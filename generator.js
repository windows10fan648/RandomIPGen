import { createRequire } from 'node:module';
import { isIP } from 'node:net';

const require = createRequire(import.meta.url);
const { RandomIPv4, RandomIPv6 } = require('random-ip-gen');

const IPV4_RANGES = ['any', 'private', 'public', 'loopback', 'link-local', 'multicast'];
const IPV6_RANGES = ['any', 'global', 'unique-local', 'link-local', 'multicast'];

export function allowedRanges(version) {
  return version === 'ipv4' ? IPV4_RANGES : IPV6_RANGES;
}

export function isValidVersion(version) {
  return version === 'ipv4' || version === 'ipv6';
}

export function isValidRange(version, range) {
  return typeof range === 'string' && allowedRanges(version).includes(range);
}

export function isValidCount(count) {
  return Number.isInteger(count) && count >= 1 && count <= 100;
}

export function validateIP(version, ip) {
  if (typeof ip !== 'string') return false;
  // Allow optional CIDR prefix (e.g. fe80::.../64)
  const candidate = ip.split('/')[0].trim();
  const family = isIP(candidate);
  if (version === 'ipv4') return family === 4;
  if (version === 'ipv6') return family === 6;
  return false;
}

export function classifyIP(version, ip) {
  const candidate = String(ip || '').split('/')[0].trim();
  if (!validateIP(version, candidate)) return null;

  if (version === 'ipv4') {
    const n = ipv4ToInt(candidate);
    const isPrivate =
      ((n & 0xff000000) >>> 0) === 0x0a000000 ||
      ((n & 0xfff00000) >>> 0) === 0xac100000 ||
      ((n & 0xffff0000) >>> 0) === 0xc0a80000;
    const isLoopback = ((n & 0xff000000) >>> 0) === 0x7f000000;
    const isLinkLocal = ((n & 0xffff0000) >>> 0) === 0xa9fe0000;
    const isMulticast = ((n & 0xf0000000) >>> 0) === 0xe0000000;
    return {
      private: isPrivate,
      loopback: isLoopback,
      linkLocal: isLinkLocal,
      multicast: isMulticast,
      public: !isPrivate && !isLoopback && !isLinkLocal && !isMulticast,
    };
  }

  const value = ipv6ToBigInt(candidate);
  const isLoopback = candidate === '::1';
  const isLinkLocal = (value >> 118n) === 0x3fan;
  const isUniqueLocal = (value >> 121n) === 0x7en;
  const isMulticast = (value >> 120n) === 0xffn;
  const isGlobal = (value >> 125n) === 1n;
  return {
    loopback: isLoopback,
    linkLocal: isLinkLocal,
    uniqueLocal: isUniqueLocal,
    multicast: isMulticast,
    global: isGlobal,
  };
}

function bigIntToIpv6(value) {
  const parts = [];
  let v = value;
  for (let i = 0; i < 8; i++) {
    parts.unshift((v & 0xffffn).toString(16).padStart(4, '0'));
    v >>= 16n;
  }
  return parts.join(':');
}

