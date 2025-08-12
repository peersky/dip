// dip/packages/core/src/default-parser.ts

import matter from "gray-matter";
import yaml from "js-yaml";
import { BaseParser } from "./base-parser";
import { parseAuthors } from "./utils"; // Assuming parseAuthors will be moved to a utils file

export class DefaultParser extends BaseParser {
  protected getSourceData(rawMarkdown: string): any | null {
    try {
      const { data } = matter(rawMarkdown, {
        engines: {
          yaml: (s: string) =>
            yaml.load(s, { json: true }) as Record<string, any>,
        },
      });
      return data && typeof data === "object" ? data : null;
    } catch (error) {
      console.error("Error extracting YAML frontmatter:", error);
      return null;
    }
  }

  protected extractTitle(data: any, defaultTitle: string): string {
    return data.title || defaultTitle;
  }

  protected extractStatus(data: any): string {
    return data.status || "Unknown";
  }

  protected extractType(data: any): string {
    return data.type || "Unknown";
  }

  protected extractCategory(data: any): string | null {
    return data.category || null;
  }

  protected extractCreated(data: any): Date | null {
    return data.created ? new Date(data.created) : null;
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
  ): { name: string; githubHandle?: string; email?: string }[] {
    return parseAuthors(data.author || "");
  }

  protected extractRequires(data: any): string[] {
    return Array.isArray(data.requires) ? data.requires.map(String) : [];
  }
}
