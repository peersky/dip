'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Container, Title, Text, Button, Stack, Alert, List, Card, Center, Loader } from '@mantine/core';
import { IconCheck, IconArrowRight, IconBrandGithub } from '@tabler/icons-react';

function GitHubAppSetupContent() {
  const searchParams = useSearchParams();
  const [installationId, setInstallationId] = useState<string | null>(null);

  useEffect(() => {
    const id = searchParams.get('installation_id');
    setInstallationId(id);
  }, [searchParams]);

  const handleContinue = () => {
    // Get the original domain to redirect back to
    const returnDomain = localStorage.getItem('github_auth_return_domain') || 'ethereum.dip.box';
    localStorage.removeItem('github_auth_return_domain');

    // Redirect back to original subdomain
    window.location.href = `https://${returnDomain}`;
  };

  return (
    <Container size="md" py="xl">
      <Stack gap="xl" align="center">
        <Alert icon={<IconCheck size="1.5rem" />} title="GitHub App Installed Successfully!" color="green" w="100%">
          <Text>
            The DIP Platform GitHub App has been installed and configured for your account.
          </Text>
        </Alert>

        <Card shadow="sm" padding="lg" radius="md" withBorder w="100%">
          <Stack gap="md">
            <Title order={2}>What's Next?</Title>

            <Text>
              You can now create and submit EIPs directly to GitHub repositories. Here's what the DIP Platform can do:
            </Text>

            <List spacing="sm" size="sm" center icon={<IconCheck size="1rem" color="green" />}>
              <List.Item>
                <strong>Create EIPs:</strong> Use our form-based editor with validation
              </List.Item>
              <List.Item>
                <strong>Auto-submit PRs:</strong> Automatically create pull requests from your GitHub account
              </List.Item>
              <List.Item>
                <strong>Repository Selection:</strong> Only access repositories you've granted permission to
              </List.Item>
              <List.Item>
                <strong>Multi-Protocol:</strong> Works with Ethereum EIPs, Arbitrum AIPs, and other protocols
              </List.Item>
            </List>

            <Alert color="blue" variant="light">
              <Text size="sm">
                <strong>Privacy Note:</strong> The DIP Platform only has access to the repositories you selected during installation.
                You can modify these permissions anytime in your GitHub settings.
              </Text>
            </Alert>
          </Stack>
        </Card>

        <Card shadow="sm" padding="lg" radius="md" withBorder w="100%">
          <Stack gap="md">
            <Title order={3}>Managing Your Installation</Title>

            <Text size="sm">
              You can manage the GitHub App installation at any time:
            </Text>

            <List spacing="xs" size="sm">
              <List.Item>
                <strong>Add/Remove Repositories:</strong> Go to GitHub Settings → Applications → DIP Platform
              </List.Item>
              <List.Item>
                <strong>Revoke Access:</strong> Uninstall the app completely if needed
              </List.Item>
              <List.Item>
                <strong>View Permissions:</strong> See exactly what access has been granted
              </List.Item>
            </List>

            <Button
              component="a"
              href="https://github.com/settings/installations"
              target="_blank"
              variant="outline"
              leftSection={<IconBrandGithub size="1rem" />}
              size="sm"
            >
              Manage GitHub App Settings
            </Button>
          </Stack>
        </Card>

        <Button
          size="lg"
          rightSection={<IconArrowRight size="1rem" />}
          onClick={handleContinue}
        >
          Continue to DIP Platform
        </Button>

        {installationId && (
          <Text size="xs" c="dimmed">
            Installation ID: {installationId}
          </Text>
        )}
      </Stack>
    </Container>
  );
}

export default function GitHubAppSetupPage() {
  return (
    <Suspense fallback={<Center h="100vh"><Loader /></Center>}>
      <GitHubAppSetupContent />
    </Suspense>
  );
}