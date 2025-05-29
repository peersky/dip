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
  const cleanHostname = hostname.split(":")[0];

  // Handle exact localhost or 127.0.0.1 as main for card view testing
  if (cleanHostname === "localhost" || cleanHostname === "127.0.0.1") {
    return {
      subdomain: "main",
      protocol: "main",
      isAuthDomain: false,
      isMainDomain: true,
    };
  }

  const parts = cleanHostname.split(".");

  // Handle subdomain.localhost for local development
  if (parts.length === 2 && parts[1] === "localhost") {
    const subdomain = parts[0];
    return {
      subdomain,
      protocol: subdomain === "auth" ? "auth" : subdomain,
      isAuthDomain: subdomain === "auth",
      isMainDomain: false,
    };
  }

  // Handle subdomain.dip.box (production-like structure)
  if (parts.length >= 3 && parts[parts.length - 1] === "box" && parts[parts.length - 2] === "dip") {
    const subdomain = parts[0];
    return {
      subdomain,
      protocol: subdomain === "auth" ? "auth" : subdomain,
      isAuthDomain: subdomain === "auth",
      isMainDomain: false,
    };
  }

  // Handle dip.box (main domain, production-like structure)
  if (parts.length === 2 && parts[1] === "box" && parts[0] === "dip") {
    return {
      subdomain: "main",
      protocol: "main",
      isAuthDomain: false,
      isMainDomain: true,
    };
  }

  // Fallback if no other condition is met (e.g., unexpected hostname, or if NEXT_PUBLIC_BASE_URL is not dip.box based)
  // This could also be a deployed environment that doesn't match dip.box, like a Vercel preview URL.
  // For Vercel preview URLs (e.g., project-git-branch-org.vercel.app),
  // we might want to treat them as the main domain or a specific test protocol.
  // For now, we'll keep the main fallback for consistency.
  console.warn(`Unrecognized hostname format: "${cleanHostname}". Defaulting to main domain. Consider refining getTenantInfo for this case.`);
  return {
    subdomain: "main",
    protocol: "main",
    isAuthDomain: false,
    isMainDomain: true,
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
    main: {
      name: "Decentralised",
      repoOwner: "decentralised",
      repoName: "DIPs",
      defaultBranch: "main",
      proposalPrefix: "DIP",
      description: "Decentralised Improvement Protocols",
      color: "gray",
      subdomain: "main",
    },
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
      color: "blue",
      subdomain: "rollup",
    },
    starknet: {
      name: "Starknet",
      repoOwner: process.env.NEXT_PUBLIC_STARKNET_REPO_OWNER || "starknet-io",
      repoName: process.env.NEXT_PUBLIC_STARKNET_REPO_NAME || "SNIPs",
      defaultBranch: process.env.NEXT_PUBLIC_STARKNET_REPO_BRANCH || "main",
      proposalPrefix: "SNIP",
      description: process.env.NEXT_PUBLIC_STARKNET_REPO_DESCRIPTION || "Starknet Improvement Proposals",
      color: "blue",
      subdomain: "starknet",
    },
    arbitrum: {
      name: "Arbitrum",
      repoOwner: process.env.NEXT_PUBLIC_ARBITRUM_REPO_OWNER || "arbitrum-foundation",
      repoName: process.env.NEXT_PUBLIC_ARBITRUM_REPO_NAME || "AIPs",
      defaultBranch: process.env.NEXT_PUBLIC_ARBITRUM_REPO_BRANCH || "main",
      proposalPrefix: "AIP",
      description: process.env.NEXT_PUBLIC_ARBITRUM_REPO_DESCRIPTION || "Arbitrum Improvement Proposals",
      color: "blue",
      subdomain: "arbitrum",
    },
    polygon: {
      name: "Polygon",
      repoOwner: process.env.NEXT_PUBLIC_POLYGON_REPO_OWNER || "polygon",
      repoName: process.env.NEXT_PUBLIC_POLYGON_REPO_NAME || "PIPs",
      defaultBranch: process.env.NEXT_PUBLIC_POLYGON_REPO_BRANCH || "main",
      proposalPrefix: "PIP",
      description: process.env.NEXT_PUBLIC_POLYGON_REPO_DESCRIPTION || "Polygon Improvement Proposals",
      color: "blue",
      subdomain: "polygon",
    },
    // Add more protocols as needed
  };

  return configs[protocol] || configs.main; // Fallback to main instead of ethereum
}

/**
 * Get all available protocols for the main domain
 */
export function getAllProtocols() {
  return [getProtocolConfig("ethereum"), getProtocolConfig("rollup"), getProtocolConfig("starknet"), getProtocolConfig("arbitrum")];
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
