import { EipFormSubmitData } from "@/components/eips/EipForm"; // Assuming EipFormSubmitData is exported

// Defines the order of frontmatter fields
const PREAMBLE_ORDER: Array<keyof EipFormSubmitData> = [
  "eip",
  "title",
  "description",
  "author",
  "discussions-to",
  "status",
  // 'last-call-deadline', // TODO: Add if form includes this
  "type",
  "category",
  "created",
  "requires",
  "withdrawalReason",
];

// Defines the order of main content sections
// These should match the keys in EipFormSubmitData for the content parts
const SECTION_ORDER: Array<{
  key: keyof EipFormSubmitData;
  title: string;
  optional?: boolean;
}> = [
  { key: "abstract", title: "Abstract" },
  { key: "motivation", title: "Motivation", optional: true },
  { key: "specification", title: "Specification" },
  { key: "rationale", title: "Rationale", optional: true },
  {
    key: "backwardsCompatibility",
    title: "Backwards Compatibility",
    optional: true,
  },
  { key: "testCases", title: "Test Cases", optional: true },
  {
    key: "referenceImplementation",
    title: "Reference Implementation",
    optional: true,
  },
  { key: "securityConsiderations", title: "Security Considerations" },
  { key: "copyright", title: "Copyright" },
];

export function formatEipForSubmit(data: EipFormSubmitData): string {
  const preambleLines: string[] = [];
  PREAMBLE_ORDER.forEach((key) => {
    let value = data[key];

    if (key === "title" && typeof value === "string")
      value = value.trim().replace(/\.$/, ""); // Remove trailing period from title
    if (key === "requires" && Array.isArray(value)) value = value.join(","); // Should be string already from form logic

    if (value !== undefined && value !== null && String(value).trim() !== "") {
      if (key === "category" && data.type !== "Standards Track") return;
      if (key === "requires" && !data.requires) return;
      if (key === "withdrawalReason" && data.status !== "Withdrawn") return;
      preambleLines.push(`${key}: ${String(value).trim()}`);
    } else if (key === "eip" && !value) {
      // Do not add empty eip: line if eip number is not set (for new proposals)
    } else if (
      (key === "requires" ||
        key === "category" ||
        key === "withdrawalReason") &&
      !value
    ) {
      // These optional/conditional fields should not be added if empty
    } else {
      // For other potentially optional fields that are empty but should be in preamble if empty by spec (rare)
      // preambleLines.push(`${key}: `);
    }
  });

  const preambleString = preambleLines.join("\n");

  const bodySections: string[] = [];
  SECTION_ORDER.forEach((section) => {
    const content = (data[section.key] as string | undefined)?.trim();

    if (
      content &&
      content.toLowerCase() !== "tbd" &&
      !(section.optional && content === "")
    ) {
      bodySections.push(`## ${section.title}\n\n${content}`);
    } else if (
      !section.optional &&
      (!content || content.toLowerCase() === "tbd")
    ) {
      // For required sections (like Abstract, Spec, Security, Copyright)
      // if they are empty or just TBD from a template, ensure they are included with TBD
      // (though validation should catch missing content for required sections before submission)
      bodySections.push(`## ${section.title}\n\nTBD`);
    }
    // Optional sections that are empty or just "TBD" will be omitted if not explicitly filled.
  });

  const bodyString = bodySections.filter((s) => s.trim() !== "").join("\n\n");

  return `---
${preambleString}
---

${bodyString}\n`; // Ensure a trailing newline
}

// Example for generating a filename (simplified)
// eip-draft_shortTitle.md
export function generateEipFilename(
  title: string | undefined,
  eipNumber?: string | number | null,
  status?: string,
): string {
  if (eipNumber) {
    // For existing, non-draft EIPs
    return `eip-${eipNumber}.md`;
  }
  // For new EIPs (Drafts) or if eipNumber is not yet assigned
  const safeTitle = title
    ? title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
    : "untitled";

  // EIP-1: "When opening a pull request to submit your EIP, please use an abbreviated title in the filename, `eip-draft_title_abbrev.md`."
  // Abbreviation is subjective, let's take first 3-4 words or up to ~30-40 chars for abbrev.
  const titleWords = safeTitle.split("-");
  let abbrev = titleWords.slice(0, 4).join("-");
  if (abbrev.length > 30) {
    abbrev = abbrev.substring(0, 30);
  }
  if (abbrev.endsWith("-")) abbrev = abbrev.slice(0, -1);

  // If an EIP number exists (even for a draft being edited), use it.
  // If it's a brand new draft, eipNumber might be null/undefined.
  const prefix = eipNumber ? `eip-${eipNumber}` : "eip-draft";

  return `${prefix}_${abbrev || "proposal"}.md`;
}
