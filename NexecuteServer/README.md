# Nexecute sandbox execution

The Spring server runs on the host with Java 21 and Docker CLI on PATH. Docker
Desktop must use Linux containers. The local Docker daemon must be able to mount
the server's temporary directory (Docker Desktop handles Windows paths). Remote
Docker daemons and containerized API deployments need a shared source path and
are not configured by this setup.

Build the runner once from `NexecuteServer`:

```powershell
docker build -t nexecute-sandbox:local docker/sandbox
```

Set the existing application environment variables: `db` (PostgreSQL JDBC URL),
`db_user`, `db_pass`, `github_client_id`, `github_client_secret`, `jwt`,
`TOKEN_ENCRYPTOR_PASSWORD`, and `TOKEN_ENCRYPTOR_SALT`. Then run `mvn spring-boot:run`.
`SANDBOX_IMAGE` overrides the runner image; images are never pulled during requests.
Copy the UI's `.env.example` to `.env.local` and start its Vite dev server. Sign in
for interactive execution; the UI attaches its access token to the WebSocket URL.
Use WSS outside localhost and redact token query parameters from proxy access logs.

## API

- `POST /api/trial/execute`: public batch execution, used by the UI fallback.
- `POST /api/execute`: same operation, requires the existing bearer authentication.
- `ws://localhost:8080/ws/execute?token=...`: authenticated interactive execution;
  `/ws/ide` is an alias. Origins follow `app.cors.allowed-origins`.

HTTP body: `{"language":"python","code":"print(input())","stdin":"Ada\n"}`.
Success returns `stdout`, `stderr`, `exitCode`, and `status: completed`. Program
failure returns HTTP 422 with the same fields and `status: error`; invalid requests
return 400 and exhausted capacity returns 429.

WebSocket accepts `execute` with `language`, `code`, and optional `stdin`, followed
by `stdin` messages whose `data` is a single line. The server appends a newline,
including for blank input. Output events are `stdout`/`stderr` with `data`; status
events use `running`, `completed`, or `error` plus a final `exitCode`. Input is
accepted throughout a run; there is no heuristic prompt detection or server echo.
Python is unbuffered; C++ programs should flush prompts. Both execution APIs accept
`file` from the editor, such as `Main.java`. Java compiles that file and runs the
class with the same name (`Main`), without a package declaration. The source class
must match the filename; code is not automatically rewritten. All supported languages
use the submitted filename, with the appropriate language-specific
extension. Only simple filenames are accepted, not paths. Older clients omitting
`file` retain the `Solution` default. Rebuild the sandbox image after this update.
JavaScript and compiled TypeScript use Node.js. Only standard installed libraries
are available; the sandbox cannot download dependencies.

| Language | Extension | Runtime/compiler |
| --- | --- | --- |
| Python | `.py` | Python 3, unbuffered |
| Java | `.java` | JDK 21 |
| JavaScript | `.js` | Node.js |
| TypeScript | `.ts` | tsc to CommonJS, then Node.js |
| C | `.c` | GCC, C17 |
| C++ | `.cpp` | G++, C++17 |
| Go | `.go` | Go, single-file `package main`, standard library |
| Rust | `.rs` | rustc, edition 2021, standard library |
| Ruby | `.rb` | Ruby with synchronized stdout |
| PHP | `.php` | PHP CLI, include `<?php` |

C/C++ programs should explicitly flush prompts before reading interactive input.
TypeScript snippets using Node-specific globals can declare their types locally;
third-party type packages are not installed. Compiler work uses the same memory
and time budget as program execution.

## Limits and lifecycle

Each run receives a fresh non-root container, read-only root and source, no network,
no capabilities, no privilege escalation, Docker's default seccomp profile, 1 CPU,
256 MiB memory with no additional swap, 64 processes, a 128 MiB writable work area,
and 16 MiB temporary area. Source and total stdin are each limited to 64 KiB;
combined output is capped at 256 KiB. Four runs may execute concurrently per server.
The container enforces a 30-second deadline including compilation/input waits;
the host also bounds Docker operations. Disconnect, output overflow, completion,
and graceful shutdown force-remove the container and delete its source directory.
An abrupt server/daemon crash may leave stopped containers and temporary files;
containers are labeled `nexecute.sandbox=true` for operator cleanup.

Docker containers share the host kernel. Run this worker on a dedicated machine
or VM for public untrusted workloads, keep Docker patched, and rate-limit the
public trial endpoint at your reverse proxy. Never expose the Docker daemon or
mount its socket inside the runner. Docker's security model is documented at
https://docs.docker.com/engine/security/.

AI analysis receives an explicit unavailable response.

## Per-user code history

Authenticated HTTP and WebSocket runs save source, filename, language, status,
exit code, and timestamp to PostgreSQL, linked to the authenticated user. Successful,
failed, and disconnected live runs are recorded after execution finishes. Anonymous
trials are not saved. Persistence failures are shown separately from execution output.

`GET /api/history` lists the current user's runs, newest first. `GET /api/history/{id}`
returns an entry only for its owner, otherwise 404. The History page and IDE sidebar
restore the selected source, language, and filename. UI history is cleared on account
changes and is not stored in browser persistence.

Restart the server to add nullable `language`, `status`, and `exit_code` columns using
the existing `spring.jpa.hibernate.ddl-auto=update` configuration. Deployments without
automatic schema updates must add these columns through their migration process.
Older entries infer language from their filename. Tests use an isolated H2 database;
they do not modify the configured PostgreSQL database.

## Push the current file to GitHub

Sign in with GitHub, then use the IDE's GitHub push form: enter an existing
`owner/repository`, target branch, relative file path, and commit message. Clicking
**Push current file** commits the editor's current content to that path and returns
a GitHub link. The target repository and branch must already exist and allow the
user to write. A new path creates a file; an existing file is updated using its
current SHA. The endpoint is authenticated `POST /api/github/push` with JSON fields
`repository`, `branch`, `path`, `message`, and `content` (up to 1 MiB UTF-8).

GitHub OAuth needs the configured `repo` scope. Tokens remain encrypted on the
server and are never returned to the browser. If you connected GitHub before the
token-encryptor configuration fix, sign in with GitHub again to refresh the stored
token. Conflicts, revoked credentials, access restrictions and branch rules return
actionable errors; writes are not automatically retried. This feature commits one
editor file per click and does not create repositories or branches.

## Verification

```powershell
mvn '-Dtest=DockerExecutionServiceTest,ExecutionProtocolTest,GithubPushServiceTest,CodeHistoryDatabaseTest,ExecutionHistoryTest' test
$env:NEXECUTE_DOCKER_TESTS='true'
mvn '-Dtest=DockerSandboxIntegrationTest' test
```

Integration tests require the built image and cover all ten languages, batch EOF,
interactive/blank stdin, isolation, output overflow, compiler errors, timeout, and
cancellation. Existing application-context tests additionally require database and
authentication configuration. Frontend checks: `node --test tests/ide-terminal.test.mjs`.
