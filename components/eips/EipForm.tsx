"use client";

import { TextInput, Textarea, Button, Stack, Select, Group, Fieldset, Paper, MultiSelect, Text, InputWrapper, Input, Tabs, Alert, LoadingOverlay } from "@mantine/core";
import { useForm, UseFormReturnType } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { formatEipForSubmit, generateEipFilename } from "@/lib/eip-utils";
import ReactMarkdown from 'react-markdown';
import type { MDXEditorMethods } from '@mdxeditor/editor';
import { GitHubAuth } from '@/components/GitHubAuth';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ErrorDisplay } from '@/components/shared/ErrorDisplay';
import { IconCheck, IconX, IconGitPullRequest } from "@tabler/icons-react";

// Dynamically import MarkdownEditor with SSR turned off
const MarkdownEditor = dynamic(() => import("@/components/shared/MarkdownEditor"), {
  ssr: false,
  loading: () => <LoadingSpinner size="sm" message="Loading editor..." />,
});

// Helper functions (can be moved to eip-utils.ts later)
const parseEipSectionsFromMarkdown = (markdownContent: string): Partial<EipFormSubmitData> => {
  const sections: Partial<EipFormSubmitData> & { copyright?: string } = {};
  const lines = markdownContent.split('\n');
  let currentSectionKey: keyof (EipFormSubmitData & { copyright?: string }) | null = null;
  let currentContent: string[] = [];

  const sectionMappings: Record<string, keyof (EipFormSubmitData & { copyright?: string })> = {
    'abstract': 'abstract',
    'motivation': 'motivation',
    'specification': 'specification',
    'rationale': 'rationale',
    'backwards compatibility': 'backwardsCompatibility',
    'test cases': 'testCases',
    'reference implementation': 'referenceImplementation',
    'security considerations': 'securityConsiderations',
    'copyright': 'copyright',
  };

  function saveCurrentSection() {
    if (currentSectionKey && currentContent.length > 0) {
      sections[currentSectionKey] = currentContent.join('\n').trim();
    }
  }

  for (const line of lines) {
    if (line.startsWith('## ')) {
      saveCurrentSection();
      const headerText = line.replace('## ', '').trim().toLowerCase();
      currentSectionKey = sectionMappings[headerText] || null;
      currentContent = [];
    } else if (currentSectionKey) {
      currentContent.push(line);
    }
  }
  saveCurrentSection();
  return sections;
};

const combineEipSectionsToMarkdown = (
  sectionData: Partial<Pick<EipFormInitialData, 'abstract' | 'motivation' | 'specification' | 'rationale' | 'backwardsCompatibility' | 'testCases' | 'referenceImplementation' | 'securityConsiderations' | 'copyright'> >,
  defaultContentTemplate: string
): string => {
  const orderedSections: Array<{ key: keyof typeof sectionData, header: string, isOptional?: boolean }> = [
    { key: 'abstract', header: '## Abstract' },
    { key: 'motivation', header: '## Motivation', isOptional: true },
    { key: 'specification', header: '## Specification' },
    { key: 'rationale', header: '## Rationale', isOptional: true },
    { key: 'backwardsCompatibility', header: '## Backwards Compatibility', isOptional: true },
    { key: 'testCases', header: '## Test Cases', isOptional: true },
    { key: 'referenceImplementation', header: '## Reference Implementation', isOptional: true },
    { key: 'securityConsiderations', header: '## Security Considerations' },
    { key: 'copyright', header: '## Copyright' },
  ];

  let content = orderedSections
    .map(section => {
      const sectionText = sectionData[section.key];
      if (sectionText && sectionText.trim() !== '' && !sectionText.trim().startsWith('[')) {
        return `${section.header}\n\n${sectionText.trim()}`;
      }
      return null;
    })
    .filter(Boolean)
    .join('\n\n');

  let finalMarkdown = defaultContentTemplate;
  orderedSections.forEach(section => {
    const sectionText = sectionData[section.key];
    if (sectionText && sectionText.trim() !== '' && !sectionText.trim().startsWith('[')){
        const regex = new RegExp(`(${section.header}[\s\S]*?)(?:\n## |$)`, 'i');
        const placeholderRegex = new RegExp(`(${section.header}\n\n\[[\s\S]*?\])(?:\n## |$)`, 'i');
        if (finalMarkdown.match(placeholderRegex)) {
             finalMarkdown = finalMarkdown.replace(placeholderRegex, `${section.header}\n\n${sectionText.trim()}\n
`);
        } else if (finalMarkdown.match(regex)) {
            finalMarkdown = finalMarkdown.replace(regex, `${section.header}\n\n${sectionText.trim()}\n
`);
        }
    }
  });

  return finalMarkdown.replace(/\n\n\n/g, '\n\n');
};

