'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Container, Title, Text, Button, Stack, Alert, Code, Paper, Center, Loader } from '@mantine/core';
import { IconCheck, IconX, IconLoader, IconArrowRight } from '@tabler/icons-react';

function GitHubAppCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [installationId, setInstallationId] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('code');
    const setupAction = searchParams.get('setup_action');
    const newInstallationId = searchParams.get('installation_id');

    console.log('GitHub App callback params:', { code, setupAction, newInstallationId });

    const processInstallation = async () => {
      if (setupAction === 'install' && newInstallationId) {
        try {
          setInstallationId(newInstallationId);

          // Fetch installation details to get user info
          const response = await fetch('/api/auth/github/app/installation', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ installationId: newInstallationId }),
          });

          const data = await response.json();

          if (response.ok && data.installation && data.user) {
            setStatus('success');

            // Store installation data
            localStorage.setItem('github_installation_id', newInstallationId);
            localStorage.setItem('github_user_data', JSON.stringify(data.user));

            // Notify parent window if this is a popup
            if (window.opener) {
              console.log('Sending installation complete message to parent window');

              // Get the original domain from localStorage or URL state
              const returnDomain = localStorage.getItem('github_auth_return_domain') ||
                                 searchParams.get('state') ||
                                 'dip.box';

              // Determine the target origin for the parent window
              let targetOrigin = window.location.origin; // Default to same origin

              // If we have a return domain and it's different from current domain
              if (returnDomain && returnDomain !== window.location.hostname) {
                if (returnDomain === 'localhost' || returnDomain.includes('localhost')) {
                  targetOrigin = 'http://localhost:3000';
                } else {
                  targetOrigin = `https://${returnDomain}`;
                }
              }

              console.log('Sending message to target origin:', targetOrigin);

              window.opener.postMessage({
                type: 'github-installation-complete',
                installationId: newInstallationId,
                user: data.user,
                installation: data.installation
              }, targetOrigin);

              // Close popup after a short delay
              setTimeout(() => {
                window.close();
              }, 1500);
            } else {
              // Not a popup, redirect to setup page after a delay
              setTimeout(() => {
                router.push(`/auth/github/app/setup?installation_id=${newInstallationId}`);
              }, 2000);
            }
          } else {
            setErrorDetails(`Failed to fetch installation details: ${data.error || 'Unknown error'}`);
            setStatus('error');
          }
        } catch (error) {
          console.error('Error processing installation:', error);
          setErrorDetails(`Failed to process installation: ${error instanceof Error ? error.message : 'Unknown error'}`);
          setStatus('error');
        }
      } else if (code) {
        // This part would typically handle the OAuth flow for user authentication,
        // not GitHub App installation. For app installation, the installation_id is key.
        console.warn('Received OAuth code on app installation callback. This might be unexpected.', { code });
        setErrorDetails('Unexpected callback state. If you were installing the app, please ensure the process completed correctly.');
        setStatus('error');
      } else {
        setErrorDetails('No installation ID or authorization code found in the callback.');
        setStatus('error');
      }
    };

    processInstallation();
  }, [searchParams, router]);

  const handleContinue = () => {
    if (installationId) {
      router.push(`/auth/github/app/setup?installation_id=${installationId}`);
    } else {
      // Fallback or error handling if installationId is not set
      router.push('/');
    }
  };

  return (
    <Container size="sm" py="xl">
      <Stack gap="xl" align="center">
        {status === 'loading' && (
          <Paper p="xl" withBorder radius="md" w="100%">
            <Stack align="center" gap="md">
              <IconLoader size="2rem" />
              <Title order={2}>Processing GitHub App Installation...</Title>
              <Text c="dimmed">Please wait while we finalize the setup.</Text>
            </Stack>
          </Paper>
        )}

        {status === 'success' && (
          <Alert icon={<IconCheck size="1.5rem" />} title="GitHub App Installation Successful!" color="green" w="100%">
            <Text>
              The GitHub App has been successfully installed and configured.
              {installationId && ` Your Installation ID is: ${installationId}`}
            </Text>
            {!window.opener && (
              <Button
                mt="md"
                onClick={handleContinue}
                rightSection={<IconArrowRight size="1rem" />}
              >
                Continue to Setup
              </Button>
            )}
            {window.opener && (
              <Text mt="md" size="sm" c="dimmed">
                This window will close automatically...
              </Text>
            )}
          </Alert>
        )}

        {status === 'error' && (
          <Alert icon={<IconX size="1.5rem" />} title="GitHub App Installation Failed" color="red" w="100%">
            <Text>
              There was an issue processing your GitHub App installation.
            </Text>
            {errorDetails && (
              <Code block mt="sm" color="red">
                {errorDetails}
              </Code>
            )}
            <Button mt="md" onClick={() => router.push('/')} variant="outline">
              Go to Homepage
            </Button>
          </Alert>
        )}
      </Stack>
    </Container>
  );
}

export default function GitHubAppCallbackPage() {
  return (
    <Suspense fallback={<Center h="100vh"><Loader /></Center>}>
      <GitHubAppCallbackContent />
    </Suspense>
  );
}