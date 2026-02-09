# x402 Facilitator for MultiversX

Off-chain payment verification and settlement service for MultiversX, implementing the x402 standard.

## Overview

The x402 Facilitator acts as an intermediary that validates off-chain payment intents (signatures) and settles them on the MultiversX blockchain. It supports both direct transaction broadcasting and Relayed V3 (gasless) payments.

## Features

- **Standard Compliance**: Implements the x402 verification scheme for MultiversX.
- **Security First**: Uses `@multiversx/sdk-core` for robust cryptographic verification.
- **Transaction Simulation**: Validates payments via blockchain simulation before broadcasting.
- **Idempotency**: Persistent storage prevents duplicate transaction settlements.
- **Flexible Settlement**: Supports direct broadcasting and Relayed V3 transactions.
- **Background Cleanup**: Automatically purges expired settlement records from local storage.

## Quick Start

```bash
git clone https://github.com/sasurobert/x402-facilitator.git
cd x402-facilitator
chmod +x setup.sh && ./setup.sh
```

The setup script installs pnpm (if missing), dependencies, creates a default `.env`, builds, and runs tests.

### Prerequisites

| Tool | Version | Required |
|------|---------|----------|
| Node.js | v20+ | Yes |
| pnpm | latest | Auto-installed by setup.sh |

### Configuration

Create a `.env` file in the root directory:

```env
PORT=3000
NETWORK_PROVIDER=https://devnet-api.multiversx.com
NETWORK_PROVIDER=https://devnet-api.multiversx.com
# Relayer Configuration
RELAYER_WALLETS_DIR=./wallets/ # Directory containing shardX.pem files
# RELAYER_PEM_PATH=./relayer.pem # Legacy single-shard support
```

### Running the Server

```bash
# Development mode
pnpm dev

# Build and start
pnpm build
pnpm start
```

## API Reference

### POST `/verify`

Validates a payment payload against specific requirements.

**Request Body:**

```json
{
  "scheme": "exact",
  "payload": { ... },
  "requirements": { ... }
}
```

### POST `/settle`

Verifies and settles a payment on-chain.

**Request Body:**

```json
{
  "scheme": "exact",
  "payload": { ... },
  "requirements": { ... }
}
```

## Development

### Running Tests

```bash
# All tests
pnpm test

# Unit tests only
pnpm test tests/unit

# E2E tests only
pnpm test tests/e2e
```

### Linting

```bash
pnpm lint
```

## License

MIT