export function generateInCidr(version, cidr, count) {
  if (!isValidVersion(version)) throw new Error('Invalid IP version.');
  if (!isValidCount(count)) throw new Error('Invalid quantity. Must be an integer between 1 and 100.');

  const [ip, prefixStr] = String(cidr || '').split('/');
  if (!validateIP(version, ip)) throw new Error('Invalid CIDR base IP.');
  const prefix = Number(prefixStr);
  const maxPrefix = version === 'ipv4' ? 32 : 128;
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > maxPrefix) {
    throw new Error(`Invalid prefix. Must be 0-${maxPrefix}.`);
  }

  const accepted = new Set();
  const maxAttempts = count * 50 + 1000;
  let attempts = 0;

  if (version === 'ipv4') {
    const base = ipv4ToInt(ip);
    const hostBits = 32 - prefix;
    const mask = hostBits === 32 ? 0 : (0xffffffff << hostBits) >>> 0;
    const network = (base & mask) >>> 0;
    const space = hostBits >= 31 ? (hostBits === 31 ? 2 : 1) : Math.pow(2, hostBits);
    while (accepted.size < count && attempts < maxAttempts) {
      attempts += 1;
      const offset = hostBits === 0 ? 0 : Math.floor(Math.random() * space);
      const val = (network + offset) >>> 0;
      const octets = [ (val >>> 24) & 255, (val >>> 16) & 255, (val >>> 8) & 255, val & 255 ];
      const candidate = octets.join('.');
      if (validateIP('ipv4', candidate)) accepted.add(candidate);
    }
  } else {
    const base = ipv6ToBigInt(ip);
    const hostBits = 128 - prefix;
    const allOnes = (1n << 128n) - 1n;
    const mask = hostBits === 0 ? allOnes : allOnes ^ ((1n << BigInt(hostBits)) - 1n);
    const network = base & mask;
    const space = hostBits > 62 ? null : 1n << BigInt(hostBits);
    while (accepted.size < count && attempts < maxAttempts) {
      attempts += 1;
      let offset;
      if (space === null) {
        // generate random host bits
        offset = 0n;
        for (let i = 0; i < hostBits; i++) {
          if (Math.random() < 0.5) offset |= 1n << BigInt(i);
        }
      } else {
        offset = BigInt(Math.floor(Math.random() * Number(space)));
      }
      const val = network | offset;
      const candidate = bigIntToIpv6(val);
      if (validateIP('ipv6', candidate)) accepted.add(candidate);
    }
  }

  const addresses = [...accepted].slice(0, count);
  if (addresses.length < count) {
    throw new Error('Unable to generate enough addresses in the selected CIDR.');
  }
  return addresses;
}

function ipv4ToInt(ip) {
  const parts = ip.split('.').map(Number);
  return (((parts[0] * 256 + parts[1]) * 256 + parts[2]) * 256 + parts[3]) >>> 0;
}

function expandIPv6(ip) {
  if (ip.includes('::')) {
    const [left, right] = ip.split('::');
    const leftParts = left ? left.split(':') : [];
    const rightParts = right ? right.split(':') : [];
    const missing = 8 - leftParts.length - rightParts.length;
    const middle = Array(Math.max(0, missing)).fill('0');
    return [...leftParts, ...middle, ...rightParts].map((p) => p.padStart(4, '0'));
  }
  return ip.split(':').map((p) => p.padStart(4, '0'));
}

function ipv6ToBigInt(ip) {
  const parts = expandIPv6(ip);
  let value = 0n;
  for (const part of parts) {
    value = (value << 16n) + BigInt(parseInt(part, 16));
  }
  return value;
}

function inV4Range(ip, range) {
  const n = ipv4ToInt(ip);
  const isPrivate =
    ((n & 0xff000000) >>> 0) === 0x0a000000 ||
    ((n & 0xfff00000) >>> 0) === 0xac100000 ||
    ((n & 0xffff0000) >>> 0) === 0xc0a80000;
  const isLoopback = ((n & 0xff000000) >>> 0) === 0x7f000000;
  const isLinkLocal = ((n & 0xffff0000) >>> 0) === 0xa9fe0000;
  const isMulticast = ((n & 0xf0000000) >>> 0) === 0xe0000000;

  switch (range) {
    case 'any':
      return true;
    case 'private':
      return isPrivate;
    case 'public':
      return !isPrivate && !isLoopback && !isLinkLocal && !isMulticast;
    case 'loopback':
      return isLoopback;
    case 'link-local':
      return isLinkLocal;
    case 'multicast':
      return isMulticast;
    default:
      return false;
  }
}

function inV6Range(ip, range) {
  if (range === 'any') return true;
  if (ip === '::1') {
    return range === 'loopback' || range === 'any';
  }
  const value = ipv6ToBigInt(ip);
  const isLinkLocal = (value >> 118n) === 0x3fan;
  const isUniqueLocal = (value >> 121n) === 0x7en;
  const isMulticast = (value >> 120n) === 0xffn;
  const isGlobal = (value >> 125n) === 1n;

  switch (range) {
    case 'global':
      return isGlobal;
    case 'unique-local':
      return isUniqueLocal;
    case 'link-local':
      return isLinkLocal;
    case 'multicast':
      return isMulticast;
    default:
      return false;
  }
}

