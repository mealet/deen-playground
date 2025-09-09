use axum::{
    http::Method,
    routing::{post, get},
    Router
};
use tower_http::cors::{Any, CorsLayer};
use tokio::{io::AsyncReadExt, process::Command, sync::{Semaphore, RwLock}};
use std::{
    process::Stdio,
    error::Error,
    collections::HashMap,
    sync::{Arc}
};

mod server;

const ENDPOINT: &str = "0.0.0.0:3000";
const MAX_CONCURRENT_EXECUTIONS: usize = 10;

pub type ExecutionSessions = Arc<RwLock<HashMap<String, tokio::sync::broadcast::Sender<String>>>>;
pub type ExecutionSemaphore = Arc<Semaphore>;

async fn verify_docker() -> Result<(), Box<dyn Error>> {
    let mut child = Command::new("docker")
        .arg("ps")
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()?;

    let status = child.wait().await?;

    if !status.success() {
        if let Some(mut stderr) = child.stderr.take() {
            let mut errors = String::new();
            stderr.read_to_string(&mut errors).await?;

            return Err(errors.into())
        }
    }

    return Ok(());
}

async fn build_docker_image() -> Result<(), Box<dyn Error>> {
    let child = Command::new("docker")
        .args(&["build", "-t", "deen", "compiler/."])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()?;

    let output = child.wait_with_output().await?;

    if !output.stdout.is_empty() {
        println!("{}", String::from_utf8_lossy(&output.stdout));
    }

    if !output.stderr.is_empty() {
        println!("{}", String::from_utf8_lossy(&output.stderr));
    }

    if !output.status.success() {
        return Err(format!("Image build failed").into());
    }

    Ok(())
}

#[tokio::main]
async fn main() {
    // logger initialization
    env_logger::init_from_env(env_logger::Env::default().default_filter_or("info"));
    log::info!("Verifying docker...");

    // verifying docker
    verify_docker().await.unwrap_or_else(|err| {
        log::error!("Unable to resolve docker:\n{err}");
        std::process::exit(1);
    });

    // building up image
    log::info!("Building executor image...");
    build_docker_image().await.unwrap_or_else(|err| {
        log::error!("Unable to build image:\n{err}");
        std::process::exit(1);
    });

    // setting up
    log::info!("Starting playground backend...");

    let sessions: ExecutionSessions = Arc::new(RwLock::new(HashMap::new()));
    let semaphore: ExecutionSemaphore = Arc::new(Semaphore::new(MAX_CONCURRENT_EXECUTIONS));

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::POST, Method::GET])
        .allow_headers(Any);

    let app = Router::new()
        .route("/ping", get(server::ping_handler))
        .route("/execute", post(server::execute_handler))
        .route("/kill/{session_id}", post(server::stop_handler))
        .route("/ws/{session_id}", get(server::websocket_handler))
        .layer(cors)
        .with_state((sessions, semaphore));

    let listener = tokio::net::TcpListener::bind(ENDPOINT).await.unwrap();
    log::info!("Listening on http://{ENDPOINT}...");
    axum::serve(listener, app.into_make_service()).await.unwrap();
}
