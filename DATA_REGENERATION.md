# Data Regeneration Guide

This guide explains how to regenerate the KV store cached data and update database records using the built-in API endpoints.

## Available Scripts

### Full Data Regeneration
```bash
pnpm data:regenerate
```
**What it does**: Runs both collection and processing phases
- Collects raw markdown files from GitHub repositories
- Processes them and generates statistics
- Updates KV store with cached data
- **Use this** for complete data refresh

### Phase-Specific Operations

#### Collection Only
```bash
pnpm data:collect
```
**What it does**: Only collects raw files from GitHub and stores in database
- Fetches markdown files from configured repositories
- Stores raw content in database
- Useful when you want to update raw data without reprocessing

#### Processing Only
```bash
pnpm data:process
```
**What it does**: Only processes existing database records
- Parses stored markdown files
- Generates statistics and breakdowns
- Updates KV store with processed data
- Useful when you've changed processing logic

### Monitoring & Debugging

#### Check Status
```bash
pnpm data:status
```
**What it does**: Shows current status of cron jobs and data pipeline

#### Debug Information
```bash
pnpm data:debug
```
**What it does**: Shows environment configuration and debug info

## When to Use Each Script

### `data:regenerate` (Most Common)
- **Initial setup** of a new deployment
- **Weekly/monthly** full data refresh
- **After adding new protocols** to configuration
- **When data seems stale** across all protocols

### `data:collect`
- **After GitHub repository changes** (new EIPs added)
- **When raw data is missing** but processing logic is fine
- **Testing new repository configurations**

### `data:process`
- **After updating statistics logic** or track normalization
- **When KV cache is corrupted** but database has good data
- **After changing acceptance rate calculations**

### `data:status`
- **Before running regeneration** to check current state
- **Monitoring scheduled jobs** in production
- **Debugging failed operations**

## Production Usage

For production deployments, you can call the same endpoints via HTTP:

```bash
# Full regeneration
curl -X POST "https://your-domain.com/api/cron/generate-static"

# Collection only
curl -X POST "https://your-domain.com/api/cron/generate-static?phase=collect"

# Processing only
curl -X POST "https://your-domain.com/api/cron/generate-static?phase=process"

# Check status
curl "https://your-domain.com/api/cron/status"
```

## Troubleshooting

### Data Not Updating
1. Check status: `pnpm data:status`
2. Check debug info: `pnpm data:debug`
3. Try collection first: `pnpm data:collect`
4. Then processing: `pnpm data:process`

### GitHub API Rate Limits
- The collection process includes built-in rate limiting
- If you hit limits, wait and try again later
- Check GitHub token permissions in debug output

### KV Store Issues
- Run `pnpm data:process` to refresh cache from database
- Check Vercel KV dashboard for storage limits
- Verify KV environment variables

## Current Protocols

The system will regenerate data for all enabled protocols:
- **Ethereum** (EIPs)
- **Rollup** (RIPs)
- **Starknet** (SNIPs)
- **Arbitrum** (AIPs)

Add new protocols by updating `lib/subdomain-utils.ts` and the cron job configuration.