"use client";

import { Container, Title, Text, Stack, Group, Button, Badge, Paper, Divider, Breadcrumbs, Anchor, Tabs } from "@mantine/core";
import { useState, useEffect } from "react";
import { IconArrowLeft, IconEdit, IconExternalLink, IconGitPullRequest, IconEye } from "@tabler/icons-react";
import { useRouter, useParams } from "next/navigation";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { ErrorDisplay } from "@/components/shared/ErrorDisplay";
import { useTenant } from "@/hooks/useTenant";
import ReactMarkdown from 'react-markdown';

interface EipDetail {
  number: string;
  title: string;
  description: string;
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
}

const mockEipDetail: EipDetail = {
  number: "1",
  title: "EIP Purpose and Guidelines",
  description: "This EIP provides guidelines and standards for creating EIPs.",
  author: "Martin Becze, Hudson Jameson",
  status: "Living",
  type: "Meta",
  created: "2015-10-27",
  lastModified: "2023-02-01",
  discussionsTo: "https://ethereum-magicians.org/t/eip-1-eip-purpose-and-guidelines/",
  requires: [],
  content: `## Abstract

This EIP provides guidelines and standards for creating EIPs (Ethereum Improvement Proposals).

## Motivation

EIPs are the primary mechanisms for proposing new features, collecting community input on issues, and documenting design decisions for Ethereum.

## Specification

### EIP Types

There are three types of EIP:

- **Standards Track EIP**: Describes any change that affects most or all Ethereum implementations
- **Meta EIP**: Describes a process surrounding Ethereum or proposes a change to a process
- **Informational EIP**: Describes an Ethereum design issue or provides general guidelines

### EIP Status Terms

- **Draft**: An EIP that is undergoing rapid iteration and changes
- **Review**: An EIP author marks an EIP as ready for and requesting Peer Review
- **Last Call**: This is the final review window for an EIP before moving to FINAL
- **Final**: This EIP represents the final standard
- **Stagnant**: Any EIP in Draft or Review if inactive for 6+ months
- **Withdrawn**: The EIP Author(s) have withdrawn the proposed EIP
- **Living**: A special status for EIPs that are designed to be continually updated

## Copyright

Copyright and related rights waived via [CC0](../LICENSE.md).`,
  pullRequestUrl: "https://github.com/ethereum/EIPs/pull/1"
};

const statusColors: Record<string, string> = {
  "Draft": "blue",
  "Review": "yellow",
  "Last Call": "orange",
  "Final": "green",
  "Stagnant": "gray",
  "Withdrawn": "red",
  "Living": "violet"
};

