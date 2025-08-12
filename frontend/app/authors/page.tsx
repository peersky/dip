"use client";

import React from "react";

import {
  Container,
  Title,
  Text,
  Stack,
  Box,
  Table,
  Anchor,
  Group,
  Skeleton,
  Center,
  Select,
  TextInput,
  Badge,
} from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AuthorStats } from "@peeramid-labs/dip-database";

function AuthorsContent() {
  const searchParams = useSearchParams();
  const [authors, setAuthors] = useState<AuthorStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [protocolFilter, setProtocolFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Initialize filters from URL parameters
  useEffect(() => {
    const protocol = searchParams?.get("protocol") || "all";
    const status = searchParams?.get("status") || "all";

    console.log("URL parameters detected:", { protocol, status });

    setProtocolFilter(protocol);
    setStatusFilter(status);
  }, [searchParams]);

  // Fetch author data when the protocol filter changes.
  useEffect(() => {
    const fetchAuthorData = async () => {
      if (!protocolFilter) return; // Don't fetch if the filter isn't set yet.

      setIsLoading(true);
      try {
        // Fetch from the correct API endpoint, passing the protocol as a query parameter.
        const response = await fetch(`/api/authors?protocol=${protocolFilter}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        if (result.success) {
          setAuthors(result.authors || []);
        } else {
          throw new Error(result.error || "Failed to fetch authors");
        }
      } catch (error) {
        console.error(`Failed to fetch authors for ${protocolFilter}:`, error);
        setAuthors([]); // Clear data on error to prevent displaying stale results.
      } finally {
        setIsLoading(false);
      }
    };

    fetchAuthorData();
  }, [protocolFilter]); // This effect re-runs whenever the protocolFilter changes.

  // Filter and sort authors on the client-side based on UI controls.
  const processedAuthors = useMemo(() => {
    if (!authors.length) return [];

    let filteredAuthors = authors;

    // Apply the "Finalized Only" filter.
    if (statusFilter === "finalized") {
      filteredAuthors = filteredAuthors.filter(
        (author) => author.finalizedContributions > 0,
      );
    }

    // Apply the search term filter to name or GitHub handle.
    if (searchTerm) {
      filteredAuthors = filteredAuthors.filter(
        (author) =>
          author.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          author.githubHandle?.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    // The API already sorts by contribution count, so we just return the filtered list.
    return filteredAuthors;
  }, [authors, statusFilter, searchTerm]);

  const protocols = [
    "all",
    "ethereum",
    "starknet",
    "rollup",
    "arbitrum",
    "polygon",
  ];

  // Determine which protocols to show in columns
  const protocolsToShow =
    protocolFilter === "all"
      ? ["ethereum", "starknet", "rollup", "arbitrum", "polygon"]
      : [protocolFilter];

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <Box ta="center">
          <Title order={1} size="h1" mb="md">
            Author Statistics & Rankings
          </Title>
          <Text size="lg" c="dimmed" maw={700} mx="auto">
            Cross-protocol author analysis showing influence, participation, and
            success rates across different improvement proposal ecosystems.
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
              onChange={(value) => setProtocolFilter(value || "all")}
              data={protocols.map((p) => ({
                value: p,
                label:
                  p === "all"
                    ? "All Protocols"
                    : p.charAt(0).toUpperCase() + p.slice(1),
              }))}
              clearable
            />

            <Select
              placeholder="All Status"
              value={statusFilter}
              onChange={(value) => setStatusFilter(value || "all")}
              data={[
                { value: "all", label: "All Authors" },
                { value: "finalized", label: "Finalized Only" },
              ]}
              clearable
            />
          </Group>
        </Group>

        <Table withTableBorder withColumnBorders withRowBorders>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Rank</Table.Th>
              <Table.Th>Author</Table.Th>
              <Table.Th>Total Proposals</Table.Th>
              <Table.Th>Finalized Proposals</Table.Th>
              <Table.Th>Success Rate</Table.Th>
              <Table.Th>Influence %</Table.Th>
              <Table.Th>Repository Contributions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {isLoading
              ? Array.from({ length: 15 }).map((_, index) => (
                  <Table.Tr key={index}>
                    <Table.Td>
                      <Skeleton height={16} width={30} />
                    </Table.Td>
                    <Table.Td>
                      <Skeleton height={16} />
                    </Table.Td>
                    <Table.Td>
                      <Skeleton height={16} width={50} />
                    </Table.Td>
                    <Table.Td>
                      <Skeleton height={16} width={50} />
                    </Table.Td>
                    <Table.Td>
                      <Skeleton height={16} width={60} />
                    </Table.Td>
                    <Table.Td>
                      <Skeleton height={16} width={60} />
                    </Table.Td>
                    <Table.Td>
                      <Skeleton height={16} />
                    </Table.Td>
                  </Table.Tr>
                ))
              : processedAuthors.map((author, index) => {
                  const successRate =
                    author.totalContributions > 0
                      ? author.finalizedContributions /
                        author.totalContributions
                      : 0;
                  return (
                    <Table.Tr key={author.id}>
                      <Table.Td>
                        <Text
                          fw={500}
                          c={
                            index < 3
                              ? "yellow"
                              : index < 10
                                ? "orange"
                                : undefined
                          }
                        >
                          #{index + 1}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Stack gap={0}>
                          <Text fw={500}>{author.name || "Unknown"}</Text>
                          {author.githubHandle && (
                            <Anchor
                              href={`https://github.com/${author.githubHandle}`}
                              target="_blank"
                              size="xs"
                            >
                              @{author.githubHandle}
                            </Anchor>
                          )}
                        </Stack>
                      </Table.Td>
                      <Table.Td ta="right">
                        <Text>{author.totalContributions}</Text>
                      </Table.Td>
                      <Table.Td ta="right">
                        <Text c="green" fw={500}>
                          {author.finalizedContributions}
                        </Text>
                      </Table.Td>
                      <Table.Td ta="right">
                        <Text
                          c={
                            successRate > 0.5
                              ? "green"
                              : successRate > 0.2
                                ? "orange"
                                : "red"
                          }
                          fw={500}
                        >
                          {(successRate * 100).toFixed(0)}%
                        </Text>
                      </Table.Td>
                      <Table.Td ta="right">
                        <Text fw={600} c="blue">
                          {author.influenceScore
                            ? parseFloat(author.influenceScore as any).toFixed(
                                2,
                              )
                            : "0.00"}
                          %
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          {Object.entries(author.contributionByRepo)
                            .sort(([, a], [, b]) => b - a)
                            .map(([repo, count]) => (
                              <Badge key={repo} variant="light">
                                {repo}: {count}
                              </Badge>
                            ))}
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
          </Table.Tbody>
        </Table>
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
