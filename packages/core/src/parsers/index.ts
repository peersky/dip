// dip/packages/core/src/parsers/index.ts
import { RepositoryConfig } from "../types";
import { BaseParser } from "./base-parser";
import { DefaultParser } from "./default-parser";
import { CompositeParser } from "./composite-parser";

/**
 * A factory function that returns the appropriate parser based on the repository configuration.
 * This allows the processing logic to be decoupled from the specific parsing implementation
 * for each protocol.
 *
 * @param repoConfig The configuration for the repository being processed.
 * @returns An instance of the correct parser class.
 */
export function getParser(repoConfig: RepositoryConfig): BaseParser {
  // Polygon PIPs use a mix of formats, so we use a composite parser.
  if (repoConfig.protocol === "polygon") {
    return new CompositeParser();
  }

  // All other protocols (EIPs, ERCs, etc.) use a standard YAML frontmatter.
  return new DefaultParser();
}

// Re-export all parser-related modules for easy access from other parts of the core package.
export * from "./base-parser";
export * from "./default-parser";
export * from "./polygon-parser";
