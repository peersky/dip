// dip/packages/core/src/parsers/composite-parser.ts
import { BaseParser, ParsedProposal } from "./base-parser";
import { DefaultParser } from "./default-parser";
import { PolygonParser } from "./polygon-parser";

/**
 * A "composite" parser that tries multiple parsing strategies in order.
 * This is designed for protocols like Polygon's PIPs, which have used
 * different metadata formats over time (e.g., Markdown tables and YAML frontmatter).
 *
 * It acts as a fallback mechanism, ensuring that as many files as possible
 * are parsed correctly, even if the format is inconsistent across the repository.
 */
export class CompositeParser extends BaseParser {
  private primaryParser: BaseParser;
  private fallbackParser: BaseParser;

  constructor() {
    super();
    // For Polygon, we expect the Markdown table to be the primary format.
    this.primaryParser = new PolygonParser();
    // If that fails, we fall back to the standard YAML frontmatter format.
    this.fallbackParser = new DefaultParser();
  }

  /**
   * Overrides the base `parse` method to implement the fallback logic.
   * It first attempts to parse using the primary parser. If that fails
   * (returns null), it then attempts to parse using the fallback parser.
   *
   * @param rawMarkdown The raw markdown string of the proposal file.
   * @param defaultTitle A fallback title to use if one cannot be parsed.
   * @returns A standardized `ParsedProposal` object from the first successful
   *          parser, or `null` if all parsers fail.
   */
  public override parse(
    rawMarkdown: string,
    defaultTitle: string,
  ): ParsedProposal | null {
    const primaryResult = this.primaryParser.parse(rawMarkdown, defaultTitle);
    if (primaryResult) {
      return primaryResult;
    }

    return this.fallbackParser.parse(rawMarkdown, defaultTitle);
  }

  // Since we are overriding the main `parse` method, the abstract extractor
  // methods from the base class will not be used by this class. We provide
  // stub implementations to satisfy the abstract class contract.

  protected getSourceData(rawMarkdown: string): any | null {
    throw new Error("Method not implemented for CompositeParser.");
  }

  protected extractTitle(data: any, defaultTitle: string): string {
    throw new Error("Method not implemented for CompositeParser.");
  }

  protected extractStatus(data: any): string {
    throw new Error("Method not implemented for CompositeParser.");
  }

  protected extractType(data: any): string {
    throw new Error("Method not implemented for CompositeParser.");
  }

  protected extractCategory(data: any): string | null {
    throw new Error("Method not implemented for CompositeParser.");
  }

  protected extractCreated(data: any): Date | null {
    throw new Error("Method not implemented for CompositeParser.");
  }

  protected extractDiscussionsTo(data: any): string | null {
    throw new Error("Method not implemented for CompositeParser.");
  }

  protected extractAuthors(
    data: any,
  ): { name?: string; email?: string; githubHandle?: string }[] {
    throw new Error("Method not implemented for CompositeParser.");
  }

  protected extractRequires(data: any): string[] {
    throw new Error("Method not implemented for CompositeParser.");
  }
}
