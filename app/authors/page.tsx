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

interface ProtocolAuthorData {
  protocol: string;
  authors: AuthorStats[];
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

  // Debug: Log filter changes
  useEffect(() => {
    console.log('Filter states updated:', { protocolFilter, trackFilter, statusFilter });
  }, [protocolFilter, trackFilter, statusFilter]);

  // Fetch author data from all protocols
  useEffect(() => {
    const fetchAuthorData = async () => {
      setIsLoading(true);
      const protocols = ['ethereum', 'starknet', 'rollup', 'polygon'];
      const data: ProtocolAuthorData[] = [];
      let totalFinalizedAcrossAllProtocols = 0;

      for (const protocol of protocols) {
        try {
          const response = await fetch(`/api/authors/${protocol}`);
          if (response.ok) {
            const result = await response.json();
            if (result.success) {
              data.push({
                protocol,
                authors: result.authors || []
              });
              // Add to total finalized proposals count
              totalFinalizedAcrossAllProtocols += result.totalFinalizedProposals || 0;
            }
          }
        } catch (error) {
          console.error(`Failed to fetch authors for ${protocol}:`, error);
        }
      }

      // Store total finalized proposals for influence calculation
      (window as any).totalFinalizedProposals = totalFinalizedAcrossAllProtocols;
      setAuthorData(data);
      setIsLoading(false);
    };

    fetchAuthorData();
  }, []);

