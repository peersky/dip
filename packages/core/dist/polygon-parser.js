"use strict";
// dip/packages/core/src/polygon-parser.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolygonParser = void 0;
const base_parser_1 = require("./base-parser");
const utils_1 = require("./utils");
/**
 * A parser for Polygon Improvement Proposals (PIPs), which use a
 * non-standard Markdown table for their metadata instead of YAML frontmatter.
 */
class PolygonParser extends base_parser_1.BaseParser {
    /**
     * Extracts the metadata from a Markdown table within the raw markdown.
     * It finds the first table, assumes its headers and values, and converts
     * it into a key-value map.
     * @param rawMarkdown The full raw markdown of the file.
     * @returns A key-value map of the table data, or null if a table can't be parsed.
     */
    getSourceData(rawMarkdown) {
        const lines = rawMarkdown.split("\n");
        const headerIndex = lines.findIndex((line) => line.trim().startsWith("|") && !line.includes("---"));
        if (headerIndex === -1) {
            return null;
        }
        const valueIndex = headerIndex + 2;
        if (valueIndex >= lines.length) {
            return null;
        }
        const headerLine = lines[headerIndex];
        const valueLine = lines[valueIndex];
        const headers = headerLine
            .split("|")
            .map((h) => h.trim().toLowerCase())
            .filter(Boolean);
        const values = valueLine
            .split("|")
            .map((v) => v.trim())
            .filter(Boolean);
        if (headers.length !== values.length) {
            console.error(`[PolygonParser] Header and value count mismatch for proposal.`);
            return null;
        }
        const data = {};
        headers.forEach((header, index) => {
            data[header] = values[index];
        });
        return data;
    }
    extractTitle(data, defaultTitle) {
        return data.title || defaultTitle;
    }
    extractStatus(data) {
        return data.status || "Unknown";
    }
    /**
     * For PIPs, the "Type" in the table (e.g., "Contracts") is more akin
     * to a category in the EIP sense. The overall type is implicitly "Standards Track".
     */
    extractType(data) {
        return data.type ? "Standards Track" : "Unknown";
    }
    extractCategory(data) {
        return data.type || null; // Use the table's "Type" field as the category.
    }
    extractCreated(data) {
        // The key in the table is 'date'
        return data.date ? new Date(data.date) : null;
    }
    /**
     * Extracts the URL from a Markdown link in the "Discussion" field.
     * e.g., "[Forum](https://...)" -> "https://..."
     */
    extractDiscussionsTo(data) {
        const discussion = data.discussion;
        if (!discussion) {
            return null;
        }
        const match = discussion.match(/\(([^)]+)\)/);
        return match ? match[1] : discussion;
    }
    extractAuthors(data) {
        // The key in the table is 'author'
        return (0, utils_1.parseAuthors)(data.author || "");
    }
    extractRequires(data) {
        // PIP tables do not have a 'requires' field.
        return [];
    }
}
exports.PolygonParser = PolygonParser;