interface EipFormValues {
  eip?: string;
  title: string;
  description: string;
  author: string;
  discussionsTo: string;
  status: string;
  type: string;
  category?: string;
  created: string;
  requires?: string[] | string;
  withdrawalReason?: string;
  mainContent: string;
}

interface EipFormInitialData {
  eip?: string;
  title?: string;
  description?: string;
  author?: string;
  discussionsTo?: string;
  status?: string;
  type?: string;
  category?: string;
  created?: string;
  requires?: string;
  withdrawalReason?: string;
  abstract?: string;
  motivation?: string;
  specification?: string;
  rationale?: string;
  backwardsCompatibility?: string;
  testCases?: string;
  referenceImplementation?: string;
  securityConsiderations?: string;
  copyright?: string;
  mainContent?: string;
}

export interface EipFormSubmitData extends Omit<EipFormValues, 'mainContent' | 'requires'> {
  requires?: string;
  abstract: string;
  motivation?: string;
  specification: string;
  rationale?: string;
  backwardsCompatibility?: string;
  testCases?: string;
  referenceImplementation?: string;
  securityConsiderations: string;
  copyright: string;
}

const defaultMainContent = `## Abstract

[Provide a short (~200 word) description of the technical issue being addressed.]

## Motivation

[Please provide motivation for why the existing protocol specification is inadequate to address the problem that the EIP solves. EIP submissions without sufficient motivation may be rejected outright.]

## Specification

[The technical specification should describe the syntax and semantics of any new feature. The specification should be detailed enough to allow competing, interoperable implementations for any of the current Ethereum platforms.]

## Rationale

[The rationale fleshes out the specification by describing what motivated the design and why particular design decisions were made. It should describe alternate designs that were considered and related work, e.g. how the feature is supported in other languages. The rationale may also provide evidence of consensus within the community, and should discuss important objections or concerns raised during discussion.]

## Backwards Compatibility

[All EIPs that introduce backwards incompatibilities must include a section describing these incompatibilities and their severity. The EIP must explain how the author proposes to deal with these incompatibilities. EIP submissions without a sufficient backwards compatibility treatise may be rejected outright.]

## Test Cases

[Test cases for an implementation are mandatory for EIPs that are affecting consensus changes. Other EIPs can choose to include links to test cases if applicable.]

## Reference Implementation

[An optional section that contains a reference/example implementation that people can use to assist in understanding or implementing this specification.]

## Security Considerations

[All EIPs must contain a section that discusses the security implications/considerations relevant to the proposed change. Include information that might be important for security discussions, surfaces risks and can be used throughout the life cycle of the proposal. E.g. include security-relevant design decisions, concerns, important discussions, implementation-specific guidance and pitfalls, an outline of threats and risks and how they are being addressed. EIP submissions missing the "Security Considerations" section will be rejected. An EIP cannot proceed to status "Final" without a Security Considerations discussion deemed sufficient by the reviewers.]

## Copyright

Copyright and related rights waived via CC0.`;

