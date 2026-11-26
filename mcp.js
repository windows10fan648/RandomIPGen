import { createRequire } from 'node:module';
import { generateAddresses, isValidVersion, isValidCount, isValidRange, allowedRanges, validateIP, classifyIP, generateInCidr } from './generator.js';

const require = createRequire(import.meta.url);
const { RandomIPv4, RandomIPv6 } = require('random-ip-gen');

const TOOLS = [
  {
    name: 'generate_ips',
    title: 'Generate IP Addresses',
    description: 'Generate random IPv4 or IPv6 addresses for testing and demonstration.',
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
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
    title: 'Validate IP Address',
    description: 'Validate an IPv4 or IPv6 address.',
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: 'object',
      properties: {
        version: { type: 'string', enum: ['ipv4', 'ipv6'] },
        ip: { type: 'string' },
      },
      required: ['version', 'ip'],
    },
  },
  {
    name: 'list_ranges',
    title: 'List IP Ranges',
    description: 'List supported IP ranges for IPv4 and/or IPv6.',
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        version: { type: 'string', enum: ['ipv4', 'ipv6'] },
      },
    },
  },
  {
    name: 'ip_info',
    title: 'IP Classification',
    description: 'Classify an IP address (private, loopback, multicast, etc.).',
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        version: { type: 'string', enum: ['ipv4', 'ipv6'] },
        ip: { type: 'string' },
      },
      required: ['version', 'ip'],
    },
  },
  {
    name: 'generate_with_ports',
    title: 'Generate IPs With Ports',
    description: 'Generate random IP addresses and append random ports.',
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: false },
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
    name: 'generate_in_cidr',
    title: 'Generate IPs In CIDR',
    description: 'Generate random IP addresses within a CIDR block.',
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        version: { type: 'string', enum: ['ipv4', 'ipv6'] },
        cidr: { type: 'string' },
        count: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
      },
      required: ['version', 'cidr'],
    },
  },
  {
    name: 'bulk_validate',
    title: 'Bulk Validate IPs',
    description: 'Validate multiple IP addresses at once.',
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        version: { type: 'string', enum: ['ipv4', 'ipv6'] },
        ips: { type: 'array', items: { type: 'string' } },
      },
      required: ['version', 'ips'],
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
        const ok = validateIP(args.version, args.ip);
        return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify({ valid: ok }) }] } };
      } catch (err) {
        return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: err.message }], isError: true } };
      }
    }

    if (name === 'list_ranges') {
      const version = args.version;
      const result = version ? { [version]: allowedRanges(version) } : { ipv4: allowedRanges('ipv4'), ipv6: allowedRanges('ipv6') };
      return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify(result) }] } };
    }

    if (name === 'ip_info') {
      const info = classifyIP(args.version, args.ip);
      return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify({ ip: args.ip, info }) }] } };
    }

    if (name === 'generate_with_ports') {
      const version = args.version || 'ipv4';
      const count = args.count === undefined ? 10 : args.count;
      const range = args.range || 'any';
      if (!isValidVersion(version) || !isValidCount(count) || !isValidRange(version, range)) {
        return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: 'Invalid parameters.' }], isError: true } };
      }
      try {
        const addresses = generateAddresses(version, count, range);
        const ports = addresses.map(() => Math.floor(Math.random() * 65535) + 1);
        const formatted = addresses.map((ip, i) =>
          version === 'ipv6' ? `[${ip}]:${ports[i]}` : `${ip}:${ports[i]}`
        );
        return {
          jsonrpc: '2.0',
          id,
          result: { content: [{ type: 'text', text: JSON.stringify({ success: true, version, range, count: addresses.length, addresses, ports, formatted }) }] },
        };
      } catch (err) {
        return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: err.message }], isError: true } };
      }
    }

    if (name === 'generate_in_cidr') {
      const version = args.version;
      const cidr = args.cidr;
      const count = args.count === undefined ? 10 : args.count;
      if (!isValidVersion(version) || !isValidCount(count)) {
        return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: 'Invalid parameters.' }], isError: true } };
      }
      try {
        const addresses = generateInCidr(version, cidr, count);
        return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify({ success: true, version, cidr, count: addresses.length, addresses }) }] } };
      } catch (err) {
        return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: err.message }], isError: true } };
      }
    }

    if (name === 'bulk_validate') {
      const version = args.version;
      const ips = Array.isArray(args.ips) ? args.ips : [];
      const results = ips.map((ip) => ({ ip, valid: validateIP(version, ip) }));
      return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify({ version, results }) }] } };
    }

    return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true } };
  }

  return { jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } };
}