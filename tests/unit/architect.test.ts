import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Architect } from '../../src/services/architect.js';
import { Address } from '@multiversx/sdk-core';

describe('Architect Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should correctly encode data for init_job using ABI', async () => {
        const jobId = 'test-job-id';
        const nonce = 12345;
        const serviceId = '1';
        const validationAddr = new Address(Buffer.alloc(32));

        // Access private method for testing encoding
        const data = await (Architect as any).constructDataField(validationAddr, jobId, nonce, serviceId);

        // Expected parts: init_job, jobId (hex), nonce (hex), serviceId (hex)
        expect(data).toContain('init_job');
        expect(data).toContain(Buffer.from(jobId).toString('hex'));

        // Nonce 12345 in hex is 3039.
        const expectedNonceHex = '3039';
        expect(data).toContain(expectedNonceHex);

        // Service ID "1" -> 01
        expect(data).toContain('01');
    });

    describe('resolveAgentDetails — null safety', () => {
        it('should return defaults when service config is undefined (empty storage)', async () => {
            // Mock the identity controller's query method
            const mockQuery = vi.fn();

            // First call (get_agent_owner) -> returns an Address
            const ownerAddr = Address.newFromHex('0139472eff6886771a982f3083da5d421f24c29181e63888228dc81ca60d69e1');
            // Second call (get_agent_service_config) -> returns [undefined] (OptionalValue::None)
            mockQuery
                .mockResolvedValueOnce([ownerAddr])   // get_agent_owner
                .mockResolvedValueOnce([undefined]);   // get_agent_service_config -> empty

            // Inject mock controller by calling initializeAbis first, then overriding
            (Architect as any).initializeAbis();
            (Architect as any).identityController = { query: mockQuery };

            const result = await (Architect as any).resolveAgentDetails(
                1,
                '1',
                Address.newFromHex('0139472eff6886771a982f3083da5d421f24c29181e63888228dc81ca60d69e1'),
            );

            expect(result.price).toBe('0');
            expect(result.token).toBe('EGLD');
            expect(result.pnonce).toBe(0);
            expect(result.owner).toBeDefined();
        });

        it('should return service config values when present', async () => {
            const mockQuery = vi.fn();

            const ownerAddr = Address.newFromHex('0139472eff6886771a982f3083da5d421f24c29181e63888228dc81ca60d69e1');
            const serviceConfig = {
                price: BigInt('1000000000000000000'),
                token: { identifier: 'USDC-c76f1f', nonce: 0 },
                pnonce: 0,
            };

            mockQuery
                .mockResolvedValueOnce([ownerAddr])
                .mockResolvedValueOnce([serviceConfig]);

            (Architect as any).initializeAbis();
            (Architect as any).identityController = { query: mockQuery };

            const result = await (Architect as any).resolveAgentDetails(
                1,
                '1',
                Address.newFromHex('0139472eff6886771a982f3083da5d421f24c29181e63888228dc81ca60d69e1'),
            );

            expect(result.price).toBe('1000000000000000000');
            expect(result.token).toBe('USDC-c76f1f');
            expect(result.pnonce).toBe(0);
        });
    });
});
