"use client";

import { Container, Title, Text, Stack, Box, Table, Anchor, Group, Skeleton, Center, Button, Collapse } from "@mantine/core";
import { getProtocolConfig } from "@/lib/subdomain-utils"; // getProtocolConfig for colors etc.
import { ProtocolStatistics, useAllProtocolsStats } from "@/hooks/useProtocolStats";
import { IconArrowUp, IconArrowDown, IconExternalLink, IconChevronDown, IconChevronRight } from "@tabler/icons-react";
import { useState, useMemo } from "react";
import Link from "next/link";

interface EnrichedProtocol extends ReturnType<typeof getProtocolConfig> {
  stats?: ProtocolStatistics;
  isLoadingStats: boolean;
  statsError?: Error | null;
  url: string;
}

// Helper to generate protocol URL
const getProtocolUrl = (subdomain: string) => {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (process.env.NODE_ENV === "development" ? "localhost:3000" : "dip.box");
  return `${subdomain}.${baseUrl}`;
};

// Component to render track subtable rows
function TrackSubtable({ stats, isLoading, protocolSubdomain }: {
  stats?: ProtocolStatistics,
  isLoading: boolean,
  protocolSubdomain: string
}) {
  if (!stats?.tracksBreakdown) return null;

  const tracks = Object.entries(stats.tracksBreakdown).sort(([,a], [,b]) => b.totalProposalsInTrack - a.totalProposalsInTrack);

  // Get all unique statuses across all proposals to create dynamic columns
  const allStatuses = new Set<string>();
  if (stats.statusCounts) {
    Object.keys(stats.statusCounts).forEach(status => allStatuses.add(status));
  }
  const statusList = Array.from(allStatuses).sort();

  // Helper to generate track URL
  const getTrackUrl = (trackName: string) => {
    return `http${process.env.NODE_ENV === 'development' ? '' : 's'}://${protocolSubdomain}.${process.env.NEXT_PUBLIC_BASE_URL || (process.env.NODE_ENV === "development" ? "localhost:3000" : "dip.box")}?track=${encodeURIComponent(trackName)}`;
  };

  // Helper to generate status+track filter URL
  const getStatusTrackUrl = (status: string, trackName: string) => {
    return `http${process.env.NODE_ENV === 'development' ? '' : 's'}://${protocolSubdomain}.${process.env.NEXT_PUBLIC_BASE_URL || (process.env.NODE_ENV === "development" ? "localhost:3000" : "dip.box")}?status=${encodeURIComponent(status)}&track=${encodeURIComponent(trackName)}`;
  };

  return (
    <Table
      withTableBorder
      withColumnBorders
      mt="xs"
      style={{ width: '100%' }}
    >
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Track</Table.Th>
          <Table.Th ta="right">Total</Table.Th>
          <Table.Th ta="right">Authors</Table.Th>
          <Table.Th ta="right">Authors Accepted</Table.Th>
          {statusList.map(status => (
            <Table.Th key={status} ta="right">{status}</Table.Th>
          ))}
          <Table.Th ta="right">Acceptance Rate</Table.Th>
          <Table.Th ta="right">Centralization</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {tracks.map(([trackName, trackData]) => {
          // Calculate centralization rate: higher % = more centralized
          // (fewer distinct authors getting finalized relative to total authors)
          const centralizationRate = trackData.distinctAuthorsInTrackCount > 0
            ? 1 - (trackData.authorsOnFinalizedInTrackCount / trackData.distinctAuthorsInTrackCount)
            : 0;

          // Calculate acceptance rate excluding stagnant and withdrawn proposals
          const stagnantCount = trackData.statusCountsInTrack?.['Stagnant'] || 0;
          const withdrawnCount = trackData.statusCountsInTrack?.['Withdrawn'] || 0;
          const activeProposals = trackData.totalProposalsInTrack - stagnantCount - withdrawnCount;
          const adjustedAcceptanceRate = activeProposals > 0
            ? trackData.finalizedProposalsInTrack / activeProposals
            : 0;

          return (
            <Table.Tr key={trackName}>
              <Table.Td>
                <Anchor
                  component={Link}
                  href={getTrackUrl(trackName)}
                  target="_blank"
                  fw={500}
                  size="sm"
                >
                  {trackName} <IconExternalLink size={12} style={{ verticalAlign: 'middle' }} />
                </Anchor>
              </Table.Td>
              <Table.Td ta="right">
                {isLoading ? <Skeleton height={16} width={40} /> : trackData.totalProposalsInTrack}
              </Table.Td>
              <Table.Td ta="right">
                {isLoading ? <Skeleton height={16} width={40} /> :
                  trackData.distinctAuthorsInTrackCount > 0 ? (
                    <Anchor
                      component={Link}
                      href={`/authors?protocol=${protocolSubdomain}&track=${encodeURIComponent(trackName)}`}
                      c="blue"
                    >
                      {trackData.distinctAuthorsInTrackCount}
                    </Anchor>
                  ) : 'No data'
                }
              </Table.Td>
              <Table.Td ta="right">
                {isLoading ? <Skeleton height={16} width={40} /> :
                  trackData.authorsOnFinalizedInTrackCount > 0 ? (
                    <Anchor
                      component={Link}
                      href={`/authors?protocol=${protocolSubdomain}&track=${encodeURIComponent(trackName)}&status=finalized`}
                      c="green"
                    >
                      {trackData.authorsOnFinalizedInTrackCount}
                    </Anchor>
                  ) : 'None'
                }
              </Table.Td>
              {statusList.map(status => (
                <Table.Td key={status} ta="right">
                  {isLoading ? <Skeleton height={16} width={30} /> :
                    trackData.statusCountsInTrack?.[status] > 0 ? (
                      <Anchor
                        component={Link}
                        href={getStatusTrackUrl(status, trackName)}
                        target="_blank"
                        c="blue"
                        size="sm"
                      >
                        {trackData.statusCountsInTrack[status]}
                      </Anchor>
                    ) : (
                      <Text size="sm" c="dimmed">0</Text>
                    )
                  }
                </Table.Td>
              ))}
              <Table.Td ta="right">
                {isLoading ? <Skeleton height={16} width={40} /> :
                  trackData.distinctAuthorsInTrackCount > 0 ? (
                    <Text
                      c={adjustedAcceptanceRate > 0.3 ? 'green' : 'orange'}
                      fw={500}
                    >
                      {(adjustedAcceptanceRate * 100).toFixed(0)}%
                    </Text>
                  ) : (
                    <Text c="dimmed">N/A</Text>
                  )
                }
              </Table.Td>
              <Table.Td ta="right">
                {isLoading ? <Skeleton height={16} width={40} /> :
                  trackData.distinctAuthorsInTrackCount > 0 ? (
                    <Text
                      c={centralizationRate > 0.5 ? 'red' : centralizationRate > 0.3 ? 'orange' : 'green'}
                      fw={500}
                    >
                      {(centralizationRate * 100).toFixed(0)}%
                    </Text>
                  ) : (
                    <Text c="dimmed">N/A</Text>
                  )
                }
              </Table.Td>
            </Table.Tr>
          );
        })}
      </Table.Tbody>
    </Table>
  );
}

