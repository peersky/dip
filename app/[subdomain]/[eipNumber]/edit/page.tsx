"use client";

import { Container, Title, Stack, Text } from "@mantine/core";
import { useParams } from "next/navigation";
import EipForm, { EipFormSubmitData } from "@/components/eips/EipForm";
import { getProtocolConfig } from "@/lib/subdomain-utils";
import { useMemo, useState, useEffect } from "react";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { ErrorDisplay } from "@/components/shared/ErrorDisplay";

interface EipFormData {
  eip?: string;
  title: string;
  description?: string;
  author: string;
  discussionsTo?: string;
  status: string;
  type: string;
  category?: string;
  created?: string;
  requires?: string;
  abstract?: string;
  motivation?: string;
  specification?: string;
  rationale?: string;
  backwardsCompatibility?: string;
  testCases?: string;
  referenceImplementation?: string;
  securityConsiderations?: string;
  copyright?: string;
  content?: string;
}

export default function SubdomainEditEipPage() {
  const params = useParams();
  const subdomain = params.subdomain as string;
  const eipNumber = params.eipNumber as string;

  const protocolConfig = useMemo(() => getProtocolConfig(subdomain), [subdomain]);

  const [initialData, setInitialData] = useState<EipFormData | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!subdomain || !eipNumber) return;

    const fetchEipData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/eips/${subdomain}/${eipNumber}`);
        const result = await response.json();
        if (result.success && result.data) {
          const fetchedEip = result.data;
          setInitialData({
            eip: fetchedEip.number,
            title: fetchedEip.title,
            description: fetchedEip.description,
            author: fetchedEip.author,
            status: fetchedEip.status,
            type: fetchedEip.type,
            category: fetchedEip.category,
            created: fetchedEip.created,
            discussionsTo: fetchedEip.discussionsTo,
            requires: fetchedEip.requires,
            content: fetchedEip.content,
          });
        } else {
          throw new Error(result.error || `Failed to fetch ${protocolConfig.proposalPrefix} ${eipNumber} data.`);
        }
      } catch (err: unknown) {
        const error = err instanceof Error ? err.message : 'An unknown error occurred';
        setError(error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchEipData();
  }, [subdomain, eipNumber, protocolConfig.proposalPrefix]);

  const handleSubmit = async (data: { rawSubmitData: EipFormSubmitData, fullMarkdown: string, filename: string }) => {
    console.log(`Submitting update for ${protocolConfig.proposalPrefix}-${eipNumber} in ${subdomain}:`, data.rawSubmitData);
    console.log("Generated Filename for Update:", data.filename);
    console.log("Full Markdown for PR (Update):\n", data.fullMarkdown);
    alert(`${protocolConfig.proposalPrefix}-${eipNumber} update prepared: ${data.filename}\nReady for GitHub PR submission (logic not yet implemented for updates).`);
  };

  if (!subdomain || !eipNumber) {
    return <Container><Text>Subdomain or EIP Number not found.</Text></Container>;
  }

  if (!protocolConfig || protocolConfig.subdomain === 'main') {
    return (
      <Container size="lg" py="xl">
        <ErrorDisplay title="Invalid Protocol" message={`The protocol "${subdomain}" is not recognized for editing a proposal.`} variant="page" />
      </Container>
    );
  }

  if (isLoading) {
    return <Container size="lg" py="xl"><LoadingSpinner message={`Loading ${protocolConfig.proposalPrefix}-${eipNumber} data for editing...`} /></Container>;
  }

  if (error) {
    return <Container size="lg" py="xl"><ErrorDisplay title="Failed to load data" message={error} onRetry={() => window.location.reload()} /></Container>;
  }

  if (!initialData) {
    return <Container size="lg" py="xl"><Text>{`${protocolConfig.proposalPrefix}-${eipNumber} data not available for editing, or failed to load.`}</Text></Container>;
  }

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <Title order={1}>{`Edit ${protocolConfig.proposalPrefix}-${eipNumber}: ${initialData?.title || ''}`}</Title>
        <EipForm
          onSubmit={handleSubmit}
          initialData={initialData}
          isEditing={true}
          eipNumber={eipNumber}
        />
      </Stack>
    </Container>
  );
}