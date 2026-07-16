// Native Hysteria2 Base64-link regression tests. Run via:
//   npx ts-node --transpile-only -P tsconfig.json src/modules/subscription-template/generators/xray.generator.service.test.ts

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { XrayGeneratorService } from './xray.generator.service';

describe('XrayGeneratorService Hysteria2 links', () => {
    it('uses the Remnawave user UUID as auth and carries the TLS certificate pin', () => {
        const service = new XrayGeneratorService();
        const links = service.generateLinks(
            [
                {
                    protocol: 'hysteria',
                    network: 'hysteria',
                    address: '203.0.113.7',
                    port: 8443,
                    remark: 'Calls fallback',
                    hysteriaAuth: '7ea2904a-8156-4c11-9634-4f687b1f573d',
                    pinnedPeerCertSha256:
                        'aabbccddaabbccddaabbccddaabbccddaabbccddaabbccddaabbccddaabbccdd',
                    tls: 'tls',
                    sni: '203.0.113.7',
                    alpn: 'h3',
                    fingerprint: '',
                    host: '',
                    path: '',
                    publicKey: '',
                    shortId: '',
                    spiderX: '',
                    password: {
                        ssPassword: '',
                        trojanPassword: '',
                        vlessPassword: '7ea2904a-8156-4c11-9634-4f687b1f573d',
                    },
                } as any,
            ],
            false,
        );

        assert.deepEqual(links, [
            'hysteria2://7ea2904a-8156-4c11-9634-4f687b1f573d@203.0.113.7:8443/?sni=203.0.113.7&alpn=h3&pinSHA256=aabbccddaabbccddaabbccddaabbccddaabbccddaabbccddaabbccddaabbccdd#Calls%20fallback',
        ]);
    });
});
