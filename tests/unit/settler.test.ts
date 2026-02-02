import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Settler } from '../../src/services/settler';
import { X402Payload } from '../../src/domain/types';
import { ISettlementStorage } from '../../src/domain/storage';
import { UserSigner, UserSecretKey, Address } from '@multiversx/sdk-core';

describe('Settler Service', () => {
    let mockStorage: ISettlementStorage;
    let mockProvider: any;
    let settler: Settler;

    const aliceHex = '01'.repeat(32);
    const aliceSecret = new UserSecretKey(Buffer.from(aliceHex, 'hex'));
    const aliceAddress = aliceSecret.generatePublicKey().toAddress();
    const aliceBech32 = aliceAddress.toBech32();

    const bobAddress = new Address(Buffer.alloc(32, 2));
    const bobBech32 = bobAddress.toBech32();

    const payload: X402Payload = {
        nonce: 1,
        value: '1000000',
        receiver: bobBech32,
        sender: aliceBech32,
        gasPrice: 1000000,
        gasLimit: 50000,
        chainID: 'D',
        version: 1,
        options: 0,
        signature: 'deadbeef'
    };

    beforeEach(() => {
        mockStorage = {
            get: vi.fn(),
            save: vi.fn(),
            updateStatus: vi.fn(),
            deleteExpired: vi.fn(),
        } as any;

        mockProvider = {
            sendTransaction: vi.fn().mockResolvedValue('tx-hash'),
        };

        settler = new Settler(mockStorage, mockProvider);
    });

    it('should settle a new direct payment', async () => {
        vi.mocked(mockStorage.get).mockResolvedValue(null);

        const result = await settler.settle(payload);

        expect(result.success).toBe(true);
        expect(result.txHash).toBe('tx-hash');
        expect(mockStorage.save).toHaveBeenCalled();
        expect(mockStorage.updateStatus).toHaveBeenCalledWith(expect.any(String), 'completed', 'tx-hash');
    });

    it('should return existing txHash for already completed payment', async () => {
        vi.mocked(mockStorage.get).mockResolvedValue({
            id: 'id',
            status: 'completed',
            txHash: 'existing-hash',
            signature: 'sig',
            payer: 'erd',
            createdAt: 100
        });

        const result = await settler.settle(payload);
        expect(result.txHash).toBe('existing-hash');
        expect(mockProvider.sendTransaction).not.toHaveBeenCalled();
    });

    it('should fail if already pending', async () => {
        vi.mocked(mockStorage.get).mockResolvedValue({
            id: 'id',
            status: 'pending',
            signature: 'sig',
            payer: 'erd',
            createdAt: 100
        });

        await expect(settler.settle(payload)).rejects.toThrow('Settlement already in progress');
    });

    it('should handle Relayed V3', async () => {
        const relayerSecret = new UserSecretKey(Buffer.alloc(32, 3));
        const relayerSigner = new UserSigner(relayerSecret);
        settler = new Settler(mockStorage, mockProvider, relayerSigner);

        vi.mocked(mockStorage.get).mockResolvedValue(null);

        const result = await settler.settle(payload);
        expect(result.success).toBe(true);
        expect(mockProvider.sendTransaction).toHaveBeenCalled();

        const sentTx = vi.mocked(mockProvider.sendTransaction).mock.calls[0][0];
        expect(sentTx.relayer).toBeDefined();
        expect(sentTx.relayerSignature).toBeDefined();
    });
});
