import React from "react";
import { NavLink, Stack } from "@mantine/core";
import Link from "next/link";
import { IconChevronDown } from "@tabler/icons-react";
import { SITEMAP } from "../../config";

const NavItems = () => {
  return SITEMAP.filter((item) => item.type === "CONTENT").map((item) => {
    if (item.children) {
      return (
        <NavLink
          key={item.title}
          label={item.title}
          rightSection={<IconChevronDown size={18} />}
        >
          {item.children.map((child) => (
            <NavLink
              key={child.title}
              component={Link}
              href={child.path}
              label={child.title}
              target={child.type === "EXTERNAL" ? "_blank" : undefined}
            />
          ))}
        </NavLink>
      );
    }

    return (
      <NavLink
        key={item.title}
        component={Link}
        href={item.path}
        label={item.title}
        target={item.type === "EXTERNAL" ? "_blank" : undefined}
      />
    );
  });
};

export const Sidebar: React.FC = () => {
  return (
    <Stack>
      <NavItems />
    </Stack>
  );
};

export default Sidebar;
