// Unit tests for the shared internal-source trust check (BDT-403). Run via:
//   npx ts-node --transpile-only -P tsconfig.json src/common/utils/network/is-trusted-internal-source.test.ts
// Uses node:test (ships with node >= 18) — no jest install required.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { isTrustedInternalSource } from './is-trusted-internal-source';

describe('isTrustedInternalSource (default trusted CIDR = cluster pod CIDR 10.42.0.0/16)', () => {
    it('trusts an address inside the k3s pod CIDR', () => {
        assert.equal(isTrustedInternalSource('10.42.3.67'), true);
    });

    it('trusts the IPv4-mapped IPv6 form of a pod-CIDR address', () => {
        assert.equal(isTrustedInternalSource('::ffff:10.42.3.67'), true);
    });

    it('does not trust the cluster node-private network (10.100.0.0/24), even though it is within 10.0.0.0/8', () => {
        assert.equal(isTrustedInternalSource('10.100.0.7'), false);
    });

    it('does not trust the WireGuard control-plane mesh (10.255.0.0/24)', () => {
        assert.equal(isTrustedInternalSource('10.255.0.2'), false);
    });

    it('does not trust an out-of-scope 10.0.0.0/8 address outside the pod CIDR', () => {
        assert.equal(isTrustedInternalSource('10.99.0.5'), false);
    });

    it('does not trust an address one bit outside the /16 boundary (10.43.0.0)', () => {
        assert.equal(isTrustedInternalSource('10.43.0.0'), false);
    });

    it('does not trust an address one bit below the /16 boundary (10.41.255.255)', () => {
        assert.equal(isTrustedInternalSource('10.41.255.255'), false);
    });

    it('trusts the very edge of the pod CIDR (10.42.255.255)', () => {
        assert.equal(isTrustedInternalSource('10.42.255.255'), true);
    });

    it('does not trust a public IP', () => {
        assert.equal(isTrustedInternalSource('203.0.113.10'), false);
    });

    it('does not trust an empty source', () => {
        assert.equal(isTrustedInternalSource(''), false);
    });

    it('does not trust garbage input', () => {
        assert.equal(isTrustedInternalSource('not-an-ip'), false);
    });
});

describe('isTrustedInternalSource with an explicit CIDR list (env override use case)', () => {
    it('trusts an address matching a custom narrower CIDR', () => {
        assert.equal(isTrustedInternalSource('10.42.3.1', ['10.42.3.0/24']), true);
    });

    it('rejects an address outside a custom narrower CIDR', () => {
        assert.equal(isTrustedInternalSource('10.42.4.1', ['10.42.3.0/24']), false);
    });

    it('supports multiple CIDRs, matching any one of them', () => {
        const cidrs = ['10.42.0.0/16', '172.16.0.0/12'];
        assert.equal(isTrustedInternalSource('172.16.5.5', cidrs), true);
        assert.equal(isTrustedInternalSource('10.42.1.1', cidrs), true);
        assert.equal(isTrustedInternalSource('192.168.1.1', cidrs), false);
    });
});
