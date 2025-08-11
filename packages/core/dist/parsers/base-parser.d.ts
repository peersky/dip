/**
 * Defines the standardized metadata structure that all parsers must return.
 * This ensures that the data processing pipeline receives a consistent
 * data format regardless of the source protocol's specific formatting.
 */
export interface ParsedProposal {
    title: string;
    status: string;
    type: string;
    category: string | null;
    created: Date | null;
    discussionsTo: string | null;
    authors: {
        name?: string;
        email?: string;
        githubHandle?: string;
    }[];
    requires: string[];
}
/**
 * Abstract class defining the contract for all protocol-specific parsers.
 * Each concrete parser will provide a specific implementation for extracting
 * metadata from a proposal's raw markdown content. This design allows for
 * easy extension to support new proposal formats in the future without
 * modifying the core processing logic.
 */
export declare abstract class BaseParser {
    /**
     * The main orchestration method. It's concrete, not abstract.
     * It calls the various abstract extractor methods to build a standardized
     * proposal object.
     *
     * @param rawMarkdown The raw markdown string of the proposal file.
     * @param defaultTitle A fallback title to use if one cannot be parsed from the content.
     * @returns A standardized `ParsedProposal` object, or `null` if the primary
     *          data source cannot be found or parsed.
     */
    parse(rawMarkdown: string, defaultTitle: string): ParsedProposal | null;
    /**
     * Pre-processes the raw markdown to extract the relevant data block
     * (e.g., YAML frontmatter, a Markdown table) that the other extractors will use.
     * @param rawMarkdown The full raw markdown of the file.
     * @returns A data object (e.g., a parsed YAML object or a key-value map from a table)
     *          or `null` if the primary data source cannot be found.
     */
    protected abstract getSourceData(rawMarkdown: string): any | null;
    protected abstract extractTitle(data: any, defaultTitle: string): string;
    protected abstract extractStatus(data: any): string;
    protected abstract extractType(data: any): string;
    protected abstract extractCategory(data: any): string | null;
    protected abstract extractCreated(data: any): Date | null;
    protected abstract extractDiscussionsTo(data: any): string | null;
    protected abstract extractAuthors(data: any): {
        name?: string;
        email?: string;
        githubHandle?: string;
    }[];
    protected abstract extractRequires(data: any): string[];
}
