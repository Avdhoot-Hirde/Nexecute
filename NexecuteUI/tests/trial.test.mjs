import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('homepage trial runs without credentials or authentication requests', async () => {
  const previousFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });
    return { ok: true, json: async () => ({ stdout: '42\n' }) };
  };
  try {
    const source = (await readFile(new URL('../src/api/trial.js', import.meta.url), 'utf8'))
      .replaceAll('import.meta.env', '({ VITE_API_BASE_URL: "http://localhost:8080/" })');
    const { executeTrial } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
    const payload = { language: 'java', file: 'Solution.java', code: 'class Solution {}', stdin: '42\n' };
    const response = await executeTrial(payload);
    assert.equal(response.ok, true);
    assert.equal(requests.length, 1);
    assert.equal(requests[0].url, 'http://localhost:8080/api/trial/execute');
    assert.equal(requests[0].options.credentials, 'omit');
    assert.equal(requests[0].options.headers.Authorization, undefined);
    assert.deepEqual(JSON.parse(requests[0].options.body), payload);
  } finally { globalThis.fetch = previousFetch; }
});
