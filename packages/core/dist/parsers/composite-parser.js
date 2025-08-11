"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompositeParser = void 0;
// dip/packages/core/src/parsers/composite-parser.ts
const base_parser_1 = require("./base-parser");
const default_parser_1 = require("./default-parser");
const polygon_parser_1 = require("./polygon-parser");
/**
 * A "composite" parser that tries multiple parsing strategies in order.
 * This is designed for protocols like Polygon's PIPs, which have used
 * different metadata formats over time (e.g., Markdown tables and YAML frontmatter).
 *
 * It acts as a fallback mechanism, ensuring that as many files as possible
 * are parsed correctly, even if the format is inconsistent across the repository.
 */
class CompositeParser extends base_parser_1.BaseParser {
    constructor() {
        super();
        // For Polygon, we expect the Markdown table to be the primary format.
        this.primaryParser = new polygon_parser_1.PolygonParser();
        // If that fails, we fall back to the standard YAML frontmatter format.
        this.fallbackParser = new default_parser_1.DefaultParser();
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
    parse(rawMarkdown, defaultTitle) {
        const primaryResult = this.primaryParser.parse(rawMarkdown, defaultTitle);
        if (primaryResult) {
            return primaryResult;
        }
        return this.fallbackParser.parse(rawMarkdown, defaultTitle);
    }
    // Since we are overriding the main `parse` method, the abstract extractor
    // methods from the base class will not be used by this class. We provide
    // stub implementations to satisfy the abstract class contract.
    getSourceData(rawMarkdown) {
        throw new Error("Method not implemented for CompositeParser.");
    }
    extractTitle(data, defaultTitle) {
        throw new Error("Method not implemented for CompositeParser.");
    }
    extractStatus(data) {
        throw new Error("Method not implemented for CompositeParser.");
    }
    extractType(data) {
        throw new Error("Method not implemented for CompositeParser.");
    }
    extractCategory(data) {
        throw new Error("Method not implemented for CompositeParser.");
    }
    extractCreated(data) {
        throw new Error("Method not implemented for CompositeParser.");
    }
    extractDiscussionsTo(data) {
        throw new Error("Method not implemented for CompositeParser.");
    }
    extractAuthors(data) {
        throw new Error("Method not implemented for CompositeParser.");
    }
    extractRequires(data) {
        throw new Error("Method not implemented for CompositeParser.");
    }
}
exports.CompositeParser = CompositeParser;
