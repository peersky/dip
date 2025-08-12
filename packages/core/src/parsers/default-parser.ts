// dip/packages/core/src/parsers/default-parser.ts
import matter from "gray-matter";
import yaml from "js-yaml";
import { BaseParser } from "./base-parser";
import { parseAuthors } from "../utils";

export class DefaultParser extends BaseParser {
  protected getSourceData(rawMarkdown: string): Record<string, any> | null {
    try {
      const { data } = matter(rawMarkdown, {
        engines: {
          yaml: (s: string) =>
            yaml.load(s, { json: true }) as Record<string, any>,
        },
      });

      if (!data || typeof data !== "object") {
        return null;
      }

      // Create a new object with all keys lowercased for case-insensitive access,
      // and attach the raw markdown for fallback parsing.
      const lowercasedData: Record<string, any> = {
        __rawMarkdown: rawMarkdown,
      };
      for (const key in data) {
        lowercasedData[key.toLowerCase()] = data[key];
      }
      return lowercasedData;
    } catch (error) {
      // This can happen with malformed YAML.
      return null;
    }
  }

  protected extractTitle(data: any, defaultTitle: string): string {
    return data.title || defaultTitle;
  }

  protected extractStatus(data: any): string {
    // 1. Check common aliases for the status field, case-insensitively.
    const statusKeys = ["status", "doc-status", "proposal-status"];
    for (const key of statusKeys) {
      if (data[key]) {
        return data[key];
      }
    }

    // 2. As a fallback for very old EIPs, scan the raw markdown content.
    const rawMarkdown = data.__rawMarkdown || "";
    const statusMatch = rawMarkdown.match(/^[Ss]tatus:\s*(.*)/m);
    if (statusMatch && statusMatch[1]) {
      return statusMatch[1].trim();
    }

    return "Unknown";
  }

  protected extractType(data: any): string {
    // Check common aliases for the type field, case-insensitively.
    const typeKeys = ["type", "proposal-type", "eip-type"];
    for (const key of typeKeys) {
      if (data[key]) {
        return data[key];
      }
    }
    return "Unknown";
  }

  protected extractCategory(data: any): string | null {
    return data.category || null;
  }

  protected extractCreated(data: any): Date | null {
    // Check for valid date string before creating a new Date object
    const createdDate = data.created;
    if (
      createdDate &&
      (typeof createdDate === "string" || typeof createdDate === "object") &&
      !isNaN(Date.parse(createdDate))
    ) {
      return new Date(createdDate);
    }
    return null;
  }

  protected extractDiscussionsTo(data: any): string | null {
    return (
      data["discussions-to"] ||
      data["discussion-to"] ||
      data["discussion"] ||
      data["forum"] ||
      null
    );
  }

  protected extractAuthors(
    data: any,
  ): { name?: string; email?: string; githubHandle?: string }[] {
    return parseAuthors(data.author || "");
  }

  protected extractRequires(data: any): string[] {
    if (Array.isArray(data.requires)) {
      return data.requires.map(String);
    }
    if (typeof data.requires === "string") {
      return data.requires.split(",").map((s: string) => s.trim());
    }
    return [];
  }
}
