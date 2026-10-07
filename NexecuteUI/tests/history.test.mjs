import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('database history restores custom files and records failed HTTP runs without local duplicates', async () => {
  const previousWindow = globalThis.window;
  const previousStorage = globalThis.localStorage;
  const previousSocket = globalThis.WebSocket;
  globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  globalThis.window = { localStorage: globalThis.localStorage };
  globalThis.WebSocket = { OPEN: 1 };
  try {
    const source = (await readFile(new URL('../src/Store/IdeStore.js', import.meta.url), 'utf8'))
      .replace('"zustand"', JSON.stringify(import.meta.resolve('zustand')))
      .replace('"zustand/middleware"', JSON.stringify(import.meta.resolve('zustand/middleware')))
      .replace('import { authFetch, useAuthStore } from "./AuthStore";', `
        export let authListener;
        export const saved = { id: 'db-id', fileName: 'Numbers.java', language: 'java', code: 'class Numbers {}', status: 'error', createdAt: '2026-10-06T10:00:00Z' };
        export const api = { fail: false };
        const useAuthStore = { getState: () => ({ isAuthenticated: true, user: { id: 'ada' } }), subscribe: listener => { authListener = listener; } };
        const authFetch = async (url, options) => {
          if (api.fail) return { ok: false, json: async () => ({}) };
          return options?.method === 'POST'
            ? { ok: false, json: async () => ({ stderr: 'Compilation failed', history: saved }) }
            : { ok: true, json: async () => [saved] };
        };
      `).replaceAll('import.meta.env', '({})');
    const { useIdeStore, saved, api, authListener } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
    const state = () => useIdeStore.getState();
    await state().loadHistory();
    assert.equal(state().history[0].fileName, 'Numbers.java');
    assert.equal(state().loadHistoryItem(state().history[0]), true);
    assert.equal(state().language, 'java');
    assert.equal(state().file, 'Numbers.java');
    assert.equal(state().code, saved.code);
    assert.equal(state().githubPath, 'Numbers.java');
    await state().runCode();
    assert.equal(state().status, 'error');
    assert.equal(state().history.length, 1);
    assert.equal(state().history[0].id, 'db-id');
    useIdeStore.setState({ status: 'running' });
    assert.equal(state().loadHistoryItem({ ...saved, code: 'overwrite' }), false);
    assert.equal(state().code, saved.code);
    authListener({ isAuthenticated: false }, { isAuthenticated: true, user: { id: 'ada' } });
    assert.equal(state().history.length, 0);
    api.fail = true;
    await state().loadHistory();
    assert.equal(state().historyLoading, false);
    assert.equal(state().historyError, 'History is unavailable');
  } finally {
    globalThis.window = previousWindow; globalThis.localStorage = previousStorage; globalThis.WebSocket = previousSocket;
  }
});
