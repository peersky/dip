"use client";

import { Container, Title, Text, Stack, Paper, Group, Button, SimpleGrid, Badge, Box, TextInput, Select, Card, Pagination, Grid, Divider, Skeleton } from "@mantine/core";
import Link from "next/link";
import { useTenant } from "@/hooks/useTenant";
import { getAllProtocols } from "@/lib/subdomain-utils";
import { IconExternalLink, IconPlus, IconSearch, IconFilter, IconEye, IconCalendar, IconUser } from "@tabler/icons-react";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { ErrorDisplay } from "@/components/shared/ErrorDisplay";
import { useEipsList, type EipItem } from "@/hooks/useEips";

const statusColors: Record<string, string> = {
  "Draft": "blue",
  "Review": "yellow",
  "Last Call": "orange",
  "Final": "green",
  "Stagnant": "gray",
  "Withdrawn": "red",
  "Living": "violet"
};

// Protocol Card Component
function ProtocolCard({ protocol }: { protocol: ReturnType<typeof getAllProtocols>[0] }) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (process.env.NODE_ENV === "development" ? "localhost:3000" : "dip.box");
  // Construct URL for protocol subdomain
  const protocolUrl = `http${baseUrl.startsWith('localhost') ? '' : 's'}://${protocol.subdomain}.${baseUrl}`;

  return (
    <Paper
      p="xl"
      shadow="md"
      withBorder
      component="a"
      href={protocolUrl} // Use the dynamically constructed URL
      style={{
        textDecoration: 'none',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        cursor: 'pointer'
      }}
      className="hover:transform hover:scale-105 hover:shadow-lg"
    >
      <Stack gap="md">
        <Group justify="space-between" align="flex-start">
          <Box>
            <Title order={2} size="h3" c={protocol.color}>
              {protocol.name}
            </Title>
            <Text size="sm" c="dimmed" mt="xs">
              {protocol.description}
            </Text>
          </Box>
          <IconExternalLink size={20} color="var(--mantine-color-dimmed)" />
        </Group>

        <Group gap="xs">
          <Badge variant="light" color={protocol.color}>
            {protocol.proposalPrefix}s
          </Badge>
          <Badge variant="outline" size="sm">
            {protocol.repoOwner}/{protocol.repoName}
          </Badge>
        </Group>

        <Text size="xs" c="dimmed">
          Visit {protocol.subdomain}.{baseUrl} to browse and create {protocol.proposalPrefix}s
        </Text>
      </Stack>
    </Paper>
  );
}

// Main Domain View - Shows Protocol Cards
function MainDomainView() {
  const protocols = getAllProtocols();

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <Box ta="center">
          <Title order={1} size="h1" mb="md">
            Decentralized Improvement Protocols
          </Title>
          <Text size="lg" c="dimmed" maw={600} mx="auto">
            A unified platform for managing improvement proposals across different blockchain protocols.
            Choose a protocol below to browse, discuss, and contribute to proposals.
          </Text>
        </Box>

        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
          {protocols.map((protocol) => (
            <ProtocolCard key={protocol.subdomain} protocol={protocol} />
          ))}
        </SimpleGrid>

        <Box ta="center" mt="xl">
          <Text size="sm" c="dimmed">
            Each protocol maintains its own repository of improvement proposals.
            Click on a protocol card to access its dedicated subdomain.
          </Text>
        </Box>
      </Stack>
    </Container>
  );
}

