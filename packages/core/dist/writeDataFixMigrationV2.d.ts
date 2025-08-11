/**
 * This script generates a data migration to clean up historical data by
 * stripping the YAML frontmatter from the `rawMarkdown` field of all
 * `ProposalVersion` records.
 *
 * The data ingestion pipeline was updated to do this for new proposals, but
 * this script is necessary to clean up any existing data that was ingested
 * before the fix.
 *
 * To use this script:
 * 1. First, create a new, empty migration:
 *    (from `packages/database`)
 *    `pnpm prisma migrate dev --create-only --name data-fix-frontmatter`
 *
 * 2. Then, run this script to populate that migration file:
 *    (from `packages/core`)
 *    `pnpm ts-node src/writeDataFixMigrationV2.ts`
 *
 * 3. Finally, review the generated `migration.sql` and apply it:
 *    (from `packages/database`)
 *    `pnpm prisma migrate dev`
 */
export {};