const initialEipFormValues: EipFormValues = {
  title: "",
  description: "",
  author: "",
  discussionsTo: "",
  status: "Draft",
  type: "Standards Track",
  category: "Core",
  created: new Date().toISOString().split('T')[0],
  requires: [],
  withdrawalReason: "",
  mainContent: defaultMainContent,
};

const eipStatuses = ["Draft", "Review", "Last Call", "Final", "Stagnant", "Withdrawn", "Living"];
const eipTypes = ["Standards Track", "Meta", "Informational"];
const eipCategories = ["Core", "Networking", "Interface", "ERC"];

const mockEipReferences = [
  { value: "1", label: "EIP-1: EIP Purpose and Guidelines" },
  { value: "20", label: "EIP-20: Token Standard" },
  { value: "165", label: "EIP-165: Standard Interface Detection" },
  { value: "721", label: "EIP-721: Non-Fungible Token Standard" },
  { value: "1155", label: "EIP-1155: Multi Token Standard" },
  { value: "1559", label: "EIP-1559: Fee market change for ETH 1.0 Chain" },
];

interface EipFormProps {
  onSubmit: (data: { rawSubmitData: EipFormSubmitData, fullMarkdown: string, filename: string }) => Promise<void>;
  initialData?: EipFormInitialData;
  isEditing?: boolean;
  eipNumber?: string;
}

const requiredSectionsHeaders = [
  "## Abstract",
  "## Specification",
  "## Security Considerations",
  "## Copyright"
];

const mockEipData = {
  title: "Sample EIP for Testing",
  description: "A sample EIP description for testing the submission flow.",
  author: "Test Author (@testuser)",
  discussionsTo: "https://ethereum-magicians.org/t/sample-eip/12345",
  status: "Draft",
  type: "Standards Track",
  category: "Core",
  created: new Date().toISOString().split('T')[0],
  requires: [],
  mainContent: `## Abstract

This is a sample EIP for testing the DIP Platform submission flow. It demonstrates the proper format and structure required for EIP submissions.

## Motivation

Testing the EIP submission system requires valid sample data that passes all validation rules while being clearly identifiable as test content.

## Specification

This test EIP includes all required sections with meaningful content that satisfies the validation requirements:

- Proper title format (under 72 characters, no period)
- Valid description (complete sentence with period, no colons)
- Correct author format
- All required sections present

## Rationale

Using pre-filled test data speeds up development and testing by eliminating the need to manually enter valid EIP content for each test submission.

## Backwards Compatibility

This test EIP has no backwards compatibility implications as it is for testing purposes only.

## Test Cases

Test cases would be provided here in a real EIP.

## Reference Implementation

Reference implementation would be provided here in a real EIP.

## Security Considerations

This test EIP poses no security risks as it is for testing purposes only. In a real EIP, security implications would be thoroughly analyzed and documented.

## Copyright

Copyright and related rights waived via CC0.`
};

