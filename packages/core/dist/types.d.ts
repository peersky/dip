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
