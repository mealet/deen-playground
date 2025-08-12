## What Is This?
This is pre-compiled **Deen Compiler** with `x86_64-unknown-linux-gnu` target. <br/>
It is used for docker, please do NOT modify it if you don't know how!

## How To Update It?
You have to get latest (or necessary) version of `deen` compiler: https://github.com/mealet/deen <br/>
Build it with command (see full guide in language documentation):
```command
cargo build --release --target=x86_64-unknown-linux-gnu
```
Your executable will be at `target/release` directory, copy it here.
