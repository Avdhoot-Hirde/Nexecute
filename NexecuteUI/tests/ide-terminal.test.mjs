import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

class MockSocket {
  static OPEN = 1;
  static current;
  readyState = 0;
  handlers = {};
  sent = [];
  constructor() { MockSocket.current = this; }
  addEventListener(type, handler) { this.handlers[type] = handler; }
  send(message) { this.sent.push(JSON.parse(message)); }
  emit(message) { this.handlers.message({ data: JSON.stringify(message) }); }
  open() { this.readyState = 1; this.handlers.open(); }
  close() { this.readyState = 3; this.handlers.close(); }
}

test('terminal streams chunks and handles repeated, blank and disconnected input', async () => {
  const previousSocket = globalThis.WebSocket;
  const previousStorage = globalThis.localStorage;
  const previousWindow = globalThis.window;
  globalThis.WebSocket = MockSocket;
  globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  globalThis.window = { localStorage: globalThis.localStorage };
  try {
    let source = await readFile(new URL('../src/Store/IdeStore.js', import.meta.url), 'utf8');
    source = source
      .replace('"zustand"', JSON.stringify(import.meta.resolve('zustand')))
      .replace('"zustand/middleware"', JSON.stringify(import.meta.resolve('zustand/middleware')))
      .replace('import { authFetch } from "./AuthStore";',
        'const authFetch = async () => ({ ok: true, json: async () => ({ stdout: "HTTP output\\n" }) });')
      .replaceAll('import.meta.env', '({ VITE_IDE_WEBSOCKET_URL: "ws://test/ide" })');
    const { useIdeStore } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
    const state = () => useIdeStore.getState();
    const output = () => state().consoleLines.map(chunk => chunk.text).join('');
    state().connectSocket();
    const socket = MockSocket.current;
    socket.open();
    state().setStdin('old input');
    await state().runCode();
    assert.equal(socket.sent[0].stdin, '');
    state().setConsoleLines([]);
    socket.emit({ type: 'stdout', data: 'Hel' });
    socket.emit({ type: 'stdout', data: 'lo\n' });
    socket.emit({ type: 'input', data: 'Name: ' });
    assert.equal(output(), 'Hello\nName: ');
    assert.equal(state().awaitingInput, true);
    state().setConsoleEntry('Ada');
    state().submitConsoleInput();
    assert.deepEqual(socket.sent.at(-1), { type: 'stdin', data: 'Ada' });
    assert.equal(output(), 'Hello\nName: Ada\n');
    assert.equal(state().awaitingInput, false);
    socket.emit({ type: 'stdout', data: 'Hello Ada\n' });
    socket.emit({ type: 'input', data: 'Optional: ' });
    state().submitConsoleInput();
    assert.deepEqual(socket.sent.at(-1), { type: 'stdin', data: '' });
    assert.ok(output().endsWith('Optional: \n'));
    assert.equal(state().stdin, 'old input');
    socket.emit({ type: 'status', status: 'completed' });
    assert.equal(state().status, 'done');
    assert.equal(state().awaitingInput, false);
    const sentCount = socket.sent.length;
    state().submitConsoleInput();
    assert.equal(socket.sent.length, sentCount);
    await state().runCode();
    socket.emit({ type: 'input', data: 'Again: ' });
    socket.close();
    assert.equal(state().status, 'error');
    assert.equal(state().awaitingInput, false);
    assert.equal(state().socketState, 'disconnected');
    await state().runCode();
    assert.equal(state().executionMode, 'http');
    assert.equal(state().status, 'done');
    assert.ok(output().endsWith('HTTP output\n'));
  } finally {
    globalThis.WebSocket = previousSocket;
    globalThis.localStorage = previousStorage;
    globalThis.window = previousWindow;
  }
});
