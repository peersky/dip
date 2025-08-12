"use client";

import {
  Container,
  Title,
  Text,
  Stack,
  Tabs,
  Table,
  Anchor,
  Skeleton,
  Group,
  TextInput,
  Select,
  Badge,
  Pagination,
  Box,
  Card,
  SimpleGrid,
  Paper,
  UnstyledButton,
  Center,
  useMantineTheme,
  RingProgress,
} from "@mantine/core";
import {
  IconSearch,
  IconChartBar,
  IconList,
  IconChevronUp,
  IconChevronDown,
  IconSelector,
  IconChartLine,
} from "@tabler/icons-react";
import { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { getProtocolConfig } from "@/lib/subdomain-utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { ResponsiveSankey } from "@nivo/sankey";

// --- Types ---
interface Proposal {
  proposalNumber: string;
  proposalPrefix: string;
  title: string;
  status: string;
  authors: string[];
  lastUpdated: string;
  category: string | null;
  type: string;
}

interface ProtocolStats {
  totalProposals: number;
  distinctAuthorsCount: number;
  authorsOnFinalizedCount: number;
  statusCounts: Record<string, number>;
  typeCounts: Record<string, number>;
  tracksBreakdown: Record<
    string,
    {
      totalProposalsInTrack: number;
      finalizedProposalsInTrack: number;
    }
  >;
  lastUpdated: string;
  averageTimeInStage: Record<string, number>;
}

const statusColors: Record<string, string> = {
  Draft: "blue",
  Review: "yellow",
  "Last Call": "orange",
  Final: "green",
  Stagnant: "gray",
  Withdrawn: "red",
  Living: "violet",
};

// --- Sankey Chart for Proposal Flow (using Nivo) ---
function SankeyView({ protocol }: { protocol: string }) {
  const [sankeyData, setSankeyData] = useState<{
    nodes: { id: string }[];
    links: { source: string; target: string; value: number }[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const theme = useMantineTheme();

  useEffect(() => {
    const fetchSankeyData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/sankey/${protocol}`);
        if (!response.ok) {
          throw new Error(
            `Failed to fetch Sankey data: ${response.statusText}`,
          );
        }
        const data = await response.json();
        if (data.success) {
          // Nivo expects node IDs to be strings, which our API already provides.
          const formattedData = {
            nodes: data.data.nodes.map((node: any) => ({
              ...node,
              id: node.name,
            })),
            links: data.data.links,
          };
          setSankeyData(formattedData);
        } else {
          throw new Error(data.error || "An unknown error occurred");
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSankeyData();
  }, [protocol]);

  if (isLoading) {
    return <Skeleton height={400} />;
  }
  if (error) {
    return <Text c="red">Could not load proposal flow data: {error}</Text>;
  }
  if (!sankeyData || sankeyData.links.length === 0) {
    return <Text>No proposal flow data available for this protocol.</Text>;
  }

  return (
    <Card withBorder radius="md" p="xl">
      <Title order={3} mb="xs" ta="center">
        Proposal Status Flow
      </Title>
      <Text c="dimmed" ta="center" size="sm" mb="lg">
        How proposals transition between different statuses over their
        lifecycle.
      </Text>
      <Box style={{ height: 500 }}>
        <ResponsiveSankey
          data={sankeyData}
          margin={{ top: 40, right: 160, bottom: 40, left: 50 }}
          align="justify"
          colors={{ scheme: "category10" }}
          nodeOpacity={1}
          nodeHoverOthersOpacity={0.35}
          nodeThickness={18}
          nodeSpacing={24}
          nodeBorderWidth={0}
          nodeBorderColor={{
            from: "color",
            modifiers: [["darker", 0.8]],
          }}
          nodeBorderRadius={3}
          linkOpacity={0.5}
          linkHoverOthersOpacity={0.1}
          linkContract={3}
          enableLinkGradient={true}
          labelPosition="outside"
          labelOrientation="vertical"
          labelPadding={16}
          label={(node) => `${node.id} (${node.value})`}
          labelTextColor={{
            from: "color",
            modifiers: [["darker", 1]],
          }}
          // Add a custom layer to render the link values.
          layers={[
            "links",
            "nodes",
            "labels",
            ({ links }) => (
              <g>
                {links.map((link) => (
                  <text
                    key={link.index}
                    x={link.source.x1 + (link.target.x0 - link.source.x1) / 2}
                    y={(link.source.y1 + link.source.y0) / 2 + 6}
                    dy="0.35em"
                    textAnchor="middle"
                    fontSize={12}
                  >
                    {link.value}
                  </text>
                ))}
              </g>
            ),
          ]}
          theme={{
            labels: {
              text: {
                fontSize: 14,
                fill: "#667eea",
              },
            },
            tooltip: {
              container: {
                background: "#fff",
                color: "#333",
              },
            },
          }}
        />
      </Box>
    </Card>
  );
}

// --- Statistics Tab Component ---
function StatisticsView({ protocol }: { protocol: string }) {
  const [stats, setStats] = useState<ProtocolStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const theme = useMantineTheme();

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/stats/${protocol}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch statistics: ${response.statusText}`);
        }
        const data = await response.json();
        if (data.success) {
          setStats(data.statistics);
        } else {
          throw new Error(data.error || "An unknown error occurred");
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [protocol]);

  if (isLoading) {
    return (
      <Stack>
        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }}>
          <Skeleton height={120} />
          <Skeleton height={120} />
          <Skeleton height={120} />
          <Skeleton height={120} />
        </SimpleGrid>
        <Skeleton height={300} />
        <SimpleGrid cols={{ base: 1, md: 2 }}>
          <Skeleton height={300} />
          <Skeleton height={300} />
        </SimpleGrid>
      </Stack>
    );
  }

  if (error) {
    return <Text c="red">Could not load statistics: {error}</Text>;
  }

  if (!stats) {
    return <Text>No statistics available for this protocol.</Text>;
  }

  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = (props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;
    // Do not render labels for very small slices to avoid clutter
    if (percent < 0.05) {
      return null;
    }
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="14px"
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const acceptanceRate =
    stats.distinctAuthorsCount > 0
      ? stats.authorsOnFinalizedCount / stats.distinctAuthorsCount
      : 0;

  const centralizationRate = 1 - acceptanceRate;

  const statusChartData = Object.entries(stats.statusCounts)
    .filter(([name]) => name !== "Moved")
    .map(([name, value]) => ({ name, count: value }))
    .sort((a, b) => b.count - a.count);

  const typeChartData = Object.entries(stats.typeCounts)
    .map(([name, value]) => ({ name, count: value }))
    .sort((a, b) => b.count - a.count);

  const trackChartData = Object.entries(stats.tracksBreakdown)
    .map(([name, value]) => ({
      name,
      count: value.totalProposalsInTrack,
    }))
    .sort((a, b) => b.count - a.count);

  return (
    <Stack gap="xl">
      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }}>
        <Paper withBorder p="lg" radius="md">
          <Text size="2rem" fw={700}>
            {stats.totalProposals}
          </Text>
          <Text c="dimmed">Total Proposals</Text>
        </Paper>
        <Paper withBorder p="lg" radius="md">
          <Text size="2rem" fw={700}>
            {stats.distinctAuthorsCount}
          </Text>
          <Text c="dimmed">Distinct Authors</Text>
        </Paper>
        <Paper withBorder p="lg" radius="md">
          <Group justify="center">
            <RingProgress
              size={80}
              thickness={8}
              roundCaps
              sections={[{ value: acceptanceRate * 100, color: "teal" }]}
              label={
                <Text c="teal" fw={700} ta="center" size="lg">
                  {(acceptanceRate * 100).toFixed(0)}%
                </Text>
              }
            />
          </Group>
          <Text c="dimmed" ta="center" mt="sm">
            Acceptance Rate
          </Text>
        </Paper>
        <Paper withBorder p="lg" radius="md">
          <Group justify="center">
            <RingProgress
              size={80}
              thickness={8}
              roundCaps
              sections={[{ value: centralizationRate * 100, color: "orange" }]}
              label={
                <Text c="orange" fw={700} ta="center" size="lg">
                  {(centralizationRate * 100).toFixed(0)}%
                </Text>
              }
            />
          </Group>
          <Text c="dimmed" ta="center" mt="sm">
            Centralization Score
          </Text>
        </Paper>
      </SimpleGrid>
      <SankeyView protocol={protocol} />
      <SimpleGrid cols={{ base: 1, md: 2 }}>
        <Card withBorder radius="md" p="xl">
          <Title order={3} mb="lg" ta="center">
            Breakdown by Type
          </Title>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={typeChartData}>
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar
                dataKey="count"
                fill={theme.colors.grape[6]}
                name="Proposals"
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card withBorder radius="md" p="xl">
          <Title order={3} mb="lg" ta="center">
            Breakdown by Track
          </Title>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={trackChartData}>
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar
                dataKey="count"
                fill={theme.colors.cyan[6]}
                name="Proposals"
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </SimpleGrid>

      {stats.averageTimeInStage &&
        Object.keys(stats.averageTimeInStage).length > 0 && (
          <Card withBorder radius="md" p="xl">
            <Title order={3} mb="xs" ta="center">
              Active Stage Velocity
            </Title>
            <Text c="dimmed" ta="center" size="sm" mb="lg">
              Proportion of time spent in each active development stage.
            </Text>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={Object.entries(stats.averageTimeInStage).map(
                    ([name, value]) => ({ name, value }),
                  )}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomizedLabel}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                >
                  {Object.entries(stats.averageTimeInStage).map(
                    ([name], index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={statusColors[name] || theme.colors.gray[5]}
                      />
                    ),
                  )}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [
                    `${value.toFixed(1)} days`,
                    "Average Duration",
                  ]}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        )}

      <Text size="xs" c="dimmed" ta="right">
        Last updated: {new Date(stats.lastUpdated).toLocaleString()}
      </Text>
    </Stack>
  );
}

