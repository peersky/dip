/**
 * Utility functions for handling multi-tenant subdomains
 */

export interface TenantInfo {
  subdomain: string;
  protocol: string;
  isAuthDomain: boolean;
  isMainDomain: boolean;
}

/**
 * Extract tenant information from hostname
 */
export function getTenantInfo(hostname: string): TenantInfo {
  // Remove port if present (for localhost development)
  const cleanHostname = hostname.split(":")[0];

  // Handle localhost development
  if (cleanHostname === "localhost" || cleanHostname === "127.0.0.1") {
    // When NEXT_PUBLIC_BASE_URL is localhost:3000, treat localhost as the main domain for testing cards view.
    // For testing specific subdomains locally, you'd typically use /etc/hosts and a different NEXT_PUBLIC_BASE_URL.
    return {
      subdomain: "main",
      protocol: "main",
      isAuthDomain: false,
      isMainDomain: true, // Treat localhost as the main domain for card view testing
    };
  }

  // Split hostname into parts
  const parts = cleanHostname.split(".");

  // Handle different domain structures
  if (parts.length >= 3) {
    // subdomain.dip.box format
    const subdomain = parts[0];

    return {
      subdomain,
      protocol: subdomain === "auth" ? "auth" : subdomain,
      isAuthDomain: subdomain === "auth",
      isMainDomain: false,
    };
  } else if (parts.length === 2 && parts[1] === "box" && parts[0] === "dip") {
    // dip.box (main domain)
    return {
      subdomain: "main",
      protocol: "main",
      isAuthDomain: false,
      isMainDomain: true,
    };
  }

  // Fallback
  return {
    subdomain: "ethereum",
    protocol: "ethereum",
    isAuthDomain: false,
    isMainDomain: false,
  };
}

/**
 * Get protocol-specific configuration
 */
export function getProtocolConfig(protocol: string) {
  const configs: Record<
    string,
    {
      name: string;
      repoOwner: string;
      repoName: string;
      defaultBranch: string;
      proposalPrefix: string;
      description: string;
      color: string;
      subdomain: string;
    }
  > = {
    ethereum: {
      name: "Ethereum",
      repoOwner: process.env.NEXT_PUBLIC_ETHEREUM_REPO_OWNER || "ethereum",
      repoName: process.env.NEXT_PUBLIC_ETHEREUM_REPO_NAME || "EIPs",
      defaultBranch: process.env.NEXT_PUBLIC_ETHEREUM_REPO_BRANCH || "master",
      proposalPrefix: "EIP",
      description: process.env.NEXT_PUBLIC_ETHEREUM_REPO_DESCRIPTION || "Ethereum Improvement Proposals",
      color: "blue",
      subdomain: "ethereum",
    },
    rollup: {
      name: "Rollup",
      repoOwner: process.env.NEXT_PUBLIC_ROLLUP_REPO_OWNER || "ethereum",
      repoName: process.env.NEXT_PUBLIC_ROLLUP_REPO_NAME || "RIPs",
      defaultBranch: process.env.NEXT_PUBLIC_ROLLUP_REPO_BRANCH || "master",
      proposalPrefix: "RIP",
      description: process.env.NEXT_PUBLIC_ROLLUP_REPO_DESCRIPTION || "Rollup Improvement Proposals",
      color: "green",
      subdomain: "rollup",
    },
    starknet: {
      name: "Starknet",
      repoOwner: process.env.NEXT_PUBLIC_STARKNET_REPO_OWNER || "starknet-io",
      repoName: process.env.NEXT_PUBLIC_STARKNET_REPO_NAME || "SNIPs",
      defaultBranch: process.env.NEXT_PUBLIC_STARKNET_REPO_BRANCH || "main",
      proposalPrefix: "SNIP",
      description: process.env.NEXT_PUBLIC_STARKNET_REPO_DESCRIPTION || "Starknet Improvement Proposals",
      color: "purple",
      subdomain: "starknet",
    },
    arbitrum: {
      name: "Arbitrum",
      repoOwner: process.env.NEXT_PUBLIC_ARBITRUM_REPO_OWNER || "arbitrum-foundation",
      repoName: process.env.NEXT_PUBLIC_ARBITRUM_REPO_NAME || "AIPs",
      defaultBranch: process.env.NEXT_PUBLIC_ARBITRUM_REPO_BRANCH || "main",
      proposalPrefix: "AIP",
      description: process.env.NEXT_PUBLIC_ARBITRUM_REPO_DESCRIPTION || "Arbitrum Improvement Proposals",
      color: "orange",
      subdomain: "arbitrum",
    },
    polygon: {
      name: "Polygon",
      repoOwner: process.env.NEXT_PUBLIC_POLYGON_REPO_OWNER || "polygon",
      repoName: process.env.NEXT_PUBLIC_POLYGON_REPO_NAME || "PIPs",
      defaultBranch: process.env.NEXT_PUBLIC_POLYGON_REPO_BRANCH || "main",
      proposalPrefix: "PIP",
      description: process.env.NEXT_PUBLIC_POLYGON_REPO_DESCRIPTION || "Polygon Improvement Proposals",
      color: "violet",
      subdomain: "polygon",
    },
    // Add more protocols as needed
  };

  return configs[protocol] || configs.ethereum; // Fallback to ethereum
}

/**
 * Get all available protocols for the main domain
 */
export function getAllProtocols() {
  return [getProtocolConfig("ethereum"), getProtocolConfig("rollup"), getProtocolConfig("starknet")];
}

/**
 * Check if current request is from auth domain
 */
export function isAuthDomain(hostname: string): boolean {
  return getTenantInfo(hostname).isAuthDomain;
}

/**
 * Get the auth domain URL for OAuth redirects
 */
export function getAuthDomainUrl(): string {
  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3000";
  }

  const authDomain = process.env.NEXT_PUBLIC_AUTH_DOMAIN || "auth.dip.box";
  return `https://${authDomain}`;
}
