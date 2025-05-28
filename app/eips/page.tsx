// This file can be empty or a basic page for /eips route if needed.
// For now, we'll make it a simple placeholder page.
"use client";

import { Container, Title, Text, Stack, Group, Button, TextInput, Select, Card, Badge, Grid, Pagination, Paper, Skeleton, Divider } from "@mantine/core";
import { useState, useEffect } from "react";
import { IconSearch, IconPlus, IconFilter, IconEye, IconGitPullRequest, IconCalendar, IconUser } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { ErrorDisplay } from "@/components/shared/ErrorDisplay";
import { useTenant } from "@/hooks/useTenant";

interface EipItem {
  number: string;
  title: string;
  description: string;
  author: string;
  status: string;
  type: string;
  category?: string;
  created: string;
  lastModified?: string;
}

const mockEips: EipItem[] = [
  {
    number: "1",
    title: "EIP Purpose and Guidelines",
    description: "This EIP provides guidelines and standards for creating EIPs.",
    author: "Martin Becze, Hudson Jameson",
    status: "Living",
    type: "Meta",
    created: "2015-10-27",
    lastModified: "2023-02-01"
  },
  {
    number: "20",
    title: "Token Standard",
    description: "A standard interface for tokens.",
    author: "Fabian Vogelsteller, Vitalik Buterin",
    status: "Final",
    type: "Standards Track",
    category: "ERC",
    created: "2015-11-19",
    lastModified: "2023-01-15"
  },
  {
    number: "721",
    title: "Non-Fungible Token Standard",
    description: "A standard interface for non-fungible tokens.",
    author: "William Entriken, Dieter Shirley, Jacob Evans, Nastassia Sachs",
    status: "Final",
    type: "Standards Track",
    category: "ERC",
    created: "2018-01-24",
    lastModified: "2023-01-10"
  },
  {
    number: "1559",
    title: "Fee market change for ETH 1.0 chain",
    description: "A transaction pricing mechanism that includes fixed-per-block network fee.",
    author: "Vitalik Buterin, Eric Conner, Rick Dudley, Matthew Slipper, Ian Norden, Abdelhamid Bakhta",
    status: "Final",
    type: "Standards Track",
    category: "Core",
    created: "2019-04-13",
    lastModified: "2023-01-05"
  }
];

const statusColors: Record<string, string> = {
  "Draft": "blue",
  "Review": "yellow",
  "Last Call": "orange",
  "Final": "green",
  "Stagnant": "gray",
  "Withdrawn": "red",
  "Living": "violet"
};

