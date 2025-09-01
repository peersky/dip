# Production Database Setup Guide

This guide provides a complete, step-by-step process for setting up and populating a new production-ready PostgreSQL database for the DIP Analytics Platform.

## Overview

The platform's data pipeline is a multi-stage process. Setting up the database involves not just creating the tables, but also running a series of scripts to fetch, process, and analyze the historical data from the source repositories.

Following these steps will result in a fully populated and operational database.

## Prerequisites

Before you begin, ensure you have:
1.  A free account with a cloud PostgreSQL provider. This guide uses [Neon](https://neon.tech/), which is highly recommended for its serverless capabilities and generous free tier.
2.  The project code cloned to your local machine.
3.  All dependencies installed (`pnpm install` from the root).

---

## Step 1: Create a New PostgreSQL Database

1.  Log in to your Neon account and create a new project.
2.  After the project is created, find the **Connection String**. You will see several options (e.g., psql, Node.js).
3.  Select the connection string that starts with `postgresql://`. Make sure you have the password visible. This is your `DATABASE_URL`.

**Example:** `postgresql://neondb_owner:xxxxxxxx@ep-cold-moon-a10npr83.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`

## Step 2: Configure Environment Variables

You need to provide this `DATABASE_URL` to all parts of the application.

-   **For Local Development:** Add the connection string to your root `.env` file:
    ```env
    DATABASE_URL="your_neon_connection_string_here"
    ```
-   **For Vercel Deployment:** Add `DATABASE_URL` as an environment variable in your Vercel project settings.
-   **For the GitHub Actions Crawler:** Add `DATABASE_URL` as a **Repository Secret** in your GitHub repository settings.

## Step 3: Run the Database Migration

This command will connect to your new, empty database and create all the necessary tables (`Proposal`, `ProposalVersion`, `GlobalStatsSnapshot`, etc.).

From the **root** of the monorepo, run:
```bash
pnpm --filter @peeramid-labs/dip-database db:migrate
```
Prisma will prompt you to name the migration. You can call it `init`. After this step, your database schema will be correct, but all the tables will be empty.

## Step 4: Run the Initial Data Crawl

This is the main data ingestion step. The crawler will connect to the GitHub API, fetch the entire commit history for all configured repositories, and populate your database with the raw proposal and author data.

**Note:** This is a long-running process and may take a significant amount of time for the initial run.

From the **root** of the monorepo, run:
```bash
pnpm --filter ip-crawler start
```

This command runs the `ip-crawler.ts` script, which performs the first two phases of the data pipeline:
1.  **Data Collection:** Fetches all raw data.
2.  **Data Resolution:** Links moved/renamed proposals.

After this step, your `Proposal`, `ProposalVersion`, and `Author` tables will be fully populated. The analytics tables, however, will still be empty.

## Step 5: Generate Historical Analytics Data

This is the final and most crucial step. It takes the raw data from Step 4 and performs all the complex calculations and aggregations needed to power the frontend dashboards.

From the `dip/packages/core` directory, run the historical regeneration utility script:
```bash
pnpm run db:regenerate-history
```
This script will:
1.  Calculate the detailed, month-by-month statistics for each protocol and populate the `ProtocolStatsSnapshot` table.
2.  Calculate the high-level, aggregated totals for the entire ecosystem and populate the `GlobalStatsSnapshot` table.

## Conclusion

Your database is now fully set up, populated, and ready for production.

To keep the data fresh, you should have the GitHub Action configured as described in the main `README.md`. This will automatically run the lightweight "updater" script on a daily basis, ensuring your platform always has the latest proposal data.