  // Aggregate and filter authors
  const aggregatedAuthors = useMemo(() => {
    const authorMap = new Map<string, AuthorStats>();
    const totalFinalizedProposals = (window as any).totalFinalizedProposals || 1; // Prevent division by zero

    // Store per-protocol author data for precise filtering
    const authorProtocolData = new Map<string, Map<string, AuthorStats>>();

    authorData.forEach(({ protocol, authors }) => {
      authors.forEach(author => {
        // Store per-protocol data for precise filtering
        if (!authorProtocolData.has(author.name)) {
          authorProtocolData.set(author.name, new Map());
        }
        authorProtocolData.get(author.name)!.set(protocol, author);

        // Aggregate across protocols
        const existing = authorMap.get(author.name);
        if (existing) {
          // Merge data across protocols
          existing.totalProposals += author.totalProposals;
          existing.finalizedProposals += author.finalizedProposals;
          existing.protocolsParticipated = [...new Set([...existing.protocolsParticipated, protocol])];
          Object.entries(author.trackDistribution).forEach(([track, count]) => {
            existing.trackDistribution[track] = (existing.trackDistribution[track] || 0) + count;
          });
          existing.acceptanceRate = existing.totalProposals > 0 ? existing.finalizedProposals / existing.totalProposals : 0;
          // New influence score: percentage of all finalized proposals
          existing.influenceScore = totalFinalizedProposals > 0 ?
            parseFloat(((existing.finalizedProposals / totalFinalizedProposals) * 100).toFixed(2)) : 0;
        } else {
          // New influence score: percentage of all finalized proposals
          const influenceScore = totalFinalizedProposals > 0 ?
            parseFloat(((author.finalizedProposals / totalFinalizedProposals) * 100).toFixed(2)) : 0;

          authorMap.set(author.name, {
            ...author,
            protocolsParticipated: [protocol],
            influenceScore
          });
        }
      });
    });

    // Convert to array and apply filters
    let filtered = Array.from(authorMap.values());

    console.log('Before filtering:', filtered.length, 'authors');
    console.log('Applied filters:', { protocolFilter, trackFilter, statusFilter });

    // Apply protocol-specific filtering when both protocol and track/status are specified
    if (protocolFilter !== 'all' && (trackFilter !== 'all' || statusFilter === 'finalized')) {
      filtered = filtered.filter(author => {
        const protocolData = authorProtocolData.get(author.name)?.get(protocolFilter);
        if (!protocolData) return false;

        // Check if this author has the required track in the specific protocol
        if (trackFilter !== 'all' && !protocolData.trackDistribution[trackFilter]) {
          return false;
        }

        // Check if this author has finalized proposals in the specific protocol
        if (statusFilter === 'finalized' && protocolData.finalizedProposals === 0) {
          return false;
        }

        return true;
      });
      console.log('After protocol-specific filter:', filtered.length, 'authors');
    } else {
      // Apply simple filters for cross-protocol aggregation
      if (protocolFilter !== 'all') {
        filtered = filtered.filter(author => author.protocolsParticipated.includes(protocolFilter));
        console.log('After protocol filter:', filtered.length, 'authors');
      }

      if (trackFilter !== 'all') {
        filtered = filtered.filter(author => author.trackDistribution[trackFilter] > 0);
        console.log('After track filter:', filtered.length, 'authors');
      }

      if (statusFilter === 'finalized') {
        filtered = filtered.filter(author => author.finalizedProposals > 0);
        console.log('After status filter:', filtered.length, 'authors');
      }
    }

    if (searchTerm) {
      filtered = filtered.filter(author =>
        author.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      console.log('After search filter:', filtered.length, 'authors');
    }

    // Sort by influence score
    return filtered.sort((a, b) => b.influenceScore - a.influenceScore);
  }, [authorData, protocolFilter, trackFilter, statusFilter, searchTerm]);

  const protocols = ['all', 'ethereum', 'starknet', 'rollup', 'polygon'];
  const tracks = ['all', 'App', 'Core', 'Meta', 'Informational', 'Interface', 'Networking'];

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

        <Table highlightOnHover withTableBorder withColumnBorders>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Rank</Table.Th>
              <Table.Th>Author</Table.Th>
              <Table.Th ta="right">Protocols</Table.Th>
              <Table.Th ta="right">Total Proposals</Table.Th>
              <Table.Th ta="right">Finalized</Table.Th>
              <Table.Th ta="right">Success Rate</Table.Th>
              <Table.Th ta="right">
                <Text fw={600} size="sm">Influence Score (%)</Text>
              </Table.Th>
              <Table.Th ta="right">Primary Track</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {isLoading ? (
              Array(10).fill(0).map((_, i) => (
                <Table.Tr key={i}>
                  <Table.Td><Skeleton height={16} width={30} /></Table.Td>
                  <Table.Td><Skeleton height={16} width={150} /></Table.Td>
                  <Table.Td><Skeleton height={16} width={50} /></Table.Td>
                  <Table.Td><Skeleton height={16} width={40} /></Table.Td>
                  <Table.Td><Skeleton height={16} width={40} /></Table.Td>
                  <Table.Td><Skeleton height={16} width={50} /></Table.Td>
                  <Table.Td><Skeleton height={16} width={60} /></Table.Td>
                  <Table.Td><Skeleton height={16} width={80} /></Table.Td>
                </Table.Tr>
              ))
            ) : (
              aggregatedAuthors.slice(0, 100).map((author, index) => {
                const primaryTrack = Object.entries(author.trackDistribution)
                  .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';

                return (
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
                    <Table.Td ta="right">{author.totalProposals}</Table.Td>
                    <Table.Td ta="right">
                      <Text c="green" fw={500}>{author.finalizedProposals}</Text>
                    </Table.Td>
                    <Table.Td ta="right">
                      <Text
                        c={author.acceptanceRate > 0.5 ? 'green' : author.acceptanceRate > 0.2 ? 'orange' : 'red'}
                        fw={500}
                      >
                        {(author.acceptanceRate * 100).toFixed(0)}%
                      </Text>
                    </Table.Td>
                    <Table.Td ta="right">
                      <Text fw={600} c="blue">{author.influenceScore.toFixed(2)}</Text>
                    </Table.Td>
                    <Table.Td ta="right">
                      <Text size="sm">{primaryTrack}</Text>
                    </Table.Td>
                  </Table.Tr>
                );
              })
            )}
          </Table.Tbody>
        </Table>

        <Center mt="lg">
          <Text size="sm" c="dimmed" ta="center">
            Influence Score = (Finalized Proposals) / (Total Finalized Proposals) × 100%.
            Success Rate = (Finalized Proposals) / (Total Proposals).
            Showing top 100 authors ranked by influence score.
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