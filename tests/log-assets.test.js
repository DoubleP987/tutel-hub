import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { fileURLToPath } from 'node:url';
import { registerAssetsRoutes } from '../src/web/routes/assets.js';

test('The control panel log script is available over HTTP', async () => {
  const app = express();
  registerAssetsRoutes(app, fileURLToPath(new URL('../src/web/public/', import.meta.url)));
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/bot-logs.js`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /javascript/);
    assert.match(await response.text(), /api\/bot\/logs/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
