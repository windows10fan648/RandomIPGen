#!/usr/bin/env node
import { createRequire } from 'node:module';
import { generateAddresses, isValidVersion, isValidCount, isValidRange, allowedRanges } from './generator.js';

const require = createRequire(import.meta.url);

function send(obj) {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

const TOOLS = [
  {
    name: 'generate_ips',
    description: 'Generate random IPv4 or IPv6 addresses for testing and demonstration.',
    inputSchema: {
      type: 'object',
      properties: {
        version: { type: 'string', enum: ['ipv4', 'ipv6'], default: 'ipv4' },
        count: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
        range: { type: 'string' },
      },
      required: [],
    },
  },
  {
    name: 'validate_ip',
    description: 'Validate an IPv4 or IPv6 address.',
    inputSchema: {
      type: 'object',
      properties: {
        version: { type: 'string', enum: ['ipv4', 'ipv6'] },
        ip: { type: 'string' },
      },
      required: ['version', 'ip'],
    },
  },
];

function handleRequest(req) {
  const { id, method, params } = req;

  if (method === 'initialize') {
    send({
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'RandomIPGen', version: '1.0.0' },
      },
    });
    return;
  }

  if (method === 'notifications/initialized') {
    return;
  }

  if (method === 'tools/list') {
    send({ jsonrpc: '2.0', id, result: { tools: TOOLS } });
    return;
  }

  if (method === 'tools/call') {
    const name = params?.name;
    const args = params?.arguments || {};

    if (name === 'generate_ips') {
      const version = args.version || 'ipv4';
      const count = args.count === undefined ? 10 : args.count;
      const range = args.range || 'any';

      if (!isValidVersion(version)) {
        send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: 'Invalid version. Use "ipv4" or "ipv6".' }], isError: true } });
        return;
      }
      if (!isValidCount(count)) {
        send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: 'Invalid count. Must be an integer between 1 and 100.' }], isError: true } });
        return;
      }
      if (!isValidRange(version, range)) {
        send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: `Invalid range. Allowed: ${allowedRanges(version).join(', ')}` }], isError: true } });
        return;
      }

      try {
        const addresses = generateAddresses(version, count, range);
        send({
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: JSON.stringify({ success: true, version, range, count: addresses.length, addresses }, null, 2) }],
          },
        });
      } catch (err) {
        send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: err.message }], isError: true } });
      }
      return;
    }

    if (name === 'validate_ip') {
      try {
        const { RandomIPv4, RandomIPv6 } = require('random-ip-gen');
        const cls = args.version === 'ipv4' ? RandomIPv4 : RandomIPv6;
        const ok = cls.validate(args.ip);
        send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify({ valid: ok }) }] } });
      } catch (err) {
        send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: err.message }], isError: true } });
      }
      return;
    }

    send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true } });
    return;
  }

  send({ jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } });
}

let buffer = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buffer += chunk;
  let idx;
  while ((idx = buffer.indexOf('\n')) !== -1) {
    const line = buffer.slice(0, idx).trim();
    buffer = buffer.slice(idx + 1);
    if (!line) continue;
    try {
      handleRequest(JSON.parse(line));
    } catch (err) {
      send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } });
    }
  }
});

process.stdin.on('end', () => process.exit(0));