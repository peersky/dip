'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button, Text, Group, Alert, Stack } from '@mantine/core';
import { IconBrandGithub, IconCheck, IconX, IconSettings } from '@tabler/icons-react';
import { useGitHubInstallations, useGitHubUser } from '@/hooks/useGitHub';

interface GitHubAuthProps {
  onAuthChange: (installationId: string | null, user: any) => void;
}

export function GitHubAuth({ onAuthChange }: GitHubAuthProps) {
  const [isInstalled, setIsInstalled] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [installation, setInstallation] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [userToken, setUserToken] = useState<string | null>(null);

  // React Query hooks - only call if we have a user token
  const {
    data: installationsData,
    isLoading: installationsLoading,
    error: installationsError,
    refetch: refetchInstallations
  } = useGitHubInstallations(userToken);

  const {
    data: githubUserData,
    isLoading: userLoading
  } = useGitHubUser(userToken || '');

  // Check localStorage on mount
  useEffect(() => {
    console.log('🔄 GitHubAuth useEffect triggered');

    const installationId = localStorage.getItem('github_installation_id');
    const userData = localStorage.getItem('github_user_data');
    const storedToken = localStorage.getItem('github_token');

    console.log('💾 localStorage installationId:', installationId);
    console.log('💾 localStorage userData:', userData);
    console.log('💾 localStorage token:', storedToken ? 'present' : 'none');

    if (storedToken) {
      setUserToken(storedToken);
    }

    if (installationId && userData && storedToken) {
      try {
        const parsedUser = JSON.parse(userData);
        console.log('👤 Parsed user data:', parsedUser);

        // For development, trust localStorage data without API verification
        if (process.env.NODE_ENV === 'development') {
          console.log('🧪 Development mode: trusting localStorage data');
          setUser(parsedUser);
          setInstallation({ id: installationId, repositories: [] });
          setIsInstalled(true);
          onAuthChange(installationId, parsedUser);
        }
      } catch (error) {
        console.error('❌ Failed to parse stored user data:', error);
        localStorage.removeItem('github_installation_id');
        localStorage.removeItem('github_user_data');
        localStorage.removeItem('github_token');
      }
    } else {
      console.log('ℹ️ No complete GitHub setup found (need app install + OAuth)');
    }
  }, [onAuthChange]);

  // Handle installations data
  useEffect(() => {
    if (installationsData && installationsData.success) {
      console.log('📡 Installations data received:', installationsData);

      const storedInstallationId = localStorage.getItem('github_installation_id');

      if (installationsData.installations.length > 0) {
        // Find the installation that matches stored ID or use the first one
        const targetInstallation = storedInstallationId
          ? installationsData.installations.find(inst => inst.id.toString() === storedInstallationId)
          : installationsData.installations[0];

        if (targetInstallation) {
          console.log('✅ Installation found:', targetInstallation);
          setInstallation(targetInstallation);
          setIsInstalled(true);

          // Store installation ID
          localStorage.setItem('github_installation_id', targetInstallation.id.toString());

          // Use user data from API if available, otherwise use stored data
          const currentUser = installationsData.user || user;
          if (currentUser) {
            onAuthChange(targetInstallation.id.toString(), currentUser);
          }
        }
      } else {
        console.log('⚠️ No installations found');
        setIsInstalled(false);
      }
    }
  }, [installationsData, user, onAuthChange]);

  // Handle GitHub user data
  useEffect(() => {
    if (githubUserData && userToken) {
      console.log('👤 GitHub user data received:', githubUserData);
      setUser(githubUserData);

      // Store user data
      localStorage.setItem('github_user_data', JSON.stringify(githubUserData));

      // If we have both user and installation, notify parent
      if (installation) {
        onAuthChange(installation.id.toString(), githubUserData);
      }
    }
  }, [githubUserData, userToken, installation, onAuthChange]);

  const handleGitHubOAuth = useCallback(() => {
    setLoading(true);

    // GitHub OAuth configuration for user authentication
    const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
    const authDomain = process.env.NEXT_PUBLIC_AUTH_DOMAIN || 'auth.dip.box';

    if (!clientId) {
      alert('GitHub OAuth is not configured. Please set NEXT_PUBLIC_GITHUB_CLIENT_ID environment variable.');
      setLoading(false);
      return;
    }

    let redirectUri: string;
    if (process.env.NODE_ENV === 'development') {
      redirectUri = `http://localhost:3000/auth/github/app/callback`;
    } else {
      redirectUri = `https://${authDomain}/auth/github/app/callback`;
    }

    // Store the original domain to redirect back after authentication
    const originalDomain = window.location.hostname;
    localStorage.setItem('github_auth_return_domain', originalDomain);

    // GitHub OAuth URL
    const oauthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user:email&state=${encodeURIComponent(originalDomain)}`;

    console.log('🔐 Opening GitHub OAuth:', oauthUrl);

    // Open OAuth in popup
    const popup = window.open(oauthUrl, 'github-oauth', 'width=600,height=700');

    // Listen for popup close or message
    const checkClosed = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkClosed);
        setLoading(false);

        // Check if token was stored
        const token = localStorage.getItem('github_token');
        if (token) {
          setUserToken(token);
          setTimeout(() => {
            refetchInstallations();
          }, 500);
        }
      }
    }, 1000);

    // Listen for messages from the popup
    const handleMessage = (event: MessageEvent) => {
      const allowedOrigins = [
        window.location.origin,
        `https://${authDomain}`,
        'http://localhost:3000'
      ];

      if (!allowedOrigins.includes(event.origin)) {
        console.warn('Message from unauthorized origin:', event.origin);
        return;
      }

      if (event.data.type === 'github-oauth-complete') {
        clearInterval(checkClosed);
        popup?.close();
        window.removeEventListener('message', handleMessage);
        setLoading(false);

        console.log('✅ OAuth completed');

        if (event.data.token) {
          localStorage.setItem('github_token', event.data.token);
          setUserToken(event.data.token);

          // Refetch installations now that we have auth
          setTimeout(() => {
            refetchInstallations();
          }, 500);
        }
      }
    };

    window.addEventListener('message', handleMessage);

    // Cleanup function
    const cleanup = () => {
      clearInterval(checkClosed);
      window.removeEventListener('message', handleMessage);
      setLoading(false);
    };

    const timeoutId = setTimeout(cleanup, 10 * 60 * 1000);

    return () => {
      clearTimeout(timeoutId);
      cleanup();
    };
  }, [refetchInstallations]);

  const handleGitHubAppInstall = useCallback(() => {
    setLoading(true);

    // GitHub App configuration
    const appName = process.env.NEXT_PUBLIC_GITHUB_APP_NAME || 'improvement-proposals-bot';

    // Always use the centralized auth domain for the callback
    const authDomain = process.env.NEXT_PUBLIC_AUTH_DOMAIN || 'auth.dip.box';
    let redirectUri: string;

    if (process.env.NODE_ENV === 'development') {
      redirectUri = `http://localhost:3000/auth/github/app/callback`;
    } else {
      redirectUri = `https://${authDomain}/auth/github/app/callback`;
    }

    // Store the original domain to redirect back after installation
    const originalDomain = window.location.hostname;
    localStorage.setItem('github_auth_return_domain', originalDomain);

    if (!appName) {
      alert('GitHub App is not configured. Please set NEXT_PUBLIC_GITHUB_APP_NAME environment variable.');
      setLoading(false);
      return;
    }

    // GitHub App installation URL with proper redirect_uri
    const installUrl = `https://github.com/apps/${appName}/installations/new?state=${encodeURIComponent(originalDomain)}`;

    console.log('🔗 Opening GitHub App installation:', installUrl);
    console.log('📍 Callback will redirect to:', redirectUri);

    // Open GitHub App installation in popup
    const popup = window.open(installUrl, 'github-install', 'width=800,height=700');

    // Listen for popup close or message
    const checkClosed = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkClosed);
        setLoading(false);

        // Refetch installations after popup closes
        setTimeout(() => {
          refetchInstallations();
        }, 1000);
      }
    }, 1000);

    // Listen for messages from the popup (including cross-domain messages)
    const handleMessage = (event: MessageEvent) => {
      // Allow messages from the auth domain or localhost
      const allowedOrigins = [
        window.location.origin,
        `https://${authDomain}`,
        'http://localhost:3000'
      ];

      if (!allowedOrigins.includes(event.origin)) {
        console.warn('Message from unauthorized origin:', event.origin);
        return;
      }

      if (event.data.type === 'github-installation-complete') {
        clearInterval(checkClosed);
        popup?.close();
        window.removeEventListener('message', handleMessage);
        setLoading(false);

        console.log('✅ Installation completed, refreshing data...');

        // Store the installation data
        if (event.data.installationId) {
          localStorage.setItem('github_installation_id', event.data.installationId);
        }
        if (event.data.user) {
          localStorage.setItem('github_user_data', JSON.stringify(event.data.user));
          setUserToken(event.data.user.token);
          setUser(event.data.user);
        }
        if (event.data.installation) {
          setInstallation(event.data.installation);
          setIsInstalled(true);
        }

        // Immediately notify parent component
        if (event.data.installationId && event.data.user) {
          onAuthChange(event.data.installationId, event.data.user);
        }

        // Refetch installations for consistency
        setTimeout(() => {
          refetchInstallations();
        }, 500);
      }
    };

    window.addEventListener('message', handleMessage);

    // Cleanup function to remove event listener if component unmounts
    const cleanup = () => {
      clearInterval(checkClosed);
      window.removeEventListener('message', handleMessage);
      setLoading(false);
    };

    // Set a timeout to cleanup if popup is still open after 10 minutes
    const timeoutId = setTimeout(cleanup, 10 * 60 * 1000);

    // Return cleanup function
    return () => {
      clearTimeout(timeoutId);
      cleanup();
    };
  }, [refetchInstallations, onAuthChange]);

  const handleManageInstallation = useCallback(() => {
    const appName = process.env.NEXT_PUBLIC_GITHUB_APP_NAME || 'improvement-proposals-bot';
    const manageUrl = `https://github.com/apps/${appName}`;
    window.open(manageUrl, '_blank');
  }, []);

  const handleRefreshInstallation = useCallback(() => {
    console.log('🔄 Refreshing GitHub installation data...');
    refetchInstallations();
  }, [refetchInstallations]);

  const handleDisconnect = useCallback(() => {
    console.log('🔌 Disconnecting GitHub integration...');
    localStorage.removeItem('github_installation_id');
    localStorage.removeItem('github_user_data');
    localStorage.removeItem('github_token');
    setUser(null);
    setInstallation(null);
    setIsInstalled(false);
    setUserToken(null);
    onAuthChange(null, null);
  }, [onAuthChange]);

  const isLoading = loading || installationsLoading || userLoading;

  if (installationsError) {
    return (
      <Alert color="red" title="GitHub Connection Error">
        <Stack gap="sm">
          <Text size="sm">
            Failed to check GitHub App installation: {installationsError.message}
          </Text>
          <Button size="sm" variant="light" onClick={handleRefreshInstallation}>
            Retry
          </Button>
        </Stack>
      </Alert>
    );
  }

  if (isInstalled && user && installation) {
    return (
      <Alert color="green" title="GitHub Connected" icon={<IconCheck size="1rem" />}>
        <Stack gap="sm">
          <Text size="sm">
            Connected as <strong>{user.login}</strong> via GitHub App installation
          </Text>
          <Group gap="sm">
            <Button
              size="sm"
              variant="light"
              leftSection={<IconSettings size="0.9rem" />}
              onClick={handleManageInstallation}
            >
              Manage
            </Button>
            <Button
              size="sm"
              variant="light"
              onClick={handleRefreshInstallation}
              loading={isLoading}
            >
              Refresh
            </Button>
            <Button
              size="sm"
              variant="outline"
              color="red"
              onClick={handleDisconnect}
            >
              Disconnect
            </Button>
          </Group>
        </Stack>
      </Alert>
    );
  }

  // Show OAuth needed if we have user token but no installations
  if (userToken && installationsData && installationsData.total === 0) {
    return (
      <Alert color="orange" title="GitHub App Installation Required">
        <Stack gap="md">
          <Text size="sm">
            You're authenticated with GitHub but haven't installed the app yet.
            Install the app to connect your repositories.
          </Text>
          <Button
            leftSection={<IconBrandGithub size="1rem" />}
            onClick={handleGitHubAppInstall}
            loading={isLoading}
            disabled={isLoading}
          >
            {isLoading ? 'Installing...' : 'Install GitHub App'}
          </Button>
        </Stack>
      </Alert>
    );
  }

  // Show app install needed if we have installations data but user needs OAuth
  if (!userToken && (localStorage.getItem('github_installation_id') || localStorage.getItem('github_user_data'))) {
    return (
      <Alert color="orange" title="GitHub Authentication Required">
        <Stack gap="md">
          <Text size="sm">
            We found GitHub App installations but need to authenticate you to access them securely.
          </Text>
          <Group gap="sm">
            <Button
              leftSection={<IconBrandGithub size="1rem" />}
              onClick={handleGitHubOAuth}
              loading={isLoading}
              disabled={isLoading}
            >
              {isLoading ? 'Authenticating...' : 'Authenticate with GitHub'}
            </Button>
            <Button
              variant="outline"
              onClick={handleGitHubAppInstall}
              loading={isLoading}
              disabled={isLoading}
            >
              Install App
            </Button>
          </Group>
        </Stack>
      </Alert>
    );
  }

  return (
    <Alert color="blue" title="GitHub Integration">
      <Stack gap="md">
        <Text size="sm">
          Connect your GitHub account to automatically submit EIPs as pull requests to the repository.
          This requires both installing our GitHub App and authenticating your account.
        </Text>
        <Group gap="sm">
          <Button
            leftSection={<IconBrandGithub size="1rem" />}
            onClick={handleGitHubAppInstall}
            loading={isLoading}
            disabled={isLoading}
          >
            {isLoading ? 'Installing...' : 'Install GitHub App'}
          </Button>
          <Button
            variant="outline"
            onClick={handleGitHubOAuth}
            loading={isLoading}
            disabled={isLoading}
          >
            {isLoading ? 'Authenticating...' : 'Authenticate'}
          </Button>
        </Group>
        <Text size="xs" c="dimmed">
          💡 You can do these in any order. Both are required for full functionality.
        </Text>
      </Stack>
    </Alert>
  );
}