// --- Proposals List Tab Component ---
function ProposalsList({ protocol }: { protocol: string }) {
  const router = useRouter();
  const protocolConfig = getProtocolConfig(protocol);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtering and Sorting State
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState("proposalNumber");
  const [sortOrder, setSortOrder] = useState("desc");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 150;

  // Debounce search term to avoid excessive API calls while typing
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch proposals whenever filters, sorting, or protocol change
  useEffect(() => {
    const fetchProposals = async () => {
      setIsLoading(true);
      setError(null);
      const params = new URLSearchParams({
        sort_by: sortBy,
        sort_order: sortOrder,
      });
      if (statusFilter) params.set("status", statusFilter);
      if (typeFilter) params.set("type", typeFilter);
      if (debouncedSearchTerm) params.set("search", debouncedSearchTerm);

      try {
        const response = await fetch(
          `/api/proposals/${protocol}?${params.toString()}`,
        );
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.statusText}`);
        }
        const data = await response.json();
        if (data.success) {
          setProposals(data.proposals);
        } else {
          throw new Error(data.error || "Unknown API error");
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProposals();
  }, [
    protocol,
    sortBy,
    sortOrder,
    statusFilter,
    typeFilter,
    debouncedSearchTerm,
  ]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, typeFilter, debouncedSearchTerm]);

  // Derive filter options from the full dataset
  const filterOptions = useMemo(() => {
    const statuses = new Set<string>();
    const types = new Set<string>();
    proposals.forEach((p) => {
      if (p.status) statuses.add(p.status);
      if (p.type) types.add(p.type);
    });
    return {
      statuses: Array.from(statuses).sort(),
      types: Array.from(types).sort(),
    };
  }, [proposals]);

  const paginatedProposals = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return proposals.slice(startIndex, startIndex + itemsPerPage);
  }, [proposals, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(proposals.length / itemsPerPage);

  // Component for sortable table headers
  function ThSortable({
    children,
    field,
  }: {
    children: React.ReactNode;
    field: string;
  }) {
    const Icon =
      sortBy === field
        ? sortOrder === "asc"
          ? IconChevronUp
          : IconChevronDown
        : IconSelector;
    return (
      <Table.Th>
        <UnstyledButton
          onClick={() => {
            if (sortBy === field) {
              setSortOrder(sortOrder === "asc" ? "desc" : "asc");
            } else {
              setSortBy(field);
              setSortOrder("desc");
            }
          }}
        >
          <Group gap="xs">
            <Text fw={500} size="sm">
              {children}
            </Text>
            <Center>
              <Icon size={14} stroke={1.5} />
            </Center>
          </Group>
        </UnstyledButton>
      </Table.Th>
    );
  }

  if (error) {
    return <Text c="red">Could not load proposals: {error}</Text>;
  }

  return (
    <Stack>
      <Group>
        <TextInput
          placeholder={`Search title or author...`}
          leftSection={<IconSearch size={16} />}
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.currentTarget.value)}
          style={{ flex: 1 }}
        />
        <Select
          placeholder="Filter by Status"
          data={filterOptions.statuses}
          value={statusFilter}
          onChange={setStatusFilter}
          clearable
        />
        <Select
          placeholder="Filter by Type"
          data={filterOptions.types}
          value={typeFilter}
          onChange={setTypeFilter}
          clearable
        />
      </Group>
      <Box style={{ overflowX: "auto" }}>
        <Table withTableBorder withColumnBorders highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <ThSortable field="proposalNumber">Number</ThSortable>
              <ThSortable field="title">Title</ThSortable>
              <ThSortable field="status">Status</ThSortable>
              <Table.Th>Author(s)</Table.Th>
              <ThSortable field="lastUpdated">Last Updated</ThSortable>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {isLoading
              ? Array.from({ length: 10 }).map((_, index) => (
                  <Table.Tr key={index}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Table.Td key={i}>
                        <Skeleton height={16} />
                      </Table.Td>
                    ))}
                  </Table.Tr>
                ))
              : paginatedProposals.map((p) => (
                  <Table.Tr
                    key={p.proposalNumber}
                    onClick={() =>
                      router.push(`/${p.proposalPrefix}-${p.proposalNumber}`)
                    }
                    style={{ cursor: "pointer" }}
                  >
                    <Table.Td>
                      <Text fw={500}>
                        {protocolConfig.proposalPrefix}-{p.proposalNumber}
                      </Text>
                    </Table.Td>
                    <Table.Td>{p.title}</Table.Td>
                    <Table.Td>
                      <Badge
                        color={statusColors[p.status] || "gray"}
                        variant="light"
                      >
                        {p.status}
                      </Badge>
                    </Table.Td>
                    <Table.Td style={{ maxWidth: 300 }}>
                      <Text size="sm" truncate>
                        {p.authors.join(", ")}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      {new Date(p.lastUpdated).toLocaleDateString()}
                    </Table.Td>
                  </Table.Tr>
                ))}
          </Table.Tbody>
        </Table>
      </Box>
      {totalPages > 1 && (
        <Group justify="center" mt="lg">
          <Pagination
            total={totalPages}
            value={currentPage}
            onChange={setCurrentPage}
          />
        </Group>
      )}
    </Stack>
  );
}

// --- Analytics Tab Component (Time Series) ---
function AnalyticsView({ protocol }: { protocol: string }) {
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const theme = useMantineTheme();

  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/analytics/${protocol}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch analytics: ${response.statusText}`);
        }
        const data = await response.json();
        if (data.success) {
          setAnalytics(data.data);
        } else {
          throw new Error(data.error || "An unknown error occurred");
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnalytics();
  }, [protocol]);

  if (isLoading) {
    return (
      <Stack>
        <Skeleton height={300} />
        <Skeleton height={300} />
        <Skeleton height={300} />
      </Stack>
    );
  }

  if (error) {
    return <Text c="red">Could not load historical analytics: {error}</Text>;
  }

  if (!analytics || analytics.length === 0) {
    return <Text>No historical analytics available for this protocol.</Text>;
  }

  return (
    <Stack gap="xl">
      <Card withBorder radius="md" p="xl">
        <Title order={3} mb="lg" ta="center">
          Proposal Growth
        </Title>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={analytics}>
            <XAxis dataKey="date" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="totalProposals"
              name="Total Proposals"
              stroke={theme.colors.blue[6]}
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>
      <Card withBorder radius="md" p="xl">
        <Title order={3} mb="lg" ta="center">
          Author Activity
        </Title>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={analytics}>
            <XAxis dataKey="date" />
            <YAxis
              yAxisId="left"
              orientation="left"
              allowDecimals={false}
              stroke={theme.colors.green[6]}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke={theme.colors.violet[6]}
            />
            <Tooltip />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="distinctAuthors"
              name="Distinct Authors"
              stroke={theme.colors.green[6]}
              strokeWidth={2}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="proposalsPerAuthor"
              name="Proposals Per Author"
              stroke={theme.colors.violet[6]}
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>
      <Card withBorder radius="md" p="xl">
        <Title order={3} mb="lg" ta="center">
          Protocol Health Metrics
        </Title>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={analytics}>
            <XAxis dataKey="date" />
            <YAxis yAxisId="left" orientation="left" unit="%" />
            <Tooltip />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="acceptanceRate"
              name="Acceptance Rate"
              stroke={theme.colors.teal[6]}
              strokeWidth={2}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="centralizationRate"
              name="Centralization Rate"
              stroke={theme.colors.orange[6]}
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </Stack>
  );
}

// --- Main Page Component ---
export default function SubdomainProtocolPage() {
  const params = useParams();
  const subdomain = params.subdomain as string;
  const protocolConfig = getProtocolConfig(subdomain);

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <Box>
          <Title order={1}>{protocolConfig.name} Protocol Dashboard</Title>
          <Text c="dimmed" mt="xs">
            {protocolConfig.description}
          </Text>
        </Box>

        <Tabs defaultValue="proposals">
          <Tabs.List>
            <Tabs.Tab value="proposals" leftSection={<IconList size={16} />}>
              Proposals
            </Tabs.Tab>
            <Tabs.Tab
              value="statistics"
              leftSection={<IconChartBar size={16} />}
            >
              Statistics
            </Tabs.Tab>
            <Tabs.Tab
              value="analytics"
              leftSection={<IconChartLine size={16} />}
            >
              Analytics
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="proposals" pt="xl">
            <ProposalsList protocol={subdomain} />
          </Tabs.Panel>

          <Tabs.Panel value="statistics" pt="xl">
            <StatisticsView protocol={subdomain} />
          </Tabs.Panel>

          <Tabs.Panel value="analytics" pt="xl">
            <AnalyticsView protocol={subdomain} />
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
}