export default function EipDetailPage() {
  const router = useRouter();
  const params = useParams();
  const eipNumber = params.eipNumber as string;
  const { protocolConfig, repositoryInfo, isLoading: tenantLoading } = useTenant();

  const [eip, setEip] = useState<EipDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string | null>('content');

  // Simulate loading EIP (replace with actual API call)
  useEffect(() => {
    const loadEip = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 800));

        // In a real implementation, this would be an API call
        if (eipNumber === "1") {
          setEip(mockEipDetail);
        } else {
          // Simulate other EIPs
          setEip({
            ...mockEipDetail,
            number: eipNumber,
            title: `Sample ${protocolConfig.name} ${eipNumber}`,
            description: `This is a sample ${protocolConfig.name} for demonstration purposes.`,
            content: `## Abstract\n\nThis is a sample ${protocolConfig.name} ${eipNumber} for demonstration purposes.\n\n## Specification\n\nDetailed specification would go here.\n\n## Security Considerations\n\nSecurity considerations would be documented here.\n\n## Copyright\n\nCopyright and related rights waived via CC0.`
          });
        }
      } catch (err) {
        setError(`Failed to load ${protocolConfig.name} ${eipNumber}. Please try again.`);
      } finally {
        setIsLoading(false);
      }
    };

    if (eipNumber && !tenantLoading) {
      loadEip();
    }
  }, [eipNumber, tenantLoading, protocolConfig.name]);

  const handleRetry = () => {
    setError(null);
    // Trigger reload
    window.location.reload();
  };

  if (tenantLoading) {
    return (
      <Container size="lg" py="xl">
        <LoadingSpinner message="Loading configuration..." />
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="lg" py="xl">
        <ErrorDisplay
          title={`Failed to Load ${protocolConfig.name}`}
          message={error}
          onRetry={handleRetry}
          variant="page"
        />
      </Container>
    );
  }

  if (isLoading) {
    return (
      <Container size="lg" py="xl">
        <LoadingSpinner message={`Loading ${protocolConfig.name} ${eipNumber}...`} />
      </Container>
    );
  }

  if (!eip) {
    return (
      <Container size="lg" py="xl">
        <ErrorDisplay
          title={`${protocolConfig.name} Not Found`}
          message={`${protocolConfig.name} ${eipNumber} could not be found.`}
          variant="page"
        />
      </Container>
    );
  }

  const breadcrumbItems = [
    { title: protocolConfig.name + 's', href: '/eips' },
    { title: `${protocolConfig.name}-${eip.number}`, href: '#' }
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
        {/* Navigation */}
        <Group>
          <Button
            variant="subtle"
            leftSection={<IconArrowLeft size="1rem" />}
            onClick={() => router.push('/eips')}
          >
            Back to {protocolConfig.name}s
          </Button>
        </Group>

        <Breadcrumbs>{breadcrumbItems}</Breadcrumbs>

        {/* Header */}
        <Paper p="xl" withBorder>
          <Stack gap="md">
            <Group justify="space-between" align="flex-start">
              <div style={{ flex: 1 }}>
                <Title order={1} size="h2">
                  {protocolConfig.name}-{eip.number}: {eip.title}
                </Title>
                <Text c="dimmed" mt="xs" size="lg">
                  {eip.description}
                </Text>
              </div>
              <Badge
                color={statusColors[eip.status] || "gray"}
                size="lg"
                variant="filled"
              >
                {eip.status}
              </Badge>
            </Group>

            <Divider />

            {/* Metadata */}
            <Group gap="xl" wrap="wrap">
              <div>
                <Text size="sm" fw={500} c="dimmed">Author(s)</Text>
                <Text size="sm">{eip.author}</Text>
              </div>
              <div>
                <Text size="sm" fw={500} c="dimmed">Type</Text>
                <Text size="sm">{eip.type}</Text>
              </div>
              {eip.category && (
                <div>
                  <Text size="sm" fw={500} c="dimmed">Category</Text>
                  <Text size="sm">{eip.category}</Text>
                </div>
              )}
              <div>
                <Text size="sm" fw={500} c="dimmed">Created</Text>
                <Text size="sm">{new Date(eip.created).toLocaleDateString()}</Text>
              </div>
              {eip.lastModified && (
                <div>
                  <Text size="sm" fw={500} c="dimmed">Last Modified</Text>
                  <Text size="sm">{new Date(eip.lastModified).toLocaleDateString()}</Text>
                </div>
              )}
            </Group>

            {/* Action Buttons */}
            <Group>
              {eip.discussionsTo && (
                <Button
                  variant="light"
                  leftSection={<IconExternalLink size="1rem" />}
                  onClick={() => window.open(eip.discussionsTo, '_blank')}
                >
                  Join Discussion
                </Button>
              )}
              {eip.pullRequestUrl && (
                <Button
                  variant="light"
                  leftSection={<IconGitPullRequest size="1rem" />}
                  onClick={() => window.open(eip.pullRequestUrl, '_blank')}
                >
                  View Pull Request
                </Button>
              )}
              <Button
                variant="light"
                leftSection={<IconExternalLink size="1rem" />}
                onClick={() => window.open(`https://github.com/${repositoryInfo.fullName}/blob/master/EIPS/eip-${eip.number}.md`, '_blank')}
              >
                View on GitHub
              </Button>
            </Group>
          </Stack>
        </Paper>

        {/* Content Tabs */}
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="content" leftSection={<IconEye size="1rem" />}>
              Content
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="content" pt="md">
            <Paper p="xl" withBorder>
              <div className="markdown-content">
                <ReactMarkdown>
                  {eip.content}
                </ReactMarkdown>
              </div>
            </Paper>
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
}