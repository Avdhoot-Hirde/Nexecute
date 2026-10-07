# NexecuteServer

The Java 21 / Spring Boot 4.1 backend for [Nexecute](../README.md). It handles authentication, Docker-isolated code execution, WebSocket streaming, per-user PostgreSQL history, and GitHub file commits.

## Prerequisites

- Java 21 and Maven, or the included Maven wrapper.
- PostgreSQL with an existing database and database user.
- A running local Docker daemon and Docker CLI on PATH. Docker Desktop must use Linux containers.
- GitHub OAuth client credentials and application secrets.

The API runs on the host. Docker must be able to bind-mount the API's temporary source directory. Docker Desktop handles local Windows paths; remote daemons or containerized API deployments need additional shared-path configuration.

## Configuration

Set these environment variables in the shell or IDE that launches Spring Boot. A server `.env` file is **not automatically loaded**.

| Variable | Required | Meaning |
| --- | --- | --- |
| `db` | Yes | PostgreSQL JDBC URL, e.g. `jdbc:postgresql://localhost:5432/nexecute` |
| `db_user` | Yes | Database username |
| `db_pass` | Yes | Database password |
| `github_client_id` | Yes | GitHub OAuth app client ID |
| `github_client_secret` | Yes | GitHub OAuth app client secret |
| `jwt` | Yes | Strong random signing secret, at least 32 UTF-8 bytes; used directly, not Base64-decoded |
| `TOKEN_ENCRYPTOR_PASSWORD` | Yes | Secret for encrypting stored GitHub tokens |
| `TOKEN_ENCRYPTOR_SALT` | Yes | Hex-encoded encryption salt, at least 8 bytes (16 hex characters) |
| `SANDBOX_IMAGE` | No | Defaults to `nexecute-sandbox:local`; image must already exist locally |
| `COOKIE_SECURE` | No | Controls the OAuth refresh cookie; defaults to `false` for local development |
| `APP_FRONTEND_URL` | No | Defaults to `http://localhost:5173` |
| `APP_CORS_ALLOWED_ORIGINS` | No | Defaults to `http://localhost:5173`; use the actual browser origin |
| `SERVER_PORT` | No | Defaults to `8080` |

Example PowerShell configuration (replace every placeholder):

```powershell
$env:db='jdbc:postgresql://localhost:5432/nexecute'
$env:db_user='<database-user>'
$env:db_pass='<database-password>'
$env:github_client_id='<oauth-client-id>'
$env:github_client_secret='<oauth-client-secret>'
$env:jwt='<strong-random-secret-at-least-32-bytes>'
$env:TOKEN_ENCRYPTOR_PASSWORD='<strong-random-encryption-password>'
$env:TOKEN_ENCRYPTOR_SALT='<random-salt-as-16-or-more-hex-characters>'
```

Keep encryption settings stable across restarts so stored GitHub tokens remain readable. Changing them requires users to reconnect GitHub. Never commit real credentials.

For local GitHub OAuth, configure the application callback as `http://localhost:8080/login/oauth2/code/github` and homepage as `http://localhost:5173`. The configured scopes are `read:user`, `user:email`, and `repo`. The callback is currently explicit in [application.yaml](src/main/resources/application.yaml); update it when changing the backend origin.

**Cookie caveat:** the OAuth refresh cookie uses `COOKIE_SECURE`, but the password-login refresh cookie currently sets `Secure=true` directly. The OAuth session cookie also defaults to secure in `application.yaml`. For local plain HTTP, the session setting can be overridden with `SERVER_SERVLET_SESSION_COOKIE_SECURE=false`; this does not change the password-login cookie. Use local HTTPS or adjust that handler if your browser rejects its cookie. Deployed environments should use HTTPS and secure cookies.

## Build and run

From this directory, after configuring the environment:

```powershell
docker info
docker build -t nexecute-sandbox:local docker/sandbox
mvn spring-boot:run
```

Use `.\mvnw.cmd spring-boot:run` on Windows or `./mvnw spring-boot:run` on macOS/Linux if using the Maven wrapper. An installed Maven is an alternative if the wrapper cannot download/start its distribution.

The API listens at `http://localhost:8080`; `GET /auth` returns a basic running response. Build the [frontend](../NexecuteUI/README.md) separately. Rebuild the sandbox image after editing its Dockerfile or launch script. No image is pulled during an execution request.

## API reference

