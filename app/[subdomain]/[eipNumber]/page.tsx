"use client";

import { Container, Title, Text, Stack, Group, Button, Badge, Paper, Divider, Breadcrumbs, Anchor, Tabs, Grid } from "@mantine/core";
import { useState, useEffect, useMemo } from "react";
import { IconArrowLeft, IconEdit, IconExternalLink, IconCalendar, IconUser, IconFileText, IconClock } from "@tabler/icons-react";
import { useRouter, useParams } from "next/navigation";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { ErrorDisplay } from "@/components/shared/ErrorDisplay";
import { getProtocolConfig } from "@/lib/subdomain-utils";
import ReactMarkdown from 'react-markdown';

interface EipDetail {
  number: string;
  title: string;
  description?: string;
  author: string;
  status: string;
  type: string;
  category?: string;
  created: string;
  lastModified?: string;
  discussionsTo?: string;
  requires?: string[];
  content: string;
  pullRequestUrl?: string;
  protocol: string;
  wordCount?: number;
  sections?: string[];
  lastCommitDate?: string;
  fileSize?: number;
  authorEmails?: string[];
  authorGithubHandles?: string[];
  path?: string;
  sha?: string;
}

interface ApiResponse {
  success: boolean;
  data: EipDetail;
  protocol: string;
  number: string;
  error?: string;
  details?: string;
}

const statusColors: Record<string, string> = {
  "Draft": "blue",
  "Review": "yellow",
  "Last Call": "orange",
  "Final": "green",
  "Stagnant": "gray",
  "Withdrawn": "red",
  "Living": "violet"
};

