"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// dip/crawler/src/validate-local-parsers.ts
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const parsers_1 = require("../../packages/core/src/parsers");
// Mock repository configurations to allow the getParser factory to select the correct parser.
const eipRepoConfig = {
    owner: "ethereum",
    repo: "EIPs",
    protocol: "ethereum",
    ecosystem: "ethereum",
    branch: "master",
    eipsFolder: "EIPS",
    proposalPrefix: "EIP",
    enabled: true,
};
const polygonRepoConfig = {
    owner: "maticnetwork",
    repo: "Polygon-Improvement-Proposals",
    protocol: "polygon",
    ecosystem: "polygon",
    branch: "master",
    eipsFolder: "PIPs",
    proposalPrefix: "PIP",
    enabled: true,
};
/**
 * Validates all markdown files in a given directory by attempting to parse them.
 * This function serves as a comprehensive unit test against a local repository checkout,
 * ensuring that the parsing logic is robust for all files.
 *
 * @param directoryPath The absolute path to the directory containing proposal files.
 * @param repoConfig The repository configuration used to select the correct parser.
 * @returns A list of filenames that could not be successfully parsed.
 */
function validateDirectory(directoryPath, repoConfig) {
    console.log(`\n--- Validating Protocol: ${repoConfig.protocol} in ${path_1.default.basename(directoryPath)} ---`);
    if (!fs_1.default.existsSync(directoryPath)) {
        console.warn(`[SKIP] Directory not found: ${directoryPath}`);
        return [];
    }
    const filenames = fs_1.default.readdirSync(directoryPath);
    const parser = (0, parsers_1.getParser)(repoConfig);
    const failedFiles = [];
    let mdFileCount = 0;
    for (const filename of filenames) {
        if (filename.endsWith(".md")) {
            mdFileCount++;
            const filePath = path_1.default.join(directoryPath, filename);
            const rawMarkdown = fs_1.default.readFileSync(filePath, "utf8");
            // Use the robust regex to extract the proposal number for the default title.
            const proposalNumberMatch = filename.match(/(?:[a-zA-Z]+-)?(\d+)\.md$/);
            if (!proposalNumberMatch) {
                failedFiles.push(`${filename} (Filename regex mismatch)`);
                continue;
            }
            const proposalNumber = proposalNumberMatch[1];
            const parsedData = parser.parse(rawMarkdown, `Proposal ${proposalNumber}`);
            if (!parsedData) {
                failedFiles.push(filename);
            }
        }
    }
    console.log(`Total Markdown files found: ${mdFileCount}`);
    console.log(`Successfully parsed: ${mdFileCount - failedFiles.length}`);
    console.log(`Failed to parse: ${failedFiles.length}`);
    if (failedFiles.length > 0) {
        console.error("The following files failed to parse:", failedFiles);
    }
    return failedFiles;
}
/**
 * Main validation script.
 */
async function main() {
    console.log("Starting local parser validation script...");
    // Note: These paths are relative to the monorepo root.
    const eipsDirectory = path_1.default.join(__dirname, "../../EIPs/EIPS");
    const pipsDirectory = path_1.default.join(__dirname, "../../Polygon-Improvement-Proposals/PIPs");
    const eipFailures = validateDirectory(eipsDirectory, eipRepoConfig);
    const pipFailures = validateDirectory(pipsDirectory, polygonRepoConfig);
    if (eipFailures.length > 0 || pipFailures.length > 0) {
        console.error("\n❌ Validation failed for one or more protocols.");
        process.exit(1);
    }
    else {
        console.log("\n✅ All local files for all tested protocols parsed successfully!");
    }
}
main().catch((e) => {
    console.error("A fatal error occurred during validation:", e);
    process.exit(1);
});
