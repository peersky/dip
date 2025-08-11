"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getParser = getParser;
const default_parser_1 = require("./default-parser");
const composite_parser_1 = require("./composite-parser");
/**
 * A factory function that returns the appropriate parser based on the repository configuration.
 * This allows the processing logic to be decoupled from the specific parsing implementation
 * for each protocol.
 *
 * @param repoConfig The configuration for the repository being processed.
 * @returns An instance of the correct parser class.
 */
function getParser(repoConfig) {
    // Polygon PIPs use a mix of formats, so we use a composite parser.
    if (repoConfig.protocol === "polygon") {
        return new composite_parser_1.CompositeParser();
    }
    // All other protocols (EIPs, ERCs, etc.) use a standard YAML frontmatter.
    return new default_parser_1.DefaultParser();
}
// Re-export all parser-related modules for easy access from other parts of the core package.
__exportStar(require("./base-parser"), exports);
__exportStar(require("./default-parser"), exports);
__exportStar(require("./polygon-parser"), exports);