export default function EipForm({ onSubmit, initialData, isEditing = false, eipNumber }: EipFormProps) {
  const editorRef = useRef<MDXEditorMethods>(null);
  const [previewMarkdown, setPreviewMarkdown] = useState('');
  const [activeTab, setActiveTab] = useState<string | null>('edit');
  const [githubInstallationId, setGithubInstallationId] = useState<string | null>(null);
  const [githubUser, setGithubUser] = useState<any>(null);
  const [skipValidation, setSkipValidation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form: UseFormReturnType<EipFormValues> = useForm<EipFormValues>({
    initialValues: useMemo(() => {
      const defaults = { ...initialEipFormValues };
      if (initialData) {
        if (initialData.mainContent) {
          defaults.mainContent = initialData.mainContent;
        } else {
          const sectionDataForCombination = {
            abstract: initialData.abstract,
            motivation: initialData.motivation,
            specification: initialData.specification,
            rationale: initialData.rationale,
            backwardsCompatibility: initialData.backwardsCompatibility,
            testCases: initialData.testCases,
            referenceImplementation: initialData.referenceImplementation,
            securityConsiderations: initialData.securityConsiderations,
            copyright: initialData.copyright,
          };
          defaults.mainContent = combineEipSectionsToMarkdown(sectionDataForCombination, defaultMainContent);
        }

        const preambleFields: Array<keyof Omit<EipFormInitialData, 'mainContent' | 'abstract' | 'motivation' | 'specification' | 'rationale' | 'backwardsCompatibility' | 'testCases' | 'referenceImplementation' | 'securityConsiderations' | 'copyright'> > = [
          'eip', 'title', 'description', 'author', 'discussionsTo', 'status', 'type', 'category', 'created', 'requires', 'withdrawalReason'
        ];

        preambleFields.forEach(key => {
          if (initialData[key] !== undefined && key in defaults) {
            const typedKey = key as keyof EipFormValues;
            if (key === 'requires' && typeof initialData.requires === 'string') {
              (defaults.requires as any) = initialData.requires.split(',').map((s: string) => s.trim()).filter((s: string) => s);
            } else {
               (defaults[typedKey] as any) = initialData[key];
            }
          }
        });
      }
      return defaults;
    }, [initialData]),

    validate: (values: EipFormValues) => {
      // Skip validation in development mode if requested
      if (process.env.NODE_ENV === 'development' && skipValidation) {
        return {};
      }

      const errors: Record<string, string> = {};

      if (!values.title || values.title.trim() === '') errors.title = "Title is required.";
      else {
        if (values.title.length > 72) errors.title = "Title should be 72 characters or less.";
        if (values.title.endsWith('.')) errors.title = "Title must not end with a period.";
        if (/EIP-\d+/.test(values.title)) errors.title = "Title must not include 'EIP-N'.";
      }
      if (!values.description || values.description.trim() === '') errors.description = "Description is required.";
      else {
        if (values.description.includes(':')) errors.description = "Description must not contain colons (':').";
        if (/(eip|erc)[\s-]*[0-9]+/i.test(values.description)) errors.description = "Description must not EIP/ERC references. Use 'Requires'.";
        if (/standard[s]?\b/i.test(values.description)) errors.description = "Description must not contain 'standard' or 'standards'.";
        if (!values.description.endsWith('.')) errors.description = "Description must be a full sentence ending with a period.";
      }
      if (!values.author || values.author.trim() === '') errors.author = "Author(s) field is required.";
      else {
        const authorParts = values.author.split(/\s*(?:,|and|,\s*and)\s*/i);
        const authorRegex = /^(?:[^,\(<@]+(?:\s+<[^>@]+@[^>@\s]+>|\s+\(@[a-zA-Z0-9_-]+\))|@[a-zA-Z0-9_-]+)$/;
        for (const part of authorParts) {
          if (!authorRegex.test(part.trim())) {
            errors.author = "Invalid author format. Use 'Name (@github)', 'Name <email@example.com>', or simply '@githubhandle'. Separate with commas or 'and'.";
            break;
          }
        }
      }
      if (!values.status) errors.status = "Status is required.";
      if (!values.type) errors.type = "Type is required.";
      if (!values.created) errors.created = "Created date is required.";
      if (values.created && !/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/.test(values.created)) errors.created = "Date: YYYY-MM-DD format.";
      if (values.discussionsTo && !/^https?:\/\/[^\s]+$/.test(values.discussionsTo)) {
        errors.discussionsTo = "Discussions-To must be a valid URL.";
      }
      if (values.type === "Standards Track" && (!values.category || values.category.trim() === '')) errors.category = "Category is required for Standards Track EIPs.";
      if (values.status === "Withdrawn" && (!values.withdrawalReason || values.withdrawalReason.trim() === '')) errors.withdrawalReason = "Withdrawal Reason required for Withdrawn EIPs.";
      if (values.requires && Array.isArray(values.requires)) {
        for (const req of values.requires) {
          if (typeof req !== 'string' || !/^\d+$/.test(req)) {
            errors.requires = "Requires: EIP numbers (digits only).";
            break;
          }
        }
      }

      const markdownContent = values.mainContent || '';
      const missingRequiredSections = requiredSectionsHeaders.filter(sectionHeader =>
        !markdownContent.includes(sectionHeader)
      );

      if (missingRequiredSections.length > 0) {
        errors.mainContent = `Missing required sections: ${missingRequiredSections.join(', ')}`;
      } else {
        const sections = parseEipSectionsFromMarkdown(markdownContent);
        if (!sections.abstract || sections.abstract.trim() === '' || sections.abstract.includes('[Provide a short')) {
          errors.mainContent = "Abstract section must have content (remove placeholder text).";
        } else if (!sections.specification || sections.specification.trim() === '' || sections.specification.includes('[The technical specification')) {
          errors.mainContent = "Specification section must have content (remove placeholder text).";
        } else if (!sections.securityConsiderations || sections.securityConsiderations.trim() === '' || sections.securityConsiderations.includes('[All EIPs must contain')) {
          errors.mainContent = "Security Considerations section must have content (remove placeholder text).";
        } else if (!sections.copyright || sections.copyright.trim() === '' || sections.copyright.includes('[Copyright and related rights')) {
          errors.mainContent = "Copyright section must have content (e.g., Copyright and related rights waived via CC0.).";
        }
      }

      return errors;
    },
  });

  useEffect(() => {
    if (activeTab === 'preview') {
      const sections = parseEipSectionsFromMarkdown(form.values.mainContent);
      const tempSubmitData: Partial<EipFormSubmitData> = {
        eip: form.values.eip,
        title: form.values.title,
        description: form.values.description,
        author: form.values.author,
        discussionsTo: form.values.discussionsTo,
        status: form.values.status,
        type: form.values.type,
        category: form.values.category,
        created: form.values.created,
        withdrawalReason: form.values.withdrawalReason,
        copyright: sections.copyright || 'Copyright and related rights waived via CC0.',
        requires: Array.isArray(form.values.requires) ? form.values.requires.join(',') : form.values.requires,
        ...sections
      };

      if (!tempSubmitData.eip && eipNumber) tempSubmitData.eip = eipNumber;
      else if (!tempSubmitData.eip && form.values.eip) tempSubmitData.eip = form.values.eip;

      setPreviewMarkdown(formatEipForSubmit(tempSubmitData as EipFormSubmitData));
    }
  }, [form.values, activeTab, eipNumber]);

  const handleFormSubmit = async (formValues: EipFormValues) => {
    if (isSubmitting) return; // Prevent double submission

    setIsSubmitting(true);

    try {
      const sections = parseEipSectionsFromMarkdown(formValues.mainContent);
      const output: EipFormSubmitData = {
        eip: formValues.eip,
        title: formValues.title,
        description: formValues.description,
        author: formValues.author,
        discussionsTo: formValues.discussionsTo,
        status: formValues.status,
        type: formValues.type,
        category: formValues.category,
        created: formValues.created,
        withdrawalReason: formValues.withdrawalReason,
        copyright: sections.copyright || 'Copyright and related rights waived via CC0.',
        requires: Array.isArray(formValues.requires) ? formValues.requires.join(',') : formValues.requires,
        ...sections
      } as EipFormSubmitData;

      if (!output.eip && eipNumber) output.eip = eipNumber;
      else if (!output.eip && formValues.eip) output.eip = formValues.eip;

      const fullMarkdown = formatEipForSubmit(output);
      const filename = generateEipFilename(output.title, output.eip, output.status);

      // Include GitHub token in submission data
      const submissionData = {
        rawSubmitData: output,
        fullMarkdown,
        filename,
        githubInstallationId,
        githubUser
      };

      await onSubmit(submissionData);
    } catch (error) {
      console.error('Form submission error:', error);
      notifications.show({
        title: "Submission Error",
        message: "An error occurred while preparing your submission. Please try again.",
        color: 'red',
        autoClose: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGitHubAuthChange = useCallback((installationId: string | null, user: any) => {
    setGithubInstallationId(installationId);
    setGithubUser(user);
  }, []);

  const fillWithMockData = () => {
    // Fill all form fields with mock data
    form.setValues({
      title: mockEipData.title,
      description: mockEipData.description,
      author: mockEipData.author,
      discussionsTo: mockEipData.discussionsTo,
      status: mockEipData.status,
      type: mockEipData.type,
      category: mockEipData.category,
      created: mockEipData.created,
      requires: mockEipData.requires,
      mainContent: mockEipData.mainContent,
    });

    // Update the markdown editor content
    if (editorRef.current) {
      editorRef.current.setMarkdown(mockEipData.mainContent);
    }

    console.log('✅ Form filled with mock EIP data');
  };

  const clearForm = () => {
    // Reset form to initial values
    form.reset();

    // Clear the markdown editor
    if (editorRef.current) {
      editorRef.current.setMarkdown(defaultMainContent);
    }

    console.log('🗑️ Form cleared');
  };

  return (
    <div style={{ position: 'relative' }}>
      {isSubmitting && (
        <LoadingSpinner
          variant="overlay"
          message="Preparing your EIP submission..."
        />
      )}

      <Tabs value={activeTab} onChange={(value) => setActiveTab(value)} mb="lg">
        <Tabs.List>
          <Tabs.Tab value="edit">Edit</Tabs.Tab>
          <Tabs.Tab value="preview">Preview</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="edit" pt="xs">
          <form onSubmit={form.onSubmit(handleFormSubmit)}>
            <Stack gap="lg">
              {/* Development Mode Helper */}
              {process.env.NODE_ENV === 'development' && (
                <Alert color="blue" title="Development Mode">
                  <Stack gap="md">
                    <Text size="sm">
                      Development tools to speed up testing and bypass validation.
                    </Text>
                    <Group>
                      <Button
                        variant="light"
                        size="sm"
                        onClick={fillWithMockData}
                        disabled={isSubmitting}
                      >
                        🚀 Fill with Test Data
                      </Button>
                      <Button
                        variant={skipValidation ? "filled" : "light"}
                        size="sm"
                        color={skipValidation ? "orange" : "blue"}
                        onClick={() => setSkipValidation(!skipValidation)}
                        disabled={isSubmitting}
                      >
                        {skipValidation ? "✅ Validation Disabled" : "⚠️ Enable Skip Validation"}
                      </Button>
                      <Button
                        variant="light"
                        size="sm"
                        color="red"
                        onClick={clearForm}
                        disabled={isSubmitting}
                      >
                        🗑️ Clear Form
                      </Button>
                    </Group>
                    {skipValidation && (
                      <Text size="xs" c="orange">
                        ⚠️ Form validation is disabled. You can submit incomplete forms for testing.
                      </Text>
                    )}
                  </Stack>
                </Alert>
              )}

              {/* GitHub Authentication Section */}
              <Fieldset legend="GitHub Integration">
                <GitHubAuth onAuthChange={handleGitHubAuthChange} />
                {!githubInstallationId && (
                  <Alert color="orange" mt="md">
                    <Text size="sm">
                      <IconGitPullRequest size="1rem" style={{ display: 'inline', marginRight: '4px' }} />
                      Connect your GitHub account to automatically submit EIPs as pull requests.
                    </Text>
                  </Alert>
                )}
              </Fieldset>

              <Fieldset legend="Preamble">
                 <Stack gap="md">
                      {isEditing && initialData?.eip && (
                          <TextInput label="EIP Number" disabled value={initialData.eip} />
                      )}
                      <TextInput required label="Title" placeholder="EIP title (max 72 chars, not a sentence)" {...form.getInputProps('title')} disabled={isSubmitting} />
                      <Textarea required label="Description" placeholder="Short, one-sentence description (no colons, no EIP/ERC refs, no 'standard')" {...form.getInputProps('description')} minRows={2} disabled={isSubmitting} />
                      <TextInput required label="Author(s)" placeholder="Name (@github), Name <email@addr>, @githubhandle" {...form.getInputProps('author')} disabled={isSubmitting} />
                      <TextInput label="Discussions-To" placeholder="URL to discussion thread" {...form.getInputProps('discussionsTo')} type="url" disabled={isSubmitting} />
                      <Group grow>
                          <Select required label="Status" data={eipStatuses} {...form.getInputProps('status')} disabled={isSubmitting} />
                          <Select required label="Type" data={eipTypes} {...form.getInputProps('type')} disabled={isSubmitting} />
                      </Group>
                      {form.values.type === 'Standards Track' && (
                          <Select required label="Category" placeholder="Select category for Standards Track" data={eipCategories} {...form.getInputProps('category')} disabled={isSubmitting} />
                      )}
                      <Group grow>
                          <TextInput required label="Created Date" placeholder="YYYY-MM-DD" {...form.getInputProps('created')} type="date" disabled={isSubmitting} />
                          <MultiSelect
                              label="Requires (Optional)"
                              placeholder="EIP numbers (e.g., 1, 155)"
                              data={mockEipReferences}
                              searchable
                              clearable
                              {...form.getInputProps('requires')}
                              disabled={isSubmitting}
                          />
                      </Group>
                      {form.values.status === 'Withdrawn' && (
                          <Textarea required label="Withdrawal Reason" placeholder="Reason for withdrawal" {...form.getInputProps('withdrawalReason')} disabled={isSubmitting} />
                      )}
                  </Stack>
              </Fieldset>

              <Fieldset legend="Main Content">
                  <Stack gap="md">
                      <Text size="sm" c="dimmed">
                          Edit the content below. Required sections: Abstract, Specification, Security Considerations, Copyright.
                          Optional sections: Motivation, Rationale, Backwards Compatibility, Test Cases, Reference Implementation.
                      </Text>
                      <Input.Wrapper
                          label={<>Main Content <Text span c="red">*</Text></>}
                          error={form.errors.mainContent ? <Text c="red" size="xs">{form.errors.mainContent as string}</Text> : undefined}
                      >
                          <MarkdownEditor
                              editorRef={editorRef}
                              content={form.values.mainContent || defaultMainContent}
                              onChange={(markdown) => form.setFieldValue('mainContent', markdown)}
                          />
                      </Input.Wrapper>
                  </Stack>
              </Fieldset>

              <Button
                type="submit"
                mt="md"
                loading={isSubmitting}
                disabled={!githubInstallationId}
                leftSection={!isSubmitting ? <IconGitPullRequest size="1rem" /> : undefined}
              >
                {isSubmitting
                  ? "Creating Pull Request..."
                  : githubInstallationId
                    ? (isEditing ? "Update EIP (Submit PR)" : "Create EIP (Submit PR)")
                    : "Connect GitHub to Submit"
                }
              </Button>

              {!githubInstallationId && (
                <Text size="xs" c="dimmed" ta="center">
                  GitHub authentication is required to submit EIPs automatically
                </Text>
              )}
            </Stack>
          </form>
        </Tabs.Panel>

        <Tabs.Panel value="preview" pt="xs">
          {activeTab === 'preview' && (
            <Paper p="md" shadow="xs" withBorder>
              <div className="markdown-content">
                <ReactMarkdown>
                  {previewMarkdown}
                </ReactMarkdown>
              </div>
            </Paper>
          )}
        </Tabs.Panel>
      </Tabs>
    </div>
  );
}