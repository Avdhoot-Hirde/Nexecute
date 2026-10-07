import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

class MockSocket {
  static OPEN = 1;
  static current;
  readyState = 0;
  handlers = {};
  sent = [];
  constructor(url) { this.url = new URL(url); MockSocket.current = this; }
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
  globalThis.window = { localStorage: globalThis.localStorage, location: { href: 'http://localhost:5173' } };
  try {
    let source = await readFile(new URL('../src/Store/IdeStore.js', import.meta.url), 'utf8');
    source = source
      .replace('"zustand"', JSON.stringify(import.meta.resolve('zustand')))
      .replace('"zustand/middleware"', JSON.stringify(import.meta.resolve('zustand/middleware')))
      .replace('import { authFetch, useAuthStore } from "./AuthStore";',
        'const useAuthStore = { getState: () => ({ accessToken: "test-token" }) }; const authFetch = async () => ({ ok: true, json: async () => ({ stdout: "HTTP output\\n" }) });')
      .replaceAll('import.meta.env', '({ VITE_IDE_WEBSOCKET_URL: "ws://test/ide" })');
    const { useIdeStore, IDE_LANGUAGES } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
    const state = () => useIdeStore.getState();
    const output = () => state().consoleLines.map(chunk => chunk.text).join('');
    assert.equal(IDE_LANGUAGES.length, 10);
    for (const language of IDE_LANGUAGES) {
      state().setCode('previous edited or submitted code');
      state().changeLanguage(language.value);
      assert.equal(state().file, language.file);
      assert.equal(state().code, language.snippet);
    }
    state().changeLanguage('python');
    state().connectSocket();
    const socket = MockSocket.current;
    assert.equal(socket.url.searchParams.get('token'), 'test-token');
    await state().runCode();
    assert.equal(state().status, 'idle');
    assert.equal(socket.sent.length, 0);
    assert.ok(output().includes('Connecting to the live terminal'));
    socket.open();
    state().setStdin('old input');
    state().setFile('Custom.py');
    await state().runCode();
    assert.equal(socket.sent[0].file, 'Custom.py');
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
    socket.emit({ type: 'history', entry: { id: 'saved-run', fileName: 'Custom.py', language: 'python', code: 'print(42)', status: 'done', createdAt: '2026-10-06T10:00:00Z' } });
    assert.equal(state().history[0].id, 'saved-run');
    assert.equal(state().history[0].fileName, 'Custom.py');
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
