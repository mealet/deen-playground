use axum::{Router, http::Method, routing};
use std::{
    collections::HashMap,
    error::Error,
    io::Read,
    process::{Command, Stdio},
    sync::Arc,
};
use tokio::sync::{RwLock, Semaphore};
use tower_http::cors::{Any, CorsLayer};

mod server;

const ENDPOINT: &str = "0.0.0.0:3000";
const MAX_CONCURRENT_EXECUTIONS: usize = 10;

pub type ExecutionSessions = Arc<RwLock<HashMap<String, tokio::sync::broadcast::Sender<String>>>>;
pub type ExecutionSemaphore = Arc<Semaphore>;

fn verify_docker() -> Result<(), Box<dyn Error>> {
    let mut child = Command::new("docker")
        .arg("ps")
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()?;

    let status = child.wait()?;

    if !status.success()
        && let Some(mut stderr) = child.stderr.take()
    {
        let mut errors = String::new();
        stderr.read_to_string(&mut errors)?;

        return Err(errors.into());
    }

    Ok(())
}

fn prepare_docker_image() -> Result<(), Box<dyn Error>> {
    const IMAGE_NAME: &str = "deen";

    // checking if image exists
    let image_checker = Command::new("docker")
        .args(["image", "inspect", IMAGE_NAME])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()?
        .wait_with_output()?;

    if image_checker.status.success() {
        log::info!("Found existing docker image, skipping build...");
    } else {
        log::warn!("No docker image found, building...");
        log::warn!("You can build it manually by `docker build -t deen backend/compiler` command");

        let child = Command::new("docker")
            .args(["build", "-t", "deen", "compiler/."])
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()?;

        let output = child.wait_with_output()?;

        if !output.stdout.is_empty() {
            log::debug!("{}", String::from_utf8_lossy(&output.stdout));
        }

        if !output.stderr.is_empty() {
            log::debug!("{}", String::from_utf8_lossy(&output.stderr));
        }

        if !output.status.success() {
            return Err("Image build failed".to_string().into());
        }
    }

    Ok(())
}

#[tokio::main]
async fn main() {
    // logger initialization
    env_logger::init_from_env(env_logger::Env::default().default_filter_or("info"));
    log::info!("Verifying docker...");

    // verifying docker
    verify_docker().unwrap_or_else(|err| {
        log::error!("Unable to resolve docker:\n{err}");
        std::process::exit(1);
    });

    // building up image
    log::info!("Preparing executor image...");
    prepare_docker_image().unwrap_or_else(|err| {
        log::error!("Unable to build image:\n{err}");
        std::process::exit(1);
    });

    // setting up
    log::info!("Starting playground backend...");

    let sessions: ExecutionSessions = Arc::new(RwLock::new(HashMap::new()));
    let semaphore: ExecutionSemaphore = Arc::new(Semaphore::new(MAX_CONCURRENT_EXECUTIONS));

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::POST, Method::GET, Method::DELETE])
        .allow_headers(Any);

    let app = Router::new()
        .route("/ping", routing::get(server::ping_handler))
        .route("/execute", routing::post(server::execute_handler))
        .route("/kill/{session_id}", routing::delete(server::stop_handler))
        .route("/ws/{session_id}", routing::get(server::websocket_handler))
        .layer(cors)
        .with_state((sessions, semaphore));

    let listener = tokio::net::TcpListener::bind(ENDPOINT).await.unwrap();
    log::info!("Listening on http://{ENDPOINT}...");
    axum::serve(listener, app.into_make_service())
        .await
        .unwrap();
}
