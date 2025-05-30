"use client";

import { Container, Title, Text, Stack, Box, Table, Anchor, Group, Skeleton, Center, Select, TextInput } from "@mantine/core";
import { IconSearch, IconExternalLink } from "@tabler/icons-react";
import { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

interface AuthorStats {
  name: string;
  totalProposals: number;
  finalizedProposals: number;
  protocolsParticipated: string[];
  trackDistribution: Record<string, number>;
  acceptanceRate: number;
  influenceScore: number;
  firstProposal: string;
  lastProposal: string;
}

interface AuthorWithProtocolData {
  name: string;
  protocolsParticipated: string[];
  firstProposal: string;
  lastProposal: string;
  total: {
    totalProposals: number;
    finalizedProposals: number;
    acceptanceRate: number;
    influenceScore: number;
    primaryTrack: string;
  };
  protocols: {
    [key: string]: {
      totalProposals: number;
      finalizedProposals: number;
      acceptanceRate: number;
      influenceScore: number;
      primaryTrack: string;
      trackDistribution: Record<string, number>;
    } | null;
  };
}

interface ProtocolAuthorData {
  protocol: string;
  authors: AuthorStats[];
  totalFinalizedProposals: number;
}

function AuthorsContent() {
  const searchParams = useSearchParams();
  const [authorData, setAuthorData] = useState<ProtocolAuthorData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [protocolFilter, setProtocolFilter] = useState('all');
  const [trackFilter, setTrackFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Initialize filters from URL parameters
  useEffect(() => {
    const protocol = searchParams?.get('protocol') || 'all';
    const track = searchParams?.get('track') || 'all';
    const status = searchParams?.get('status') || 'all';

    console.log('URL parameters detected:', { protocol, track, status });

    setProtocolFilter(protocol);
    setTrackFilter(track);
    setStatusFilter(status);
  }, [searchParams]);

  // Fetch author data from all protocols
  useEffect(() => {
    const fetchAuthorData = async () => {
      setIsLoading(true);
      const protocols = ['ethereum', 'starknet', 'rollup', 'arbitrum'];
      const data: ProtocolAuthorData[] = [];

      for (const protocol of protocols) {
        try {
          const response = await fetch(`/api/authors/${protocol}`);
          if (response.ok) {
            const result = await response.json();
            if (result.success) {
              data.push({
                protocol,
                authors: result.authors || [],
                totalFinalizedProposals: result.totalFinalizedProposals || 0
              });
            }
          }
        } catch (error) {
          console.error(`Failed to fetch authors for ${protocol}:`, error);
        }
      }

      setAuthorData(data);
      setIsLoading(false);
    };

    fetchAuthorData();
  }, []);

  // Aggregate and process authors
  const processedAuthors = useMemo(() => {
    if (!authorData.length) return [];

    const authorMap = new Map<string, AuthorWithProtocolData>();
    const protocolTotals = new Map<string, number>();

    // Calculate protocol totals for influence score calculation
    authorData.forEach(({ protocol, totalFinalizedProposals }) => {
      protocolTotals.set(protocol, totalFinalizedProposals);
    });

    // Calculate global total
    const globalTotalFinalized = Array.from(protocolTotals.values()).reduce((sum, total) => sum + total, 0);

    // Process each protocol's authors
    authorData.forEach(({ protocol, authors }) => {
      const protocolTotal = protocolTotals.get(protocol) || 1;

      authors.forEach(author => {
        if (!authorMap.has(author.name)) {
          // Initialize author with empty protocol data
          authorMap.set(author.name, {
            name: author.name,
            protocolsParticipated: [],
            firstProposal: author.firstProposal,
            lastProposal: author.lastProposal,
            total: {
              totalProposals: 0,
              finalizedProposals: 0,
              acceptanceRate: 0,
              influenceScore: 0,
              primaryTrack: ''
            },
            protocols: {
              ethereum: null,
              starknet: null,
              rollup: null,
              arbitrum: null
            }
          });
        }

        const authorEntry = authorMap.get(author.name)!;

        // Add protocol to participated list
        if (!authorEntry.protocolsParticipated.includes(protocol)) {
          authorEntry.protocolsParticipated.push(protocol);
        }

        // Calculate protocol-specific influence score
        const protocolInfluenceScore = protocolTotal > 0 ?
          parseFloat(((author.finalizedProposals / protocolTotal) * 100).toFixed(2)) : 0;

        // Get primary track for this protocol
        const primaryTrack = Object.entries(author.trackDistribution)
          .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';

        // Set protocol-specific data
        authorEntry.protocols[protocol] = {
          totalProposals: author.totalProposals,
          finalizedProposals: author.finalizedProposals,
          acceptanceRate: author.acceptanceRate,
          influenceScore: protocolInfluenceScore,
          primaryTrack,
          trackDistribution: author.trackDistribution
        };

        // Update totals
        authorEntry.total.totalProposals += author.totalProposals;
        authorEntry.total.finalizedProposals += author.finalizedProposals;
      });
    });

    // Calculate total metrics and apply filters
    let filteredAuthors = Array.from(authorMap.values()).map(author => {
      // Calculate total acceptance rate
      author.total.acceptanceRate = author.total.totalProposals > 0 ?
        author.total.finalizedProposals / author.total.totalProposals : 0;

      // Calculate total influence score
      author.total.influenceScore = globalTotalFinalized > 0 ?
        parseFloat(((author.total.finalizedProposals / globalTotalFinalized) * 100).toFixed(2)) : 0;

      // Calculate primary track across all protocols
      const allTracks: Record<string, number> = {};
      Object.values(author.protocols).forEach(protocolData => {
        if (protocolData) {
          Object.entries(protocolData.trackDistribution).forEach(([track, count]) => {
            allTracks[track] = (allTracks[track] || 0) + count;
          });
        }
      });
      author.total.primaryTrack = Object.entries(allTracks)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';

      return author;
    });

    // Apply filters
    if (protocolFilter !== 'all') {
      filteredAuthors = filteredAuthors.filter(author =>
        author.protocolsParticipated.includes(protocolFilter)
      );
    }

    if (trackFilter !== 'all') {
      filteredAuthors = filteredAuthors.filter(author =>
        Object.values(author.protocols).some(protocolData =>
          protocolData && protocolData.trackDistribution[trackFilter] > 0
        )
      );
    }

    if (statusFilter === 'finalized') {
      filteredAuthors = filteredAuthors.filter(author => author.total.finalizedProposals > 0);
    }

    if (searchTerm) {
      filteredAuthors = filteredAuthors.filter(author =>
        author.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort by total influence score, but if filtering by specific protocol, sort by that protocol's influence score
    if (protocolFilter !== 'all') {
      return filteredAuthors.sort((a, b) => {
        const aScore = a.protocols[protocolFilter]?.influenceScore || 0;
        const bScore = b.protocols[protocolFilter]?.influenceScore || 0;
        return bScore - aScore;
      });
    }

    return filteredAuthors.sort((a, b) => b.total.influenceScore - a.total.influenceScore);
  }, [authorData, protocolFilter, trackFilter, statusFilter, searchTerm]);

  const protocols = ['all', 'ethereum', 'starknet', 'rollup', 'arbitrum'];
  const tracks = ['all', 'App', 'Core', 'Meta', 'Informational', 'Interface', 'Networking'];

  // Determine which protocols to show in columns
  const protocolsToShow = protocolFilter === 'all' ?
    ['ethereum', 'starknet', 'rollup', 'arbitrum'] :
    [protocolFilter];

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <Box ta="center">
          <Title order={1} size="h1" mb="md">
            Author Statistics & Rankings
          </Title>
          <Text size="lg" c="dimmed" maw={700} mx="auto">
            Cross-protocol author analysis showing influence, participation, and success rates across
            different improvement proposal ecosystems.
          </Text>
        </Box>

        <Group justify="space-between">
          <TextInput
            placeholder="Search authors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.currentTarget.value)}
            leftSection={<IconSearch size={16} />}
            style={{ minWidth: 250 }}
          />
          <Group>
            <Select
              placeholder="All Protocols"
              value={protocolFilter}
              onChange={(value) => setProtocolFilter(value || 'all')}
              data={protocols.map(p => ({ value: p, label: p === 'all' ? 'All Protocols' : p.charAt(0).toUpperCase() + p.slice(1) }))}
              clearable
            />
            <Select
              placeholder="All Tracks"
              value={trackFilter}
              onChange={(value) => setTrackFilter(value || 'all')}
              data={tracks.map(t => ({ value: t, label: t === 'all' ? 'All Tracks' : t }))}
              clearable
            />
            <Select
              placeholder="All Status"
              value={statusFilter}
              onChange={(value) => setStatusFilter(value || 'all')}
              data={[
                { value: 'all', label: 'All Authors' },
                { value: 'finalized', label: 'Finalized Only' }
              ]}
              clearable
            />
          </Group>
        </Group>

        <Box style={{ overflowX: 'auto' }}>
          <Table highlightOnHover withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th rowSpan={2} style={{ verticalAlign: 'middle' }}>Rank</Table.Th>
                <Table.Th rowSpan={2} style={{ verticalAlign: 'middle' }}>Author</Table.Th>
                <Table.Th rowSpan={2} style={{ verticalAlign: 'middle', textAlign: 'right' }}>Protocols</Table.Th>
                <Table.Th colSpan={4} ta="center" style={{ borderBottom: '1px solid var(--mantine-color-gray-3)' }}>
                  <Text fw={600} size="sm">Total (Cross-Protocol)</Text>
                </Table.Th>
                {protocolsToShow.map(protocol => {
                  const protocolColors = {
                    ethereum: 'blue',
                    starknet: 'blue',
                    rollup: 'blue',
                    arbitrum: 'blue'
                  };
                  return (
                    <Table.Th key={protocol} colSpan={3} ta="center" style={{ borderBottom: '1px solid var(--mantine-color-gray-3)' }}>
                      <Text fw={600} size="sm" c={protocolColors[protocol as keyof typeof protocolColors]}>
                        {protocol.charAt(0).toUpperCase() + protocol.slice(1)}
                      </Text>
                    </Table.Th>
                  );
                })}
              </Table.Tr>
              <Table.Tr>
                {/* Total columns */}
                <Table.Th ta="right"><Text size="xs">Proposals</Text></Table.Th>
                <Table.Th ta="right"><Text size="xs">Finalized</Text></Table.Th>
                <Table.Th ta="right"><Text size="xs">Success %</Text></Table.Th>
                <Table.Th ta="right"><Text size="xs">Influence %</Text></Table.Th>

                {/* Protocol-specific columns - only for selected protocols */}
                {protocolsToShow.map(protocol => (
                  <>
                    <Table.Th key={`${protocol}-finalized`} ta="right"><Text size="xs">Finalized</Text></Table.Th>
                    <Table.Th key={`${protocol}-success`} ta="right"><Text size="xs">Success %</Text></Table.Th>
                    <Table.Th key={`${protocol}-influence`} ta="right"><Text size="xs">Influence %</Text></Table.Th>
                  </>
                ))}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {isLoading ? (
                Array(10).fill(0).map((_, i) => (
                  <Table.Tr key={i}>
                    {Array(7 + (protocolsToShow.length * 3)).fill(0).map((_, j) => (
                      <Table.Td key={j}><Skeleton height={16} width={j === 1 ? 150 : 40} /></Table.Td>
                    ))}
                  </Table.Tr>
                ))
              ) : (
                processedAuthors.slice(0, 100).map((author, index) => (
                  <Table.Tr key={author.name}>
                    <Table.Td>
                      <Text fw={500} c={index < 3 ? 'yellow' : index < 10 ? 'orange' : undefined}>
                        #{index + 1}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text fw={500}>{author.name}</Text>
                    </Table.Td>
                    <Table.Td ta="right">
                      <Text size="sm">{author.protocolsParticipated.length}</Text>
                    </Table.Td>

                    {/* Total columns */}
                    <Table.Td ta="right">{author.total.totalProposals}</Table.Td>
                    <Table.Td ta="right">
                      <Text c="green" fw={500}>{author.total.finalizedProposals}</Text>
                    </Table.Td>
                    <Table.Td ta="right">
                      <Text
                        c={author.total.acceptanceRate > 0.5 ? 'green' : author.total.acceptanceRate > 0.2 ? 'orange' : 'red'}
                        fw={500}
                        size="sm"
                      >
                        {(author.total.acceptanceRate * 100).toFixed(0)}%
                      </Text>
                    </Table.Td>
                    <Table.Td ta="right">
                      <Text fw={600} c="blue" size="sm">{author.total.influenceScore.toFixed(2)}%</Text>
                    </Table.Td>

                    {/* Protocol-specific columns - only for selected protocols */}
                    {protocolsToShow.map(protocol => {
                      const protocolData = author.protocols[protocol];
                      const protocolColors = {
                        ethereum: 'blue',
                        starknet: 'purple',
                        rollup: 'orange',
                        arbitrum: 'cyan'
                      };

                      if (!protocolData) {
                        return (
                          <>
                            <Table.Td key={`${protocol}-finalized`} ta="right">
                              <Text size="sm" c="dimmed">-</Text>
                            </Table.Td>
                            <Table.Td key={`${protocol}-success`} ta="right">
                              <Text size="sm" c="dimmed">-</Text>
                            </Table.Td>
                            <Table.Td key={`${protocol}-influence`} ta="right">
                              <Text size="sm" c="dimmed">-</Text>
                            </Table.Td>
                          </>
                        );
                      }

                      return (
                        <>
                          <Table.Td key={`${protocol}-finalized`} ta="right">
                            <Text c="green" fw={500} size="sm">{protocolData.finalizedProposals}</Text>
                          </Table.Td>
                          <Table.Td key={`${protocol}-success`} ta="right">
                            <Text
                              c={protocolData.acceptanceRate > 0.5 ? 'green' : protocolData.acceptanceRate > 0.2 ? 'orange' : 'red'}
                              fw={500}
                              size="sm"
                            >
                              {(protocolData.acceptanceRate * 100).toFixed(0)}%
                            </Text>
                          </Table.Td>
                          <Table.Td key={`${protocol}-influence`} ta="right">
                            <Text fw={600} c={protocolColors[protocol as keyof typeof protocolColors]} size="sm">
                              {protocolData.influenceScore.toFixed(2)}%
                            </Text>
                          </Table.Td>
                        </>
                      );
                    })}
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        </Box>

        <Center mt="lg">
          <Text size="sm" c="dimmed" ta="center" maw={800}>
            <Text fw={600} mb="xs">Calculation Details:</Text>
            • <strong>Total Influence Score</strong>: (Author's Total Finalized Proposals) / (Global Total Finalized Proposals) × 100%<br/>
            • <strong>Protocol Influence Score</strong>: (Author's Protocol Finalized Proposals) / (Protocol Total Finalized Proposals) × 100%<br/>
            • <strong>Success Rate</strong>: (Finalized Proposals) / (Total Proposals) × 100%<br/>
            <br/>
            {protocolFilter === 'all' ? (
              <>Protocol-specific influence scores sum to 100% within each protocol column.</>
            ) : (
              <>Showing only {protocolFilter} protocol data. Influence scores sum to 100% within this protocol.</>
            )}
            <br/>
            Total influence scores sum to 100% across all protocols.
            Showing top 100 authors ranked by {protocolFilter === 'all' ? 'total' : protocolFilter} influence score.
          </Text>
        </Center>
      </Stack>
    </Container>
  );
}

function AuthorsPageFallback() {
    return (
      <Container size="xl" py="xl">
        <Stack gap="xl">
          <Box ta="center">
            <Title order={1} size="h1" mb="md">
              Author Statistics & Rankings
            </Title>
            <Text size="lg" c="dimmed" maw={700} mx="auto">
              Loading author statistics...
            </Text>
          </Box>
          <Center>
            <Skeleton height={400} />
          </Center>
        </Stack>
      </Container>
    );
  }

  export default function AuthorsPage() {
    return (
      <Suspense fallback={<AuthorsPageFallback />}>
        <AuthorsContent />
      </Suspense>
    );
  }