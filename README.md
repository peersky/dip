# Decentralized Improvement Proposal (DIP) Analytics Platform

This repository contains the full source code for the DIP Analytics Platform, a comprehensive tool for tracking, analyzing, and visualizing the lifecycle of improvement proposals across various blockchain ecosystems.

The platform is built as a `pnpm` monorepo, providing a clear separation of concerns between the data processing backend, the database schema, and the user-facing frontend.

## Monorepo Structure

This project is organized into the following key packages:

-   `frontend/`: A Next.js application that serves as the user interface for the platform. It handles all the rendering, charting, and user interaction.
-   `crawler/`: A standalone Node.js service responsible for fetching data from source repositories. This is the main entry point for the data pipeline.
-   `packages/core/`: A shared library containing all the core business logic for the platform. This includes proposal parsing, data processing, statistics calculation, and lifecycle analysis. It is used by the `crawler`.
-   `packages/database/`: A dedicated package that manages the database schema using Prisma. It provides the Prisma Client that all other services use to interact with the database.

---

## Local Development Setup

To get the platform running on your local machine, please follow these steps.

### 1. Prerequisites

-   Node.js (v18 or later recommended)
-   `pnpm` package manager (`npm install -g pnpm`)
-   A PostgreSQL database (a free tier on [Neon](https://neon.tech/) is an excellent choice)

### 2. Installation

Clone the repository and install all dependencies from the root directory:

```bash
git clone <repository_url>
cd dip
pnpm install
```

### 3. Environment Variables

Create a `.env` file in the root of the project (`dip/.env`). This file is critical for both the backend service and the frontend application.

```env
# The full connection string for your PostgreSQL database.
DATABASE_URL="postgresql://user:password@host:port/dbname?sslmode=require"

# A GitHub Personal Access Token with 'repo' scope.
# This is essential to avoid API rate-limiting during data crawling.
GITHUB_PAT="github_pat_..."

# --- Frontend Variables ---
# The base domain for your application.
# For local development with subdomains, use "localhost:3000".
NEXT_PUBLIC_BASE_DOMAIN="localhost:3000"
```

### 4. Running the Application

You can run the frontend and backend services from the root of the monorepo.

-   **To run the frontend development server:**
    ```bash
    pnpm --filter happy-birthday dev
    ```
-   **To run the backend data pipeline:**
    ```bash
    pnpm --filter ip-crawler start
    ```

---

## Deployment Guide

This application is designed as two separate deployments: the frontend is deployed to a hosting provider like Vercel, and the backend data service is run as a periodic task, typically a cron job.

### Frontend Deployment (Vercel)

The `frontend` application is a standard Next.js app and is optimized for deployment on Vercel.

**1. Create a New Vercel Project:**
   - Connect your Git repository to Vercel.
   - When importing the project, select the `frontend` directory as the **Root Directory**. Vercel will automatically detect that it is a Next.js application.

**2. Configure Project Settings:**
   - **Build & Development Settings:** Ensure the settings match the `frontend` package.
     - **Build Command:** `pnpm build`
     - **Install Command:** `pnpm install`
   - **Root Directory:** `frontend`

**3. Set Environment Variables:**
   In your Vercel project settings (under "Settings" -> "Environment Variables"), add all the variables from your local `.env` file. Most importantly:
   - `DATABASE_URL`: Ensure this points to your production database.
   - `GITHUB_PAT`: This is not strictly required for the frontend to run, but it's good practice to have it available if any future server components need it.
   - `NEXT_PUBLIC_BASE_DOMAIN`: Set this to your primary production domain (e.g., `dip.box`).

**4. Configure Domains:**
   - Add your main domain (e.g., `dip.box`) to the Vercel project.
   - Add all necessary subdomain wildcards (e.g., `*.dip.box`). This is crucial for the multi-tenant dashboard functionality. Vercel will guide you through the necessary DNS configuration.

### Backend Data Service (Scheduled Cron Job)

The backend is not a long-running server; it's a script (`ip-crawler.ts`) that needs to be executed on a schedule (e.g., once every 24 hours) to keep the data fresh. **GitHub Actions** are a perfect, free, and integrated way to accomplish this.

**1. Create a GitHub Action Workflow:**
   - In your repository, create a new file at `.github/workflows/daily_data_crawl.yml`.
   - Paste the following configuration into the file:

   ```yaml
   name: Daily Data Regeneration Job

   on:
     workflow_dispatch: # Allows manual triggering
     schedule:
       - cron: '0 4 * * *' # Runs every day at 4:00 AM UTC

   jobs:
     regenerate-data:
       runs-on: ubuntu-latest
       steps:
         - name: Checkout repository
           uses: actions/checkout@v3

         - name: Install pnpm
           uses: pnpm/action-setup@v2
           with:
             version: 8 # or your desired pnpm version

         - name: Set up Node.js
           uses: actions/setup-node@v3
           with:
             node-version: '18'
             cache: 'pnpm'

         - name: Install dependencies
           run: pnpm install

         - name: Run the full data pipeline
           env:
             DATABASE_URL: ${{ secrets.DATABASE_URL }}
             GITHUB_PAT: ${{ secrets.GITHUB_PAT }}
           run: pnpm --filter ip-crawler start
   ```

**2. Add Repository Secrets:**
   - In your GitHub repository settings (under "Settings" -> "Secrets and variables" -> "Actions"), you must add the following **Repository secrets**:
     - `DATABASE_URL`: Your full production database connection string.
     - `GITHUB_PAT`: Your GitHub Personal Access Token.

Once this is set up, the GitHub Action will automatically run on the schedule you've defined, keeping your platform's data up-to-date without any manual intervention.

---

## Advanced Configuration: GitHub App

For functionality that involves creating pull requests on behalf of users (e.g., a "Submit Proposal" feature), the platform uses a GitHub App for secure, repository-specific authentication.

### How it Works

The platform uses a "fork-and-PR" workflow that does not require any special permissions from the official protocol repositories:
1. A user installs the GitHub App on their personal account.
2. The App automatically forks the target repository (e.g., `ethereum/EIPs`) to the user's account.
3. The App creates a new branch, commits the new proposal file, and creates a Pull Request from the user's fork back to the official repository.
4. This ensures that all contributions are correctly attributed to the user.

### Creating a GitHub App

1.  Go to **GitHub Developer Settings** -> **Apps** and click "New GitHub App".
2.  Fill in the application details:
    *   **App Name:** A unique name for your application (e.g., "DIP Platform Dev").
    *   **Homepage URL:** Your main application URL (e.g., `https://dip.box` or `http://localhost:3000`).
3.  **Callback URLs:**
    *   **User authorization callback URL:** `https://auth.YOUR_DOMAIN/auth/github/app/callback`
    *   **Setup URL:** `https://auth.YOUR_DOMAIN/auth/github/app/setup`
4.  **Permissions:**
    *   **Repository Permissions:**
        *   `Contents`: Read & Write
        *   `Pull requests`: Write
    *   **Account Permissions:**
        *   `Email addresses`: Read-only
5.  **Installation Settings:**
    *   Select **Any account**.

### Required Environment Variables

After creating the App, you will need to generate a **private key** and a **client secret**. Add the following variables to your `.env` file for the frontend:

```env
# Get from the GitHub App's main settings page
GITHUB_APP_ID="your_app_id"
NEXT_PUBLIC_GITHUB_CLIENT_ID="your_client_id"
GITHUB_CLIENT_SECRET="your_client_secret"

# Generate a new private key from the App settings page.
# Ensure it is a single line with \n for newlines.
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"

# The name of your app, used in UI elements
NEXT_PUBLIC_GITHUB_APP_NAME="your-app-name"

# The dedicated subdomain for handling authentication callbacks
NEXT_PUBLIC_AUTH_DOMAIN="auth.your_domain.com"
```