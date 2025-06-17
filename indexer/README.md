# DIP Gas Metrics Indexer

A standalone indexing server that monitors blockchain activity and calculates gas metrics for connected wallets.

## Features

- Monitors user activity and node activity on specified blockchains
- Calculates aggregate gas spent and earned by each connected wallet
- Stores transaction and gas metrics data in a PostgreSQL database
- Configurable monitoring periods
- Robust error handling and logging

## Prerequisites

- Node.js (v18 or higher)
- pnpm (v8 or higher)
- PostgreSQL database
- Access to blockchain RPC endpoints

## Setup

1. Install dependencies:
```bash
pnpm install
```

2. Set up environment variables:
Create a `.env` file in the root directory with the following variables:
```
DATABASE_URL="postgresql://user:password@localhost:5432/dip_indexer"
ETHEREUM_RPC_URL="https://mainnet.infura.io/v3/your-infura-key"
ETHEREUM_START_BLOCK="18000000"
```

3. Initialize the database:
```bash
pnpm prisma migrate dev
```

4. Type check the project:
```bash
pnpm typecheck
```

## Running the Indexer

Development mode:
```bash
pnpm dev
```

Production mode:
```bash
pnpm start
```

## Database Schema

### WalletGasMetrics
- Tracks aggregated gas metrics for each wallet
- Period-based aggregation (monthly by default)
- Stores both gas spent and earned

### Transaction
- Stores individual transaction data
- Includes gas usage, status, and timestamps
- Indexed for efficient querying

## Configuration

The indexer can be configured through:
- Environment variables
- `envio.config.ts` for blockchain-specific settings
- Database schema modifications for different aggregation periods

## Monitoring

The indexer includes comprehensive logging:
- Transaction processing logs
- Error logs
- Performance metrics
- Block processing status

## Future Integration

This indexer will be integrated with the DIP platform's credits system, allowing users to claim rewards based on their activity.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT 