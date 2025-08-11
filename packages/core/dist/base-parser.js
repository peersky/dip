"use strict";
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
    // The main orchestration method. It's concrete, not abstract.
    parse(rawMarkdown, defaultTitle) {
        const data = this.getSourceData(rawMarkdown);
        if (!data)
            return null;
        const title = this.extractTitle(data, defaultTitle);
        const status = this.extractStatus(data);
        const type = this.extractType(data);
        const category = this.extractCategory(data);
        const created = this.extractCreated(data);
        const discussionsTo = this.extractDiscussionsTo(data);
        const authors = this.extractAuthors(data);
        const requires = this.extractRequires(data);
        return {
            title,
            status,
            type,
            category,
            created,
            discussionsTo,
            authors,
            requires,
        };
    }
}
exports.BaseParser = BaseParser;
