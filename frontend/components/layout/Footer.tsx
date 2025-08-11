import React from "react";
import { Container, Box, getGradient, Grid, Group, Image, Stack, useMantineTheme } from "@mantine/core";
import { UnstyledButton } from "@mantine/core";
import Link from "next/link";
import { DISCORD_URL, GITHUB_URL, SITEMAP, X_URL } from "../../config";
import { IconBrandDiscord, IconBrandGithub, IconBrandX } from "@tabler/icons-react";
import { useMediaQuery } from "@mantine/hooks";
import router from "next/router";


const FooterMenuItems = () => {
    return SITEMAP.filter((item) => !item.hideInFooter).map((item) => {
        if (item.children) {
            return (

                <Stack key={item.title}>
                    {item.children.map((child) => (
                        <UnstyledButton
                            key={child.title}
                            component={Link}
                            href={child.path}
                            target={child.type === "EXTERNAL" ? "_blank" : undefined}
                        >
                            {child.title}
                        </UnstyledButton>
                    ))}
                </Stack>

            );
        }

        return (

            <UnstyledButton
                key={item.title}
                component={Link}
                href={item.path}
                target={item.type === "EXTERNAL" ? "_blank" : undefined}
                style={{ borderLeft: "1px solid teal", paddingLeft: "1rem" }}
            >
                {item.title}
            </UnstyledButton>
        );
    });
};

const SocialItems = () => {
    const theme = useMantineTheme();
    const isMdScreen = useMediaQuery(`(max-width: ${theme.breakpoints.md})`);
    return (
        <Group gap="md" align="bottom" pt="5px" w={isMdScreen ? "100%" : "auto"} justify={isMdScreen ? "center" : "end"}>
            <UnstyledButton component={Link} href={GITHUB_URL} target="_blank">
                <IconBrandGithub color={theme.colors.dark[0]} size={24} />
            </UnstyledButton>
            <UnstyledButton component={Link} href={X_URL} target="_blank">
                <IconBrandX color={theme.colors.dark[0]} size={24} />
            </UnstyledButton>
            <UnstyledButton component={Link} href={DISCORD_URL} target="_blank">
                <IconBrandDiscord color={theme.colors.dark[0]} size={24} />
            </UnstyledButton>
        </Group>
    );
};

export const Footer = () => {
    const theme = useMantineTheme();
    const isMdScreen = useMediaQuery(`(max-width: ${theme.breakpoints.md})`);
    const gradient = getGradient({ deg: 45, from: theme.colors.dark[8], to: theme.colors.dark[6] }, theme);

    return (
        <Box style={{ background: gradient }} pb="md" pt="md">
            <Container maw="100%" mx="auto">
                <Grid columns={24} gutter="1rem">
                    <Grid.Col span={{ base: 24, md: 5, lg: 8 }} order={isMdScreen ? 1 : 0}>
                        <Stack gap="0" maw={180} mx={isMdScreen ? "auto" : "0"} h="100%"
                            justify="end">
                            <Image src="/logo.png" maw={"48px"} alt="logo" onClick={() => router.push("/")} style={{ cursor: "pointer" }} />
                        </Stack>
                    </Grid.Col>
                    <Grid.Col span={{ base: 24, md: 19, lg: 16 }}>
                        <Group gap={isMdScreen ? "1rem" : "2rem"} align="center"
                            justify={isMdScreen ? "center" : "end"}>
                            {FooterMenuItems()}
                            {SocialItems()}
                        </Group>
                    </Grid.Col>
                </Grid>
            </Container>
        </Box>
    );
};

export default Footer;
