# NexecuteUI

The React frontend for [Nexecute](../README.md). It provides the homepage trial editor, full IDE, interactive console, saved-history page, authentication screens, and GitHub push form.

## Stack

React 19, Vite 8, Tailwind CSS 4, Zustand, Monaco Editor, React Router, and Headless UI. Language choices and starter templates are shared between the homepage editor and IDE.

## Setup

Use Node.js 22.12+ and npm. The installed Vite version also supports Node 20.19+. Start the [backend and sandbox](../NexecuteServer/README.md) first.

From this directory:

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

On macOS/Linux, use `cp .env.example .env.local`. Preserve any existing local settings. Open [localhost:5173](http://localhost:5173).

## Configuration

[.env.example](.env.example) contains the development endpoints:

| Variable | Default/example | Purpose |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `http://localhost:8080` | HTTP API origin |
| `VITE_IDE_WEBSOCKET_URL` | `ws://localhost:8080/ws/execute` | Live IDE execution |
| `VITE_EXECUTE_PATH` | `/api/trial/execute` | Batch execution endpoint |
| `VITE_IDE_EXECUTE_PATH` | Falls back to `VITE_EXECUTE_PATH` | Optional IDE-specific batch endpoint |
| `VITE_IDE_HISTORY_PATH` | `/api/history` | Saved runs |
| `VITE_GITHUB_PUSH_PATH` | `/api/github/push` | Commit the editor file |
| `VITE_GITHUB_OAUTH_PATH` | `/oauth2/authorization/github` | GitHub sign-in |
| `VITE_AUTH_LOGIN_PATH` | `/auth/login` | Password login |
| `VITE_AUTH_REGISTER_PATH` | `/auth/register` | Registration |
| `VITE_AUTH_ME_PATH` | `/auth/me` | Current user |
| `VITE_AUTH_REFRESH_PATH` | `/auth/refresh` | Refresh access token |
| `VITE_AUTH_LOGOUT_PATH` | `/auth/logout` | Logout |

Vite reads these values at startup/build time. Restart the dev server after changing them; rebuild for production changes. `VITE_*` values are public browser configuration, so never put secrets here. The Vite configuration does not provide an API proxy: point `VITE_API_BASE_URL` to the backend and allow the frontend origin in server CORS.

## Editor workflows

### Run code

Choose Python, Java, JavaScript, TypeScript, C, C++, Go, Rust, Ruby, or PHP. Changing language resets the editor to the selected language's starter code and filename. Edited source in the current editor is replaced by that action.

The filename is sent to the backend in both HTTP and WebSocket execution. For Java, the class and filename must match, for example `Numbers.java` and `class Numbers`. See [language constraints](../NexecuteServer/README.md#languages).

- **Live connection:** Sign in and configure the WebSocket URL. Run the code, type into the console, and press Enter to submit a line. Blank lines are supported. The UI waits for the connection before starting a live run.
- **HTTP mode:** Enter all stdin in **Input for next run** before running. The request returns after execution finishes; it cannot accept input afterward.
- **Homepage trial:** Uses HTTP batch execution and its stdin field.

Output is appended as chunks, preserving line breaks. User-submitted input is echoed locally. The server does not infer when a program is asking for input. Programs should flush prompts where required by their runtime.

### Restore a saved run

Signed-in runs are stored by the server after execution completes. The History page and IDE sidebar show the user's saved entries. Clicking one restores its code, language, and original filename; it does not automatically execute it. Opening another entry is disabled while a run is active.

Editor preferences are persisted locally. History is loaded from the backend and cleared from UI memory when the account changes. Anonymous trials do not create database history.

### Push to GitHub

Sign in with GitHub. In the IDE, enter an existing repository (`owner/repository`), branch, relative destination path, and commit message. **Push current file** sends the editor content to the backend and shows a GitHub link on success. Renaming the editor file updates the default push path unless a custom path was chosen.

GitHub OAuth credentials stay on the server. Repository write access and branch rules still apply. The form creates or updates one file per push.

The Assistant panel currently reports that AI analysis is unavailable; no AI provider is configured.

## Development and validation

```powershell
npm run dev
node --test tests/ide-terminal.test.mjs tests/github-push.test.mjs tests/history.test.mjs
npm run build
npm run preview
npm run lint
```

`build` writes the production bundle to `dist/`. `preview` serves that bundle locally; it does not start the backend. The frontend tests cover terminal messages, language switching, GitHub request behavior, history restoration, and account-related history clearing. They use mocked APIs and do not publish files to GitHub.

## Source layout

- `src/Pages/`: homepage, IDE, History, login, and OAuth callback.
- `src/Store/IdeStore.js`: language definitions, execution, history, and GitHub push state.
- `src/Store/AuthStore.js`: authentication and authenticated HTTP requests.
- `src/context/`: homepage editor state.
- `src/components/`: shared editor, controls, navigation, and UI elements.
- `tests/`: Node-based regression tests.
- [docs/ide-terminal.md](docs/ide-terminal.md): WebSocket message contract.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Live console unavailable | Set the WebSocket URL, restart Vite, sign in, and check backend origin settings. |
| `NoSuchElementException` or EOF on input | In HTTP mode, provide stdin before Run; use **Live connection** for interactive input. |
| API requests fail | Confirm the API origin, running backend, and allowed CORS origin. |
| History is empty | Sign in and finish a run; use Retry if the history request failed. |
| GitHub push fails | Check repository/branch access and destination path; reconnect GitHub if credentials expired. |
| Cookie/authentication issues locally | Review the server's [cookie configuration notes](../NexecuteServer/README.md#configuration). |

[Project overview](../README.md) · [Backend documentation](../NexecuteServer/README.md)
