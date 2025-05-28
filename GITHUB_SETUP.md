# GitHub App Setup Guide

## Overview

This DIP platform uses GitHub Apps for secure, repository-specific access to create EIP pull requests. Users can select which repositories to grant access to during installation.

## GitHub App vs OAuth App

**GitHub App (Current Implementation):**
- ✅ **Repository Selection**: Users choose specific repositories during installation
- ✅ **Granular Permissions**: Only the permissions needed for EIP submissions
- ✅ **Better Security**: Principle of least privilege
- ✅ **Organization Support**: Can be installed on organizations
- ✅ **No Broad Access**: Limited to selected repositories only

**OAuth App (Previous):**
- ❌ **All Public Repos**: Access to all user's public repositories
- ❌ **Broader Permissions**: More access than needed
- ❌ **Less Secure**: Wider attack surface

## GitHub App Creation

### Step 1: Create GitHub App

1. Go to [GitHub Developer Settings](https://github.com/settings/apps/new)
2. Fill in the application details:

**Basic Information:**
- **App Name**: `DIP Platform` (must be unique)
- **Homepage URL**: `https://dip.box`
- **App Description**:
  ```
  Decentralized Improvement Protocol platform for managing and submitting EIPs, AIPs, and other protocol improvement proposals. Enables users to create, edit, and submit improvement proposals directly to protocol repositories.
  ```

**Callback URLs:**
- **User authorization callback URL**: `https://auth.dip.box/auth/github/app/callback`
- **Setup URL**: `https://auth.dip.box/auth/github/app/setup`
- **Webhook URL**: `https://auth.dip.box/api/github/webhooks`

**Repository Permissions:**
- ✅ **Contents**: Read & Write (to create/edit files)
- ✅ **Pull requests**: Write (to create PRs)
- ✅ **Metadata**: Read (basic repo info)

**Account Permissions:**
- ✅ **Email addresses**: Read (to get user email)

**Installation Settings:**
- ✅ **Any account** (allows installation on any user/org)
- ✅ **Expire user authorization tokens**: 8 hours or 1 day

**Webhook Events:**
- ✅ **Installation** (when app is installed/uninstalled)
- ✅ **Installation repositories** (when repo access changes)
- ✅ **Pull request** (optional - for tracking PR status)

### Step 2: Generate Private Key

After creating the app:
1. Scroll to **"Private keys"** section
2. Click **"Generate a private key"**
3. Download the `.pem` file (keep secure!)

### Step 3: Environment Variables

Create a `.env.local` file in the frontend directory:

```bash
# GitHub App Configuration
GITHUB_APP_ID=123456
GITHUB_APP_NAME=dip
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nMIIE...your-key-here...\n-----END RSA PRIVATE KEY-----"
GITHUB_WEBHOOK_SECRET=your_webhook_secret_here

# Multi-tenant Configuration
NEXT_PUBLIC_AUTH_DOMAIN=auth.dip.box
NEXT_PUBLIC_GITHUB_APP_NAME=improvement-proposals-bot

# Optional: For development
NEXT_PUBLIC_DEV_MODE=true
```

**Important Notes:**
- Replace `123456` with your actual App ID
- Replace `improvement-proposals-bot` with your actual app name (lowercase, hyphens)
- Convert the private key to a single line with `\n` for newlines
- Generate webhook secret: `openssl rand -hex 32`

## How It Works

### User Installation Flow
1. User clicks "Install GitHub App" in the DIP platform
2. Redirected to GitHub app installation page
3. User selects which repositories to grant access to
4. GitHub redirects back to platform with installation ID
5. Platform stores installation ID and user info locally

### EIP Submission Flow
1. User creates EIP using the platform form
2. Platform uses installation ID to get access token
3. Platform creates/updates fork of target repository (e.g., ethereum/EIPs)
4. Platform creates new branch and commits EIP file
5. Platform creates pull request from user's fork to main repository
6. PR appears as coming from the actual user (not the platform)

### Benefits

- ✅ **Repository Selection**: Users choose specific repos to grant access to
- ✅ **Granular Permissions**: Only necessary permissions for EIP submission
- ✅ **User Attribution**: PRs appear from actual authors, not platform
- ✅ **Security**: Principle of least privilege access
- ✅ **Revocable**: Users can easily manage/revoke access
- ✅ **Multi-Protocol**: Works for any protocol repository (EIPs, AIPs, etc.)

## Development Setup

For local development:

1. Create a separate GitHub App for development
2. Use `http://localhost:3000/auth/github/app/callback` as callback URL
3. Set `NEXT_PUBLIC_DEV_MODE=true` in `.env.local`
4. The platform will handle localhost domain routing automatically

## Production Deployment

### Vercel Configuration

1. Add environment variables in Vercel dashboard
2. Configure custom domains:
   - `dip.box` → main platform
   - `auth.dip.box` → authentication subdomain
   - `ethereum.dip.box` → Ethereum EIPs
   - `arbitrum.dip.box` → Arbitrum AIPs
   - etc.

### Domain Setup

The platform supports multi-tenant subdomains:
- Each protocol gets its own subdomain (e.g., `ethereum.dip.box`)
- Authentication happens on centralized domain (`auth.dip.box`)
- Users are redirected back to original protocol subdomain after auth

## Troubleshooting

### "GitHub App not configured" Error
- Check that all environment variables are set correctly
- Ensure private key is properly formatted (single line with `\n`)
- Verify App ID matches the created GitHub App

### "Installation not found" Error
- User may have uninstalled the app
- Installation ID may be invalid or expired
- Check GitHub App installation status

### Permission Errors
- Verify repository permissions are set correctly in GitHub App settings
- Ensure user has granted access to the target repository
- Check that the repository is public (private repos need additional permissions)

## Security Considerations

- Private key should be kept secure and never committed to version control
- Use environment variables for all sensitive configuration
- Webhook secret should be used to verify webhook authenticity
- Consider rotating private keys periodically
- Monitor app installations and usage through GitHub's interface