# Nexecute

A browser-based coding workspace with Docker-isolated execution, interactive input/output, per-user code history, and GitHub file commits.

## Features

- **10 languages:** Python, Java, JavaScript, TypeScript, C, C++, Go, Rust, Ruby, and PHP.
- **Online editor:** Monaco syntax highlighting, editable filenames, and starter code that resets when switching languages.
- **Interactive terminal:** WebSocket output streaming and live stdin, with HTTP batch execution when a live connection is unavailable.
- **Isolated execution:** A fresh restricted Docker container for each run, with resource limits, a deadline, and cleanup.
- **Authentication:** Username/password login, JWT access tokens, and GitHub OAuth.
- **Saved history:** PostgreSQL-backed runs scoped to each user; select an entry from the History page or IDE sidebar to restore its code, filename, and language.
- **GitHub push:** Create or update the current editor file in an existing repository and branch using the connected user's account.

The Assistant panel is present, but AI analysis is not implemented. Execution supports individual source files and installed standard libraries; it does not install project dependencies.

## Project structure

```text
Nexecute/
├── README.md
├── NexecuteServer/       Spring Boot API, authentication, history, GitHub integration
│   ├── docker/sandbox/  Linux runner image and language launch commands
│   └── src/             Java application and tests
└── NexecuteUI/           React application
    ├── src/             Pages, Monaco editor, and Zustand stores
    ├── docs/            Interactive execution protocol
    └── tests/           Frontend regression tests
```

| Component | Technologies | Local address |
| --- | --- | --- |
| Frontend | React 19, Vite 8, Tailwind CSS, Zustand, Monaco | `http://localhost:5173` |
| Backend | Java 21, Spring Boot 4.1, Spring Security, Spring Data JPA | `http://localhost:8080` |
| Persistence | PostgreSQL | Configured through the server environment |
| Execution | Docker Linux containers | Local Docker daemon |

The browser sends authenticated requests to Spring Boot. The server stores users and execution history in PostgreSQL, starts a sandbox for each accepted run, and streams its output back to the editor. GitHub commits are sent by the server using encrypted OAuth credentials.

## Run locally

### Prerequisites

- Java 21 and Maven, or the included Maven wrapper.
- Node.js 22.12+ and npm (the installed Vite version also supports Node 20.19+).
- PostgreSQL with an existing database and a user permitted to create/update tables.
- Docker Engine or Docker Desktop with **Linux containers**, running and accessible through the `docker` CLI.
- A GitHub OAuth application and its client credentials. These are required by the current server configuration.

### 1. Configure and start the server

Follow the [server environment setup](NexecuteServer/README.md#configuration), including database credentials, JWT/encryption secrets, and the GitHub callback URL. Set the variables in the shell or IDE that starts the server; Spring Boot does not automatically read a project `.env` file.

From the repository root:

```powershell
cd NexecuteServer
docker build -t nexecute-sandbox:local docker/sandbox
mvn spring-boot:run
```

Keep the server running. The backend runs on the host and mounts a temporary source directory into each container. A remote Docker daemon or a containerized backend requires additional shared-path configuration.

### 2. Configure and start the UI

In another terminal, from the repository root:

```powershell
cd NexecuteUI
npm install
Copy-Item .env.example .env.local
npm run dev
```

On macOS/Linux, use `cp .env.example .env.local` instead of `Copy-Item`. If `.env.local` already exists, update it instead of overwriting it. See [UI configuration](NexecuteUI/README.md#configuration) for endpoint details.

Open [Nexecute locally](http://localhost:5173). Sign in, open the IDE, and wait for **Live connection** before running a program that reads input. Type input in the console and press Enter. In HTTP mode, supply stdin before starting the run.

### 3. Save and revisit work

Signed-in runs are saved after execution finishes, including failures. Open **History**, or select an entry from the IDE sidebar, to restore it. Anonymous trials are not saved.

For GitHub push, sign in with GitHub and enter `owner/repository`, an existing branch, a relative file path, and a commit message. **Push current file** creates or updates that file; it does not create a repository or branch.

## Language and filename rules

Use a simple filename with the matching extension: `.py`, `.java`, `.js`, `.ts`, `.c`, `.cpp`, `.go`, `.rs`, `.rb`, or `.php`. Java's entry class must match the filename, such as `Main.java` with `class Main`, without a package declaration. Go requires `package main`. PHP source includes `<?php`.

See the [server language reference](NexecuteServer/README.md#languages) for compiler details and input behavior.

## Validation

From `NexecuteUI`:

```powershell
node --test tests/ide-terminal.test.mjs tests/github-push.test.mjs tests/history.test.mjs
npm run build
```

From `NexecuteServer`:

```powershell
mvn '-Dtest=DockerExecutionServiceTest,ExecutionProtocolTest,GithubPushServiceTest,CodeHistoryDatabaseTest,ExecutionHistoryTest' test
```

For real sandbox tests, build the image and run:

```powershell
$env:NEXECUTE_DOCKER_TESTS='true'
mvn '-Dtest=DockerSandboxIntegrationTest' test
```

On macOS/Linux: `NEXECUTE_DOCKER_TESTS=true mvn -Dtest=DockerSandboxIntegrationTest test`.

History tests use isolated H2 storage; GitHub tests use a local mock API. Docker tests execute real containers. A full application startup additionally needs the configured PostgreSQL database and authentication settings.

## Deployment considerations

The current setup is designed for a host-run API and local Docker daemon. Docker shares the host kernel; use a dedicated worker machine or VM for public untrusted code. Keep resource limits enabled and protect the public trial endpoint with rate limits. Configure HTTPS/WSS, CORS, OAuth redirect URLs, and secure cookies for the deployed origins. Never expose the Docker socket to submitted code or put server secrets in `VITE_*` variables.

## Further documentation

- [NexecuteServer: setup, APIs, limits, and tests](NexecuteServer/README.md)
- [NexecuteUI: setup, workflows, and development](NexecuteUI/README.md)
- [Interactive execution message protocol](NexecuteUI/docs/ide-terminal.md)
