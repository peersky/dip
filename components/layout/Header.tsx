"use client";

import React from "react";
import { Burger, Group, Title, Button } from "@mantine/core";
import { IconHome } from "@tabler/icons-react";
import { useTenant } from "@/hooks/useTenant";
import { useRouter } from "next/navigation";

interface HeaderProps {
  opened: boolean;
  toggle: () => void;
}

export const Header: React.FC<HeaderProps> = ({ opened, toggle }) => {
  const { protocolConfig, isLoading } = useTenant();
  const router = useRouter();

  const goToMainPage = () => {
    // Navigate to the main overview page
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (process.env.NODE_ENV === "development" ? "localhost:3000" : "dip.box");
    const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
    window.location.href = `${protocol}://${baseUrl}`;
  };

  if (isLoading) {
    return (
      <Group h="100%" px="md">
        <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
        <div>Loading...</div>
      </Group>
    );
  }

  return (
    <Group h="100%" px="md" justify="space-between">
      <Group>
      <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
      <Title order={3}>
        {protocolConfig.name} Improvements
      </Title>
      </Group>
      <Button
        variant="light"
        size="sm"
        leftSection={<IconHome size="1rem" />}
        onClick={goToMainPage}
      >
        Overview
      </Button>
    </Group>
  );
};

export default Header;
