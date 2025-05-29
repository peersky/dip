"use client";

import { Container, Title, Text, Stack, Box, Table, Anchor, Group, Skeleton, Center, Button } from "@mantine/core";
import { getProtocolConfig } from "@/lib/subdomain-utils"; // getProtocolConfig for colors etc.
import { ProtocolStatistics, useAllProtocolsStats } from "@/hooks/useProtocolStats";
import { IconArrowUp, IconArrowDown, IconExternalLink } from "@tabler/icons-react";
import { useState, useMemo } from "react";
import Link from "next/link";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";

interface EnrichedProtocol extends ReturnType<typeof getProtocolConfig> {
  stats?: ProtocolStatistics;
  isLoadingStats: boolean;
  statsError?: Error | null;
  url: string;
}

// Helper to generate protocol URL
const getProtocolUrl = (subdomain: string) => {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (process.env.NODE_ENV === "development" ? "localhost:3000" : "dip.box");
  return `http${baseUrl.startsWith('localhost') ? '' : 's'}://${subdomain}.${baseUrl}`;
};

// Component to render individual protocol row with stats
function ProtocolRow({ protocol, allTracks, protocolsData, isLoading }: {
  protocol: EnrichedProtocol,
  allTracks: string[],
  protocolsData: Record<string, ProtocolStatistics>,
  isLoading: boolean
}) {
  const stats = protocolsData[protocol.subdomain];

  return (
    <Table.Tr key={protocol.subdomain}>
      <Table.Td>
        <Anchor component={Link} href={protocol.url} target="_blank" c={protocol.color} fw={500}>
          {protocol.name} <IconExternalLink size={14} style={{ verticalAlign: 'middle' }} />
        </Anchor>
        <Text size="xs" c="dimmed">{protocol.description}</Text>
      </Table.Td>
      <Table.Td ta="right">
        {isLoading ? <Skeleton height={16} width={40} /> : (stats?.totalProposals ?? 'N/A')}
      </Table.Td>
      <Table.Td ta="right">
        {isLoading ? <Skeleton height={16} width={40} /> : (stats?.distinctAuthorsCount ?? 'N/A')}
      </Table.Td>
      <Table.Td ta="right">
        {isLoading ? <Skeleton height={16} width={40} /> :
          (stats && typeof stats.acceptanceScore === 'number' ? `${(stats.acceptanceScore * 100).toFixed(0)}%` : 'N/A')}
      </Table.Td>
      {/* Dynamic track columns */}
      {allTracks.map(track => (
        <Table.Td key={track} ta="right">
          {isLoading ? <Skeleton height={16} width={40} /> :
            (() => {
              const trackData = stats?.tracksBreakdown?.[track];
              if (!trackData) return '0';
              return trackData.totalProposalsInTrack.toString();
            })()
          }
        </Table.Td>
      ))}
      <Table.Td>
        {isLoading ? <Skeleton height={12} width={70} /> :
          (stats?.lastUpdated ? new Date(stats.lastUpdated).toLocaleDateString() : 'N/A')}
      </Table.Td>
    </Table.Tr>
  );
}

export default function HomePage() {
  const [sortField, setSortField] = useState<keyof ProtocolStatistics | 'name' | 'tracksBreakdown'>('totalProposals');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Use React Query to fetch all protocols data
  const { data, isLoading, error } = useAllProtocolsStats();

  const protocolsWithInitialConfig = useMemo(() => {
    if (!data?.protocols) return [];
    return data.protocols.map(p => ({
        ...p,
        isLoadingStats: isLoading,
        url: getProtocolUrl(p.subdomain)
    }));
  }, [data?.protocols, isLoading]);

  // Handle error state
  if (error) {
    return (
      <Container size="xl" py="xl">
        <Center>
          <Text c="red">Error loading protocol data: {error.message}</Text>
        </Center>
      </Container>
    );
  }

  const ThSortable = ({ children, field }: { children: React.ReactNode; field: keyof ProtocolStatistics | 'name' | 'tracksBreakdown' }) => {
    const isSorted = sortField === field;
    return (
      <Table.Th
        onClick={() => {
          if (isSorted) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
          } else {
            setSortField(field);
            setSortDirection('desc');
          }
        }}
        style={{ cursor: 'pointer' }}
      >
        <Group gap="xs" justify="space-between">
          {children}
          {isSorted && (sortDirection === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />)}
        </Group>
      </Table.Th>
    );
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <Box ta="center">
          <Title order={1} size="h1" mb="md">
            Decentralized Improvement Protocols Overview
          </Title>
          <Text size="lg" c="dimmed" maw={700} mx="auto">
            Explore activity and contribution metrics across various improvement proposal repositories.
            Click on a protocol name to visit its dedicated portal, or view detailed track breakdowns.
          </Text>
        </Box>

        <Table highlightOnHover withTableBorder withColumnBorders verticalSpacing="md">
          <Table.Thead>
            <Table.Tr>
              <ThSortable field="name">Protocol</ThSortable>
              <ThSortable field="totalProposals">Proposals</ThSortable>
              <ThSortable field="distinctAuthorsCount">Authors (Overall)</ThSortable>
              <ThSortable field="acceptanceScore">Acceptance (Overall)</ThSortable>
              {/* Dynamic track headers */}
              {data?.allTracks.map(track => (
                <Table.Th key={track} style={{ minWidth: '100px' }}>
                  <Text size="sm" fw={500}>{track}</Text>
                  <Text size="xs" c="dimmed">Proposals</Text>
                </Table.Th>
              ))}
              <Table.Th>Last Update</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {protocolsWithInitialConfig.map((protocol) => (
              <ProtocolRow
                key={protocol.subdomain}
                protocol={protocol}
                allTracks={data?.allTracks || []}
                protocolsData={data?.protocolsData || {}}
                isLoading={isLoading}
              />
            ))}
          </Table.Tbody>
        </Table>

         <Center mt="lg">
            <Text size="sm" c="dimmed">
                Metrics are updated periodically. Overall Acceptance Score = (Authors on Any Finalized Proposal) / (Total Distinct Authors Overall). Track columns show proposal counts for each category.
            </Text>
        </Center>
      </Stack>
    </Container>
  );
}

