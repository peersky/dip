import { BaseParser, ParsedProposal } from "./base-parser";
/**
 * A "composite" parser that tries multiple parsing strategies in order.
 * This is designed for protocols like Polygon's PIPs, which have used
 * different metadata formats over time (e.g., Markdown tables and YAML frontmatter).
 *
 * It acts as a fallback mechanism, ensuring that as many files as possible
 * are parsed correctly, even if the format is inconsistent across the repository.
 */
export declare class CompositeParser extends BaseParser {
    private primaryParser;
    private fallbackParser;
    constructor();
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
    parse(rawMarkdown: string, defaultTitle: string): ParsedProposal | null;
    protected getSourceData(rawMarkdown: string): any | null;
    protected extractTitle(data: any, defaultTitle: string): string;
    protected extractStatus(data: any): string;
    protected extractType(data: any): string;
    protected extractCategory(data: any): string | null;
    protected extractCreated(data: any): Date | null;
    protected extractDiscussionsTo(data: any): string | null;
    protected extractAuthors(data: any): {
        name?: string;
        email?: string;
        githubHandle?: string;
    }[];
    protected extractRequires(data: any): string[];
}
