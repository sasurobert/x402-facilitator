import { z } from 'zod';

export const X402PayloadSchema = z.object({
    nonce: z.number().int().nonnegative(),
    value: z.string().regex(/^\d+$/),
    receiver: z.string().startsWith('erd1'),
    sender: z.string().startsWith('erd1'),
    gasPrice: z.number().int().nonnegative(),
    gasLimit: z.number().int().nonnegative(),
    data: z.string().optional(),
    chainID: z.string(),
    version: z.number().int().nonnegative(),
    options: z.number().int().nonnegative(),
    signature: z.string().regex(/^[0-9a-fA-F]{128}$/),
    validAfter: z.number().int().nonnegative().optional(),
    validBefore: z.number().int().nonnegative().optional(),
});

export const X402RequirementsSchema = z.object({
    payTo: z.string().startsWith('erd1'),
    amount: z.string().regex(/^\d+$/),
    asset: z.string(),
    network: z.string(),
    extra: z.object({
        assetTransferMethod: z.enum(['direct', 'esdt']),
    }).optional(),
});

export const VerifyRequestSchema = z.object({
    scheme: z.literal('exact'),
    payload: X402PayloadSchema,
    requirements: X402RequirementsSchema,
});

export const SettleRequestSchema = z.object({
    scheme: z.literal('exact'),
    payload: X402PayloadSchema,
    requirements: X402RequirementsSchema,
});