export default function SubdomainEipDetailPage() {
  const router = useRouter();
  const params = useParams();
  const subdomain = params.subdomain as string;
  const eipNumber = params.eipNumber as string;

  const protocolConfig = useMemo(() => getProtocolConfig(subdomain), [subdomain]);

  const [eip, setEip] = useState<EipDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string | null>('content');

  useEffect(() => {
    const loadEip = async () => {
      if (!subdomain || !eipNumber) {
        setError("Subdomain or EIP number missing.");
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/eips/${subdomain}/${eipNumber}`);
        const data: ApiResponse = await response.json();

        if (data.success) {
          setEip(data.data);
        } else {
          throw new Error(data.error || `Failed to load ${protocolConfig.proposalPrefix} ${eipNumber}`);
        }
      } catch (err: unknown) {
        console.error(`Error loading ${protocolConfig.proposalPrefix} ${eipNumber} for ${subdomain}:`, err);
        setError(err instanceof Error ? err.message : `Failed to load ${protocolConfig.proposalPrefix} ${eipNumber}. Please try again.`);
      } finally {
        setIsLoading(false);
      }
    };

    loadEip();
  }, [subdomain, eipNumber, protocolConfig.name, protocolConfig.proposalPrefix]);

  const handleRetry = () => {
    setError(null);
    if (subdomain && eipNumber) {
        const loadEip = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await fetch(`/api/eips/${subdomain}/${eipNumber}`);
                const data: ApiResponse = await response.json();
                if (data.success) {
                setEip(data.data);
                } else {
                throw new Error(data.error || `Failed to load ${protocolConfig.proposalPrefix} ${eipNumber}`);
                }
            } catch (err: unknown) {
                console.error(`Error loading ${protocolConfig.proposalPrefix} ${eipNumber} for ${subdomain}:`, err);
                setError(err instanceof Error ? err.message : `Failed to load ${protocolConfig.proposalPrefix} ${eipNumber}. Please try again.`);
            } finally {
                setIsLoading(false);
            }
        };
        loadEip();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatWordCount = (count?: number) => {
    if (!count) return "";
    return `${count.toLocaleString()} words`;
  };

  const formatFileSize = (size?: number) => {
    if (!size) return "";
    const kb = size / 1024;
    return `${kb.toFixed(1)} KB`;
  };

  if (!protocolConfig || protocolConfig.subdomain === 'main') {
     return (
      <Container size="lg" py="xl">
        <ErrorDisplay title="Invalid Protocol" message={`The protocol "${subdomain}" is not recognized for displaying an EIP.`} variant="page" />
      </Container>
    );
  }

  if (isLoading) {
    return (
      <Container size="lg" py="xl">
        <LoadingSpinner message={`Loading ${protocolConfig.proposalPrefix} ${eipNumber}...`} />
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="lg" py="xl">
        <ErrorDisplay
          title={`Failed to Load ${protocolConfig.proposalPrefix}`}
          message={error}
          onRetry={handleRetry}
          variant="page"
        />
      </Container>
    );
  }

  if (!eip) {
    return (
      <Container size="lg" py="xl">
        <ErrorDisplay
          title={`${protocolConfig.proposalPrefix} Not Found`}
          message={`${protocolConfig.proposalPrefix} ${eipNumber} could not be found for the ${protocolConfig.name} protocol.`}
          variant="page"
        />
      </Container>
    );
  }

  const breadcrumbItems = [
    { title: `${protocolConfig.name} ${protocolConfig.proposalPrefix}s`, href: `/` },
    { title: `${protocolConfig.proposalPrefix}-${eip.number}`, href: '#' }
  ].map((item, index) => (
    <Anchor
      key={index}
      onClick={() => item.href !== '#' && router.push(item.href)}
      style={{ cursor: item.href !== '#' ? 'pointer' : 'default' }}
    >
      {item.title}
    </Anchor>
  ));

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <Group>
          <Button
            variant="subtle"
            leftSection={<IconArrowLeft size="1rem" />}
            onClick={() => router.push(`/`)}
          >
            Back to {protocolConfig.name} {protocolConfig.proposalPrefix}s
          </Button>
        </Group>

        <Breadcrumbs>{breadcrumbItems}</Breadcrumbs>

        <Paper p="xl" withBorder>
          <Stack gap="md">
            <Group justify="space-between" align="flex-start">
              <div style={{ flex: 1 }}>
                <Group mb="sm">
                  <Title order={1}>{protocolConfig.proposalPrefix}-{eip.number}</Title>
                  <Badge color={statusColors[eip.status] || 'gray'} size="lg" variant="light">
                    {eip.status}
                  </Badge>
                  <Badge variant="outline" size="lg">
                    {eip.type}
                  </Badge>
                  {eip.category && (
                    <Badge variant="outline" color="blue" size="lg">
                      {eip.category}
                    </Badge>
                  )}
                </Group>
                <Title order={2} mb="md">{eip.title}</Title>
                {eip.description && (
                  <Text size="lg" c="dimmed" mb="md">
                    {eip.description}
                  </Text>
                )}
              </div>
              <Group gap="xs">
                <Button
                  variant="light"
                  leftSection={<IconEdit size="1rem" />}
                  onClick={() => router.push(`/${subdomain}/${eip.number}/edit`)}
                >
                  Edit
                </Button>
                {eip.pullRequestUrl && (
                  <Button
                    variant="light"
                    color="green"
                    leftSection={<IconExternalLink size="1rem" />}
                    onClick={() => window.open(eip.pullRequestUrl, '_blank')}
                  >
                    View PR
                  </Button>
                )}
              </Group>
            </Group>
            <Divider />
            <Grid>
              <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                <Stack gap="xs">
                  <Group gap="xs">
                    <IconUser size="1rem" />
                    <Text size="sm" fw={500}>Author(s)</Text>
                  </Group>
                  <Text size="sm" c="dimmed">{eip.author}</Text>
                </Stack>
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                <Stack gap="xs">
                  <Group gap="xs">
                    <IconCalendar size="1rem" />
                    <Text size="sm" fw={500}>Created</Text>
                  </Group>
                  <Text size="sm" c="dimmed">{formatDate(eip.created)}</Text>
                </Stack>
              </Grid.Col>
              {eip.lastModified && (
                <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                  <Stack gap="xs">
                    <Group gap="xs">
                      <IconClock size="1rem" />
                      <Text size="sm" fw={500}>Last Modified</Text>
                    </Group>
                    <Text size="sm" c="dimmed">{formatDate(eip.lastModified)}</Text>
                  </Stack>
                </Grid.Col>
              )}
              {eip.wordCount && (
                <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                  <Stack gap="xs">
                    <Group gap="xs">
                      <IconFileText size="1rem" />
                      <Text size="sm" fw={500}>Word Count</Text>
                    </Group>
                    <Text size="sm" c="dimmed">{formatWordCount(eip.wordCount)}</Text>
                  </Stack>
                </Grid.Col>
              )}
              {eip.fileSize && (
                <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                  <Stack gap="xs">
                    <Text size="sm" fw={500}>File Size</Text>
                    <Text size="sm" c="dimmed">{formatFileSize(eip.fileSize)}</Text>
                  </Stack>
                </Grid.Col>
              )}
              {eip.sections && eip.sections.length > 0 && (
                <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                  <Stack gap="xs">
                    <Text size="sm" fw={500}>Sections</Text>
                    <Text size="sm" c="dimmed">{eip.sections.length} sections</Text>
                  </Stack>
                </Grid.Col>
              )}
              {eip.requires && eip.requires.length > 0 && (
                <Grid.Col span={{ base: 12 }}>
                  <Stack gap="xs">
                    <Text size="sm" fw={500}>Requires</Text>
                    <Group gap="xs">
                      {eip.requires.map((req) => (
                        <Badge
                          key={req}
                          variant="outline"
                          size="sm"
                          style={{ cursor: 'pointer' }}
                          onClick={() => router.push(`/${subdomain}/${req}`)}
                        >
                          {protocolConfig.proposalPrefix}-{req}
                        </Badge>
                      ))}
                    </Group>
                  </Stack>
                </Grid.Col>
              )}
              {eip.discussionsTo && (
                <Grid.Col span={{ base: 12 }}>
                  <Stack gap="xs">
                    <Text size="sm" fw={500}>Discussions</Text>
                    <Anchor href={eip.discussionsTo} target="_blank" size="sm">
                      {eip.discussionsTo}
                    </Anchor>
                  </Stack>
                </Grid.Col>
              )}
            </Grid>
          </Stack>
        </Paper>

        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="content">Content</Tabs.Tab>
            {eip.sections && eip.sections.length > 0 && (
              <Tabs.Tab value="sections">Sections ({eip.sections.length})</Tabs.Tab>
            )}
            <Tabs.Tab value="metadata">Metadata</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="content" pt="xl">
            <Paper p="xl" withBorder>
              <div className="markdown-content">
                <ReactMarkdown>
                  {eip.content}
                </ReactMarkdown>
              </div>
            </Paper>
          </Tabs.Panel>

          {eip.sections && eip.sections.length > 0 && (
            <Tabs.Panel value="sections" pt="xl">
              <Paper p="xl" withBorder>
                <Stack gap="md">
                  <Title order={3}>Document Sections</Title>
                  <Text c="dimmed" mb="lg">
                    This {protocolConfig.name} contains {eip.sections.length} main sections:
                  </Text>
                  <Grid>
                    {eip.sections.map((section, index) => (
                      <Grid.Col span={{ base: 12, sm: 6, md: 4 }} key={index}>
                        <Paper p="md" withBorder>
                          <Text fw={500}>{section}</Text>
                        </Paper>
                      </Grid.Col>
                    ))}
                  </Grid>
                </Stack>
              </Paper>
            </Tabs.Panel>
          )}

          <Tabs.Panel value="metadata" pt="xl">
            <Paper p="xl" withBorder>
              <Stack gap="lg">
                <Title order={3}>Technical Metadata</Title>
                <Grid>
                  {eip.path && (
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <Stack gap="xs">
                        <Text fw={500}>Repository Path</Text>
                        <Text size="sm" c="dimmed" style={{ fontFamily: 'monospace' }}>
                          {eip.path}
                        </Text>
                      </Stack>
                    </Grid.Col>
                  )}
                  {eip.sha && (
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <Stack gap="xs">
                        <Text fw={500}>Git SHA</Text>
                        <Text size="sm" c="dimmed" style={{ fontFamily: 'monospace' }}>
                          {eip.sha.substring(0, 8)}...
                        </Text>
                      </Stack>
                    </Grid.Col>
                  )}
                  {eip.lastCommitDate && (
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <Stack gap="xs">
                        <Text fw={500}>Last Commit Date</Text>
                        <Text size="sm" c="dimmed">
                          {formatDate(eip.lastCommitDate)}
                        </Text>
                      </Stack>
                    </Grid.Col>
                  )}
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <Stack gap="xs">
                      <Text fw={500}>Protocol</Text>
                      <Text size="sm" c="dimmed">{eip.protocol}</Text>
                    </Stack>
                  </Grid.Col>
                  {eip.authorEmails && eip.authorEmails.length > 0 && (
                    <Grid.Col span={{ base: 12 }}>
                      <Stack gap="xs">
                        <Text fw={500}>Author Emails</Text>
                        <Group gap="xs">
                          {eip.authorEmails.map((email, index) => (
                            <Badge key={index} variant="outline" size="sm">
                              {email}
                            </Badge>
                          ))}
                        </Group>
                      </Stack>
                    </Grid.Col>
                  )}
                  {eip.authorGithubHandles && eip.authorGithubHandles.length > 0 && (
                    <Grid.Col span={{ base: 12 }}>
                      <Stack gap="xs">
                        <Text fw={500}>GitHub Handles</Text>
                        <Group gap="xs">
                          {eip.authorGithubHandles.map((handle, index) => (
                            <Badge key={index} variant="outline" size="sm">
                              @{handle}
                            </Badge>
                          ))}
                        </Group>
                      </Stack>
                    </Grid.Col>
                  )}
                </Grid>
              </Stack>
            </Paper>
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
}