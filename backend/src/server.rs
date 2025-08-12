use axum::{
    Json,
    extract::State,
    http::StatusCode,
    response::IntoResponse
};
use std::sync::Arc;
use serde::{Serialize, Deserialize};
use crate::runner::ContainerPool;

#[derive(Deserialize)]
pub struct ExecuteRequest {
    code: String,
    input: String,
}

#[derive(Serialize)]
pub struct ExecuteResponse {
    success: bool,
    output: String
}

pub async fn execute_handler(
    State(pool): State<Arc<ContainerPool>>,
    Json(payload): Json<ExecuteRequest>
) -> impl IntoResponse {
    let _permit = match pool.acquire().await {
        Ok(permit) => permit,
        Err(_) => return (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(ExecuteResponse {
                success: false,
                output: String::new()
            })
        )
    };

    match pool.execute(payload.code, payload.input).await {
        Ok(output) => (
            StatusCode::OK,
            Json(ExecuteResponse {
                success: true,
                output
            })
        ),
        Err(err) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ExecuteResponse {
                success: false,
                output: err.to_string()
            })
        )
    }
}
