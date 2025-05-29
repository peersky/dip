"use client";

import { Container, Title, Stack, Alert, Group, Button, Text } from "@mantine/core";
import EipForm, { EipFormSubmitData } from "@/components/eips/EipForm";
import { notifications } from "@mantine/notifications";
import { useState, useMemo } from "react";
import { IconCheck, IconGitPullRequest, IconExternalLink } from "@tabler/icons-react";
import { getProtocolConfig } from "@/lib/subdomain-utils";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { ErrorDisplay } from "@/components/shared/ErrorDisplay";
import { useCreatePR } from "@/hooks/useEips";
import { useParams, useRouter } from "next/navigation";

interface SubmissionData {
  rawSubmitData: EipFormSubmitData;
  fullMarkdown: string;
  filename: string;
  githubInstallationId?: string | null;
  githubUser?: any;
}

export default function SubdomainNewEipPage() {
  const router = useRouter();
  const params = useParams();
  const subdomain = params.subdomain as string;

  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{ url: string; number: number } | null>(null);

  const protocolConfig = useMemo(() => getProtocolConfig(subdomain), [subdomain]);
  const repositoryInfo = useMemo(() => {
    const config = getProtocolConfig(subdomain);
    return {
      owner: config.repoOwner,
      repo: config.repoName,
      fullName: `${config.repoOwner}/${config.repoName}`,
      displayName: config.description,
    };
  }, [subdomain]);

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
        protocol: subdomain,
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
        setSuccessData({
          url: result.pullRequest.url,
          number: result.pullRequest.number
        });
        notifications.show({
          title: "Pull Request Created!",
          message: `Successfully created PR #${result.pullRequest.number} for ${protocolConfig.name}`,
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
    createPRMutation.reset();
  };

  if (!protocolConfig || protocolConfig.subdomain === 'main') {
    return (
      <Container size="lg" py="xl">
        <ErrorDisplay title="Invalid Protocol" message={`The protocol "${subdomain}" is not recognized for creating a new proposal.`} variant="page" />
      </Container>
    );
  }

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <div>
          <Title order={1}>Create New {protocolConfig.name} {protocolConfig.proposalPrefix}</Title>
          <Text c="dimmed" mt="xs">
            Submit to {repositoryInfo.displayName} ({repositoryInfo.fullName})
          </Text>
        </div>

        {successData && (
          <Alert icon={<IconCheck size="1rem" />} title={`${protocolConfig.proposalPrefix} Submitted Successfully!`} color="green">
            <Stack gap="md">
              <Text size="sm">
                Your {protocolConfig.proposalPrefix} has been submitted as Pull Request #{successData.number} and is now under review.
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
                  Submit Another {protocolConfig.proposalPrefix}
                </Button>
                <Button
                  variant="subtle"
                  onClick={() => router.push(`/`)}
                >
                  Back to {protocolConfig.name} list
                </Button>
              </Group>
            </Stack>
          </Alert>
        )}

        {submissionError && (
          <ErrorDisplay
            title="Submission Failed"
            message={submissionError}
            onRetry={handleRetry}
          />
        )}

        {!successData && (
          <div style={{ position: 'relative' }}>
            {createPRMutation.isPending && (
              <LoadingSpinner
                variant="overlay"
                message={`Creating pull request for ${protocolConfig.name}...`}
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