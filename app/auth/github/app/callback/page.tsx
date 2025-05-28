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

    if (setupAction === 'install') {
      const newInstallationId = searchParams.get('installation_id');
      if (newInstallationId) {
        setInstallationId(newInstallationId);
        setStatus('success');
        // Optionally, redirect to a setup complete page or main app page
        // router.push(`/auth/github/app/setup?installation_id=${newInstallationId}`);
      } else {
        setErrorDetails('Installation ID not found after successful installation.');
        setStatus('error');
      }
    } else if (code) {
      // This part would typically handle the OAuth flow for user authentication,
      // not GitHub App installation. For app installation, the installation_id is key.
      // If this page is solely for app installation callback, this branch might be less relevant.
      // For now, let's assume if 'code' is present without 'setup_action=install', it's an unexpected state.
      console.warn('Received OAuth code on app installation callback. This might be unexpected.', { code });
      setErrorDetails('Unexpected callback state. If you were installing the app, please ensure the process completed correctly.');
      setStatus('error');
    } else {
      setErrorDetails('No installation ID or authorization code found in the callback.');
      setStatus('error');
    }
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
              The GitHub App has been successfully installed or configured.
              {installationId && ` Your Installation ID is: ${installationId}`}
            </Text>
            <Button
              mt="md"
              onClick={handleContinue}
              rightSection={<IconArrowRight size="1rem" />}
            >
              Continue to Setup
            </Button>
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