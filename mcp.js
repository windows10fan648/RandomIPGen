import { createRequire } from 'node:module';
import { generateAddresses, isValidVersion, isValidCount, isValidRange, allowedRanges } from './generator.js';

const require = createRequire(import.meta.url);
const { RandomIPv4, RandomIPv6 } = require('random-ip-gen');

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

export function handleMcpRequest(req) {
  const { id, method, params } = req;

  if (method === 'initialize') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'RandomIPGen', version: '1.0.0' },
      },
    };
  }

  if (method === 'notifications/initialized') {
    return null;
  }

  if (method === 'tools/list') {
    return { jsonrpc: '2.0', id, result: { tools: TOOLS } };
  }

  if (method === 'tools/call') {
    const name = params?.name;
    const args = params?.arguments || {};

    if (name === 'generate_ips') {
      const version = args.version || 'ipv4';
      const count = args.count === undefined ? 10 : args.count;
      const range = args.range || 'any';

      if (!isValidVersion(version)) {
        return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: 'Invalid version. Use "ipv4" or "ipv6".' }], isError: true } };
      }
      if (!isValidCount(count)) {
        return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: 'Invalid count. Must be an integer between 1 and 100.' }], isError: true } };
      }
      if (!isValidRange(version, range)) {
        return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: `Invalid range. Allowed: ${allowedRanges(version).join(', ')}` }], isError: true } };
      }

      try {
        const addresses = generateAddresses(version, count, range);
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: JSON.stringify({ success: true, version, range, count: addresses.length, addresses }, null, 2) }],
          },
        };
      } catch (err) {
        return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: err.message }], isError: true } };
      }
    }

    if (name === 'validate_ip') {
      try {
        const cls = args.version === 'ipv4' ? RandomIPv4 : RandomIPv6;
        const ok = cls.validate(args.ip);
        return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify({ valid: ok }) }] } };
      } catch (err) {
        return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: err.message }], isError: true } };
      }
    }

    return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true } };
  }

  return { jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } };
}