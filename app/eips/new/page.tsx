"use client";

import { Container, Title, Stack, Alert, Group, Button, Text } from "@mantine/core";
import EipForm, { EipFormSubmitData } from "@/components/eips/EipForm";
import { notifications } from "@mantine/notifications";
import { useState } from "react";
import { IconCheck, IconX, IconGitPullRequest, IconExternalLink } from "@tabler/icons-react";
import { useTenant } from "@/hooks/useTenant";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { ErrorDisplay } from "@/components/shared/ErrorDisplay";
import { useCreatePR } from "@/hooks/useEips";

interface SubmissionData {
  rawSubmitData: EipFormSubmitData;
  fullMarkdown: string;
  filename: string;
  githubInstallationId?: string | null;
  githubUser?: any;
}

export default function NewEipPage() {
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{ url: string; number: number } | null>(null);
  const { repositoryInfo, protocolConfig, isLoading } = useTenant();

  // Use React Query mutation for PR creation
  const createPRMutation = useCreatePR();

  const handleSubmit = async (data: SubmissionData) => {
    if (!data.githubInstallationId || !data.githubUser) {
      notifications.show({
        title: "GitHub Authentication Required",
        message: "Please connect your GitHub account to submit EIPs automatically.",
        color: 'orange',
        autoClose: 5000,
      });
      return;
    }

    setSubmissionError(null);
    setSuccessData(null);

    try {
      const result = await createPRMutation.mutateAsync({
        title: data.rawSubmitData.title,
        description: data.rawSubmitData.description,
        content: data.fullMarkdown,
        author: data.rawSubmitData.author,
        type: data.rawSubmitData.type,
        category: data.rawSubmitData.category,
        status: data.rawSubmitData.status,
        protocol: protocolConfig.subdomain,
        // Additional data for PR creation
        filename: data.filename,
        eipNumber: data.rawSubmitData.eip,
        installationId: data.githubInstallationId,
        githubUser: data.githubUser,
        targetRepository: {
          owner: repositoryInfo.owner,
          repo: repositoryInfo.repo,
        },
      });

      if (result.success) {
        // Successful GitHub PR creation
        setSuccessData({
          url: result.pullRequest.url,
          number: result.pullRequest.number
        });

        notifications.show({
          title: "Pull Request Created!",
          message: `Successfully created PR #${result.pullRequest.number}`,
          color: 'green',
          autoClose: 10000,
        });
      } else {
        throw new Error(result.error || "Failed to create pull request");
      }
    } catch (error: any) {
      console.error("Failed to submit EIP for PR creation:", error);
      setSubmissionError(error.message || "Could not connect to the server to create PR.");

      notifications.show({
        title: "Submission Failed",
        message: error.message || "An error occurred while creating the pull request.",
        color: 'red',
        autoClose: 7000,
      });
    }
  };

  const handleRetry = () => {
    setSubmissionError(null);
    setSuccessData(null);
    createPRMutation.reset(); // Reset mutation state
  };

  if (isLoading) {
    return (
      <Container size="lg" py="xl">
        <LoadingSpinner message="Loading repository configuration..." />
      </Container>
    );
  }

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <div>
          <Title order={1}>Create New {protocolConfig.name}</Title>
          <Text c="dimmed" mt="xs">
            Submit to {repositoryInfo.displayName} ({repositoryInfo.fullName})
          </Text>
        </div>

        {/* Success State */}
        {successData && (
          <Alert icon={<IconCheck size="1rem" />} title="EIP Submitted Successfully!" color="green">
            <Stack gap="md">
              <Text size="sm">
                Your EIP has been submitted as Pull Request #{successData.number} and is now under review.
              </Text>
              <Group>
                <Button
                  leftSection={<IconExternalLink size="1rem" />}
                  onClick={() => window.open(successData.url, '_blank')}
                  variant="light"
                  color="green"
                >
                  View Pull Request
                </Button>
                <Button
                  variant="outline"
                  onClick={handleRetry}
                >
                  Submit Another EIP
                </Button>
              </Group>
            </Stack>
          </Alert>
        )}

        {/* Error State */}
        {submissionError && (
          <ErrorDisplay
            title="Submission Failed"
            message={submissionError}
            onRetry={handleRetry}
          />
        )}

        {/* Form - hidden when successful */}
        {!successData && (
          <div style={{ position: 'relative' }}>
            {createPRMutation.isPending && (
              <LoadingSpinner
                variant="overlay"
                message="Creating pull request..."
              />
            )}
            <EipForm
              onSubmit={handleSubmit}
              isEditing={false}
            />
          </div>
        )}
      </Stack>
    </Container>
  );
}