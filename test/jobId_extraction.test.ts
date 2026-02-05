import { Settler } from '../src/services/settler';
import { JsonSettlementStorage } from '../src/storage/json';
import { INetworkProvider } from '../src/domain/network';
import { ISettlementStorage } from '../src/domain/storage';
import { X402Payload } from '../src/domain/types';
import fs from 'fs';
import path from 'path';

const mockProvider: INetworkProvider = {
    sendTransaction: async () => 'txHash123',
    simulateTransaction: async () => ({}),
    queryContract: async () => ({}),
};

describe('Settler JobID Extraction', () => {
    const testDbPath = 'test_settlements.json';
    let storage: ISettlementStorage;
    let settler: Settler;

    beforeEach(() => {
        if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
        storage = new JsonSettlementStorage(testDbPath);
        settler = new Settler(storage, mockProvider);
    });

    afterEach(() => {
        if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
    });

    it('should extract jobId from init_job_with_payment data', async () => {
        const jobId = 'job-verification-123';
        const jobIdHex = Buffer.from(jobId).toString('hex');
        const data = `init_job_with_payment@${jobIdHex}@00@00`;

        const payload: X402Payload = {
            nonce: 1,
            value: '0',
            receiver: 'erd1...',
            sender: 'erd1...',
            gasPrice: 1000000000,
            gasLimit: 50000000,
            chainID: 'D',
            version: 1,
            signature: 'sig123',
            data: data
        };

        await settler.settle(payload);

        // Verify storage
        // The ID is sha256(signature) -> sha256('sig123')
        // We need to find the record and check its jobId field
        const records = await storage.getUnread();
        // Note: settle marks it as completed (unread).

        expect(records.length).toBe(1);
        expect(records[0].jobId).toBe(jobId);
    });

    it('should ignore data without init_job prefix', async () => {
        const data = `transfer@00`;
        const payload: X402Payload = {
            nonce: 2,
            value: '0',
            receiver: 'erd1...',
            sender: 'erd1...',
            gasPrice: 1000000000,
            gasLimit: 50000000,
            chainID: 'D',
            version: 1,
            signature: 'sig456', // unique sig
            data: data
        };

        await settler.settle(payload);
        const records = await storage.getUnread();
        expect(records.length).toBe(1);
        expect(records[0].jobId).toBeUndefined();
    });
});
