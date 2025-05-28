"use client";

import React from "react";
import { Burger, Group, Title } from "@mantine/core";
import { useTenant } from "@/hooks/useTenant";

interface HeaderProps {
  opened: boolean;
  toggle: () => void;
}

export const Header: React.FC<HeaderProps> = ({ opened, toggle }) => {
  const { protocolConfig, isLoading } = useTenant();

  if (isLoading) {
    return (
      <Group h="100%" px="md">
        <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
        <div>Loading...</div>
      </Group>
    );
  }

  return (
    <Group h="100%" px="md">
      <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
      <Title order={3}>
        {protocolConfig.name} DIP Platform
      </Title>
    </Group>
  );
};

export default Header;
