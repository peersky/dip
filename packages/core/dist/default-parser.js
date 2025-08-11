"use strict";
// dip/packages/core/src/default-parser.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultParser = void 0;
const gray_matter_1 = __importDefault(require("gray-matter"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const base_parser_1 = require("./base-parser");
const utils_1 = require("./utils"); // Assuming parseAuthors will be moved to a utils file
class DefaultParser extends base_parser_1.BaseParser {
    getSourceData(rawMarkdown) {
        try {
            const { data } = (0, gray_matter_1.default)(rawMarkdown, {
                engines: {
                    yaml: (s) => js_yaml_1.default.load(s, { json: true }),
                },
            });
            return data && typeof data === "object" ? data : null;
        }
        catch (error) {
            console.error("Error extracting YAML frontmatter:", error);
            return null;
        }
    }
    extractTitle(data, defaultTitle) {
        return data.title || defaultTitle;
    }
    extractStatus(data) {
        return data.status || "Unknown";
    }
    extractType(data) {
        return data.type || "Unknown";
    }
    extractCategory(data) {
        return data.category || null;
    }
    extractCreated(data) {
        return data.created ? new Date(data.created) : null;
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
        return Array.isArray(data.requires) ? data.requires.map(String) : [];
    }
}
exports.DefaultParser = DefaultParser;
