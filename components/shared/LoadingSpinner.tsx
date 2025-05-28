import { Loader, Stack, Text, Box } from "@mantine/core";

interface LoadingSpinnerProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  message?: string;
  variant?: "default" | "overlay" | "inline";
  color?: string;
}

export function LoadingSpinner({
  size = "md",
  message,
  variant = "default",
  color = "blue"
}: LoadingSpinnerProps) {
  const content = (
    <>
      <Loader size={size} color={color} />
      {message && (
        <Text size="sm" c="dimmed" ta="center">
          {message}
        </Text>
      )}
    </>
  );

  if (variant === "inline") {
    return (
      <Box display="inline-flex" style={{ alignItems: "center", gap: "8px" }}>
        <Loader size="xs" color={color} />
        {message && <Text size="sm" c="dimmed">{message}</Text>}
      </Box>
    );
  }

  if (variant === "overlay") {
    return (
      <Stack
        align="center"
        justify="center"
        h="100%"
        w="100%"
        pos="absolute"
        top={0}
        left={0}
        bg="rgba(255, 255, 255, 0.8)"
        style={{ zIndex: 1000 }}
      >
        {content}
      </Stack>
    );
  }

  return (
    <Stack align="center" justify="center" gap="md" py="xl">
      {content}
    </Stack>
  );
}