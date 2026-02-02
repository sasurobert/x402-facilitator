import { describe, it, expect } from 'vitest';
import { VerifyRequestSchema } from '../../src/domain/schemas';

describe('Validation Schemas', () => {
    const validRequest = {
        scheme: 'exact',
        payload: {
            nonce: 1,
            value: '1000000',
            receiver: 'erd1qy9pzpzpzpzpzpzpzpzpzpzpzpzpzpzpzpzpzpzpzpzpzpzpzpzpzpzpzp',
            sender: 'erd1qy9pzpzpzpzpzpzpzpzpzpzpzpzpzpzpzpzpzpzpzpzpzpzpzpzpzpzpzp',
            gasPrice: 1000000,
            gasLimit: 50000,
            chainID: 'D',
            version: 1,
            options: 0,
            signature: 'a'.repeat(128),
        },
        requirements: {
            payTo: 'erd1qy9pzpzpzpzpzpzpzpzpzpzpzpzpzpzpzpzpzpzpzpzpzpzpzpzpzpzpzp',
            amount: '1000000',
            asset: 'EGLD',
            network: 'multiversx:D',
        },
    };

    it('should validate a valid request', () => {
        const result = VerifyRequestSchema.safeParse(validRequest);
        expect(result.success).toBe(true);
    });

    it('should fail if scheme is not exact', () => {
        const invalid = { ...validRequest, scheme: 'other' };
        const result = VerifyRequestSchema.safeParse(invalid);
        expect(result.success).toBe(false);
    });

    it('should fail if signature is invalid length', () => {
        const invalid = { ...validRequest };
        invalid.payload.signature = 'abc';
        const result = VerifyRequestSchema.safeParse(invalid);
        expect(result.success).toBe(false);
    });

    it('should fail if addresses do not start with erd1', () => {
        const invalid = { ...validRequest };
        invalid.payload.sender = '0x123';
        const result = VerifyRequestSchema.safeParse(invalid);
        expect(result.success).toBe(false);
    });

    it('should fail if amount is not a numeric string', () => {
        const invalid = { ...validRequest };
        invalid.requirements.amount = '100.5';
        const result = VerifyRequestSchema.safeParse(invalid);
        expect(result.success).toBe(false);
    });
});
