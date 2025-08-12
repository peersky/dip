// dip/packages/core/src/parsers/polygon-parser.ts

import { BaseParser } from "./base-parser";
import { parseAuthors } from "../utils";

/**
 * A robust parser for Polygon Improvement Proposals (PIPs).
 *
 * PIPs present a unique challenge as they embed their metadata within a
 * Markdown table in the document body, rather than using standard YAML frontmatter.
 * This parser is specifically designed to find and interpret this table structure,
 * mapping PIP-specific field names to the standardized proposal format.
 */
export class PolygonParser extends BaseParser {
  /**
   * Overrides the base method to extract metadata from a Markdown table.
   * This function scans the document for a table, parses its headers and values,
   * and converts them into a case-insensitive key-value map for easy access.
   *
   * @param rawMarkdown The full raw markdown of the PIP file.
   * @returns A key-value map of the metadata, or null if a valid table is not found.
   */
  protected getSourceData(rawMarkdown: string): Record<string, string> | null {
    const lines = rawMarkdown.split("\n");
    let headerLine: string | undefined;
    let separatorLine: string | undefined;
    let valueLine: string | undefined;

    // Find the lines that constitute the metadata table
    for (let i = 0; i < lines.length - 2; i++) {
      if (
        lines[i].trim().startsWith("|") &&
        lines[i + 1].trim().startsWith("|---") &&
        lines[i + 2].trim().startsWith("|")
      ) {
        headerLine = lines[i];
        separatorLine = lines[i + 1];
        valueLine = lines[i + 2];
        break;
      }
    }

    if (!headerLine || !valueLine) {
      return null;
    }

    // Clean and split the header and value lines into arrays
    const headers = headerLine
      .split("|")
      .map((h) => h.trim().toLowerCase()) // Use lowercase for consistent key access
      .filter(Boolean);
    const values = valueLine
      .split("|")
      .map((v) => v.trim())
      .filter(Boolean);

    if (headers.length !== values.length) {
      console.warn(
        `[PolygonParser] Header and value count mismatch. Headers: ${headers.length}, Values: ${values.length}`,
      );
      return null;
    }

    // Zip the headers and values into a key-value object
    const data: Record<string, string> = {};
    headers.forEach((header, index) => {
      data[header] = values[index];
    });

    // The title is often not in the table, but in the first H1 tag.
    // We'll add it to the source data here for consistency.
    const titleMatch = rawMarkdown.match(/^#\s*(.*)/m);
    if (titleMatch && !data.title) {
      // Title may have the format "PIP-1: Title Text", so we strip the prefix
      data.title = titleMatch[1].replace(/PIP-\d+:\s*/, "").trim();
    }

    return data;
  }

  protected extractTitle(data: any, defaultTitle: string): string {
    // The title is now pre-populated in getSourceData.
    return data.title || defaultTitle;
  }

  protected extractStatus(data: any): string {
    // PIPs can use 'status' or 'pip status' as the header.
    return data.status || data["pip status"] || "Unknown";
  }

  /**
   * For PIPs, the "Type" in the table (e.g., "Standards", "Core") is more akin
   * to a Category in the EIP sense. The overall proposal type is implicitly
   * "Standards Track" if a type is defined in the table.
   */
  protected extractType(data: any): string {
    // If a 'type' field exists in the table, we classify the PIP as Standards Track.
    return data.type ? "Standards Track" : "Unknown";
  }

  /**
   * We use the table's "Type" field as the Category for our standardized model.
   */
  protected extractCategory(data: any): string | null {
    return data.type || null;
  }

  protected extractCreated(data: any): Date | null {
    // The key in the table is 'date'.
    const createdDate = data.date;
    if (
      createdDate &&
      typeof createdDate === "string" &&
      !isNaN(Date.parse(createdDate))
    ) {
      return new Date(createdDate);
    }
    return null;
  }

  /**
   * Extracts the URL from a Markdown link in the "Discussion" field.
   * e.g., "[Forum](https://...)" -> "https://..."
   */
  protected extractDiscussionsTo(data: any): string | null {
    const discussion = data.discussion;
    if (!discussion) {
      return null;
    }

    // Regex to find the URL inside markdown link parentheses
    const match = discussion.match(/\(([^)]+)\)/);
    return match ? match[1] : discussion;
  }

  protected extractAuthors(
    data: any,
  ): { name?: string; email?: string; githubHandle?: string }[] {
    // The key in the table is 'author'.
    return parseAuthors(data.author || "");
  }

  protected extractRequires(data: any): string[] {
    // PIP tables generally do not have a 'requires' field.
    return [];
  }
}
