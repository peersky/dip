"use client";

import { Container, Text, Stack, Paper, Group, Button, Badge, TextInput, Select, Card, Pagination, Grid, Divider, Skeleton } from "@mantine/core";
import { getProtocolConfig } from "@/lib/subdomain-utils";
import { IconPlus, IconSearch, IconFilter, IconEye, IconCalendar, IconUser } from "@tabler/icons-react";
import { useState, useEffect, useMemo } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { ErrorDisplay } from "@/components/shared/ErrorDisplay";
import { useEipsList } from "@/hooks/useEips";

const statusColors: Record<string, string> = {
  "Draft": "blue",
  "Review": "yellow",
  "Last Call": "orange",
  "Final": "green",
  "Stagnant": "gray",
  "Withdrawn": "red",
  "Living": "violet"
};

export default function SubdomainProtocolPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const subdomain = params.subdomain as string; // Get subdomain from route

  // Get protocolConfig directly using the subdomain from route params
  // No need for useTenant here for the primary protocolConfig, though it might be used for other tenant info
  const protocolConfig = useMemo(() => getProtocolConfig(subdomain), [subdomain]);

  // Initialize filter states from URL parameters
  const [searchQuery, setSearchQuery] = useState(searchParams?.get('search') || "");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchParams?.get('search') || "");
  const [statusFilter, setStatusFilter] = useState<string | null>(searchParams?.get('status') || null);
  const [trackFilter, setTrackFilter] = useState<string | null>(searchParams?.get('track') || null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams?.get('page') || '1'));
  const itemsPerPage = 10; // Or make this configurable

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearchQuery) params.set('search', debouncedSearchQuery);
    if (statusFilter) params.set('status', statusFilter);
    if (trackFilter) params.set('track', trackFilter);
    if (currentPage > 1) params.set('page', currentPage.toString());

    const newUrl = params.toString() ? `/?${params.toString()}` : '/';
    router.replace(newUrl, { scroll: false });
  }, [debouncedSearchQuery, statusFilter, trackFilter, currentPage, router]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset page to 1 when filters or subdomain change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, statusFilter, trackFilter, subdomain]);

  // Prepare query parameters for useEipsList
  const queryParams = useMemo(() => ({
    protocol: subdomain, // Use subdomain from route directly
    page: currentPage,
    limit: itemsPerPage,
    search: debouncedSearchQuery || undefined,
    status: statusFilter || undefined,
    track: trackFilter || undefined,
  }), [subdomain, currentPage, itemsPerPage, debouncedSearchQuery, statusFilter, trackFilter]);

  const {
    data: eipsData,
    isLoading,
    error,
    refetch,
  } = useEipsList(queryParams);

  const handleRetry = () => {
    refetch();
  };

  const combinedTrackOptions = useMemo(() => {
    if (!eipsData?.filters) return [];
    const types = eipsData.filters.types || [];
    const categories = eipsData.filters.categories || [];
    const combined = new Set([...types, ...categories]);
    return Array.from(combined).sort().map(opt => ({ label: opt, value: opt }));
  }, [eipsData?.filters]);

  // Initial loading state based on hook or if protocol config is not ready (e.g. invalid subdomain)
  if (!protocolConfig || protocolConfig.subdomain === 'main') {
    // This can happen if an invalid subdomain is routed here somehow
    // or if getProtocolConfig returns the default/main config for an unrecognized one.
    return (
      <Container size="xl" py="xl">
        <ErrorDisplay title="Invalid Protocol" message={`The protocol "${subdomain}" is not recognized.`} variant="page" />
      </Container>
    );
  }

  if (isLoading) { // This isLoading is from useEipsList
    return <Container size="xl" py="xl"><LoadingSpinner message={`Loading ${protocolConfig.name} proposals...`} /></Container>;
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

  const eips = eipsData?.data || [];
  const pagination = eipsData?.pagination;
  const filterOptions = eipsData?.filters || { statuses: [], types: [], categories: [] };
  // const statistics = eipsData?.statistics; // Statistics removed as per earlier request

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Group justify="space-between">
          <div>
            {/* <Title order={1}>{protocolConfig.name} Repository</Title>
            <Text c="dimmed" mt="xs">
              Browse and search through all {protocolConfig.proposalPrefix}s
            </Text> */}
          </div>
          <Button
            leftSection={<IconPlus size="1rem" />}
            onClick={() => router.push(`/new`)}
          >
            Create New {protocolConfig.proposalPrefix}
          </Button>
        </Group>

        {eipsData?.lastUpdate && (
          <Text size="xs" c="dimmed" mb="md">
            Last updated: {new Date(eipsData.lastUpdate).toLocaleDateString()}
          </Text>
        )}

        {/* Filters */}
        <Paper p="md" withBorder>
          <Stack gap="md">
            <Group>
              <IconFilter size="1rem" />
              <Text fw={500}>Filters</Text>
            </Group>

            <Grid>
              <Grid.Col span={{ base: 12, md: 8 }}>
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
                  data={filterOptions.statuses.map(s => ({label: s, value: s}))} // Ensure data is in {label, value} format
                  value={statusFilter}
                  onChange={setStatusFilter}
                  clearable
                />
              </Grid.Col>

              <Grid.Col span={{ base: 12, sm: 6, md: 2 }}>
                <Select
                  placeholder="Track (Type/Category)"
                  data={combinedTrackOptions}
                  value={trackFilter}
                  onChange={setTrackFilter}
                  clearable
                  disabled={!combinedTrackOptions || combinedTrackOptions.length === 0}
                />
              </Grid.Col>
            </Grid>
          </Stack>
        </Paper>

        {/* Results Summary */}
        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            Showing {eips.length} of {pagination?.total || 0} {protocolConfig.proposalPrefix}s
          </Text>
          {pagination && pagination.totalPages > 1 && (
            <Text size="sm" c="dimmed">
              Page {pagination.page} of {pagination.totalPages}
            </Text>
          )}
        </Group>

        {/* EIP List */}
        {isLoading ? ( // This check is redundant given the one above, but harmless
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
                  setTrackFilter(null);
                  setCurrentPage(1);
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
                key={`${subdomain}-${eip.number}`}
                withBorder
                p="lg"
                style={{ cursor: 'pointer' }}
                onClick={() => router.push(`/${eip.number}`)}
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
                        router.push(`/${eip.number}`);
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
                        <strong>Track:</strong> {eip.type}{eip.category && eip.type ? ` / ${eip.category}` : eip.category || ''}
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