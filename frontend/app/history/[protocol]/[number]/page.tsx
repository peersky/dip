"use client";

import { useQuery } from "@tanstack/react-query";
import { Container, Title, Text, Stack, Alert, Loader, Paper, ThemeIcon, Group, Badge } from "@mantine/core";
import { IconAlertCircle, IconGitCommit, IconArrowRight } from "@tabler/icons-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Timeline } from '@mantine/core';
import { useParams } from 'next/navigation';

interface HistoryEntry {
  status: string;
  title: string;
  contributorCount: number;
  githubSha: string;
  timestamp: string;
}

interface ProposalHistoryResponse {
  success: boolean;
  history: HistoryEntry[];
  proposalId: string;
  proposalNumber: string;
  error?: string;
}

const fetchProposalHistory = async (protocol: string, number: string): Promise<ProposalHistoryResponse> => {
  const response = await fetch(`/api/history/${protocol}/${number}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(errorData.error || `Failed to fetch history for ${protocol}/${number}`);
  }
  return response.json();
};

const useProposalHistory = (protocol: string, number: string) => {
  return useQuery<ProposalHistoryResponse, Error>({
    queryKey: ["proposalHistory", protocol, number],
    queryFn: () => fetchProposalHistory(protocol, number),
    enabled: !!protocol && !!number,
  });
};

const ContributorChart = ({ history }: { history: HistoryEntry[] }) => {
    const chartData = history.map(entry => ({
        date: new Date(entry.timestamp).toLocaleDateString(),
        contributors: entry.contributorCount,
    }));

    return (
        <Paper withBorder shadow="sm" p="md" mt="xl">
            <Title order={3} mb="md">Contributor Evolution</Title>
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="contributors" stroke="#8884d8" activeDot={{ r: 8 }} />
                </LineChart>
            </ResponsiveContainer>
        </Paper>
    );
};

const HistoryTimeline = ({ history, protocol }: { history: HistoryEntry[], protocol: string }) => {
    return (
        <Paper withBorder shadow="sm" p="md" mt="xl">
            <Title order={3} mb="xl">Proposal Status History</Title>
            <Timeline active={history.length} bulletSize={24} lineWidth={2}>
                {history.map((entry, index) => (
                    <Timeline.Item
                        key={index}
                        bullet={<ThemeIcon size={24} radius="xl" variant="light" color="blue"><IconGitCommit size="0.9rem" /></ThemeIcon>}
                        title={entry.status}
                    >
                        <Text c="dimmed" size="sm">
                            {new Date(entry.timestamp).toLocaleString()}
                        </Text>
                        <Text size="sm" mt={4}>
                            Title: "{entry.title}"
                        </Text>
                        <Group mt="xs">
                            <Badge variant="light" color="gray">
                                Contributors: {entry.contributorCount}
                            </Badge>
                            <Badge
                                component="a"
                                href={`https://github.com/maticnetwork/Polygon-Improvement-Proposals/commit/${entry.githubSha}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                variant="outline"
                                color="dark"
                                rightSection={<IconArrowRight size="0.6rem" />}
                            >
                                SHA: {entry.githubSha.substring(0, 7)}
                            </Badge>
                        </Group>
                    </Timeline.Item>
                ))}
            </Timeline>
        </Paper>
    );
};


export default function ProposalHistoryPage() {
  const params = useParams();
  const protocol = params.protocol as string;
  const number = params.number as string;

  const { data, isLoading, error, isError } = useProposalHistory(protocol, number);

  if (isLoading) {
    return (
      <Container size="md" py="xl">
        <Stack align="center">
          <Loader />
          <Text>Loading proposal history...</Text>
        </Stack>
      </Container>
    );
  }

  if (isError) {
    return (
      <Container size="md" py="xl">
        <Alert icon={<IconAlertCircle size="1rem" />} title="Error!" color="red" variant="light">
          {error?.message || "An unknown error occurred."}
        </Alert>
      </Container>
    );
  }

  if (!data?.success || !data.history || data.history.length === 0) {
    return (
        <Container size="md" py="xl">
            <Alert icon={<IconAlertCircle size="1rem" />} title="No History Found" color="blue" variant="light">
                No history records were found for this proposal. This could be because it's a new proposal or it has not been updated since tracking began.
            </Alert>
        </Container>
    );
  }

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <div>
          <Title order={1}>History for {protocol.charAt(0).toUpperCase() + protocol.slice(1)} Proposal #{data.proposalNumber}</Title>
          <Text c="dimmed">A timeline of changes and contributor growth.</Text>
        </div>

        <HistoryTimeline history={data.history} protocol={protocol}/>
        <ContributorChart history={data.history} />
      </Stack>
    </Container>
  );
}
