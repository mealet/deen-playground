use tokio::{
    io::{AsyncReadExt, AsyncWriteExt}, process::Command, sync::{AcquireError, Semaphore, SemaphorePermit}
};
use std::{process::Stdio, error::Error, sync::Arc};

pub struct ContainerPool {
    semaphore: Arc<Semaphore>,
}

impl ContainerPool {
    pub fn new(max_containers: usize) -> Self {
        Self {
            semaphore: Arc::new(Semaphore::new(max_containers))
        }
    }

    pub async fn acquire(&self) -> Result<SemaphorePermit, AcquireError> {
        self.semaphore.acquire().await
    }

    pub async fn execute(&self, code: impl AsRef<str>, input: impl AsRef<str>) -> Result<String, Box<dyn Error>> {
        // creating temporary file
        let temp_dir = tempfile::tempdir()?;
        let input_path = temp_dir.path().join("source.dn");

        log::info!("Starting execution of `{}`...", temp_dir.path().display());
        tokio::fs::write(&input_path, code.as_ref()).await?;

        // running isolated docker container
        let mut child = Command::new("docker")
            .args(&[
                "run", "-i", "--rm",
                "--cpus=1",
                "--memory=128m",
                "--memory-swap=128m",
                "--restart=no",
                "--network=none",
                "--health-cmd=\"curl -f http://localhost/ || exit 1\"",
                "--health-interval=5s",
                "--health-retries=3",
                "--health-timeout=3s",
                "--health-start-period=6s",
                "-v", &format!("{}:/sandbox/source.dn:ro", input_path.display()),
                "deen",
                "sh", "-c",
                "(deen source.dn output && echo '' && ./output) 2>&1"
            ])
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()?;

        // attaching input
        
        let mut input = input.as_ref().to_string();
        if input.is_empty() || input.as_bytes()[input.len() - 1] != b'\n' {
            input.push('\n');
        }

        if let Some(mut stdin) = child.stdin.take() {
            stdin.write(input.as_bytes()).await?;
        }

        // reading output (stdout and stderr together)
        let mut output = String::new();
        if let Some(mut stdout) = child.stdout.take() {
            stdout.read_to_string(&mut output).await?;
        }

        let status = child.wait().await?;

        if let Some(mut stderr) = child.stderr.take() {
            let mut errors = String::new();
            stderr.read_to_string(&mut errors).await?;

            if !errors.is_empty() {
                output.push_str(&errors);
            }
        }

        if !status.success() {
            log::error!("Failed execution: {}", status);
            return Err(format!("Process failed: {}\n\n{}", status, output).into())
        }

        log::info!("Successful execution of `{}`: {}", temp_dir.path().display(), status);
        Ok(output)
    }
}
