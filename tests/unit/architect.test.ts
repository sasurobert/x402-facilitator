import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Architect } from '../../src/services/architect.js';
import { Address } from '@multiversx/sdk-core';

describe('Architect Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should correctly encode data for init_job_with_payment using ABI', async () => {
        const jobId = 'test-job-id';
        const nonce = 12345;
        const serviceId = 'test-service';
        const validationAddr = new Address(Buffer.alloc(32));

        // Access private method for testing encoding
        const data = await (Architect as any).constructDataField(validationAddr, jobId, nonce, serviceId);

        // Expected parts: init_job_with_payment, jobId (hex), nonce (hex, 8 bytes big endian), serviceId (hex)
        expect(data).toContain('init_job_with_payment');
        expect(data).toContain(Buffer.from(jobId).toString('hex'));

        // Nonce 12345 in hex is 3039.
        const expectedNonceHex = '3039';
        expect(data).toContain(expectedNonceHex);
        expect(data).toContain(Buffer.from(serviceId).toString('hex'));
    });
});
