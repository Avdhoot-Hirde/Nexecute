import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('push sends current content and filename, preserves custom paths and reports API errors', async () => {
  const previousStorage = globalThis.localStorage;
  const previousWindow = globalThis.window;
  globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  globalThis.window = { localStorage: globalThis.localStorage };
  try {
    const source = (await readFile(new URL('../src/Store/IdeStore.js', import.meta.url), 'utf8'))
      .replace('"zustand"', JSON.stringify(import.meta.resolve('zustand')))
      .replace('"zustand/middleware"', JSON.stringify(import.meta.resolve('zustand/middleware')))
      .replace('import { authFetch, useAuthStore } from "./AuthStore";', `
        const useAuthStore = { getState: () => ({}) };
        export const requests = [];
        const authFetch = async (url, options) => {
          requests.push({ url, body: JSON.parse(options.body) });
          return { ok: requests.length === 1, json: async () => requests.length === 1
            ? { htmlUrl: 'https://github.com/ada/demo/blob/main/Example.py' }
            : { message: 'The file changed on GitHub. Review it before retrying the push.' } };
        };
      `).replaceAll('import.meta.env', '({})');
    const { useIdeStore, requests } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
    const state = () => useIdeStore.getState();
    state().setFile('Example.py');
    assert.equal(state().githubPath, 'Example.py');
    state().setGithubRepository('ada/demo');
    state().setCode('print("42")');
    await state().pushToGithub();
    assert.equal(requests[0].url, '/api/github/push');
    assert.equal(requests[0].body.path, 'Example.py');
    assert.equal(requests[0].body.content, 'print("42")');
    assert.equal(state().pushStatus, 'success');
    assert.ok(state().pushedUrl.startsWith('https://github.com/'));
    state().setGithubPath('src/custom.py');
    state().setFile('Another.py');
    assert.equal(state().githubPath, 'src/custom.py');
    await state().pushToGithub();
    assert.equal(state().pushStatus, 'error');
    assert.match(state().pushError, /file changed/);
    state().setGithubRepository('');
    await state().pushToGithub();
    assert.equal(requests.length, 2);
  } finally {
    globalThis.localStorage = previousStorage;
    globalThis.window = previousWindow;
  }
});