// Component to render individual protocol row with expandable subtable
function ProtocolRow({ protocol, protocolsData, isLoading }: {
  protocol: EnrichedProtocol,
  protocolsData: Record<string, ProtocolStatistics>,
  isLoading: boolean
}) {
  const [expanded, setExpanded] = useState(false);
  const stats = protocolsData[protocol.subdomain];

  // Calculate aggregate metrics from track-level data (mean of track values)
  const aggregateMetrics = useMemo(() => {
    if (!stats?.tracksBreakdown) return { acceptanceRate: null, centralizationRate: null };

    const tracks = Object.values(stats.tracksBreakdown);
    if (tracks.length === 0) return { acceptanceRate: null, centralizationRate: null };

    // Calculate mean acceptance rate across all tracks (excluding stagnant/withdrawn)
    const trackAcceptanceRates = tracks
      .filter(track => track.totalProposalsInTrack > 0)
      .map(track => {
        // Calculate active proposals (excluding Stagnant and Withdrawn)
        const stagnantCount = track.statusCountsInTrack?.['Stagnant'] || 0;
        const withdrawnCount = track.statusCountsInTrack?.['Withdrawn'] || 0;
        const activeProposals = track.totalProposalsInTrack - stagnantCount - withdrawnCount;

        // If no active proposals, treat as 0% acceptance rate
        if (activeProposals <= 0) return 0;

        // Calculate acceptance rate based on active proposals only
        return track.finalizedProposalsInTrack / activeProposals;
      });

    const meanAcceptanceRate = trackAcceptanceRates.length > 0
      ? trackAcceptanceRates.reduce((sum, rate) => sum + rate, 0) / trackAcceptanceRates.length
      : 0;

    // Calculate mean centralization rate across all tracks
    const trackCentralizationRates = tracks
      .filter(track => track.distinctAuthorsInTrackCount > 0)
      .map(track => 1 - (track.authorsOnFinalizedInTrackCount / track.distinctAuthorsInTrackCount));

    const meanCentralizationRate = trackCentralizationRates.length > 0
      ? trackCentralizationRates.reduce((sum, rate) => sum + rate, 0) / trackCentralizationRates.length
      : 0;

    return {
      acceptanceRate: meanAcceptanceRate,
      centralizationRate: meanCentralizationRate
    };
  }, [stats?.tracksBreakdown]);

  return (
    <>
      <Table.Tr key={protocol.subdomain}>
        <Table.Td>
          <Group gap="sm">
            <Button
              variant="subtle"
              size="xs"
              p={4}
              onClick={() => setExpanded(!expanded)}
              style={{ minWidth: 'auto' }}
            >
              {expanded ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
            </Button>
            <Box>
              <Anchor component={Link} href={protocol.url} target="_blank" c={protocol.color} fw={500}>
                {protocol.name} <IconExternalLink size={14} style={{ verticalAlign: 'middle' }} />
              </Anchor>
              <Text size="xs" c="dimmed">{protocol.description}</Text>
            </Box>
          </Group>
        </Table.Td>
        <Table.Td ta="right">
          {isLoading ? <Skeleton height={16} width={40} /> : (stats?.totalProposals ?? 'N/A')}
        </Table.Td>
        <Table.Td ta="right">
          {isLoading ? <Skeleton height={16} width={40} /> :
            stats?.distinctAuthorsCount ? (
              <Anchor
                component={Link}
                href={`/authors?protocol=${protocol.subdomain}`}
                c="blue"
              >
                {stats.distinctAuthorsCount}
              </Anchor>
            ) : 'N/A'
          }
        </Table.Td>
        <Table.Td ta="right">
          {isLoading ? <Skeleton height={16} width={40} /> :
            stats?.authorsOnFinalizedCount ? (
              <Anchor
                component={Link}
                href={`/authors?protocol=${protocol.subdomain}&status=finalized`}
                c="green"
              >
                {stats.authorsOnFinalizedCount}
              </Anchor>
            ) : 'N/A'
          }
        </Table.Td>
        <Table.Td ta="right">
          {isLoading ? <Skeleton height={16} width={40} /> :
            (aggregateMetrics.acceptanceRate !== null ? (
              <Text
                c={aggregateMetrics.acceptanceRate > 0.3 ? 'green' : 'orange'}
                fw={500}
              >
                {(aggregateMetrics.acceptanceRate * 100).toFixed(0)}%
              </Text>
            ) : 'N/A')
          }
        </Table.Td>
        <Table.Td ta="right">
          {isLoading ? <Skeleton height={16} width={40} /> :
            (aggregateMetrics.centralizationRate !== null ? (
              <Text
                c={aggregateMetrics.centralizationRate > 0.5 ? 'red' : aggregateMetrics.centralizationRate > 0.3 ? 'orange' : 'green'}
                fw={500}
              >
                {(aggregateMetrics.centralizationRate * 100).toFixed(0)}%
              </Text>
            ) : 'N/A')
          }
        </Table.Td>
        <Table.Td ta="right">
          {isLoading ? <Skeleton height={16} width={40} /> :
            (stats?.tracksBreakdown ? Object.keys(stats.tracksBreakdown).length : 'N/A')
          }
        </Table.Td>
        <Table.Td>
          {isLoading ? <Skeleton height={12} width={70} /> :
            (stats?.lastUpdated ? new Date(stats.lastUpdated).toLocaleDateString() : 'N/A')}
        </Table.Td>
      </Table.Tr>
      <Table.Tr>
        <Table.Td colSpan={8} p={0}>
          <Collapse in={expanded}>
            <TrackSubtable stats={stats} isLoading={isLoading} protocolSubdomain={protocol.subdomain} />
          </Collapse>
        </Table.Td>
      </Table.Tr>
    </>
  );
}

export default function HomePage() {
  const [sortField, setSortField] = useState<keyof ProtocolStatistics | 'name' | 'trackCount'>('totalProposals');
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

  const ThSortable = ({ children, field }: { children: React.ReactNode; field: keyof ProtocolStatistics | 'name' | 'trackCount' }) => {
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
            Click on a protocol name to visit its dedicated portal, or expand rows to view detailed track breakdowns.
          </Text>
        </Box>

        <Table highlightOnHover withTableBorder withColumnBorders verticalSpacing="md">
          <Table.Thead>
            <Table.Tr>
              <ThSortable field="name">Protocol</ThSortable>
              <ThSortable field="totalProposals">Total Proposals</ThSortable>
              <ThSortable field="distinctAuthorsCount">Total Authors</ThSortable>
              <ThSortable field="authorsOnFinalizedCount">Finalized Authors</ThSortable>
              <ThSortable field="acceptanceScore">Acceptance Rate</ThSortable>
              <Table.Th>Centralization</Table.Th>
              <ThSortable field="trackCount">Track Count</ThSortable>
              <Table.Th>Last Update</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {protocolsWithInitialConfig.map((protocol) => (
              <ProtocolRow
                key={protocol.subdomain}
                protocol={protocol}
                protocolsData={data?.protocolsData || {}}
                isLoading={isLoading}
              />
            ))}
          </Table.Tbody>
        </Table>

         <Center mt="lg">
            <Stack gap="md" maw={800} mx="auto">
              <Text size="sm" c="dimmed" ta="center" fw={500}>
                Metrics Explanation
              </Text>

              <Stack gap="xs">
                <Text size="sm" c="dimmed" ta="center">
                  <Text span fw={500}>Protocol-Level Aggregates:</Text> Acceptance Rate and Centralization shown in the main table
                  are calculated as the mean of track-level values (averages across all tracks within each protocol).
                </Text>

                <Text size="sm" c="dimmed" ta="center">
                  <Text span fw={500}>Track-Level Metrics:</Text> Detailed breakdowns visible when expanding each protocol row.
                  Shows individual statistics per track (Core, Interface, App, etc.).
                </Text>

                <Text size="sm" c="dimmed" ta="center">
                  <Text span fw={500}>Acceptance Rate:</Text> (Finalized Proposals) ÷ (Active Proposals) where Active = Total - Stagnant - Withdrawn
                </Text>

                <Text size="sm" c="dimmed" ta="center">
                  <Text span fw={500}>Centralization:</Text> 1 - (Authors with Finalized Proposals ÷ Total Authors)
                  — higher % means fewer authors control finalized decisions
                </Text>

                <Text size="xs" c="dimmed" ta="center" mt="xs">
                  Click arrow icons to expand protocols and view detailed track-level breakdowns.
                  Metrics updated periodically from GitHub repositories.
                </Text>
              </Stack>
            </Stack>
        </Center>
      </Stack>
    </Container>
  );
}

