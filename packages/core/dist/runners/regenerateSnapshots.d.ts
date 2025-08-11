/**
 * This is a dedicated runner script for the historical snapshot regeneration process.
 *
 * Its sole purpose is to import and execute the `regenerateAllHistoricalSnapshots`
 * function from the main `processing.ts` engine. This keeps the core logic
 * centralized while providing a clean, easy-to-use entry point for this
 * specific maintenance task.
 *
 * To run this script, use the corresponding command in package.json:
 * `pnpm run db:regenerate-history`
 */
export {};
