import { Alert, Button, Stack, Text, Code } from "@mantine/core";
import { IconAlertCircle, IconRefresh } from "@tabler/icons-react";

interface ErrorDisplayProps {
  title?: string;
  message: string;
  details?: string;
  onRetry?: () => void;
  variant?: "alert" | "page" | "inline";
  color?: string;
}

export function ErrorDisplay({
  title = "Error",
  message,
  details,
  onRetry,
  variant = "alert",
  color = "red"
}: ErrorDisplayProps) {
  const content = (
    <>
      <Text size="sm">{message}</Text>
      {details && (
        <Code block mt="xs" c="red">
          {details}
        </Code>
      )}
      {onRetry && (
        <Button
          leftSection={<IconRefresh size="1rem" />}
          variant="light"
          color={color}
          size="sm"
          mt="md"
          onClick={onRetry}
        >
          Try Again
        </Button>
      )}
    </>
  );

  if (variant === "inline") {
    return (
      <Text size="sm" c="red">
        {message}
      </Text>
    );
  }

  if (variant === "page") {
    return (
      <Stack align="center" justify="center" gap="md" py="xl">
        <IconAlertCircle size={48} color="var(--mantine-color-red-6)" />
        <Text size="lg" fw={500} ta="center">{title}</Text>
        <Text size="sm" c="dimmed" ta="center" maw={400}>
          {message}
        </Text>
        {details && (
          <Code block mt="xs" c="red" maw={600}>
            {details}
          </Code>
        )}
        {onRetry && (
          <Button
            leftSection={<IconRefresh size="1rem" />}
            variant="light"
            color={color}
            onClick={onRetry}
          >
            Try Again
          </Button>
        )}
      </Stack>
    );
  }

  return (
    <Alert
      icon={<IconAlertCircle size="1rem" />}
      title={title}
      color={color}
    >
      {content}
    </Alert>
  );
}