"use strict";
// dip/packages/core/src/utils.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseAuthors = parseAuthors;
/**
 * Parses a string of authors into an array of structured author objects.
 * Handles various formats, such as multiple authors separated by commas or newlines,
 * and extracts name, email, and GitHub handle.
 *
 * Example input: "Vitalik Buterin <vitalik@ethereum.org> (@vbuterin), Gavin Wood <gavin@ethereum.org>"
 *
 * @param authorString The raw author string from the proposal metadata.
 * @returns An array of author objects.
 */
function parseAuthors(authorString) {
    if (!authorString)
        return [];
    const authors = Array.isArray(authorString)
        ? authorString
        : authorString.split(/,(?![^()]*\))|\n/);
    const result = [];
    for (const authorStr of authors) {
        const trimmedAuthor = authorStr.trim();
        if (!trimmedAuthor)
            continue;
        const emailMatch = trimmedAuthor.match(/<([^>]+)>/);
        const handleMatch = trimmedAuthor.match(/\(([^)]+)\)/);
        const name = trimmedAuthor
            .replace(/<[^>]+>/, "")
            .replace(/\(([^)]+)\)/, "")
            .trim();
        if (name) {
            result.push({
                name: name,
                email: emailMatch ? emailMatch[1] : undefined,
                githubHandle: handleMatch ? handleMatch[1].replace("@", "") : undefined,
            });
        }
    }
    return result;
}
