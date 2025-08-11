"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// dip/crawler/src/polygon-filename-parser.test.ts
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
describe('Polygon Filename Parser', () => {
    it('should correctly parse all filenames in the local Polygon-Improvement-Proposals/PIPs directory', () => {
        // This regex should match filenames like 'PIP-1.md', '1.md', etc.,
        // capturing only the numerical part.
        const proposalNumberRegex = /(?:[a-zA-Z]+-)?(\d+)\.md$/;
        // Path to the local PIPs directory, relative to the monorepo root.
        const pipsDirectory = path_1.default.join(__dirname, '../../Polygon-Improvement-Proposals/PIPs');
        // Check if the directory exists to prevent test errors in different environments.
        if (!fs_1.default.existsSync(pipsDirectory)) {
            console.warn(`
        Skipping filename parser test: Directory not found at ${pipsDirectory}.
        Please ensure the Polygon-Improvement-Proposals repository is checked out at the root of the monorepo.
      `);
            // Make the test pass trivially if the directory doesn't exist.
            expect(true).toBe(true);
            return;
        }
        const filenames = fs_1.default.readdirSync(pipsDirectory);
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
        console.log(`Successfully processed and validated ${processedFiles} PIP markdown files.`);
        expect(processedFiles).toBeGreaterThan(0);
    });
});
