export interface ISettlementRecord {
    id: string; // Hash of the signed payload (or unique ID)
    signature: string;
    payer: string;
    status: 'pending' | 'completed' | 'failed';
    txHash?: string;
    validBefore?: number;
    createdAt: number;
}

export interface ISettlementStorage {
    save(record: ISettlementRecord): Promise<void>;
    get(id: string): Promise<ISettlementRecord | null>;
    updateStatus(id: string, status: ISettlementRecord['status'], txHash?: string): Promise<void>;
    deleteExpired(now: number): Promise<void>;
}
