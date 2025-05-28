'use client';

import { useState } from 'react';
import { Container, Title, Stack, Button, Textarea, Select, Alert, Code, Group } from '@mantine/core';
import { notifications } from '@mantine/notifications';

const webhookExamples = {
  installation: {
    action: 'created',
    installation: {
      id: 12345,
      account: { login: 'testuser' },
      repository_selection: 'selected',
    },
    sender: { login: 'testuser' },
  },
  installation_update: {
    action: 'updated',
    installation: {
      id: 12345,
      account: { login: 'testuser' },
    },
    repositories_added: [{ name: 'EIPs', full_name: 'ethereum/EIPs' }],
    repositories_removed: [],
  },
  pull_request_opened: {
    action: 'opened',
    pull_request: {
      number: 123,
      title: 'EIP-XXXX: Example Improvement Proposal',
      user: { login: 'testuser' },
      state: 'open',
      merged: false,
      html_url: 'https://github.com/ethereum/EIPs/pull/123',
    },
    repository: {
      name: 'EIPs',
      full_name: 'ethereum/EIPs',
    },
  },
  pull_request_review: {
    action: 'submitted',
    review: {
      user: { login: 'reviewer' },
      state: 'approved',
      body: 'Looks good! Just a few minor suggestions.',
    },
    pull_request: {
      number: 123,
      title: 'EIP-XXXX: Example Improvement Proposal',
    },
    repository: {
      name: 'EIPs',
      full_name: 'ethereum/EIPs',
    },
  },
};

export default function WebhookTestPage() {
  const [selectedEvent, setSelectedEvent] = useState<string>('installation');
  const [payload, setPayload] = useState(JSON.stringify(webhookExamples.installation, null, 2));
  const [loading, setLoading] = useState(false);

  const handleEventChange = (value: string | null) => {
    if (value && value in webhookExamples) {
      setSelectedEvent(value);
      setPayload(JSON.stringify(webhookExamples[value as keyof typeof webhookExamples], null, 2));
    }
  };

  const testWebhook = async () => {
    setLoading(true);

    try {
      const response = await fetch('/api/github/webhooks/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventType: selectedEvent,
          payload: JSON.parse(payload),
        }),
      });

      const result = await response.json();

      if (response.ok) {
        notifications.show({
          title: 'Webhook Test Successful',
          message: `Event "${selectedEvent}" processed successfully`,
          color: 'green',
        });
        console.log('Webhook test result:', result);
      } else {
        notifications.show({
          title: 'Webhook Test Failed',
          message: result.error || 'Unknown error',
          color: 'red',
        });
      }
    } catch (error) {
      notifications.show({
        title: 'Network Error',
        message: 'Failed to send test webhook',
        color: 'red',
      });
      console.error('Webhook test error:', error);
    }

    setLoading(false);
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
        <Title order={1}>Webhook Testing (Development)</Title>

        <Alert color="blue" title="Development Testing">
          This page allows you to test webhook functionality locally without needing external webhook delivery.
        </Alert>

        <Stack gap="md">
          <Select
            label="Event Type"
            value={selectedEvent}
            onChange={handleEventChange}
            data={[
              { value: 'installation', label: 'Installation Created' },
              { value: 'installation_update', label: 'Installation Updated' },
              { value: 'pull_request_opened', label: 'Pull Request Opened' },
              { value: 'pull_request_review', label: 'Pull Request Review' },
            ]}
          />

          <Textarea
            label="Webhook Payload"
            value={payload}
            onChange={(e) => setPayload(e.target.value)}
            minRows={15}
            maxRows={25}
            style={{ fontFamily: 'monospace' }}
          />

          <Group>
            <Button onClick={testWebhook} loading={loading}>
              Send Test Webhook
            </Button>

            <Button
              variant="outline"
              onClick={() => handleEventChange(selectedEvent)}
            >
              Reset to Example
            </Button>
          </Group>
        </Stack>

        <Alert color="gray" title="How to Use">
          <Stack gap="xs">
            <div>1. Select an event type from the dropdown</div>
            <div>2. Modify the payload JSON if needed</div>
            <div>3. Click "Send Test Webhook" to simulate the event</div>
            <div>4. Check the browser console and server logs for results</div>
          </Stack>
        </Alert>

        <Code block>
          {`// Example: Test from command line
curl -X POST http://localhost:3000/api/github/webhooks/test \\
  -H "Content-Type: application/json" \\
  -d '{
    "eventType": "installation",
    "payload": ${JSON.stringify(webhookExamples.installation, null, 6)}
  }'`}
        </Code>
      </Stack>
    </Container>
  );
}