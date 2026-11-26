#!/usr/bin/env node
import http from 'node:http';
import { handleMcpRequest } from './mcp.js';

const PORT = process.env.MCP_PORT || 3001;

const server = http.createServer((req, res) => {
  if (req.url !== '/mcp') {
    res.statusCode = 404;
    res.end('Not found');
    return;
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method === 'POST') {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      let parsed;
      try {
        parsed = JSON.parse(body || '{}');
      } catch {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }));
        return;
      }

      const handleOne = (r) => handleMcpRequest(r);
      let result;
      if (Array.isArray(parsed)) {
        result = parsed.map(handleOne).filter((r) => r !== null);
      } else {
        result = handleOne(parsed);
      }

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-store');
      if (result === null) {
        res.statusCode = 202;
        res.end();
      } else {
        res.end(JSON.stringify(result));
      }
    });
    return;
  }

  if (req.method === 'GET') {
    res.statusCode = 405;
    res.setHeader('Allow', 'POST, DELETE');
    res.end('Method not allowed');
    return;
  }

  if (req.method === 'DELETE') {
    res.statusCode = 204;
    res.end();
    return;
  }

  res.statusCode = 405;
  res.end('Method not allowed');
});

server.listen(PORT, () => {
  console.log(`RandomIPGen MCP (Streamable HTTP) running at http://localhost:${PORT}/mcp`);
});