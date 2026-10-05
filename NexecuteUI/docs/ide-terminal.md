# Interactive IDE execution

Set `VITE_IDE_WEBSOCKET_URL` to the execution server's WebSocket endpoint.
The HTTP execution endpoint returns a finished response and cannot provide live
print/input interaction. In HTTP mode, users supply stdin before running.

The frontend uses these JSON messages:

| Direction | Message | Meaning |
| --- | --- | --- |
| Client to server | `{"type":"execute","language":"python","code":"...","stdin":""}` | Start a new isolated execution. |
| Server to client | `{"type":"stdout","data":"Hello\n"}` | Append output exactly as emitted, preserving line breaks. |
| Server to client | `{"type":"stderr","data":"Error\n"}` | Append error output. |
| Server to client | `{"type":"input","data":"Name: "}` | Request input, optionally displaying a prompt. |
| Client to server | `{"type":"stdin","data":"Ada"}` | Submit one line to the active process; the server must append a newline. Empty data submits a blank line. |
| Server to client | `{"type":"status","status":"completed"}` | Execution finished. `running` and `error` are also supported. |

Prompts must be sent once: if already emitted through stdout, send an input event
with empty data. The console also accepts stdin throughout a live run, allowing
processes that do not emit explicit input events to read it normally.
The frontend locally echoes submitted input; the server should not echo it again.

The execution server must stream and flush output while the same process remains
alive, write incoming stdin to that process, and clean up the process when its
connection closes. Python execution should use unbuffered output. Program code
must run in the backend's isolated execution environment. No execution WebSocket
implementation was found in the adjacent NexecuteServer project during this change.

Run frontend protocol checks with `node --test tests/ide-terminal.test.mjs`.
