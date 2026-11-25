import test from 'node:test';
import assert from 'node:assert/strict';
import { isIP } from 'node:net';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { RandomIPv4, RandomIPv6 } = require('random-ip-gen');
import { generateAddresses, isValidVersion, isValidCount } from '../generator.js';

test('isValidVersion accepts ipv4 and ipv6', () => {
  assert.equal(isValidVersion('ipv4'), true);
  assert.equal(isValidVersion('ipv6'), true);
  assert.equal(isValidVersion('ipv5'), false);
  assert.equal(isValidVersion(''), false);
});

test('isValidCount enforces 1-100 integers', () => {
  assert.equal(isValidCount(1), true);
  assert.equal(isValidCount(100), true);
  assert.equal(isValidCount(0), false);
  assert.equal(isValidCount(101), false);
  assert.equal(isValidCount(1.5), false);
  assert.equal(isValidCount('10'), false);
});

test('IPv4 generation produces valid addresses', () => {
  const ips = generateAddresses('ipv4', 10);
  assert.equal(ips.length, 10);
  for (const ip of ips) {
    assert.equal(RandomIPv4.validate(ip), true);
    assert.equal(isIP(ip), 4);
  }
});

test('IPv6 generation produces valid addresses', () => {
  const ips = generateAddresses('ipv6', 10);
  assert.equal(ips.length, 10);
  for (const ip of ips) {
    assert.equal(RandomIPv6.validate(ip), true);
    assert.equal(isIP(ip), 6);
  }
});

test('multiple generation count matches request', () => {
  assert.equal(generateAddresses('ipv4', 1).length, 1);
  assert.equal(generateAddresses('ipv4', 50).length, 50);
  assert.equal(generateAddresses('ipv6', 25).length, 25);
});

test('invalid IP version throws', () => {
  assert.throws(() => generateAddresses('ipv5', 5), /Invalid IP version/);
  assert.throws(() => generateAddresses('', 5), /Invalid IP version/);
});

test('invalid quantities throw', () => {
  assert.throws(() => generateAddresses('ipv4', 0), /Invalid quantity/);
  assert.throws(() => generateAddresses('ipv4', 101), /Invalid quantity/);
  assert.throws(() => generateAddresses('ipv4', 1.5), /Invalid quantity/);
  assert.throws(() => generateAddresses('ipv4', -1), /Invalid quantity/);
});

test('quantity limits enforced', () => {
  assert.throws(() => generateAddresses('ipv4', 0));
  assert.throws(() => generateAddresses('ipv4', 101));
  assert.doesNotThrow(() => generateAddresses('ipv4', 1));
  assert.doesNotThrow(() => generateAddresses('ipv4', 100));
});

test('duplicate prevention within batches', () => {
  const ipv4 = generateAddresses('ipv4', 100);
  assert.equal(new Set(ipv4).size, ipv4.length);
  const ipv6 = generateAddresses('ipv6', 100);
  assert.equal(new Set(ipv6).size, ipv6.length);
});

test('package validate rejects garbage', () => {
  assert.equal(RandomIPv4.validate('not-an-ip'), false);
  assert.equal(RandomIPv6.validate('not-an-ip'), false);
});