import {
  Container,
  Group,
  Stack,
  Text,
  Title,
  Button,
} from "@mantine/core";
import Link from "next/link";
import { PropsWithChildren } from "react";
import { IconArrowLeft } from "@tabler/icons-react";

export default function SubdomainLayout({
  children,
  params,
}: PropsWithChildren<{ params: { subdomain: string } }>) {
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
          {params.subdomain} Protocol
        </Title>
        {children}
      </Stack>
    </Container>
  );
}
