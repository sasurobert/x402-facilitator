import { Address, Transaction, UserSigner, TransactionComputer } from '@multiversx/sdk-core';
import { X402Payload } from '../domain/types';
import { ISettlementStorage } from '../domain/storage';
import crypto from 'crypto';

export class Settler {
    private transactionComputer = new TransactionComputer();

    constructor(
        private storage: ISettlementStorage,
        private provider: any,
        private relayerSigner?: UserSigner
    ) { }

    async settle(payload: X402Payload): Promise<{ success: boolean; txHash?: string }> {
        // 1. Idempotency Check
        const id = this.calculateId(payload);
        const existing = await this.storage.get(id);

        if (existing && existing.status === 'completed') {
            return { success: true, txHash: existing.txHash };
        }

        if (existing && existing.status === 'pending') {
            throw new Error('Settlement already in progress');
        }

        // 2. Save Pending Record
        await this.storage.save({
            id,
            signature: payload.signature,
            payer: payload.sender,
            status: 'pending',
            validBefore: payload.validBefore,
            createdAt: Math.floor(Date.now() / 1000)
        });

        try {
            let txHash: string;

            if (this.relayerSigner) {
                // Relayed V3
                txHash = await this.sendRelayedV3(payload);
            } else {
                // Direct broadcast (already signed by sender)
                txHash = await this.sendDirect(payload);
            }

            // 3. Update to Completed
            await this.storage.updateStatus(id, 'completed', txHash);
            return { success: true, txHash };

        } catch (error: any) {
            await this.storage.updateStatus(id, 'failed');
            throw new Error(`Settlement failed: ${error.message}`);
        }
    }

    private calculateId(payload: X402Payload): string {
        // Use signature as unique ID for the payment
        return crypto.createHash('sha256').update(payload.signature).digest('hex');
    }

    private async sendDirect(payload: X402Payload): Promise<string> {
        const tx = new Transaction({
            nonce: BigInt(payload.nonce),
            value: BigInt(payload.value),
            receiver: Address.newFromBech32(payload.receiver),
            sender: Address.newFromBech32(payload.sender),
            gasPrice: BigInt(payload.gasPrice),
            gasLimit: BigInt(payload.gasLimit),
            data: payload.data ? Buffer.from(payload.data) : undefined,
            chainID: payload.chainID,
            version: payload.version,
            signature: Buffer.from(payload.signature, 'hex'),
        });

        const result = await this.provider.sendTransaction(tx);
        return result;
    }

    private async sendRelayedV3(payload: X402Payload): Promise<string> {
        if (!this.relayerSigner) throw new Error('Relayer signer not configured');

        const relayerAddress = this.relayerSigner.getAddress();

        const tx = new Transaction({
            nonce: BigInt(payload.nonce),
            value: BigInt(payload.value),
            receiver: Address.newFromBech32(payload.receiver),
            sender: Address.newFromBech32(payload.sender),
            relayer: relayerAddress,
            gasPrice: BigInt(payload.gasPrice),
            gasLimit: BigInt(payload.gasLimit) + 50000n, // +50,000 for relayed
            data: payload.data ? Buffer.from(payload.data) : undefined,
            chainID: payload.chainID,
            version: payload.version,
            signature: Buffer.from(payload.signature, 'hex'),
        });

        // Relayer signs as well
        const bytesToSign = this.transactionComputer.computeBytesForSigning(tx);
        tx.relayerSignature = await this.relayerSigner.sign(bytesToSign);

        const result = await this.provider.sendTransaction(tx);
        return result;
    }
}
