import { useMantineTheme, Stack } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";

export const ViewportHeightContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const theme = useMantineTheme();
    const isXsScreen = useMediaQuery(theme.breakpoints.xs);
    return (
        <Stack justify='space-between' h={isXsScreen ? '100%' : 'calc(100vh - 59px)'} gap="1rem"
        mah={isXsScreen ? '100%' : 'calc(100vh - 59px)'} w="100%" mx="auto" style={{ overflow: 'hidden' }}>
            {children}
        </Stack>
    );
  };

  export default ViewportHeightContainer;
