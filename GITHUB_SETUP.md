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
GITHUB_APP_ID=1333063
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nMIIE...your-key-here...\n-----END RSA PRIVATE KEY-----"
NEXT_PUBLIC_GITHUB_APP_NAME=improvement-proposals-bot

# GitHub OAuth Configuration (from same app)
NEXT_PUBLIC_GITHUB_CLIENT_ID=Iv23li5CyuOpYc8pVa8f
GITHUB_CLIENT_SECRET=your_client_secret_here

# Multi-tenant Configuration
NEXT_PUBLIC_AUTH_DOMAIN=auth.dip.box

# GitHub webhook secret (optional)
GITHUB_WEBHOOK_SECRET=your_webhook_secret_here
```

**Important Notes:**
- Replace `1333063` with your actual App ID
- Replace `improvement-proposals-bot` with your actual app name (lowercase, hyphens)
- Replace `Iv23li5CyuOpYc8pVa8f` with your actual Client ID
- Convert the private key to a single line with `\n` for newlines
- Generate webhook secret: `openssl rand -hex 32`

## How It Works

### Dual Authentication Flow (Security + UX)
The platform uses **both** GitHub App installation AND OAuth user authentication:

1. **GitHub App Installation**: Grants repository access permissions
2. **OAuth Authentication**: Identifies the user securely

This ensures:
- ✅ **Security**: Only authenticated users can see their own installations
- ✅ **Privacy**: No cross-user data exposure
- ✅ **Minimal Permissions**: Users only grant what's needed

### Complete User Flow
1. **User visits platform** → Sees "Install GitHub App" and "Authenticate" buttons
2. **User installs GitHub App** → Selects repositories to grant access to
3. **User authenticates via OAuth** → Platform can identify them securely
4. **Platform matches user to their installations** → Shows only their data
5. **User can submit EIPs** → Creates PRs using their authenticated identity

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