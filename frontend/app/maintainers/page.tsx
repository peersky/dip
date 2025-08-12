"use client";

import { useState, useEffect } from "react";
import { Container, Title, Text, Table, Anchor, Skeleton } from "@mantine/core";
import { IconExternalLink } from "@tabler/icons-react";

interface Maintainer {
  author: {
    id: string;
    name: string | null;
    githubHandle: string | null;
    email: string | null;
  };
  repository: {
    owner: string;
    repo: string;
    website: string | null;
  };
}

/**
 * The page component for displaying repository maintainers.
 * It fetches data on the client-side and renders it in a table.
 */
export default function MaintainersPage() {
  const [maintainers, setMaintainers] = useState<Maintainer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMaintainers = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/maintainers");
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setMaintainers(data.maintainers);
          }
        }
      } catch (error) {
        console.error("Failed to fetch maintainers:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMaintainers();
  }, []);

  return (
    <Container size="lg" my="xl">
      <Title order={1} mb="md">
        Repository Maintainers
      </Title>
      <Text c="dimmed" mb="xl">
        This page lists the maintainers who have committed changes to the
        tracked proposal repositories. Maintainers are identified by their
        commit authorship in the Git history.
      </Text>

      <Table withTableBorder withColumnBorders withRowBorders>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Repository</Table.Th>
            <Table.Th>Maintainer</Table.Th>
            <Table.Th>GitHub Handle</Table.Th>
            <Table.Th>Email</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {isLoading
            ? Array.from({ length: 10 }).map((_, index) => (
                <Table.Tr key={index}>
                  <Table.Td>
                    <Skeleton height={16} />
                  </Table.Td>
                  <Table.Td>
                    <Skeleton height={16} />
                  </Table.Td>
                  <Table.Td>
                    <Skeleton height={16} />
                  </Table.Td>
                  <Table.Td>
                    <Skeleton height={16} />
                  </Table.Td>
                </Table.Tr>
              ))
            : maintainers.map((maintainer) => (
                <Table.Tr
                  key={`${maintainer.repository.owner}/${maintainer.repository.repo}/${maintainer.author.id}`}
                >
                  <Table.Td>
                    <Anchor
                      href={
                        maintainer.repository.website ||
                        `https://github.com/${maintainer.repository.owner}/${maintainer.repository.repo}`
                      }
                      target="_blank"
                      fw={500}
                    >
                      {maintainer.repository.owner}/{maintainer.repository.repo}
                      <IconExternalLink
                        size={14}
                        style={{ verticalAlign: "middle", marginLeft: "4px" }}
                      />
                    </Anchor>
                  </Table.Td>
                  <Table.Td>
                    {maintainer.author.name || <Text c="dimmed">N/A</Text>}
                  </Table.Td>
                  <Table.Td>
                    {maintainer.author.githubHandle ? (
                      <Anchor
                        href={`https://github.com/${maintainer.author.githubHandle}`}
                        target="_blank"
                        size="sm"
                      >
                        @{maintainer.author.githubHandle}
                      </Anchor>
                    ) : (
                      <Text c="dimmed">N/A</Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    {maintainer.author.email || <Text c="dimmed">N/A</Text>}
                  </Table.Td>
                </Table.Tr>
              ))}
        </Table.Tbody>
      </Table>
    </Container>
  );
}
