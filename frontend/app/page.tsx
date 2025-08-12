"use client";

import {
  Container,
  Title,
  Text,
  Stack,
  Group,
  Card,
  Badge,
  Button,
  Loader,
  Alert,
  Box,
  Anchor,
  useMantineTheme,
  Tabs,
  RingProgress,
  Table,
} from "@mantine/core";
import {
  IconChartBar,
  IconAlertCircle,
  IconExternalLink,
  IconTimeline,
  IconHelpCircle,
} from "@tabler/icons-react";
import { useState, useEffect } from "react";
import NextLink from "next/link";
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

// --- Data Structures ---
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

// --- ProtocolRow Component (Inspired by L2BEAT) ---
function ProtocolRow({ protocol }: { protocol: ProtocolStats }) {
  const theme = useMantineTheme();
  const protocolConfig = getProtocolConfig(protocol.protocol);

  const handleNavigate = () => {
    const url = getProtocolUrl(protocol.protocol);
    window.location.href = url;
  };

  const centralizationRatePercent = protocol.centralizationRate * 100;
  const centralizationColor =
    centralizationRatePercent > 70
      ? "red"
      : centralizationRatePercent > 40
        ? "orange"
        : "green";

  return (
    <Table.Tr>
      <Table.Td>
        <Group>
          <Stack gap={0}>
            <Title order={5}>{protocolConfig?.name || protocol.protocol}</Title>
            <Text size="xs" c="dimmed">
              {protocol.ecosystem}
            </Text>
          </Stack>
        </Group>
      </Table.Td>
      <Table.Td>
        <Text fw={500}>{protocol.totalProposals.toLocaleString()}</Text>
      </Table.Td>
      <Table.Td>
        <Text fw={500}>{protocol.distinctAuthorsCount.toLocaleString()}</Text>
      </Table.Td>
      <Table.Td>
        <Group gap="xs">
          <RingProgress
            size={30}
            thickness={3}
            roundCaps
            sections={[
              { value: centralizationRatePercent, color: centralizationColor },
            ]}
          />
          <Text fw={500} c={centralizationColor}>
            {centralizationRatePercent.toFixed(1)}%
          </Text>
        </Group>
      </Table.Td>
      <Table.Td>
        <Button variant="light" size="xs" onClick={handleNavigate}>
          Detailed Workspace
        </Button>
      </Table.Td>
    </Table.Tr>
  );
}

// --- HomePage Component ---
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
        setHistoricalData(data.success ? data.data : []);
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
        const sortedData = data.success
          ? data.data.sort(
              (a: ProtocolStats, b: ProtocolStats) =>
                b.totalProposals - a.totalProposals,
            )
          : [];
        setProtocols(sortedData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, []);

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
        <Box ta="center" mb="xl">
          <Title order={1} size="h1" mb="sm">
            Decentralisation Improvement Proposals
          </Title>
          <Text size="lg" c="dimmed" maw={700} mx="auto">
            An aggregated, data-driven view of the activity, contributions, and
            health across major blockchain ecosystems.
            <Anchor component={NextLink} href="/faq" ml={5}>
              Learn more.
            </Anchor>
          </Text>
        </Box>

        {/* Charts Widget */}
        <Card withBorder radius="md" p="xl">
          <Tabs defaultValue="trends">
            <Tabs.List>
              <Tabs.Tab value="trends" leftSection={<IconTimeline size={16} />}>
                Ecosystem Historical Trends
              </Tabs.Tab>
              <Tabs.Tab
                value="activity"
                leftSection={<IconChartBar size={16} />}
              >
                Protocol Activity Comparison
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="trends" pt="xl">
              {isLoadingHistorical ? (
                <Group justify="center" p="xl">
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
                      domain={[0, 100]}
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
            </Tabs.Panel>

            <Tabs.Panel value="activity" pt="xl">
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
                  <YAxis
                    allowDecimals={false}
                    scale="log"
                    domain={["auto", "auto"]}
                  />
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
            </Tabs.Panel>
          </Tabs>
        </Card>

        {/* Protocol List */}
        <Box>
          <Title order={2} size="h2" mb="xl" ta="center">
            Explore Protocols
          </Title>
          <Card withBorder p={0}>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Protocol</Table.Th>
                  <Table.Th>Total Proposals</Table.Th>
                  <Table.Th>Distinct Authors</Table.Th>
                  <Table.Th>Centralization</Table.Th>
                  <Table.Th></Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {protocols.map((protocol) => (
                  <ProtocolRow key={protocol.protocol} protocol={protocol} />
                ))}
              </Table.Tbody>
            </Table>
          </Card>
        </Box>
      </Stack>
    </Container>
  );
}
