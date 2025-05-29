# Environment Variables

This document lists all environment variables used in the DIP Platform.

## **GitHub App Configuration**

### Required for Production
```bash
# GitHub App credentials (get from https://github.com/settings/apps)
GITHUB_APP_ID=1333063
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
NEXT_PUBLIC_GITHUB_APP_NAME=improvement-proposals-bot

# GitHub OAuth credentials (from the same GitHub App page)
NEXT_PUBLIC_GITHUB_CLIENT_ID=Iv23li5CyuOpYc8pVa8f
GITHUB_CLIENT_SECRET=your_client_secret_here

# GitHub webhook secret (optional, for webhook verification)
GITHUB_WEBHOOK_SECRET=your_webhook_secret_here

# Multi-tenant Configuration
NEXT_PUBLIC_AUTH_DOMAIN=auth.dip.box
```

## **Repository Configuration**

### Ethereum EIPs
```bash
# For testing with peeramid-labs fork:
NEXT_PUBLIC_ETHEREUM_REPO_OWNER=peeramid-labs
NEXT_PUBLIC_ETHEREUM_REPO_NAME=EIPs
NEXT_PUBLIC_ETHEREUM_REPO_BRANCH=master
NEXT_PUBLIC_ETHEREUM_REPO_DESCRIPTION="Ethereum Improvement Proposals"

# For production with official repo:
NEXT_PUBLIC_ETHEREUM_REPO_OWNER=ethereum
NEXT_PUBLIC_ETHEREUM_REPO_NAME=EIPs
NEXT_PUBLIC_ETHEREUM_REPO_BRANCH=master
NEXT_PUBLIC_ETHEREUM_REPO_DESCRIPTION="Ethereum Improvement Proposals"
```

### Arbitrum AIPs (Optional)
```bash
NEXT_PUBLIC_ARBITRUM_REPO_OWNER=arbitrum-foundation
NEXT_PUBLIC_ARBITRUM_REPO_NAME=AIPs
NEXT_PUBLIC_ARBITRUM_REPO_BRANCH=main
NEXT_PUBLIC_ARBITRUM_REPO_DESCRIPTION="Arbitrum Improvement Proposals"
```

## **Currently Used (Existing Project)**

### Privy Authentication
```bash
NEXT_PUBLIC_PRIVY_APP_ID=cm936s5y001fyii0lqbc6lgl2
PRIVY_SECRET=your_privy_secret_here
```

### Database
```bash
DATABASE_URL=postgresql://user:pass@host:port/db?sslmode=require
```

### Blockchain Configuration
```bash
PRIVATE_KEY=0x...
NEXT_PUBLIC_SITE_URL=https://peeramid.network
NEXT_PUBLIC_USE_LOCALHOST=true
NEXT_PUBLIC_DEFAULT_CHAIN_NAME=localhost
NEXT_PUBLIC_LOCAL_CHAIN_RPC_TARGET=http://127.0.0.1:8545
RPC_URL=http://127.0.0.1:8545
NEXT_PUBLIC_CELO_MAINNET_WIP_ADDRESS=0x1EBcf8ef65e70968a63683C7618C5FaE5F32D73F
```

### Analytics & Monitoring
```bash
NEXT_PUBLIC_ENGINE_GTAG=XXX
NEXT_PUBLIC_ENVIO_API_ENDPOINT=your_envio_endpoint
```

## **Development vs Production**

### Development Mode
- Set `NODE_ENV=development`
- GitHub App credentials are optional (will use mock mode)
- Repository targets can be set to forks for testing

### Production Mode
- Set `NODE_ENV=production`
- GitHub App credentials are required
- Repository targets should point to official repos

## **Quick Setup for Testing**

Add these to your `.env` for the fork-and-PR workflow to official repositories:

```bash
# GitHub App
NEXT_PUBLIC_GITHUB_APP_NAME=improvement-proposals-bot

# Target the OFFICIAL Ethereum repository (fork-and-PR workflow)
NEXT_PUBLIC_ETHEREUM_REPO_OWNER=ethereum
NEXT_PUBLIC_ETHEREUM_REPO_NAME=EIPs
NEXT_PUBLIC_ETHEREUM_REPO_DESCRIPTION="Ethereum Improvement Proposals"

# For testing with your own fork first:
# NEXT_PUBLIC_ETHEREUM_REPO_OWNER=your-github-username
# NEXT_PUBLIC_ETHEREUM_REPO_NAME=EIPs
# NEXT_PUBLIC_ETHEREUM_REPO_DESCRIPTION="Ethereum Improvement Proposals (Testing via your fork)"
```

## **How the Fork-and-PR Workflow Works**

1. **User installs GitHub App** on their own account
2. **App automatically forks** ethereum/EIPs to user's account (if not exists)
3. **App creates branch** in user's fork
4. **App commits EIP** to user's fork
5. **App creates PR** from user's fork → ethereum/EIPs

**No permission needed from Ethereum organization!** ✅

## Google AI (Optional)