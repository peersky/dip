"use client";

import {
  Container,
  Title,
  Text,
  Stack,
  Group,
  Button,
  Badge,
  Paper,
  Divider,
  Breadcrumbs,
  Anchor,
  Tabs,
  Grid,
  Timeline,
  Alert,
  SimpleGrid,
} from "@mantine/core";
import { useState, useEffect, useMemo } from "react";
import {
  IconArrowLeft,
  IconExternalLink,
  IconCalendar,
  IconUser,
  IconClock,
  IconInfoCircle,
  IconChartLine,
} from "@tabler/icons-react";
import { useRouter, useParams } from "next/navigation";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { ErrorDisplay } from "@/components/shared/ErrorDisplay";
import { getProtocolConfig } from "@/lib/subdomain-utils";
import { MarkdownRenderer } from "@/components/shared/MarkdownRenderer";

// Matches the rich data structure returned by our new, move-aware API
interface UnifiedProposal {
  id: string;
  proposalNumber: string;
  githubPath: string;
  title: string;
  status: string;
  type: string;
  category: string | null;
  created: string | null;
  discussionsTo: string | null;
  requires: string[];
  enrichedRequires: { number: string; status: string }[];
  isMoved: boolean;
  originalPath?: string;
  versions: {
    id: string;
    commitSha: string;
    commitDate: string;
    rawMarkdown: string;
    status: string;
    authors: { author: { name: string | null; githubHandle: string | null } }[];
  }[];
}

interface ApiResponse {
  success: boolean;
  data: UnifiedProposal;
  error?: string;
}

const statusColors: Record<string, string> = {
  Draft: "blue",
  Review: "yellow",
  "Last Call": "orange",
  Final: "green",
  Stagnant: "gray",
  Withdrawn: "red",
  Living: "violet",
  Moved: "dark",
  Deleted: "red",
};

function AnalyticsView({ proposal }: { proposal: UnifiedProposal }) {
  const analytics = useMemo(() => {
    if (!proposal || proposal.versions.length < 1) {
      return null;
    }

    const chronologicalVersions = [...proposal.versions].reverse();
    const creationDate = new Date(chronologicalVersions[0].commitDate);

    const contributors = new Set<string>();
    proposal.versions.forEach((v) => {
      v.authors.forEach((a) => {
        contributors.add(a.author.name || a.author.githubHandle || "Unknown");
      });
    });

    const finalVersion = chronologicalVersions.find(
      (v) => v.status === "Final" || v.status === "Living",
    );
    let timeToFinalizationDays: number | null = null;
    if (finalVersion) {
      const finalDate = new Date(finalVersion.commitDate);
      timeToFinalizationDays = Math.round(
        (finalDate.getTime() - creationDate.getTime()) / (1000 * 60 * 60 * 24),
      );
    } else {
      timeToFinalizationDays = Math.round(
        (new Date().getTime() - creationDate.getTime()) / (1000 * 60 * 60 * 24),
      );
    }

    const statusValues: Record<string, number> = {
      Final: 5,
      Living: 5,
      "Last Call": 4,
      Review: 3,
      Draft: 2,
      Idea: 1,
      Stagnant: 0,
      Withdrawn: -1,
      Moved: -2,
      Deleted: -3,
      Unknown: 0,
    };

    const chartData = chronologicalVersions.map((v) => ({
      date: new Date(v.commitDate).toLocaleDateString("en-CA"),
      status: v.status,
      value: statusValues[v.status] ?? 0,
    }));

    return {
      totalRevisions: proposal.versions.length,
      uniqueContributors: contributors.size,
      timeToFinalizationDays,
      isFinal: !!finalVersion,
      chartData,
    };
  }, [proposal]);

  if (!analytics) {
    return <Text>Not enough data to display analytics for this proposal.</Text>;
  }

  const yAxisTicks = [-3, -2, -1, 0, 1, 2, 3, 4, 5];
  const formatYAxis = (tick: number) => {
    const statusMap: Record<number, string> = {
      5: "Final/Living",
      4: "Last Call",
      3: "Review",
      2: "Draft",
      1: "Idea",
      0: "Stagnant/Unknown",
      "-1": "Withdrawn",
      "-2": "Moved",
      "-3": "Deleted",
    };
    return statusMap[tick] || "";
  };

  return (
    <Stack gap="xl">
      <SimpleGrid cols={{ base: 1, sm: 3 }}>
        <Paper p="xl" radius="md" ta="center">
          <Text size="2rem" fw={700}>
            {analytics.totalRevisions}
          </Text>
          <Text c="dimmed">Total Revisions</Text>
        </Paper>
        <Paper p="xl" radius="md" ta="center">
          <Text size="2rem" fw={700}>
            {analytics.uniqueContributors}
          </Text>
          <Text c="dimmed">Unique Contributors</Text>
        </Paper>
        <Paper p="xl" radius="md" ta="center">
          <Text size="2rem" fw={700}>
            {analytics.timeToFinalizationDays}
          </Text>
          <Text c="dimmed">
            {analytics.isFinal ? "Days to Finalization" : "Days Since Creation"}
          </Text>
        </Paper>
      </SimpleGrid>

      <Paper p="xl" radius="md">
        <Title order={3} mb="lg" ta="center">
          Status History Over Time
        </Title>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={analytics.chartData} margin={{ right: 30 }}>
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis
              domain={[-3, 5]}
              ticks={yAxisTicks}
              tickFormatter={formatYAxis}
              width={120}
            />
            <Tooltip
              labelFormatter={(label) => new Date(label).toLocaleDateString()}
              formatter={(value, name, props) => {
                // This 'as any' is a common workaround for a known issue with
                // the recharts Tooltip formatter's generic typings.
                return [props.payload.status, "Status"] as any;
              }}
            />
            <Legend />
            <Line
              type="stepAfter"
              dataKey="value"
              name="Status"
              stroke="#8884d8"
              strokeWidth={2}
              dot={true}
            />
          </LineChart>
        </ResponsiveContainer>
      </Paper>
    </Stack>
  );
}

