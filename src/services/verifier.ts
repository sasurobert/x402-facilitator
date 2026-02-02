import { Address, UserVerifier, Transaction } from '@multiversx/sdk-core';
import { X402Payload, X402Requirements } from '../domain/types';

export class Verifier {
    static async verify(payload: X402Payload, requirements: X402Requirements, provider?: any): Promise<{ isValid: boolean; payer: string }> {
        // 1. Static Checks (Time)
        const now = Math.floor(Date.now() / 1000);
        if (payload.validAfter && now < payload.validAfter) {
            throw new Error('Transaction not yet valid');
        }
        if (payload.validBefore && now > payload.validBefore) {
            throw new Error('Transaction expired');
        }

        // 2. Signature Verification
        const senderAddress = Address.newFromBech32(payload.sender);
        const verifier = UserVerifier.fromAddress(senderAddress);

        // We need to re-serialize the payload for verification.
        const message = this.serializePayload(payload);
        const isValidSignature = await verifier.verify(message, Buffer.from(payload.signature, 'hex'));

        if (!isValidSignature) {
            throw new Error('Invalid signature');
        }

        // 3. Requirements Match
        if (payload.receiver !== requirements.payTo) {
            throw new Error('Receiver mismatch');
        }

        if (requirements.asset === 'EGLD') {
            if (BigInt(payload.value) < BigInt(requirements.amount)) {
                throw new Error('Insufficient amount');
            }
        } else {
            // ESDT Logic (MultiESDTNFTTransfer parsing)
            this.verifyESDT(payload, requirements);
        }

        // 4. Simulation
        if (provider) {
            await this.simulate(payload, provider);
        }

        return { isValid: true, payer: payload.sender };
    }

    public static async simulate(payload: X402Payload, provider: any) {
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

        try {
            const simulationResult = await provider.simulateTransaction(tx);
            if (simulationResult.execution.result !== 'success') {
                throw new Error(`Simulation failed: ${simulationResult.execution.message || 'Unknown error'}`);
            }
        } catch (error: any) {
            throw new Error(`Simulation error: ${error.message}`);
        }
    }

    private static serializePayload(payload: X402Payload): Buffer {
        const parts = [
            payload.nonce.toString(),
            payload.value,
            payload.receiver,
            payload.sender,
            payload.gasPrice.toString(),
            payload.gasLimit.toString(),
            payload.data || "",
            payload.chainID,
            payload.version.toString(),
            payload.options.toString()
        ];
        return Buffer.from(parts.join('|'));
    }

    private static verifyESDT(payload: X402Payload, _requirements: X402Requirements) {
        if (!payload.data?.startsWith('MultiESDTNFTTransfer')) {
            throw new Error('Not an ESDT transfer');
        }
        // Parsing logic omitted for brevity in this step, but would check token and amount
    }
}