Authenticated HTTP requests use `Authorization: Bearer <access-token>`.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/auth` | Basic running response |
| POST | `/auth/register` | Register with `userName`, `email`, `password`, `confirmPassword` |
| POST | `/auth/login` | Login with `userName` and `password` |
| GET | `/auth/me` | Current authenticated user |
| POST | `/auth/refresh` | Refresh access token using the refresh cookie |
| POST | `/auth/logout` | Clear authentication/refresh cookie |
| GET | `/oauth2/authorization/github` | Begin GitHub OAuth |
| POST | `/api/trial/execute` | Public batch execution; saves history when authenticated |
| POST | `/api/execute` | Authenticated batch execution |
| GET | `/api/history` | Current user's runs, newest first |
| GET | `/api/history/{id}` | Current user's saved entry; returns 404 for another user's entry |
| POST | `/api/github/push` | Authenticated create/update of a repository file |
| WebSocket | `/ws/execute?token=...` | Authenticated live execution; `/ws/ide` is an alias |

### Batch execution

```json
{
  "language": "java",
  "file": "Main.java",
  "code": "class Main { public static void main(String[] args) { System.out.println(new java.util.Scanner(System.in).nextInt()); } }",
  "stdin": "42\n"
}
```

Responses contain `stdout`, `stderr`, `exitCode`, and `status` (`completed` or `error`). Successful execution returns HTTP 200; execution failure returns 422, invalid requests 400, and exhausted capacity 429. Authenticated responses include the saved `history` entry, or `historyError` if persistence fails. Batch stdin is closed after the supplied content; an empty value cannot support later interactive input.

### Live execution

Connect with the access token and an allowed origin. Send an `execute` message containing `language`, `file`, `code`, and optional initial `stdin`. While the process runs, send `{"type":"stdin","data":"42"}`; each message appends a newline, including blank lines.

The server emits `stdout`/`stderr` chunks, `status` updates, and a `history` event after saving the run. Database failures are reported as `history_error`. Input can be submitted throughout a live run; prompts are not detected heuristically or echoed by the server. Closing the connection cancels its run.

See the complete [message protocol](../NexecuteUI/docs/ide-terminal.md). Use WSS in deployed environments and redact token query parameters from access logs.

## Languages

| Language identifier | Extension | Execution |
| --- | --- | --- |
| `python` | `.py` | Python 3, unbuffered |
| `java` | `.java` | JDK 21 compilation and execution |
| `javascript` | `.js` | Node.js |
| `typescript` | `.ts` | tsc to CommonJS, then Node.js |
| `c` | `.c` | GCC, C17 |
| `cpp` | `.cpp` | G++, C++17 |
| `go` | `.go` | Go build, standard library, modules/downloads disabled |
| `rust` | `.rs` | rustc, edition 2021, standard library |
| `ruby` | `.rb` | Ruby with synchronized stdout |
| `php` | `.php` | PHP CLI |

The frontend filename is validated and used inside the sandbox. Only simple filenames are accepted, without folders or spaces. Omitting `file` uses `Solution` with the language extension. Java's entry class must match the filename without a package declaration; source code is not rewritten. Go requires `package main`; PHP source includes `<?php`.

External dependencies are not installed during execution. TypeScript programs using Node-specific globals can declare their types locally. C/C++ programs should flush prompts before waiting for input. Node programs must close input handles when finished. Compilation and input waits share the execution deadline.

## Sandbox limits

| Resource | Limit |
| --- | --- |
| Concurrent executions | 4 per server process |
| Container deadline | 30 seconds, including compilation and input waits |
| CPU | 1 CPU |
| Memory | 256 MiB, no additional swap |
| Processes | 64 |
| Source / total stdin | 64 KiB each, UTF-8 |
| Combined output | 256 KiB |
| Writable work area | 128 MiB tmpfs |
| Temporary area | 16 MiB tmpfs |

Each run uses a non-root container, read-only root filesystem and source mount, disabled networking, dropped capabilities, no privilege escalation, and Docker's default seccomp profile. Go build files use the bounded work area. Host-side waits also bound Docker operations.

Completion, cancellation, overflow, and graceful shutdown remove the container and source directory. Abrupt host/daemon failure may leave stopped containers or temporary files; sandbox containers carry the `nexecute.sandbox=true` label for operator inspection.

Containers share the host kernel. Use a dedicated worker machine or VM for public untrusted workloads, keep Docker patched, rate-limit the public trial endpoint, and never expose the daemon socket to submitted code.

## Database history

Accepted authenticated runs save source, filename, language, status, exit code, timestamp, and owner after execution ends. Successes, failures, and disconnected live runs are recorded. Anonymous trials are not saved; database failures are shown separately from execution output.

The History page and IDE sidebar retrieve owner-scoped entries and restore the selected code. History is not persisted in browser storage and is cleared from UI memory on account changes. Older database rows without a language infer it from their filename.

The current JPA setting is `ddl-auto: update`: starting the server creates/updates mapped tables, but does not create the PostgreSQL database itself. Deployments that disable automatic updates must manage schema migrations, including the history fields `language`, `status`, and `exit_code`.

## GitHub commits

`POST /api/github/push` accepts `repository` (`owner/repository`), `branch`, `path`, `message`, and `content` (up to 1 MiB UTF-8). The repository and branch must exist and permit the connected user to write.

The server decrypts the user's stored OAuth token, looks up the current file SHA, and creates or updates the file through GitHub. The response includes `htmlUrl`, `commitSha`, `path`, and `branch`. Access restrictions, conflicts, revoked credentials, and repository rules produce actionable errors. Writes are not automatically retried. This operation commits one editor file; it does not create branches or repositories.

AI analysis is not implemented; the WebSocket handler returns an unavailable message for analysis requests.

## Tests

Database, protocol, validation, and GitHub mock tests:

```powershell
mvn '-Dtest=DockerExecutionServiceTest,ExecutionProtocolTest,GithubPushServiceTest,CodeHistoryDatabaseTest,ExecutionHistoryTest' test
```

Actual Docker execution tests (image must be built):

```powershell
$env:NEXECUTE_DOCKER_TESTS='true'
mvn '-Dtest=DockerSandboxIntegrationTest' test
```

On macOS/Linux: `NEXECUTE_DOCKER_TESTS=true mvn -Dtest=DockerSandboxIntegrationTest test`.

History tests use temporary H2 storage rather than the configured PostgreSQL database. GitHub tests use a local mock HTTP server and do not publish commits. Docker tests cover all ten languages, custom filenames, batch/live stdin, isolation, output limits, errors, cancellation, and timeouts. Full application startup needs the real environment configuration.

[Project overview](../README.md) · [Frontend documentation](../NexecuteUI/README.md)
