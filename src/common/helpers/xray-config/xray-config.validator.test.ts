// Native Hysteria2 user-injection regression tests. Run via:
//   npx ts-node -r tsconfig-paths/register --transpile-only -P tsconfig.json src/common/helpers/xray-config/xray-config.validator.test.ts

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { XRayConfig } from './xray-config.validator';

describe('XRayConfig native Hysteria2 user injection', () => {
    it('injects active Remnawave users with UUID auth', () => {
        const config = XRayConfig.getXrayConfigInstance({
            inbounds: [
                {
                    tag: 'hysteria2-calls',
                    port: 8443,
                    protocol: 'hysteria',
                    settings: { version: 2, clients: [] },
                    streamSettings: {
                        network: 'hysteria',
                        security: 'tls',
                        hysteriaSettings: { version: 2 },
                    },
                },
            ],
            outbounds: [],
        } as any);

        const result = config.includeUserBatch(
            [
                {
                    tId: 42n,
                    vlessUuid: '7ea2904a-8156-4c11-9634-4f687b1f573d',
                    trojanPassword: '',
                    ssPassword: '',
                    tags: ['hysteria2-calls'],
                } as any,
            ],
            new Map(),
        );

        assert.deepEqual((result.inbounds[0].settings as any).clients, [
            {
                auth: '7ea2904a-8156-4c11-9634-4f687b1f573d',
                email: '42',
                id: '7ea2904a-8156-4c11-9634-4f687b1f573d',
            },
        ]);
    });
});
