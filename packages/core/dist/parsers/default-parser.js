"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultParser = void 0;
// dip/packages/core/src/parsers/default-parser.ts
const gray_matter_1 = __importDefault(require("gray-matter"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const base_parser_1 = require("./base-parser");
const utils_1 = require("../utils");
class DefaultParser extends base_parser_1.BaseParser {
    getSourceData(rawMarkdown) {
        try {
            const { data } = (0, gray_matter_1.default)(rawMarkdown, {
                engines: {
                    yaml: (s) => js_yaml_1.default.load(s, { json: true }),
                },
            });
            if (!data || typeof data !== "object") {
                return null;
            }
            // Create a new object with all keys lowercased for case-insensitive access,
            // and attach the raw markdown for fallback parsing.
            const lowercasedData = {
                __rawMarkdown: rawMarkdown,
            };
            for (const key in data) {
                lowercasedData[key.toLowerCase()] = data[key];
            }
            return lowercasedData;
        }
        catch (error) {
            // This can happen with malformed YAML.
            return null;
        }
    }
    extractTitle(data, defaultTitle) {
        return data.title || defaultTitle;
    }
    extractStatus(data) {
        // 1. Check common aliases for the status field, case-insensitively.
        const statusKeys = ["status", "doc-status", "proposal-status"];
        for (const key of statusKeys) {
            if (data[key]) {
                return data[key];
            }
        }
        // 2. As a fallback for very old EIPs, scan the raw markdown content.
        const rawMarkdown = data.__rawMarkdown || "";
        const statusMatch = rawMarkdown.match(/^[Ss]tatus:\s*(.*)/m);
        if (statusMatch && statusMatch[1]) {
            return statusMatch[1].trim();
        }
        return "Unknown";
    }
    extractType(data) {
        // Check common aliases for the type field, case-insensitively.
        const typeKeys = ["type", "proposal-type", "eip-type"];
        for (const key of typeKeys) {
            if (data[key]) {
                return data[key];
            }
        }
        return "Unknown";
    }
    extractCategory(data) {
        return data.category || null;
    }
    extractCreated(data) {
        // Check for valid date string before creating a new Date object
        const createdDate = data.created;
        if (createdDate &&
            (typeof createdDate === "string" || typeof createdDate === "object") &&
            !isNaN(Date.parse(createdDate))) {
            return new Date(createdDate);
        }
        return null;
    }
    extractDiscussionsTo(data) {
        return (data["discussions-to"] ||
            data["discussion-to"] ||
            data["discussion"] ||
            data["forum"] ||
            null);
    }
    extractAuthors(data) {
        return (0, utils_1.parseAuthors)(data.author || "");
    }
    extractRequires(data) {
        if (Array.isArray(data.requires)) {
            return data.requires.map(String);
        }
        if (typeof data.requires === "string") {
            return data.requires.split(",").map((s) => s.trim());
        }
        return [];
    }
}
exports.DefaultParser = DefaultParser;
