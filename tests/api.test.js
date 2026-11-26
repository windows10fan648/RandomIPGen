import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';

process.env.VERCEL = '1';
const { default: app } = await import('../server.js');

let server;
let base;

test.before(async () => {
  server = http.createServer(app);
  server.listen(0);
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}`;
});

test.after(() => {
  server.close();
});

test('home page renders', async () => {
  const res = await fetch(base + '/');
  assert.equal(res.status, 200);
  const text = await res.text();
  assert.match(text, /Random IP Generator/);
});

test('privacy and terms pages render', async () => {
  const p = await fetch(base + '/privacy');
  const t = await fetch(base + '/terms');
  assert.equal(p.status, 200);
  assert.equal(t.status, 200);
});

test('api generates ipv4 addresses', async () => {
  const res = await fetch(base + '/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ version: 'ipv4', count: 3 }),
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.count, 3);
  assert.equal(data.addresses.length, 3);
});

test('api rejects invalid version', async () => {
  const res = await fetch(base + '/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ version: 'ipv5', count: 3 }),
  });
  assert.equal(res.status, 400);
});

test('api rejects malformed json', async () => {
  const res = await fetch(base + '/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{bad json}',
  });
  assert.equal(res.status, 400);
});

test('mcp endpoint generates addresses', async () => {
  const res = await fetch(base + '/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: 'generate_ips', arguments: { version: 'ipv6', count: 2 } },
    }),
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.match(data.result.content[0].text, /success/);
});