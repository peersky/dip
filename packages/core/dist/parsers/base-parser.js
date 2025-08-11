"use strict";
// dip/packages/core/src/parsers/base-parser.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseParser = void 0;
/**
 * Abstract class defining the contract for all protocol-specific parsers.
 * Each concrete parser will provide a specific implementation for extracting
 * metadata from a proposal's raw markdown content. This design allows for
 * easy extension to support new proposal formats in the future without
 * modifying the core processing logic.
 */
class BaseParser {
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
    parse(rawMarkdown, defaultTitle) {
        const data = this.getSourceData(rawMarkdown);
        if (!data)
            return null;
        return {
            title: this.extractTitle(data, defaultTitle),
            status: this.extractStatus(data),
            type: this.extractType(data),
            category: this.extractCategory(data),
            created: this.extractCreated(data),
            discussionsTo: this.extractDiscussionsTo(data),
            authors: this.extractAuthors(data),
            requires: this.extractRequires(data),
        };
    }
}
exports.BaseParser = BaseParser;
