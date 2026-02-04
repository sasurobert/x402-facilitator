import fs from 'fs';
import { ISettlementRecord, ISettlementStorage } from '../domain/storage.js';

export class JsonSettlementStorage implements ISettlementStorage {
    private records: Map<string, ISettlementRecord> = new Map();

    constructor(private filePath: string) {
        this.load();
    }

    private load() {
        if (fs.existsSync(this.filePath)) {
            try {
                const data = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
                for (const record of data) {
                    this.records.set(record.id, record);
                }
            } catch (e) {
                console.error('Failed to load storage file:', e);
            }
        }
    }

    private saveToFile() {
        try {
            const data = Array.from(this.records.values());
            fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
        } catch (e) {
            console.error('Failed to save to storage file:', e);
        }
    }

    async save(record: ISettlementRecord): Promise<void> {
        if (record.isRead === undefined) {
            record.isRead = false;
        }
        this.records.set(record.id, record);
        this.saveToFile();
    }

    async get(id: string): Promise<ISettlementRecord | null> {
        return this.records.get(id) || null;
    }

    async updateStatus(id: string, status: ISettlementRecord['status'], txHash?: string): Promise<void> {
        const record = this.records.get(id);
        if (record) {
            record.status = status;
            record.txHash = txHash;
            this.saveToFile();
        }
    }

    async deleteExpired(now: number): Promise<void> {
        let changed = false;
        for (const [id, record] of this.records.entries()) {
            if (record.validBefore && record.validBefore < now) {
                this.records.delete(id);
                changed = true;
            }
        }
        if (changed) {
            this.saveToFile();
        }
    }

    async getUnread(): Promise<ISettlementRecord[]> {
        const unread: ISettlementRecord[] = [];
        for (const record of this.records.values()) {
            if (record.status === 'completed' && !record.isRead) {
                unread.push(record);
            }
        }
        return unread;
    }

    async markAsRead(ids: string[]): Promise<void> {
        let changed = false;
        for (const id of ids) {
            const record = this.records.get(id);
            if (record) {
                record.isRead = true;
                changed = true;
            }
        }
        if (changed) {
            this.saveToFile();
        }
    }
}
