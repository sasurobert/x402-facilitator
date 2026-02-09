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
});
