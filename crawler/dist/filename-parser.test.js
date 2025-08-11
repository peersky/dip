"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
describe('Proposal Filename Parser', () => {
    it('should correctly parse all filenames in the local EIPs/EIPS directory', () => {
        // This regex should match filenames like '1.md', 'eip-1.md', 'erc-721.md', etc.,
        // capturing only the numerical part. It is more robust than the original.
        const proposalNumberRegex = /(?:[a-zA-Z]+-)?(\d+)\.md$/;
        // Path to the local EIPs directory, relative to the monorepo root.
        // The test runs from dip/crawler/src, so we go up 2 levels to get to the 'dip' root.
        const eipsDirectory = path_1.default.join(__dirname, '../../EIPs/EIPS');
        // Check if the directory exists to prevent test errors in different environments.
        if (!fs_1.default.existsSync(eipsDirectory)) {
            console.warn(`
        Skipping filename parser test: Directory not found at ${eipsDirectory}.
        Please ensure the EIPs repository is checked out at the root of the monorepo.
      `);
            // Make the test pass trivially if the directory doesn't exist.
            expect(true).toBe(true);
            return;
        }
        const filenames = fs_1.default.readdirSync(eipsDirectory);
        let processedFiles = 0;
        const failedMatches = [];
        for (const filename of filenames) {
            // We only care about markdown files.
            if (filename.endsWith('.md')) {
                processedFiles++;
                const match = filename.match(proposalNumberRegex);
                if (!match || !match[1]) {
                    failedMatches.push(filename);
                }
                else {
                    // Check if the captured group is a valid number.
                    const proposalNumber = parseInt(match[1], 10);
                    expect(isNaN(proposalNumber)).toBe(false);
                }
            }
        }
        // Assert that all markdown files were parsed correctly.
        if (failedMatches.length > 0) {
            console.error('The following filenames failed to parse:', failedMatches);
        }
        expect(failedMatches).toEqual([]);
        // Assert that we processed a significant number of files, confirming the test ran correctly.
        // Based on your `ls | wc -l` command, we expect around 835 files.
        console.log(`Successfully processed and validated ${processedFiles} EIP markdown files.`);
        expect(processedFiles).toBeGreaterThan(800);
    });
});