export default function SubdomainSlugDetailPage() {
  const router = useRouter();
  const params = useParams();
  const subdomain = params.subdomain as string;
  const slug = params.slug as string;

  const protocolConfig = useMemo(
    () => getProtocolConfig(subdomain),
    [subdomain],
  );

  const [proposal, setProposal] = useState<UnifiedProposal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string | null>("content");

  useEffect(() => {
    const loadProposal = async () => {
      if (!subdomain || !slug) {
        setError("Subdomain or proposal slug missing.");
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/proposals/${subdomain}/${slug}`);
        const data: ApiResponse = await response.json();

        if (data.success) {
          setProposal(data.data);
        } else {
          throw new Error(data.error || `Failed to load ${slug}`);
        }
      } catch (err: unknown) {
        console.error(`Error loading ${slug} for ${subdomain}:`, err);
        setError(
          err instanceof Error ? err.message : `Failed to load ${slug}.`,
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadProposal();
  }, [subdomain, slug]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (isLoading) {
    return (
      <Container size="lg" py="xl">
        <LoadingSpinner message={`Loading ${slug}...`} />
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="lg" py="xl">
        <ErrorDisplay
          title={`Failed to Load Proposal`}
          message={error}
          variant="page"
        />
      </Container>
    );
  }

  if (!proposal) {
    return (
      <Container size="lg" py="xl">
        <ErrorDisplay
          title={`Proposal Not Found`}
          message={`${slug} could not be found.`}
          variant="page"
        />
      </Container>
    );
  }

  const latestVersion = proposal.versions[0];
  const breadcrumbItems = [
    { title: `${protocolConfig.name} Proposals`, href: `/` },
    { title: slug, href: "#" },
  ].map((item, index) => (
    <Anchor
      key={index}
      onClick={() => item.href !== "#" && router.push(item.href)}
      style={{ cursor: item.href !== "#" ? "pointer" : "default" }}
    >
      {item.title}
    </Anchor>
  ));

  return (
    <Container fluid>
      <Stack gap="xl" p="md">
        <Breadcrumbs>{breadcrumbItems}</Breadcrumbs>

        {proposal.isMoved && (
          <Alert
            variant="light"
            color="blue"
            title="Proposal History Note"
            icon={<IconInfoCircle />}
          >
            This proposal was previously known as{" "}
            <Text span fw={700}>
              {proposal.originalPath}
            </Text>
            . The full history from both locations has been combined below.
          </Alert>
        )}

        <Paper>
          <Stack gap="md">
            <Group justify="space-between" align="flex-start">
              <div style={{ flex: 1 }}>
                <Group mb="sm">
                  <Title order={1}>{slug.toUpperCase()}</Title>
                  <Badge
                    color={statusColors[latestVersion.status] || "gray"}
                    size="lg"
                    variant="light"
                  >
                    {latestVersion.status}
                  </Badge>
                </Group>
                <Title order={2} mb="md">
                  {proposal.title}
                </Title>
              </div>
            </Group>
            <Divider />
            <Grid>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <Stack gap="xs">
                  <Group gap="xs">
                    <IconUser size="1rem" />
                    <Text size="sm" fw={500}>
                      Author(s)
                    </Text>
                  </Group>
                  <Text size="sm" c="dimmed">
                    {latestVersion.authors
                      .map((a) => a.author.name || a.author.githubHandle)
                      .join(", ") || "N/A"}
                  </Text>
                </Stack>
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <Stack gap="xs">
                  <Group gap="xs">
                    <IconClock size="1rem" />
                    <Text size="sm" fw={500}>
                      Last Modified
                    </Text>
                  </Group>
                  <Text size="sm" c="dimmed">
                    {formatDate(latestVersion.commitDate)}
                  </Text>
                </Stack>
              </Grid.Col>
              {proposal.enrichedRequires &&
                proposal.enrichedRequires.length > 0 && (
                  <Grid.Col span={{ base: 12 }}>
                    <Stack gap="xs">
                      <Group gap="xs">
                        <IconInfoCircle size="1rem" />
                        <Text size="sm" fw={500}>
                          Requires
                        </Text>
                      </Group>
                      <Group gap="xs">
                        {proposal.enrichedRequires.map((req) => {
                          const prefix = slug.split("-")[0];
                          return (
                            <Badge
                              key={req.number}
                              variant="light"
                              color={statusColors[req.status] || "gray"}
                              size="sm"
                              style={{ cursor: "pointer" }}
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/${prefix}-${req.number}`);
                              }}
                            >
                              {req.status}: {prefix}-{req.number}
                            </Badge>
                          );
                        })}
                      </Group>
                    </Stack>
                  </Grid.Col>
                )}
            </Grid>
          </Stack>
        </Paper>

        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="content">Content</Tabs.Tab>
            <Tabs.Tab value="history">
              History ({proposal.versions.length} versions)
            </Tabs.Tab>
            <Tabs.Tab
              value="analytics"
              leftSection={<IconChartLine size={16} />}
            >
              Analytics
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="content" pt="xl">
            <Paper p="xl">
              <MarkdownRenderer content={latestVersion.rawMarkdown} />
            </Paper>
          </Tabs.Panel>

          <Tabs.Panel value="history" pt="xl">
            <Paper>
              <Stack gap="lg">
                <Title order={3}>Proposal Version History</Title>
                <Timeline
                  active={proposal.versions.length}
                  bulletSize={18}
                  lineWidth={2}
                >
                  {proposal.versions.map((version) => (
                    <Timeline.Item
                      key={version.id}
                      title={
                        <Group justify="space-between">
                          <Text fw={500} size="md">
                            Status: {version.status}
                          </Text>
                          <Anchor
                            href={`https://github.com/${protocolConfig.repoOwner}/${protocolConfig.repoName}/commit/${version.commitSha}`}
                            target="_blank"
                            size="sm"
                          >
                            <Group gap="xs" align="center">
                              <Text style={{ fontFamily: "monospace" }}>
                                {version.commitSha.substring(0, 7)}
                              </Text>
                              <IconExternalLink size="0.9rem" />
                            </Group>
                          </Anchor>
                        </Group>
                      }
                    >
                      <Text c="dimmed" size="sm">
                        Authored by{" "}
                        {version.authors
                          .map((a) => a.author.name || a.author.githubHandle)
                          .join(", ") || "N/A"}
                      </Text>
                      <Text size="xs" mt={4}>
                        {formatDate(version.commitDate)}
                      </Text>
                    </Timeline.Item>
                  ))}
                </Timeline>
              </Stack>
            </Paper>
          </Tabs.Panel>

          <Tabs.Panel value="analytics" pt="xl">
            <AnalyticsView proposal={proposal} />
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
}
