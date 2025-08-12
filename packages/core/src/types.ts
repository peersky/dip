// dip/packages/core/src/types.ts

// This interface defines the configuration for a single repository to be crawled.
// It is used across the core and crawler packages, so it is defined here
// in a separate file to prevent circular dependencies.
export interface RepositoryConfig {
  owner: string;
  ecosystem: string;
  repo: string;
  branch: string;
  eipsFolder: string;
  protocol: string;
  proposalPrefix: string;
  enabled: boolean;
  description?: string | null;
  website?: string | null;
  forkedFrom?: {
    owner: string;
    repo: string;
    protocol: string;
  };
}
