import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
    DEFAULT_CONNECTION_LIMIT,
    DEFAULT_POOL_TIMEOUT_SECONDS,
    buildDatabaseUrl,
    parsePositiveInt,
} from './build-database-url';

describe('buildDatabaseUrl', () => {
    it('appends connection_limit and pool_timeout to a normal URL', () => {
        const result = buildDatabaseUrl(
            'postgresql://user:pass@host:5432/db?sslmode=disable',
            10,
            20,
        );

        const url = new URL(result);
        assert.equal(url.searchParams.get('connection_limit'), '10');
        assert.equal(url.searchParams.get('pool_timeout'), '20');
        assert.equal(url.searchParams.get('sslmode'), 'disable');
    });

    it('preserves an existing connection_limit instead of overwriting it', () => {
        const result = buildDatabaseUrl(
            'postgresql://user:pass@host:5432/db?connection_limit=5',
            10,
            20,
        );

        const url = new URL(result);
        assert.equal(url.searchParams.get('connection_limit'), '5');
    });

    it('falls back to the untouched raw URL when new URL() throws', () => {
        const rawUrl = 'postgresql://user:pa/ss@host:5432/db';

        assert.throws(() => new URL(rawUrl));
        assert.equal(buildDatabaseUrl(rawUrl, 10, 20), rawUrl);
    });

    it('falls back to the untouched raw URL for a password containing "?"', () => {
        const rawUrl = 'postgresql://user:pa?ss@host:5432/db';

        assert.throws(() => new URL(rawUrl));
        assert.equal(buildDatabaseUrl(rawUrl, 10, 20), rawUrl);
    });

    it('falls back to the untouched raw URL for a password containing "#"', () => {
        const rawUrl = 'postgresql://user:pa#ss@host:5432/db';

        assert.throws(() => new URL(rawUrl));
        assert.equal(buildDatabaseUrl(rawUrl, 10, 20), rawUrl);
    });
});

describe('parsePositiveInt', () => {
    it('returns the default when the env var is unset', () => {
        assert.equal(parsePositiveInt(undefined, DEFAULT_CONNECTION_LIMIT), DEFAULT_CONNECTION_LIMIT);
    });

    it('parses a valid positive integer string', () => {
        assert.equal(parsePositiveInt('7', DEFAULT_CONNECTION_LIMIT), 7);
    });

    it('falls back to the default for a non-numeric value', () => {
        assert.equal(parsePositiveInt('abc', DEFAULT_CONNECTION_LIMIT), DEFAULT_CONNECTION_LIMIT);
    });

    it('falls back to the default for zero', () => {
        assert.equal(parsePositiveInt('0', DEFAULT_POOL_TIMEOUT_SECONDS), DEFAULT_POOL_TIMEOUT_SECONDS);
    });

    it('falls back to the default for a negative number', () => {
        assert.equal(parsePositiveInt('-5', DEFAULT_POOL_TIMEOUT_SECONDS), DEFAULT_POOL_TIMEOUT_SECONDS);
    });
});
