# ☘️ Deen Playground
**Deen Playground** is a fullstack web application which provides online [Deen](https://github.com/mealet/deen) execution. <br/>
Project includes REST API for code execution and frontend page with code editor and controller panel.

## 🛠️ Usage
1. Clone this repository:
```
git clone https://github.com/mealet/deen-playground
```
2. Install [Docker](https://www.docker.com/) from official site.
3. Build images and run them by command:
```command
# Attached (interactive) mode
docker-compose build && docker-compose up

# Detached (background) mode
docker-compose build && docker-compose up -d
```
4. Open application on localhost: http://locahost
5. To stop it run command from the same dir:
```
docker-compose down
```

## ✍️ Tech Stack
> [!NOTE]
> **Backend:**
> - Language: `Rust`
> - Framework: `Axum`
> - Code Execution: `Docker`
>
> **Frontend:**
> - Language: `Typescript`
> - Build Tool: `Vite`
> - Web Library: `React`
>
> **HTTP Server And Reverse Proxy:** `nginx`

## ❔ How Execution Works
When backend server recieves execution code request it creates temporary file, fills it with code and starts isolated docker container with mounted source file. <br/>
_Isolated Docker_ container contains pre-compiled version of `deen` compiler and standard library (environment already setup). Currently it has next parameters:
- Memory: `512m`
- CPUs: `1`
- Network: `none`
- User: `sandbox`
- Acess to Directories: `only /sandbox`

## 👮 License
This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.
