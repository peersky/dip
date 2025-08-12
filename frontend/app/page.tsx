"use client";

import {
  Container,
  Title,
  Text,
  Stack,
  Group,
  Card,
  SimpleGrid,
  Badge,
  Button,
  Loader,
  Alert,
  Paper,
  Box,
  Anchor,
  useMantineTheme,
  RingProgress,
} from "@mantine/core";
import {
  IconChartBar,
  IconUsers,
  IconFileText,
  IconAlertCircle,
  IconExternalLink,
  IconTimeline,
} from "@tabler/icons-react";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { getProtocolConfig, getProtocolUrl } from "@/lib/subdomain-utils";

// Define the structure of the data we expect from our new API endpoint
interface ProtocolStats {
  protocol: string;
  snapshotDate: string;
  totalProposals: number;
  distinctAuthorsCount: number;
  centralizationRate: number;
  description: string | null;
  website: string | null;
  ecosystem: string | null;
  proposalPrefix: string | null;
}

// --- ProtocolCard Component ---
// A dedicated component for displaying a single protocol's information in a card format.
function ProtocolCard({ protocol }: { protocol: ProtocolStats }) {
  const router = useRouter();
  const theme = useMantineTheme();
  const protocolConfig = getProtocolConfig(protocol.protocol);

  const handleNavigate = () => {
    // Navigate to the subdomain-based page for the protocol using the new helper.
    const url = getProtocolUrl(protocol.protocol);
    window.location.href = url;
  };

  return (
    <Card withBorder shadow="sm" p="lg" radius="md">
      <Stack justify="space-between" style={{ height: "100%" }}>
        <Box>
          <Group justify="space-between" mb="xs">
            <Title order={3} size="h4">
              {protocolConfig?.name || protocol.protocol}
            </Title>
            {protocol.ecosystem && (
              <Badge variant="light" color={theme.primaryColor}>
                {protocol.ecosystem}
              </Badge>
            )}
          </Group>
          <Text c="dimmed" size="sm" lineClamp={3} mb="md">
            {protocol.description || "No description available."}
          </Text>
        </Box>

        <Stack>
          <SimpleGrid cols={3} spacing="xs">
            <Paper withBorder p="xs" radius="sm" ta="center">
              <Text size="xs" c="dimmed">
                Proposals
              </Text>
              <Text fw={700} size="xl">
                {protocol.totalProposals.toLocaleString()}
              </Text>
            </Paper>
            <Paper withBorder p="xs" radius="sm" ta="center">
              <Text size="xs" c="dimmed">
                Authors
              </Text>
              <Text fw={700} size="xl">
                {protocol.distinctAuthorsCount.toLocaleString()}
              </Text>
            </Paper>
            <Paper withBorder p="xs" radius="sm" ta="center">
              <Text size="xs" c="dimmed">
                Centralization
              </Text>
              <RingProgress
                size={45}
                thickness={4}
                roundCaps
                sections={[
                  {
                    value: protocol.centralizationRate * 100,
                    color:
                      protocol.centralizationRate > 0.7
                        ? "red"
                        : protocol.centralizationRate > 0.4
                          ? "orange"
                          : "green",
                  },
                ]}
                label={
                  <Text
                    c={
                      protocol.centralizationRate > 0.7
                        ? "red"
                        : protocol.centralizationRate > 0.4
                          ? "orange"
                          : "green"
                    }
                    fw={700}
                    ta="center"
                    size="xs"
                  >
                    {(protocol.centralizationRate * 100).toFixed(0)}%
                  </Text>
                }
              />
            </Paper>
          </SimpleGrid>
          <Button variant="light" fullWidth mt="md" onClick={handleNavigate}>
            View Dashboard
          </Button>
          {protocol.website && (
            <Anchor href={protocol.website} target="_blank" size="sm">
              <Group gap="xs" justify="center">
                <Text inherit>Visit website</Text>
                <IconExternalLink size="0.9rem" />
              </Group>
            </Anchor>
          )}
        </Stack>
      </Stack>
    </Card>
  );
}

