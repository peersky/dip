"use client";

import React from "react";
import { AppShell, ColorSchemeScript, MantineProvider, createTheme } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import "./globals.css"; // Assuming this contains basic global styles
import "@mantine/core/styles.css";
import { Notifications } from "@mantine/notifications";
import "@mantine/notifications/styles.css";
import "@mantine/tiptap/styles.css";
import { Header } from "@/components/layout/Header";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from '@/lib/react-query';

// Using a more explicit, though still minimal, theme.
// You can also pass DEFAULT_THEME directly if no overrides are needed.
const theme = createTheme({
  // Example: primaryColor: 'blue', // Add any actual overrides if you have them
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [opened, { toggle }] = useDisclosure();

  return (
    <html lang="en" suppressHydrationWarning={true}>
      <head>
        <ColorSchemeScript defaultColorScheme="dark" />
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>DIP - Decentralized Improvement Proposals</title>
        <meta name="description" content="A unified platform for managing improvement proposals across different blockchain protocols" />
        {/* Favicon links can be added here if you have them in public/ */}
        {/* <link rel="icon" href="/favicon.ico" /> */}
      </head>
      <body>
        <QueryClientProvider client={queryClient}>
          <MantineProvider theme={theme} defaultColorScheme="dark">
            <Notifications />
            <AppShell
              header={{ height: 60 }}
              navbar={{
                width: 250,
                breakpoint: "sm",
                collapsed: { mobile: !opened, desktop: true }, // Keep navbar for potential future use, but collapsed on desktop
              }}
              padding="md"
            >
              <AppShell.Header>
                <Header opened={opened} toggle={toggle} />
              </AppShell.Header>
              <AppShell.Navbar p="md">
                {/* Placeholder for future navigation links */}
                Navbar Content (e.g., Protocol-specific Categories)
              </AppShell.Navbar>
              <AppShell.Main>{children}</AppShell.Main>
            </AppShell>
            <ReactQueryDevtools initialIsOpen={false} />
          </MantineProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}
