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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialData, setInitialData] = useState<EipFormData | null>(null);

  useEffect(() => {
    const fetchEipData = async () => {
      if (!eipNumber || eipNumber === 'new') return;

      try {
        setLoading(true);
        const response = await fetch(`/api/eips/${subdomain}/${eipNumber}`);

        if (!response.ok) {
          throw new Error('Failed to fetch EIP data');
        }

        const result = await response.json();

        if (result.success && result.data) {
          const eip = result.data;

          // Transform the EIP data to match our form structure
          const formData: EipFormData = {
            eip: eip.eip?.toString(),
            title: eip.title || '',
            description: eip.description || '',
            author: Array.isArray(eip.author) ? eip.author.join(', ') : (eip.author || ''),
            discussionsTo: eip.discussionsTo || eip['discussions-to'] || '',
            status: eip.status || 'Draft',
            type: eip.type || '',
            category: eip.category || '',
            created: eip.created || '',
            requires: Array.isArray(eip.requires) ? eip.requires.join(', ') : (eip.requires || ''),
            abstract: eip.abstract || '',
            motivation: eip.motivation || '',
            specification: eip.specification || '',
            rationale: eip.rationale || '',
            backwardsCompatibility: eip.backwardsCompatibility || eip['backwards-compatibility'] || '',
            testCases: eip.testCases || eip['test-cases'] || '',
            referenceImplementation: eip.referenceImplementation || eip['reference-implementation'] || '',
            securityConsiderations: eip.securityConsiderations || eip['security-considerations'] || '',
            copyright: eip.copyright || '',
            content: eip.content || ''
          };

          setInitialData(formData);
        }
      } catch (err: unknown) {
        console.error('Error fetching EIP:', err);
        setError(err instanceof Error ? err.message : 'Failed to load EIP data');
      } finally {
        setLoading(false);
      }
    };

    fetchEipData();
  }, [subdomain, eipNumber]);

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

  if (loading) {
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