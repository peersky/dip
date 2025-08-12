'use client';

import { useState } from 'react';
import { Container, Title, Stack, Button, TextInput, Alert, Code, Text } from '@mantine/core';

export default function GitHubTestPage() {
  const [installationId, setInstallationId] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testInstallation = async () => {
    if (!installationId.trim()) {
      setError('Please enter an installation ID');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log('Testing installation ID:', installationId);

      const response = await fetch('/api/auth/github/app/installation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ installationId: installationId.trim() }),
      });

      const data = await response.json();

      console.log('API Response:', { status: response.status, data });

      if (response.ok) {
        setResult(data);
      } else {
        setError(`API Error (${response.status}): ${data.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      console.error('Network error:', err);
      setError(`Network Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const checkLocalStorage = () => {
    const storedId = localStorage.getItem('github_installation_id');
    const storedUser = localStorage.getItem('github_user_data');

    console.log('LocalStorage contents:', {
      installationId: storedId,
      userData: storedUser,
    });

    if (storedId) {
      setInstallationId(storedId);
    }
  };

  const simulateInstallation = () => {
    // Simulate a successful GitHub App installation
    const mockInstallationId = '12345678';
    const mockUserData = {
      login: 'testuser',
      id: 123456,
      avatar_url: 'https://github.com/testuser.png',
      name: 'Test User',
      email: 'test@example.com',
    };

    localStorage.setItem('github_installation_id', mockInstallationId);
    localStorage.setItem('github_user_data', JSON.stringify(mockUserData));

    console.log('✅ Simulated GitHub installation:', {
      installationId: mockInstallationId,
      userData: mockUserData,
    });

    alert('Simulated installation set! Refresh the page to see the GitHub Auth component update.');
  };

  const clearInstallation = () => {
    localStorage.removeItem('github_installation_id');
    localStorage.removeItem('github_user_data');
    console.log('🗑️ Cleared GitHub installation data');
    alert('Installation data cleared! Refresh the page to see the GitHub Auth component update.');
  };

  if (process.env.NODE_ENV !== 'development') {
    return (
      <Container size="md" py="xl">
        <Alert color="red" title="Development Only">
          This page is only available in development mode.
        </Alert>
      </Container>
    );
  }

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <Title order={1}>GitHub Installation Test</Title>

        <Alert color="blue" title="Debug Tool">
          Use this page to test the GitHub App installation API and debug authentication issues.
        </Alert>

        <Stack gap="md">
          <TextInput
            label="Installation ID"
            placeholder="Enter GitHub App installation ID"
            value={installationId}
            onChange={(e) => setInstallationId(e.target.value)}
          />

          <Stack gap="xs">
            <Button onClick={testInstallation} loading={loading}>
              Test Installation API
            </Button>

            <Button variant="outline" onClick={checkLocalStorage}>
              Check LocalStorage
            </Button>

            <Button variant="outline" onClick={simulateInstallation}>
              Simulate Installation
            </Button>

            <Button variant="outline" onClick={clearInstallation}>
              Clear Installation
            </Button>
          </Stack>
        </Stack>

        {error && (
          <Alert color="red" title="Error">
            {error}
          </Alert>
        )}

        {result && (
          <Stack gap="md">
            <Alert color="green" title="Success">
              Installation API returned valid data
            </Alert>

            <div>
              <Text fw={500} mb="xs">Installation Info:</Text>
              <Code block>
                {JSON.stringify({
                  id: result.installation?.id,
                  account: result.installation?.account?.login,
                  type: result.installation?.account?.type,
                  repositoryCount: result.installation?.repositories?.length,
                }, null, 2)}
              </Code>
            </div>

            <div>
              <Text fw={500} mb="xs">User Info:</Text>
              <Code block>
                {JSON.stringify({
                  login: result.user?.login,
                  name: result.user?.name,
                  email: result.user?.email,
                }, null, 2)}
              </Code>
            </div>

            <div>
              <Text fw={500} mb="xs">Repositories ({result.installation?.repositories?.length || 0}):</Text>
              <Code block>
                {JSON.stringify(
                  result.installation?.repositories?.map((r: any) => ({
                    name: r.name,
                    full_name: r.full_name,
                    private: r.private,
                  })) || [],
                  null,
                  2
                )}
              </Code>
            </div>

            <div>
              <Text fw={500} mb="xs">Relevant Repositories:</Text>
              <Code block>
                {JSON.stringify(
                  result.installation?.repositories?.filter((repo: any) =>
                    repo.name === 'EIPs' ||
                    repo.name.toLowerCase().includes('improvement') ||
                    repo.name.toLowerCase().includes('proposal') ||
                    repo.name.toLowerCase().includes('eip') ||
                    repo.name.toLowerCase().includes('aip')
                  ).map((r: any) => r.name) || [],
                  null,
                  2
                )}
              </Code>
            </div>
          </Stack>
        )}
      </Stack>
    </Container>
  );
}