function randInt(max) {
  return Math.floor(Math.random() * max);
}

function randHexDigits(n) {
  let s = '';
  for (let i = 0; i < n; i++) s += randInt(16).toString(16);
  return s;
}

function randomV4InRange(range) {
  switch (range) {
    case 'loopback':
      return `127.${randInt(256)}.${randInt(256)}.${randInt(256)}`;
    case 'link-local':
      return `169.254.${randInt(256)}.${randInt(256)}`;
    case 'multicast':
      return `${224 + randInt(16)}.${randInt(256)}.${randInt(256)}.${randInt(256)}`;
    case 'private': {
      const t = Math.random();
      if (t < 0.5) return `10.${randInt(256)}.${randInt(256)}.${randInt(256)}`;
      if (t < 0.75) return `172.${16 + randInt(16)}.${randInt(256)}.${randInt(256)}`;
      return `192.168.${randInt(256)}.${randInt(256)}`;
    }
    default:
      return null;
  }
}

function randomV6Hextet() {
  return randInt(65536).toString(16).padStart(4, '0');
}

function randomV6InRange(range) {
  if (range === 'link-local') {
    // Typical link-local form: fe80::/64 + 64-bit interface id
    return 'fe80::' + Array.from({ length: 4 }, () => randomV6Hextet()).join(':');
  }
  let first;
  switch (range) {
    case 'global':
      first = (0x2000 + randInt(0x2000)).toString(16).padStart(4, '0');
      break;
    case 'unique-local':
      first = (0xfc00 + randInt(0x0200)).toString(16).padStart(4, '0');
      break;
    case 'multicast':
      first = (0xff00 + randInt(0x0100)).toString(16).padStart(4, '0');
      break;
    default:
      return null;
  }
  const rest = Array.from({ length: 7 }, () => randomV6Hextet());
  return [first, ...rest].join(':');
}

export function generateAddresses(version, count, range = 'any') {
  if (!isValidVersion(version)) {
    throw new Error('Invalid IP version. Use "ipv4" or "ipv6".');
  }
  if (!isValidCount(count)) {
    throw new Error('Invalid quantity. Must be an integer between 1 and 100.');
  }
  if (!isValidRange(version, range)) {
    throw new Error('Invalid IP range for the selected version.');
  }

  const GeneratorClass = version === 'ipv4' ? RandomIPv4 : RandomIPv6;
  const expectedFamily = version === 'ipv4' ? 4 : 6;

  const directRange = version === 'ipv4'
    ? ['loopback', 'link-local', 'multicast', 'private'].includes(range)
    : ['global', 'unique-local', 'link-local', 'multicast'].includes(range) && range !== 'any';

  // 'any' and 'public' use the package (with filtering for 'public')
  const usePackage = range === 'any' || range === 'public';

  const accepted = new Set();
  const instance = usePackage ? new GeneratorClass() : null;
  const inRangeFn = version === 'ipv4' ? inV4Range : inV6Range;

  const maxAttempts = usePackage ? count * 100 + 1000 : count * 10 + 100;
  let attempts = 0;

  while (accepted.size < count && attempts < maxAttempts) {
    attempts += 1;
    let candidate;
    if (usePackage) {
      candidate = instance.generate();
      if (range === 'public' && !inRangeFn(candidate, 'public')) continue;
    } else if (version === 'ipv4') {
      candidate = randomV4InRange(range);
    } else {
      candidate = randomV6InRange(range);
    }

    if (
      candidate &&
      validateIP(version, candidate) &&
      (range === 'any' || range === 'public' || inRangeFn(candidate, range))
    ) {
      accepted.add(candidate);
    }
  }

  const addresses = [...accepted].slice(0, count);
  if (addresses.length < count) {
    throw new Error('Unable to generate enough addresses in the selected range.');
  }

  if (new Set(addresses).size !== addresses.length) {
    throw new Error('Duplicate addresses detected in batch.');
  }

  return addresses;
}