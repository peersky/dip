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
export declare function parseAuthors(authorString: string | string[]): {
    name: string;
    email?: string;
    githubHandle?: string;
}[];
