import { Transaction } from '@multiversx/sdk-core';

export interface ISimulationResult {
    status?: { status?: string };
    raw?: {
        status?: string;
        receiverShard?: { status?: string };
        senderShard?: { status?: string };
    };
    execution?: {
        result?: string;
        message?: string;
        gasConsumed?: number;
    };
    result?: {
        execution?: {
            result?: string;
            message?: string;
            gasConsumed?: number;
        };
    };
    error?: string;
}

export interface INetworkProvider {
    sendTransaction(tx: Transaction): Promise<string>;
    simulateTransaction(tx: Transaction): Promise<ISimulationResult>;
    queryContract(query: unknown): Promise<unknown>;
}

