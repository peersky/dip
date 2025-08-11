import { RepositoryConfig } from "../types";
import { BaseParser } from "./base-parser";
/**
 * A factory function that returns the appropriate parser based on the repository configuration.
 * This allows the processing logic to be decoupled from the specific parsing implementation
 * for each protocol.
 *
 * @param repoConfig The configuration for the repository being processed.
 * @returns An instance of the correct parser class.
 */
export declare function getParser(repoConfig: RepositoryConfig): BaseParser;
export * from "./base-parser";
export * from "./default-parser";
export * from "./polygon-parser";
