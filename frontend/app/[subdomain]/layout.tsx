"use client";
import { Container, Group, Stack, Text, Title, Button } from "@mantine/core";
import Link from "next/link";
import { IconArrowLeft } from "@tabler/icons-react";
import { useParams } from "next/navigation";

export default function SubdomainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const { subdomain } = params;

  return (
    <Container size="lg" my="xl">
      <Stack gap="xl">
        <Group>
          <Button
            component={Link}
            href="/"
            variant="outline"
            size="xs"
            leftSection={<IconArrowLeft size={14} />}
          >
            Back to Protocols
          </Button>
        </Group>
        <Title order={1} style={{ textTransform: "capitalize" }}>
          {subdomain} Protocol
        </Title>
        {children}
      </Stack>
    </Container>
  );
}