export default function EipsListPage() {
  const router = useRouter();
  const { protocolConfig, isLoading: tenantLoading } = useTenant();

  const [eips, setEips] = useState<EipItem[]>([]);
  const [filteredEips, setFilteredEips] = useState<EipItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // Reduced for list view

  // Simulate loading EIPs (replace with actual API call)
  useEffect(() => {
    const loadEips = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // In a real implementation, this would be an API call
        setEips(mockEips);
        setFilteredEips(mockEips);
      } catch (err) {
        setError("Failed to load EIPs. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    loadEips();
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = eips;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(eip =>
        eip.title.toLowerCase().includes(query) ||
        eip.description.toLowerCase().includes(query) ||
        eip.number.includes(query) ||
        eip.author.toLowerCase().includes(query)
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(eip => eip.status === statusFilter);
    }

    if (typeFilter) {
      filtered = filtered.filter(eip => eip.type === typeFilter);
    }

    if (categoryFilter) {
      filtered = filtered.filter(eip => eip.category === categoryFilter);
    }

    setFilteredEips(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [eips, searchQuery, statusFilter, typeFilter, categoryFilter]);

  const handleRetry = () => {
    setError(null);
    // Trigger reload
    window.location.reload();
  };

  const paginatedEips = filteredEips.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredEips.length / itemsPerPage);

  const uniqueStatuses = [...new Set(eips.map(eip => eip.status))];
  const uniqueTypes = [...new Set(eips.map(eip => eip.type))];
  const uniqueCategories = [...new Set(eips.map(eip => eip.category).filter(Boolean))] as string[];

  if (tenantLoading) {
    return (
      <Container size="xl" py="xl">
        <LoadingSpinner message="Loading configuration..." />
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="xl" py="xl">
        <ErrorDisplay
          title="Failed to Load EIPs"
          message={error}
          onRetry={handleRetry}
          variant="page"
        />
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Group justify="space-between">
          <div>
            <Title order={1}>{protocolConfig.name} Repository</Title>
            <Text c="dimmed" mt="xs">
              Browse and search through all {protocolConfig.name}s
            </Text>
          </div>
          <Button
            leftSection={<IconPlus size="1rem" />}
            onClick={() => router.push('/eips/new')}
          >
            Create New {protocolConfig.name}
          </Button>
        </Group>

        {/* Filters */}
        <Paper p="md" withBorder>
          <Stack gap="md">
            <Group>
              <IconFilter size="1rem" />
              <Text fw={500}>Filters</Text>
            </Group>

            <Grid>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <TextInput
                  placeholder="Search by title, description, number, or author..."
                  leftSection={<IconSearch size="1rem" />}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </Grid.Col>

              <Grid.Col span={{ base: 12, sm: 6, md: 2 }}>
                <Select
                  placeholder="Status"
                  data={uniqueStatuses}
                  value={statusFilter}
                  onChange={setStatusFilter}
                  clearable
                />
              </Grid.Col>

              <Grid.Col span={{ base: 12, sm: 6, md: 2 }}>
                <Select
                  placeholder="Type"
                  data={uniqueTypes}
                  value={typeFilter}
                  onChange={setTypeFilter}
                  clearable
                />
              </Grid.Col>

              <Grid.Col span={{ base: 12, sm: 6, md: 2 }}>
                <Select
                  placeholder="Category"
                  data={uniqueCategories}
                  value={categoryFilter}
                  onChange={setCategoryFilter}
                  clearable
                />
              </Grid.Col>
            </Grid>
          </Stack>
        </Paper>

        {/* Results Summary */}
        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            Showing {paginatedEips.length} of {filteredEips.length} {protocolConfig.name}s
          </Text>
          {totalPages > 1 && (
            <Text size="sm" c="dimmed">
              Page {currentPage} of {totalPages}
            </Text>
          )}
        </Group>

        {/* EIP List */}
        {isLoading ? (
          <Stack gap="md">
            {Array.from({ length: 5 }).map((_, index) => (
              <Card key={index} withBorder p="lg">
                <Stack gap="sm">
                  <Group justify="space-between">
                    <Skeleton height={24} width="60%" />
                    <Skeleton height={20} width={80} />
                  </Group>
                  <Skeleton height={16} />
                  <Skeleton height={16} width="80%" />
                  <Group>
                    <Skeleton height={12} width={100} />
                    <Skeleton height={12} width={80} />
                    <Skeleton height={12} width={120} />
                  </Group>
                </Stack>
              </Card>
            ))}
          </Stack>
        ) : paginatedEips.length === 0 ? (
          <Paper p="xl" ta="center" withBorder>
            <Stack gap="md" align="center">
              <IconSearch size={48} color="var(--mantine-color-gray-5)" />
              <Text size="lg" fw={500}>No {protocolConfig.name}s found</Text>
              <Text size="sm" c="dimmed">
                Try adjusting your search criteria or filters
              </Text>
              <Button
                variant="light"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter(null);
                  setTypeFilter(null);
                  setCategoryFilter(null);
                }}
              >
                Clear Filters
              </Button>
            </Stack>
          </Paper>
        ) : (
          <Stack gap="md">
            {paginatedEips.map((eip) => (
              <Card
                key={eip.number}
                withBorder
                p="lg"
                style={{ cursor: 'pointer' }}
                onClick={() => router.push(`/eips/${eip.number}`)}
              >
                <Stack gap="md">
                  {/* Header */}
                  <Group justify="space-between" align="flex-start">
                    <div style={{ flex: 1 }}>
                      <Group gap="sm" align="center">
                        <Text fw={600} size="lg">
                          {protocolConfig.name}-{eip.number}
                        </Text>
                        <Badge
                          color={statusColors[eip.status] || "gray"}
                          variant="light"
                        >
                          {eip.status}
                        </Badge>
                      </Group>
                      <Text fw={500} size="md" mt={4}>
                        {eip.title}
                      </Text>
                    </div>
                    <Button
                      variant="light"
                      size="sm"
                      leftSection={<IconEye size="0.9rem" />}
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/eips/${eip.number}`);
                      }}
                    >
                      View
                    </Button>
                  </Group>

                  {/* Description */}
                  <Text size="sm" c="dimmed" lineClamp={2}>
                    {eip.description}
                  </Text>

                  <Divider />

                  {/* Metadata */}
                  <Group justify="space-between" wrap="wrap">
                    <Group gap="xl">
                      <Group gap="xs">
                        <IconUser size="0.9rem" color="var(--mantine-color-gray-6)" />
                        <Text size="sm" c="dimmed">
                          <strong>Author:</strong> {eip.author.split(',')[0]}
                          {eip.author.includes(',') && '...'}
                        </Text>
                      </Group>

                      <Text size="sm" c="dimmed">
                        <strong>Type:</strong> {eip.type}
                        {eip.category && ` • ${eip.category}`}
                      </Text>
                    </Group>

                    <Group gap="xs">
                      <IconCalendar size="0.9rem" color="var(--mantine-color-gray-6)" />
                      <Text size="sm" c="dimmed">
                        {new Date(eip.created).toLocaleDateString()}
                        {eip.lastModified && (
                          <Text span c="dimmed" size="xs" ml="xs">
                            (Updated {new Date(eip.lastModified).toLocaleDateString()})
                          </Text>
                        )}
                      </Text>
                    </Group>
                  </Group>
                </Stack>
              </Card>
            ))}
          </Stack>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <Group justify="center">
            <Pagination
              value={currentPage}
              onChange={setCurrentPage}
              total={totalPages}
              size="sm"
            />
          </Group>
        )}
      </Stack>
    </Container>
  );
}