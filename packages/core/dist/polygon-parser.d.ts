import { BaseParser } from "./base-parser";
/**
 * A parser for Polygon Improvement Proposals (PIPs), which use a
 * non-standard Markdown table for their metadata instead of YAML frontmatter.
 */
export declare class PolygonParser extends BaseParser {
    /**
     * Extracts the metadata from a Markdown table within the raw markdown.
     * It finds the first table, assumes its headers and values, and converts
     * it into a key-value map.
     * @param rawMarkdown The full raw markdown of the file.
     * @returns A key-value map of the table data, or null if a table can't be parsed.
     */
    protected getSourceData(rawMarkdown: string): Record<string, string> | null;
    protected extractTitle(data: any, defaultTitle: string): string;
    protected extractStatus(data: any): string;
    /**
     * For PIPs, the "Type" in the table (e.g., "Contracts") is more akin
     * to a category in the EIP sense. The overall type is implicitly "Standards Track".
     */
    protected extractType(data: any): string;
    protected extractCategory(data: any): string | null;
    protected extractCreated(data: any): Date | null;
    /**
     * Extracts the URL from a Markdown link in the "Discussion" field.
     * e.g., "[Forum](https://...)" -> "https://..."
     */
    protected extractDiscussionsTo(data: any): string | null;
    protected extractAuthors(data: any): {
        name: string;
        githubHandle?: string;
        email?: string;
    }[];
    protected extractRequires(data: any): string[];
}
