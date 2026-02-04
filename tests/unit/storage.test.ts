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

    it('should get unread records', async () => {
        await storage.save({
            id: 'read',
            signature: 'sig',
            payer: 'erd1...',
            status: 'completed' as const,
            createdAt: 100,
            isRead: true
        });
        await storage.save({
            id: 'unread',
            signature: 'sig',
            payer: 'erd1...',
            status: 'completed' as const,
            createdAt: 100,
            isRead: false
        });
        await storage.save({
            id: 'unread-default',
            signature: 'sig',
            payer: 'erd1...',
            status: 'completed' as const,
            createdAt: 100,
            // isRead undefined -> defaults to false in save()
        });
        await storage.save({
            id: 'pending',
            signature: 'sig',
            payer: 'erd1...',
            status: 'pending' as const,
            createdAt: 100,
            isRead: false
        });

        const unread = await storage.getUnread();
        expect(unread).toHaveLength(2);
        expect(unread.map(r => r.id)).toContain('unread');
        expect(unread.map(r => r.id)).toContain('unread-default');
    });

    it('should mark records as read', async () => {
        await storage.save({
            id: 'rec1',
            signature: 'sig',
            payer: 'erd1...',
            status: 'completed' as const,
            createdAt: 100,
            isRead: false
        });
        await storage.save({
            id: 'rec2',
            signature: 'sig',
            payer: 'erd1...',
            status: 'completed' as const,
            createdAt: 100,
            isRead: false
        });

        await storage.markAsRead(['rec1']);

        const unread = await storage.getUnread();
        expect(unread).toHaveLength(1);
        expect(unread[0].id).toBe('rec2');

        const rec1 = await storage.get('rec1');
        expect(rec1?.isRead).toBe(true);
    });
});
