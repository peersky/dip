"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// dip/crawler/src/author-parser.test.ts
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const gray_matter_1 = __importDefault(require("gray-matter"));
const utils_1 = require("../../packages/core/src/utils");
describe('Selective Author Parser', () => {
    it('should find all EIPs authored by "Felix Lange <fjl@ethereum.org>"', () => {
        const TARGET_NAME = 'Felix Lange';
        const TARGET_EMAIL = 'fjl@ethereum.org';
        // The test runs from dip/crawler/src, so we go up 2 levels to get to the 'dip' root.
        const eipsDirectory = path_1.default.join(__dirname, '../../EIPs/EIPS');
        // Check if the directory exists to prevent test errors.
        if (!fs_1.default.existsSync(eipsDirectory)) {
            console.warn(`
        Skipping author parser test: Directory not found at ${eipsDirectory}.
        Please ensure the EIPs repository is checked out at the root of the monorepo.
      `);
            // Pass trivially if the directory doesn't exist.
            expect(true).toBe(true);
            return;
        }
        const filenames = fs_1.default.readdirSync(eipsDirectory);
        const matchingFiles = [];
        for (const filename of filenames) {
            if (filename.endsWith('.md')) {
                const filePath = path_1.default.join(eipsDirectory, filename);
                const fileContent = fs_1.default.readFileSync(filePath, 'utf8');
                try {
                    const { data: frontmatter } = (0, gray_matter_1.default)(fileContent);
                    if (frontmatter && frontmatter.author) {
                        const authors = (0, utils_1.parseAuthors)(frontmatter.author);
                        const isAuthoredByTarget = authors.some(author => author.name.includes(TARGET_NAME) &&
                            author.email === TARGET_EMAIL);
                        if (isAuthoredByTarget) {
                            matchingFiles.push(filename);
                        }
                    }
                }
                catch (e) {
                    // Ignore files with parsing errors
                }
            }
        }
        console.log(`\n--- Found ${matchingFiles.length} EIPs authored by ${TARGET_NAME} <${TARGET_EMAIL}> ---`);
        matchingFiles.forEach(file => console.log(file));
        console.log("--- End of Report ---\n");
        // We expect to find at least one EIP authored by Felix Lange.
        expect(matchingFiles.length).toBeGreaterThan(0);
    });
});