// --- HomePage Component ---
// The main component for the landing page, redesigned as a dashboard.
export default function HomePage() {
  const [protocols, setProtocols] = useState<ProtocolStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [isLoadingHistorical, setIsLoadingHistorical] = useState(true);
  const [historicalError, setHistoricalError] = useState<string | null>(null);
  const theme = useMantineTheme();

  useEffect(() => {
    const fetchHistoricalStats = async () => {
      try {
        const response = await fetch("/api/stats/historical");
        if (!response.ok) {
          throw new Error(
            `Failed to fetch historical stats: ${response.statusText}`,
          );
        }
        const data = await response.json();
        if (data.success) {
          setHistoricalData(data.data);
        } else {
          throw new Error(
            data.error || "An unknown error occurred fetching historical data",
          );
        }
      } catch (err: any) {
        setHistoricalError(err.message);
      } finally {
        setIsLoadingHistorical(false);
      }
    };

    fetchHistoricalStats();
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/stats/all");
        if (!response.ok) {
          throw new Error(`Failed to fetch stats: ${response.statusText}`);
        }
        const data = await response.json();
        if (data.success) {
          // Sort protocols by total proposals descending by default
          const sortedData = data.data.sort(
            (a: ProtocolStats, b: ProtocolStats) =>
              b.totalProposals - a.totalProposals,
          );
          setProtocols(sortedData);
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
  }, []);

  const globalStats = useMemo(() => {
    if (!protocols || protocols.length === 0) {
      return { totalProposals: 0, totalAuthors: 0, protocolCount: 0 };
    }
    const totalProposals = protocols.reduce(
      (sum, p) => sum + p.totalProposals,
      0,
    );
    const totalAuthors = protocols.reduce(
      (sum, p) => sum + p.distinctAuthorsCount,
      0,
    ); // Note: This is a sum, not distinct across protocols
    return {
      totalProposals,
      totalAuthors,
      protocolCount: protocols.length,
    };
  }, [protocols]);

  if (isLoading) {
    return (
      <Container size="xl" py="xl" style={{ textAlign: "center" }}>
        <Loader size="xl" />
        <Text mt="md">Loading protocol dashboards...</Text>
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="xl" py="xl">
        <Alert
          icon={<IconAlertCircle size="1rem" />}
          title="Error!"
          color="red"
        >
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <Box ta="center">
          <Title order={1} size="h1" mb="sm">
            Decentralized Improvement Protocol Dashboards
          </Title>
          <Text size="lg" c="dimmed" maw={700} mx="auto">
            An aggregated view of the activity and contributions across major
            blockchain ecosystems.
          </Text>
        </Box>

        {/* Global Stats Grid */}
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="xl">
          <Paper withBorder p="xl" radius="md" ta="center">
            <IconFileText
              size="2rem"
              stroke={1.5}
              color={theme.colors.blue[6]}
            />
            <Text size="4xl" fw={700} mt="sm">
              {globalStats.totalProposals.toLocaleString()}
            </Text>
            <Text c="dimmed">Total Proposals</Text>
          </Paper>
          <Paper withBorder p="xl" radius="md" ta="center">
            <IconUsers size="2rem" stroke={1.5} color={theme.colors.green[6]} />
            <Text size="4xl" fw={700} mt="sm">
              {globalStats.totalAuthors.toLocaleString()}
            </Text>
            <Text c="dimmed">Contributors</Text>
          </Paper>
          <Paper withBorder p="xl" radius="md" ta="center">
            <IconChartBar
              size="2rem"
              stroke={1.5}
              color={theme.colors.grape[6]}
            />
            <Text size="4xl" fw={700} mt="sm">
              {globalStats.protocolCount}
            </Text>
            <Text c="dimmed">Tracked Protocols</Text>
          </Paper>
        </SimpleGrid>

        {/* Comparison Chart */}
        <Card withBorder radius="md" p="xl">
          <Title order={2} size="h3" mb="xl" ta="center">
            Protocol Activity Comparison
          </Title>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={protocols}
              margin={{ top: 5, right: 20, left: -10, bottom: 90 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="protocol"
                angle={-45}
                textAnchor="end"
                interval={0}
                tick={{ fontSize: 12 }}
              />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend
                verticalAlign="top"
                wrapperStyle={{ paddingBottom: "20px" }}
              />
              <Bar
                dataKey="totalProposals"
                fill={theme.colors.blue[6]}
                name="Total Proposals"
              />
              <Bar
                dataKey="distinctAuthorsCount"
                fill={theme.colors.green[6]}
                name="Distinct Authors"
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Historical Trends Chart */}
        <Card withBorder radius="md" p="xl">
          <Title order={2} size="h3" mb="xl" ta="center">
            <Group justify="center">
              <IconTimeline size="1.8rem" />
              Ecosystem Historical Trends
            </Group>
          </Title>
          {isLoadingHistorical ? (
            <Group justify="center">
              <Loader />
            </Group>
          ) : historicalError ? (
            <Alert color="red" icon={<IconAlertCircle />}>
              Could not load historical data: {historicalError}
            </Alert>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart
                data={historicalData}
                margin={{ top: 5, right: 20, left: 0, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis
                  yAxisId="left"
                  label={{
                    value: "Count",
                    angle: -90,
                    position: "insideLeft",
                    offset: 10,
                  }}
                  allowDecimals={false}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  unit="%"
                  label={{
                    value: "Rate (%)",
                    angle: 90,
                    position: "insideRight",
                    offset: 10,
                  }}
                  allowDecimals={false}
                />
                <Tooltip />
                <Legend
                  verticalAlign="top"
                  wrapperStyle={{ paddingBottom: "20px" }}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="Proposals"
                  stroke={theme.colors.blue[6]}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="Authors"
                  stroke={theme.colors.green[6]}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="Centralization Rate"
                  stroke={theme.colors.red[6]}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="Acceptance Rate"
                  stroke={theme.colors.teal[6]}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Protocol Cards Grid */}
        <Box>
          <Title order={2} size="h2" mb="xl" ta="center">
            Explore Protocols
          </Title>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="xl">
            {protocols.map((protocol) => (
              <ProtocolCard key={protocol.protocol} protocol={protocol} />
            ))}
          </SimpleGrid>
        </Box>
      </Stack>
    </Container>
  );
}
