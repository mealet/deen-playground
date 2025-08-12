use axum::{
    routing::post,
    Router
};
use std::sync::Arc;
use tokio::{io::AsyncReadExt, process::Command};
use std::{process::Stdio, error::Error};

mod runner;
mod server;

const ENDPOINT: &str = "0.0.0.0:3000";

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

#[tokio::main]
async fn main() {
    // logger initialization
    env_logger::init_from_env(env_logger::Env::default().default_filter_or("info"));
    log::info!("Starting playground...");

    // verifying docker
    verify_docker().await.unwrap_or_else(|err| {
        log::error!("Unable to resolve docker:\n{err}");
    });

    // setting up axum app
    let pool = runner::ContainerPool::new(50);
    let app = Router::new()
        .route("/execute", post(server::execute_handler))
        .with_state(Arc::new(pool));

    let listener = tokio::net::TcpListener::bind(ENDPOINT).await.unwrap();

    log::info!("Listening on http://{ENDPOINT}...");
    axum::serve(listener, app).await.unwrap();
}
