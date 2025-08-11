import { BaseParser } from "./base-parser";
/**
 * A robust parser for Polygon Improvement Proposals (PIPs).
 *
 * PIPs present a unique challenge as they embed their metadata within a
 * Markdown table in the document body, rather than using standard YAML frontmatter.
 * This parser is specifically designed to find and interpret this table structure,
 * mapping PIP-specific field names to the standardized proposal format.
 */
export declare class PolygonParser extends BaseParser {
    /**
     * Overrides the base method to extract metadata from a Markdown table.
     * This function scans the document for a table, parses its headers and values,
     * and converts them into a case-insensitive key-value map for easy access.
     *
     * @param rawMarkdown The full raw markdown of the PIP file.
     * @returns A key-value map of the metadata, or null if a valid table is not found.
     */
    protected getSourceData(rawMarkdown: string): Record<string, string> | null;
    protected extractTitle(data: any, defaultTitle: string): string;
    protected extractStatus(data: any): string;
    /**
     * For PIPs, the "Type" in the table (e.g., "Standards", "Core") is more akin
     * to a Category in the EIP sense. The overall proposal type is implicitly
     * "Standards Track" if a type is defined in the table.
     */
    protected extractType(data: any): string;
    /**
     * We use the table's "Type" field as the Category for our standardized model.
     */
    protected extractCategory(data: any): string | null;
    protected extractCreated(data: any): Date | null;
    /**
     * Extracts the URL from a Markdown link in the "Discussion" field.
     * e.g., "[Forum](https://...)" -> "https://..."
     */
    protected extractDiscussionsTo(data: any): string | null;
    protected extractAuthors(data: any): {
        name?: string;
        email?: string;
        githubHandle?: string;
    }[];
    protected extractRequires(data: any): string[];
}
