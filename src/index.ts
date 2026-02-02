import express, { Request, Response } from 'express';
import { Verifier } from './services/verifier';
import { Settler } from './services/settler';
import { CleanupService } from './services/cleanup';
import { JsonSettlementStorage } from './storage/json';
import { VerifyRequestSchema, SettleRequestSchema } from './domain/schemas';
import { ProxyNetworkProvider } from '@multiversx/sdk-network-providers';
import { UserSigner } from '@multiversx/sdk-core';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

export function createServer(dependencies: {
    provider: any,
    storage: JsonSettlementStorage,
    relayerSigner?: UserSigner
}) {
    const { provider, storage, relayerSigner } = dependencies;
    const app = express();
    app.use(express.json());

    const settler = new Settler(storage, provider, relayerSigner);
    const cleanupService = new CleanupService(storage);
    cleanupService.start();

    app.post('/verify', async (req: Request, res: Response) => {
        try {
            const validated = VerifyRequestSchema.parse(req.body);
            const result = await Verifier.verify(validated.payload, validated.requirements, provider);
            res.json(result);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    });

    app.post('/settle', async (req: Request, res: Response) => {
        try {
            const validated = SettleRequestSchema.parse(req.body);
            await Verifier.verify(validated.payload, validated.requirements, provider);
            const result = await settler.settle(validated.payload);
            res.json(result);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    });

    return app;
}

if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    const providerUrl = process.env.NETWORK_PROVIDER || 'https://devnet-api.multiversx.com';
    const provider = new ProxyNetworkProvider(providerUrl);

    if (!fs.existsSync('./data')) {
        fs.mkdirSync('./data');
    }
    const storage = new JsonSettlementStorage('./data/settlements.json');

    // Relayer initialization omitted for brevity, but would go here

    const app = createServer({ provider, storage });
    app.listen(PORT, () => {
        console.log(`x402 Facilitator listening on port ${PORT}`);
    });
}
