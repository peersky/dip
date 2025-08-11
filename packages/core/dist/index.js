"use strict";
/**
 * This file serves as the public API for the @peeramid-labs/dip-core package.
 * It explicitly exports all the functions, types, and utilities that are intended
 * to be consumed by other packages in the monorepo (like the `crawler`).
 *
 * This "barrel file" pattern resolves module system ambiguities and ensures a
 * clean, stable, and well-defined interface for the package.
 */
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
exports.processProposalFile = exports.calculateAndCacheStatistics = exports.updateLatestSnapshots = exports.backfillGlobalStats = exports.regenerateAllHistoricalSnapshots = exports.resolveMovedProposals = exports.processRepository = exports.seedRepositoryConfigs = exports.repositories = void 0;
// Export core processing functions
var processing_1 = require("./processing");
Object.defineProperty(exports, "repositories", { enumerable: true, get: function () { return processing_1.repositories; } });
Object.defineProperty(exports, "seedRepositoryConfigs", { enumerable: true, get: function () { return processing_1.seedRepositoryConfigs; } });
Object.defineProperty(exports, "processRepository", { enumerable: true, get: function () { return processing_1.processRepository; } });
Object.defineProperty(exports, "resolveMovedProposals", { enumerable: true, get: function () { return processing_1.resolveMovedProposals; } });
Object.defineProperty(exports, "regenerateAllHistoricalSnapshots", { enumerable: true, get: function () { return processing_1.regenerateAllHistoricalSnapshots; } });
Object.defineProperty(exports, "backfillGlobalStats", { enumerable: true, get: function () { return processing_1.backfillGlobalStats; } });
Object.defineProperty(exports, "updateLatestSnapshots", { enumerable: true, get: function () { return processing_1.updateLatestSnapshots; } });
// Note: The following are lower-level functions, but are exported for utility scripts
Object.defineProperty(exports, "calculateAndCacheStatistics", { enumerable: true, get: function () { return processing_1.calculateAndCacheStatistics; } });
Object.defineProperty(exports, "processProposalFile", { enumerable: true, get: function () { return processing_1.processProposalFile; } });
// Export all parsers
__exportStar(require("./parsers"), exports);
// Export shared utility functions
__exportStar(require("./utils"), exports);
// Export all shared types
__exportStar(require("./types"), exports);