// Protocol Subdomain View - Shows EIP Listing directly
function ProtocolSubdomainView() {
  const router = useRouter();
  const { protocolConfig, isLoading: tenantLoading, isMainDomain } = useTenant();

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, statusFilter, typeFilter, categoryFilter, protocolConfig?.subdomain]);

  // Prepare query parameters
  const queryParams = useMemo(() => ({
    protocol: protocolConfig?.subdomain || '',
    page: currentPage,
    limit: itemsPerPage,
    search: debouncedSearchQuery || undefined,
    status: statusFilter || undefined,
    type: typeFilter || undefined,
    category: categoryFilter || undefined,
  }), [protocolConfig?.subdomain, currentPage, debouncedSearchQuery, statusFilter, typeFilter, categoryFilter]);

  // Use React Query for data fetching
  const {
    data: eipsData,
    isLoading,
    error,
    refetch,
  } = useEipsList(queryParams);

  const handleRetry = () => {
    refetch();
  };

  if (tenantLoading) {
    return <Container size="xl" py="xl"><LoadingSpinner message="Loading protocol..." /></Container>;
  }

  // If isMainDomain is true here, it means routing/tenant logic error, MainDomainView should be shown by HomePage
  if (isMainDomain) {
     return (
      <Container size="xl" py="xl">
        <ErrorDisplay title="Routing Error" message="Displaying proposal list on main domain. Please check configuration." variant="page" />
      </Container>
    );
  }

  // If protocolConfig is still not available after tenantLoading is false, then it's an issue.
  if (!protocolConfig || protocolConfig.subdomain === 'main') {
     return (
      <Container size="xl" py="xl">
        <ErrorDisplay title="Configuration Error" message="Protocol configuration not available for this subdomain." variant="page" />
      </Container>
    );
  }

  if (error && !isLoading) {
    return (
      <Container size="xl" py="xl">
        <ErrorDisplay
          title={`Failed to Load ${protocolConfig.proposalPrefix}s`}
          message={error.message}
          onRetry={handleRetry}
          variant="page"
        />
      </Container>
    );
  }

  const eips = eipsData?.data.eips || [];
  const pagination = eipsData?.data.pagination;
  const filterOptions = eipsData?.data.filters?.options || { statuses: [], types: [], categories: [] };

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Group justify="space-between">
          <div>
            <Title order={1}>{protocolConfig.name} Repository</Title>
            <Text c="dimmed" mt="xs">
              Browse and search through all {protocolConfig.proposalPrefix}s
            </Text>
          </div>
          <Button
            leftSection={<IconPlus size="1rem" />}
            onClick={() => router.push('/eips/new')}
          >
            Create New {protocolConfig.proposalPrefix}
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
                  placeholder={`Search by title, ${protocolConfig.proposalPrefix} number, or author...`}
                  leftSection={<IconSearch size="1rem" />}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </Grid.Col>

              <Grid.Col span={{ base: 12, sm: 6, md: 2 }}>
                <Select
                  placeholder="Status"
                  data={filterOptions.statuses}
                  value={statusFilter}
                  onChange={setStatusFilter}
                  clearable
                />
              </Grid.Col>

              <Grid.Col span={{ base: 12, sm: 6, md: 2 }}>
                <Select
                  placeholder="Type"
                  data={filterOptions.types}
                  value={typeFilter}
                  onChange={setTypeFilter}
                  clearable
                />
              </Grid.Col>

              <Grid.Col span={{ base: 12, sm: 6, md: 2 }}>
                <Select
                  placeholder="Category"
                  data={filterOptions.categories}
                  value={categoryFilter}
                  onChange={setCategoryFilter}
                  clearable
                  disabled={filterOptions.categories.length === 0}
                />
              </Grid.Col>
            </Grid>
          </Stack>
        </Paper>

        {/* Results Summary */}
        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            Showing {eips.length} of {pagination?.totalCount || 0} {protocolConfig.proposalPrefix}s
          </Text>
          {pagination && pagination.totalPages > 1 && (
            <Text size="sm" c="dimmed">
              Page {pagination.currentPage} of {pagination.totalPages}
            </Text>
          )}
        </Group>

        {/* EIP List */}
        {isLoading ? (
          <Stack gap="md">
            {Array.from({ length: itemsPerPage }).map((_, index) => (
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
        ) : eips.length === 0 ? (
          <Paper p="xl" ta="center" withBorder>
            <Stack gap="md" align="center">
              <IconSearch size={48} color="var(--mantine-color-gray-5)" />
              <Text size="lg" fw={500}>No {protocolConfig.proposalPrefix}s found</Text>
              <Text size="sm" c="dimmed">
                Try adjusting your search criteria or filters, or check back later.
              </Text>
              <Button
                variant="light"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter(null);
                  setTypeFilter(null);
                  setCategoryFilter(null);
                  setCurrentPage(1); // Also reset page
                }}
              >
                Clear Filters
              </Button>
            </Stack>
          </Paper>
        ) : (
          <Stack gap="md">
            {eips.map((eip) => (
              <Card
                key={eip.number}
                withBorder
                p="lg"
                style={{ cursor: 'pointer' }}
                onClick={() => router.push(`/eips/${eip.number}`)}
              >
                <Stack gap="md">
                  <Group justify="space-between" align="flex-start">
                    <div style={{ flex: 1 }}>
                      <Group gap="sm" align="center">
                        <Text fw={600} size="lg">
                          {protocolConfig.proposalPrefix}-{eip.number}
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
                  <Text size="sm" c="dimmed" lineClamp={2}>
                    {eip.description}
                  </Text>
                  <Divider />
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

        {pagination && pagination.totalPages > 1 && (
          <Group justify="center" mt="lg">
            <Pagination
              value={currentPage}
              onChange={setCurrentPage}
              total={pagination.totalPages}
              size="sm"
            />
          </Group>
        )}
      </Stack>
    </Container>
  );
}

export default function HomePage() {
  const { isMainDomain, isLoading: tenantLoading } = useTenant();

  if (tenantLoading) {
    return (
      <Container size="lg" py="xl">
        <LoadingSpinner message="Initializing DIP Platform..." />
      </Container>
    );
  }

  if (isMainDomain) {
    return <MainDomainView />;
  }

  return <ProtocolSubdomainView />;
}

