'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Container, Text, Loader, Alert, Center } from '@mantine/core';
import { IconCheck, IconX } from '@tabler/icons-react';

function GitHubCallbackContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');

      if (error) {
        setStatus('error');
        setMessage(`GitHub authentication failed: ${error}`);
        return;
      }

      if (!code) {
        setStatus('error');
        setMessage('No authorization code received from GitHub');
        return;
      }

      try {
        // Exchange code for access token
        const response = await fetch('/api/auth/github/exchange', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code }),
        });

        const data = await response.json();

        if (response.ok && data.access_token) {
          // Store token in localStorage
          localStorage.setItem('github_token', data.access_token);
          setStatus('success');
          setMessage('Successfully authenticated with GitHub!');

          // Get the original domain to redirect back to
          const returnDomain = localStorage.getItem('github_auth_return_domain');
          localStorage.removeItem('github_auth_return_domain');

          // Close popup window or redirect back to original domain
          if (window.opener) {
            // This is a popup window
            setTimeout(() => {
              window.close();
            }, 2000);
          } else if (returnDomain && returnDomain !== window.location.hostname) {
            // Redirect back to original subdomain
            setTimeout(() => {
              window.location.href = `https://${returnDomain}`;
            }, 2000);
          } else {
            // Fallback: redirect to home
            setTimeout(() => {
              window.location.href = '/';
            }, 2000);
          }
        } else {
          setStatus('error');
          setMessage(data.error || 'Failed to exchange authorization code');
        }
      } catch (error) {
        setStatus('error');
        setMessage('Network error during authentication');
        console.error('GitHub auth error:', error);
      }
    };

    handleCallback();
  }, [searchParams]);

  return (
    <Container size="sm" py="xl">
      {status === 'loading' && (
        <div style={{ textAlign: 'center' }}>
          <Loader size="lg" mb="md" />
          <Text>Completing GitHub authentication...</Text>
        </div>
      )}

      {status === 'success' && (
        <Alert icon={<IconCheck size="1rem" />} title="Success!" color="green">
          <Text>{message}</Text>
          <Text size="sm" c="dimmed" mt="xs">
            This window will close automatically.
          </Text>
        </Alert>
      )}

      {status === 'error' && (
        <Alert icon={<IconX size="1rem" />} title="Authentication Failed" color="red">
          <Text>{message}</Text>
          <Text size="sm" c="dimmed" mt="xs">
            Please close this window and try again.
          </Text>
        </Alert>
      )}
    </Container>
  );
}

export default function GitHubCallbackPage() {
  return (
    <Suspense fallback={<Center h="100vh"><Loader /></Center>}>
      <GitHubCallbackContent />
    </Suspense>
  );
}