use axum::{
    Json,
    extract::{
        State,
        Path,
        WebSocketUpgrade,
        ws::{WebSocket, Message}
    },
    http::StatusCode,
    response::{IntoResponse, Response}
};
use serde::{Serialize, Deserialize};
use tokio::{
    sync::broadcast,
    io::{AsyncBufReadExt, AsyncWriteExt, BufReader},
    process::Command
};
use uuid::Uuid;
use std::{sync::Arc, process::Stdio};

use crate::{ExecutionSemaphore, ExecutionSessions};

#[derive(Deserialize)]
pub struct ExecuteRequest {
    code: String,
    input: String,
}

#[derive(Serialize)]
pub struct ExecuteResponse {
    success: bool,
    session_id: String
}

pub async fn execute_handler(
    State((sessions, semaphore)): State<(ExecutionSessions, ExecutionSemaphore)>,
    Json(payload): Json<ExecuteRequest>
) -> impl IntoResponse {
    let _permit = match semaphore.try_acquire() {
        Ok(permit) => permit,
        Err(_) => return (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(ExecuteResponse {
                success: false,
                session_id: format!("Server is busy, try again later")
            })
        )
    };

    let session_id = Uuid::new_v4().to_string();
    let (tx, _) = broadcast::channel(1000);

    {
        let mut sessions_guard = sessions.write().await;
        sessions_guard.insert(session_id.clone(), tx.clone());
    }

    let sessions_cloned = Arc::clone(&sessions);
    let session_id_cloned = session_id.clone();

    tokio::spawn(async move {
        let result = execute_code(payload.code, payload.input, tx, &session_id_cloned).await;

        // removing session
        {
            let mut sessions_guard = sessions_cloned.write().await;
            sessions_guard.remove(&session_id_cloned);
        }

        if let Err(err) = result {
            log::error!("Failed execution for `{}`: {}", session_id_cloned, err);
        }
    });

    (
        StatusCode::OK,
        Json(ExecuteResponse {
            success: true,
            session_id
        })
    )
}

pub async fn stop_handler(
    State((sessions, _)): State<(ExecutionSessions, ExecutionSemaphore)>,
    Path(session_id): Path<String>
) -> impl IntoResponse {
    // verification if session exist
    {
        let sessions_guard = sessions.read().await;
        if !sessions_guard.contains_key(&session_id) {
            return StatusCode::NOT_FOUND;
        }
    }

    if kill_container(session_id).await.is_err() {
        return StatusCode::INTERNAL_SERVER_ERROR;
    }

    return StatusCode::OK;
}

pub async fn websocket_handler(
    ws: WebSocketUpgrade,
    Path(session_id): Path<String>,
    State((sessions, _)): State<(ExecutionSessions, ExecutionSemaphore)>,
) -> Response {
    ws.on_upgrade(move |socket| handle_socket(socket, session_id, sessions))
}

async fn handle_socket(
    mut socket: WebSocket,
    session_id: String,
    sessions: ExecutionSessions
) {
    let mut rx = {
        let sessions_guard = sessions.read().await;
        match sessions_guard.get(&session_id) {
            Some(tx) => tx.subscribe(),
            None => {
                let _ = socket.send(Message::Text("ERROR: Session not found".into())).await;
                return;
            }
        }
    };

    while let Ok(message) = rx.recv().await {
        if socket.send(Message::Text(message.into())).await.is_err() {
            break;
        }
    }

    let _ = socket.send(Message::Close(None));
}

async fn kill_container(uuid: impl AsRef<str>) -> Result<(), Box<dyn std::error::Error>> {
    let uuid = uuid.as_ref();

    let mut child = Command::new("docker")
        .args(&[
            "kill", uuid
        ])
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()?;

    let status = child.wait().await?;

    if status.success() {
        log::warn!("Killed container: `{uuid}`");
        return Ok(());
    }

    return Err(format!("Failed to kill container `{uuid}`: {status}").into())
}

async fn execute_code(code: impl AsRef<str>, input: impl AsRef<str>, output_sender: broadcast::Sender<String>, uuid: impl AsRef<str>) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let input = input.as_ref().to_owned();
    let code = code.as_ref();
    let uuid = uuid.as_ref();

    let temp_dir = tempfile::tempdir_in("/tmp/deen-playground")?;
    let input_path = temp_dir.path().join("source.dn");

    log::info!("Starting execution of `{}`...", temp_dir.path().display());
    tokio::fs::write(&input_path, code).await?;
    
    let mut child = Command::new("docker")
        .args(&[
            "run", "-i", "--rm",
            "--name", uuid,
            "--cpus", "1",
            "--memory", "128m",
            "--network", "none",
            "-v", &format!("{}:/sandbox/source.dn:ro", input_path.display()),
            "deen",
            "sh", "-c",
            "(sleep 1) && (deen ./source.dn output && echo '') && (timeout 15s ./output; CODE=$?; if [ $CODE -eq 124 ]; then echo 'RUNNER: 15 seconds runtime expired, exiting...' >&2 && exit 1; else echo -e '\\nProcess finished with code: '$CODE; fi)  2>&1"
        ])
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()?;

    let stdin = child.stdin.take();
    let stdout = child.stdout.take();
    let stderr = child.stderr.take();

    let mut input = input;
    if input.is_empty() || !input.ends_with('\n') {
        input.push('\n');
    }

    if let Some(mut stdin) = stdin {
        let _ = stdin.write_all(input.as_bytes()).await;
    }

    let stdout_sender = output_sender.clone();
    let stdout_task = tokio::spawn(async move {
        if let Some(stdout) = stdout {
            let reader = BufReader::new(stdout);
            let mut lines = reader.lines();
            
            while let Ok(Some(line)) = lines.next_line().await {
                let _ = stdout_sender.send(line);
            }
        }
    });

    let stderr_sender = output_sender.clone();
    let stderr_task = tokio::spawn(async move {
        if let Some(stderr) = stderr {
            let reader = BufReader::new(stderr);
            let mut lines = reader.lines();
            
            while let Ok(Some(line)) = lines.next_line().await {
                let _ = stderr_sender.send(line);
            }
        }
    });

    let status = child.wait().await?;
    let _ = tokio::join!(stdout_task, stderr_task);

    log::info!("Finished `{}`: {}", temp_dir.path().display(), status);
    Ok(())
}
