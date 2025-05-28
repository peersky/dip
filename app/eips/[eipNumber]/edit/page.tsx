"use client";

import { Container, Title, Stack, Text } from "@mantine/core";
import { useParams } from "next/navigation";
import EipForm, { EipFormSubmitData } from "@/components/eips/EipForm"; // Shared form component

// Mock initial data for EIP-1 in MARKDOWN format for content fields
const mockEip1MarkdownInitialData = {
  eip: "1",
  title: "EIP Purpose and Guidelines",
  description: "Describes EIPs, EIP types, and the EIP workflow.",
  author: "Martin Becze (@wanderer), Hudson Jameson (@Souptacular), et al.",
  discussionsTo: "https://ethereum-magicians.org/t/eip-1-eip-purpose-and-guidelines/4309",
  status: "Living",
  type: "Meta",
  category: undefined, // Meta EIPs might not have a category
  created: "2015-10-27",
  requires: undefined, // No requirements for EIP-1
  // Content fields in Markdown
  abstract: "EIP stands for Ethereum Improvement Proposal. An EIP is a design document providing information to the Ethereum community, or describing a new feature for Ethereum or its processes or environment. The EIP should provide a concise technical specification of the feature and a rationale for the feature.",
  motivation: "To provide a clear process for proposing improvements to Ethereum.",
  specification: `
## EIP Types
There are three types of EIP:
- A **Standards Track EIP** describes any change that affects most or all Ethereum implementations...
- A **Meta EIP** describes a process surrounding Ethereum or proposes a change to (or an event in) a process...
- An **Informational EIP** describes an Ethereum design issue, or provides general guidelines or information to the Ethereum community, but does not propose a new feature...
`,
  rationale: "The EIP process is based on the Bitcoin Improvement Proposal (BIP) process.",
  backwardsCompatibility: "Not applicable.",
  testCases: "Not applicable for this type of EIP.",
  referenceImplementation: "Not applicable.",
  securityConsiderations: "There are no security considerations for this EIP itself, but the EIP process should consider security implications of proposed changes.",
  copyright: "Copyright and related rights waived via CC0.",
};


export default function EditEipPage() {
  const params = useParams();
  const eipNumber = params.eipNumber as string;

  // In a real app, you would fetch this data asynchronously and it would be Markdown.
  // For now, we only have mock data for EIP-1.
  const initialDataForForm = eipNumber === "1" ? mockEip1MarkdownInitialData : undefined;

  const handleSubmit = async (data: { rawSubmitData: EipFormSubmitData, fullMarkdown: string, filename: string }) => {
    console.log(`Submitting update for EIP-${eipNumber}:`, data.rawSubmitData);
    console.log("Generated Filename for Update:", data.filename);
    console.log("Full Markdown for PR (Update):\n", data.fullMarkdown);
    alert(`EIP-${eipNumber} update prepared: ${data.filename}\nReady for GitHub PR submission (logic not yet implemented).`);
    // TODO: Make an API call to backend to create/update a PR on GitHub
  };

  if (!eipNumber) {
    return <Container><Text>EIP Number not found.</Text></Container>;
  }

  if (!initialDataForForm) {
    return <Container><Text>{`EIP-${eipNumber} data not available in this mock for editing.`}</Text></Container>;
  }

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <Title order={1}>{`Edit EIP-${eipNumber}: ${initialDataForForm?.title || ''}`}</Title>
        <EipForm onSubmit={handleSubmit} initialData={initialDataForForm} isEditing={true} eipNumber={eipNumber} />
      </Stack>
    </Container>
  );
}