FROM rust:1.88

RUN curl -fsSL https://get.docker.com -o get-docker.sh && \
  sh get-docker.sh && \
  rm get-docker.sh

WORKDIR /app
COPY . .
RUN cargo build --release

CMD ["./target/release/backend"]
