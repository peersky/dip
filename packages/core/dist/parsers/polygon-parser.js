"use strict";
// dip/packages/core/src/parsers/polygon-parser.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolygonParser = void 0;
const base_parser_1 = require("./base-parser");
const utils_1 = require("../utils");
/**
 * A robust parser for Polygon Improvement Proposals (PIPs).
 *
 * PIPs present a unique challenge as they embed their metadata within a
 * Markdown table in the document body, rather than using standard YAML frontmatter.
 * This parser is specifically designed to find and interpret this table structure,
 * mapping PIP-specific field names to the standardized proposal format.
 */
class PolygonParser extends base_parser_1.BaseParser {
    /**
     * Overrides the base method to extract metadata from a Markdown table.
     * This function scans the document for a table, parses its headers and values,
     * and converts them into a case-insensitive key-value map for easy access.
     *
     * @param rawMarkdown The full raw markdown of the PIP file.
     * @returns A key-value map of the metadata, or null if a valid table is not found.
     */
    getSourceData(rawMarkdown) {
        const lines = rawMarkdown.split("\n");
        let headerLine;
        let separatorLine;
        let valueLine;
        // Find the lines that constitute the metadata table
        for (let i = 0; i < lines.length - 2; i++) {
            if (lines[i].trim().startsWith("|") &&
                lines[i + 1].trim().startsWith("|---") &&
                lines[i + 2].trim().startsWith("|")) {
                headerLine = lines[i];
                separatorLine = lines[i + 1];
                valueLine = lines[i + 2];
                break;
            }
        }
        if (!headerLine || !valueLine) {
            return null;
        }
        // Clean and split the header and value lines into arrays
        const headers = headerLine
            .split("|")
            .map((h) => h.trim().toLowerCase()) // Use lowercase for consistent key access
            .filter(Boolean);
        const values = valueLine
            .split("|")
            .map((v) => v.trim())
            .filter(Boolean);
        if (headers.length !== values.length) {
            console.warn(`[PolygonParser] Header and value count mismatch. Headers: ${headers.length}, Values: ${values.length}`);
            return null;
        }
        // Zip the headers and values into a key-value object
        const data = {};
        headers.forEach((header, index) => {
            data[header] = values[index];
        });
        // The title is often not in the table, but in the first H1 tag.
        // We'll add it to the source data here for consistency.
        const titleMatch = rawMarkdown.match(/^#\s*(.*)/m);
        if (titleMatch && !data.title) {
            // Title may have the format "PIP-1: Title Text", so we strip the prefix
            data.title = titleMatch[1].replace(/PIP-\d+:\s*/, "").trim();
        }
        return data;
    }
    extractTitle(data, defaultTitle) {
        // The title is now pre-populated in getSourceData.
        return data.title || defaultTitle;
    }
    extractStatus(data) {
        // PIPs can use 'status' or 'pip status' as the header.
        return data.status || data["pip status"] || "Unknown";
    }
    /**
     * For PIPs, the "Type" in the table (e.g., "Standards", "Core") is more akin
     * to a Category in the EIP sense. The overall proposal type is implicitly
     * "Standards Track" if a type is defined in the table.
     */
    extractType(data) {
        // If a 'type' field exists in the table, we classify the PIP as Standards Track.
        return data.type ? "Standards Track" : "Unknown";
    }
    /**
     * We use the table's "Type" field as the Category for our standardized model.
     */
    extractCategory(data) {
        return data.type || null;
    }
    extractCreated(data) {
        // The key in the table is 'date'.
        const createdDate = data.date;
        if (createdDate &&
            typeof createdDate === "string" &&
            !isNaN(Date.parse(createdDate))) {
            return new Date(createdDate);
        }
        return null;
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
        // Regex to find the URL inside markdown link parentheses
        const match = discussion.match(/\(([^)]+)\)/);
        return match ? match[1] : discussion;
    }
    extractAuthors(data) {
        // The key in the table is 'author'.
        return (0, utils_1.parseAuthors)(data.author || "");
    }
    extractRequires(data) {
        // PIP tables generally do not have a 'requires' field.
        return [];
    }
}
exports.PolygonParser = PolygonParser;
