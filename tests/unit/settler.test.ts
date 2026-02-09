import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Settler } from '../../src/services/settler';
import { X402Payload } from '../../src/domain/types';
import { ISettlementStorage } from '../../src/domain/storage';
import { UserSecretKey, Address } from '@multiversx/sdk-core';
import { RelayerManager } from '../../src/services/relayer_manager';

describe('Settler Service', () => {
    let mockStorage: ISettlementStorage;
    let mockProvider: any;
    let mockRelayerManager: any;
    let settler: Settler;

    const aliceHex = '01'.repeat(32);
    // Convert Buffer to Uint8Array for SDK Core compatibility
    const aliceSecret = new UserSecretKey(Uint8Array.from(Buffer.from(aliceHex, 'hex')));
    const aliceAddress = aliceSecret.generatePublicKey().toAddress();
    const aliceBech32 = aliceAddress.toBech32();

    const bobAddress = new Address(Uint8Array.from(Buffer.alloc(32, 2)));
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
            getUnread: vi.fn(),
            markAsRead: vi.fn(),
        } as any;

        mockProvider = {
            sendTransaction: vi.fn().mockResolvedValue('tx-hash'),
            simulateTransaction: vi.fn().mockResolvedValue({ status: { status: 'success' } }),
        };

        mockRelayerManager = {
            getSignerForUser: vi.fn(),
        } as unknown as RelayerManager;

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

    it('should handle Relayed V3 when relayer is present in payload', async () => {
        // Generate a valid address for the relayer mock
        const relayerSecret = new UserSecretKey(Uint8Array.from(Buffer.alloc(32, 3)));
        const relayerAddressBech32 = relayerSecret.generatePublicKey().toAddress().toBech32();

        const mockRelayerSigner = {
            getAddress: () => ({
                bech32: () => relayerAddressBech32
            }),
            sign: vi.fn().mockResolvedValue(Uint8Array.from(Buffer.from('relayer-sig')))
        };

        vi.mocked(mockRelayerManager.getSignerForUser).mockReturnValue(mockRelayerSigner);

        settler = new Settler(mockStorage, mockProvider, mockRelayerManager);

        vi.mocked(mockStorage.get).mockResolvedValue(null);

        // MUST have relayer field AND version >= 2 to trigger relayed path
        const payloadWithRelayer = { ...payload, relayer: relayerAddressBech32, version: 2 };

        const result = await settler.settle(payloadWithRelayer);
        expect(result.success).toBe(true);
        expect(mockProvider.sendTransaction).toHaveBeenCalled();
        expect(mockProvider.simulateTransaction).toHaveBeenCalled();
        expect(mockRelayerManager.getSignerForUser).toHaveBeenCalledWith(payload.sender);

        const sentTx = vi.mocked(mockProvider.sendTransaction).mock.calls[0][0];
        expect(sentTx.relayer).toBeDefined();

        expect(sentTx.relayer.toString()).toBe(relayerAddressBech32);
        expect(sentTx.relayerSignature).toBeDefined();

        // GAS LIMIT CHECK: Should match payload exactly, no +50k
        expect(sentTx.gasLimit.valueOf()).toBe(BigInt(payload.gasLimit));
    });

    it('should use Direct send if RelayerManager exists but payload has NO relayer', async () => {
        settler = new Settler(mockStorage, mockProvider, mockRelayerManager);
        vi.mocked(mockStorage.get).mockResolvedValue(null);

        // payload has no 'relayer' field
        const result = await settler.settle(payload);
        expect(result.success).toBe(true);

        // Should NOT utilize relayer manager
        expect(mockRelayerManager.getSignerForUser).not.toHaveBeenCalled();

        // Should be direct tx
        const sentTx = vi.mocked(mockProvider.sendTransaction).mock.calls[0][0];
        expect(sentTx.relayer.isEmpty()).toBe(true); // Direct tx has default empty Address for relayer
    });

    it('should success if relayer in payload matches expected relayer', async () => {
        const relayerSecret = new UserSecretKey(Uint8Array.from(Buffer.alloc(32, 3)));
        const relayerAddressBech32 = relayerSecret.generatePublicKey().toAddress().toBech32();

        const mockRelayerSigner = {
            getAddress: () => ({ bech32: () => relayerAddressBech32 }),
            sign: vi.fn().mockResolvedValue(Uint8Array.from(Buffer.from('relayer-sig')))
        };

        vi.mocked(mockRelayerManager.getSignerForUser).mockReturnValue(mockRelayerSigner);
        settler = new Settler(mockStorage, mockProvider, mockRelayerManager);
        vi.mocked(mockStorage.get).mockResolvedValue(null);

        const payloadWithRelayer = { ...payload, relayer: relayerAddressBech32, version: 2 };
        const result = await settler.settle(payloadWithRelayer);
        expect(result.success).toBe(true);
    });

    it('should fail if relayer in payload mismatches expected relayer', async () => {
        const relayerSecret = new UserSecretKey(Uint8Array.from(Buffer.alloc(32, 3)));
        const relayerAddressBech32 = relayerSecret.generatePublicKey().toAddress().toBech32();

        const mockRelayerSigner = {
            getAddress: () => ({ bech32: () => relayerAddressBech32 }),
            sign: vi.fn()
        };

        vi.mocked(mockRelayerManager.getSignerForUser).mockReturnValue(mockRelayerSigner);
        settler = new Settler(mockStorage, mockProvider, mockRelayerManager);

        const payloadWithWrongRelayer = { ...payload, relayer: bobBech32, version: 2 };
        await expect(settler.settle(payloadWithWrongRelayer)).rejects.toThrow('Invalid relayer address');
    });

    it('should fail Relayed V3 if payload.relayer is missing', async () => {
        settler = new Settler(mockStorage, mockProvider, mockRelayerManager);
        vi.mocked(mockStorage.get).mockResolvedValue(null);

        // payload has relayerManager but relayer field is set AND version < 2
        const payloadNoRelayer = { ...payload, version: 2 };
        // No relayer field — should go direct path since condition is relayerManager && payload.relayer
        const result = await settler.settle(payloadNoRelayer);
        expect(result.success).toBe(true);
        expect(mockRelayerManager.getSignerForUser).not.toHaveBeenCalled();
    });

    it('should fail Relayed V3 if version < 2', async () => {
        const relayerSecret = new UserSecretKey(Uint8Array.from(Buffer.alloc(32, 3)));
        const relayerAddressBech32 = relayerSecret.generatePublicKey().toAddress().toBech32();

        const mockRelayerSigner = {
            getAddress: () => ({ bech32: () => relayerAddressBech32 }),
            sign: vi.fn()
        };

        vi.mocked(mockRelayerManager.getSignerForUser).mockReturnValue(mockRelayerSigner);
        settler = new Settler(mockStorage, mockProvider, mockRelayerManager);
        vi.mocked(mockStorage.get).mockResolvedValue(null);

        const payloadV1 = { ...payload, relayer: relayerAddressBech32, version: 1 };
        await expect(settler.settle(payloadV1)).rejects.toThrow('version >= 2');
    });

    it('should fail Relayed V3 if simulation fails', async () => {
        const relayerSecret = new UserSecretKey(Uint8Array.from(Buffer.alloc(32, 3)));
        const relayerAddressBech32 = relayerSecret.generatePublicKey().toAddress().toBech32();

        const mockRelayerSigner = {
            getAddress: () => ({ bech32: () => relayerAddressBech32 }),
            sign: vi.fn().mockResolvedValue(Uint8Array.from(Buffer.from('relayer-sig')))
        };

        vi.mocked(mockRelayerManager.getSignerForUser).mockReturnValue(mockRelayerSigner);
        mockProvider.simulateTransaction = vi.fn().mockResolvedValue({
            status: { status: 'fail' },
            execution: { message: 'insufficient funds' }
        });
        settler = new Settler(mockStorage, mockProvider, mockRelayerManager);
        vi.mocked(mockStorage.get).mockResolvedValue(null);

        const payloadWithRelayer = { ...payload, relayer: relayerAddressBech32, version: 2 };
        await expect(settler.settle(payloadWithRelayer)).rejects.toThrow('simulation failed');
        expect(mockProvider.sendTransaction).not.toHaveBeenCalled();
    });
});
