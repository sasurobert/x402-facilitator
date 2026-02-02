import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { JsonSettlementStorage } from '../../src/storage/json';
import { ISettlementRecord } from '../../src/domain/storage';
import fs from 'fs';

describe('JsonSettlementStorage', () => {
    const filePath = './test-settlements.json';
    let storage: JsonSettlementStorage;

    beforeEach(() => {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        storage = new JsonSettlementStorage(filePath);
    });

    afterEach(() => {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    });

    it('should save and get a record', async () => {
        const record: ISettlementRecord = {
            id: 'test-id',
            signature: 'sig',
            payer: 'erd1...',
            status: 'pending' as const,
            createdAt: Date.now(),
        };

        await storage.save(record);
        const retrieved = await storage.get('test-id');
        expect(retrieved).toMatchObject(record);
    });

    it('should update status', async () => {
        const record: ISettlementRecord = {
            id: 'test-id',
            signature: 'sig',
            payer: 'erd1...',
            status: 'pending' as const,
            createdAt: Date.now(),
        };

        await storage.save(record);
        await storage.updateStatus('test-id', 'completed', '0x123');
        const retrieved = await storage.get('test-id');
        expect(retrieved?.status).toBe('completed');
        expect(retrieved?.txHash).toBe('0x123');
    });

    it('should delete expired records', async () => {
        const now = 1000;
        await storage.save({
            id: 'expired',
            signature: 'sig',
            payer: 'erd1...',
            status: 'pending' as const,
            validBefore: 500,
            createdAt: 100,
        });
        await storage.save({
            id: 'valid',
            signature: 'sig',
            payer: 'erd1...',
            status: 'pending' as const,
            validBefore: 1500,
            createdAt: 100,
        });

        await storage.deleteExpired(now);
        expect(await storage.get('expired')).toBeNull();
        expect(await storage.get('valid')).not.toBeNull();
    });

    it('should persist to file', async () => {
        const record: ISettlementRecord = {
            id: 'persist-test',
            signature: 'sig',
            payer: 'erd1...',
            status: 'pending' as const,
            createdAt: Date.now(),
        };

        await storage.save(record);

        // Create a new instance pointing to the same file
        const newStorage = new JsonSettlementStorage(filePath);
        const retrieved = await newStorage.get('persist-test');
        expect(retrieved).toMatchObject(record);
    });
});
