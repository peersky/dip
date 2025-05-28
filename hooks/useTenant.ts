import { useEffect, useState } from "react";
import { getTenantInfo, getProtocolConfig, TenantInfo } from "@/lib/subdomain-utils";

interface UseTenantReturn extends TenantInfo {
  protocolConfig: ReturnType<typeof getProtocolConfig>;
  repositoryInfo: {
    owner: string;
    repo: string;
    fullName: string;
    displayName: string;
  };
  isLoading: boolean;
}

export function useTenant(): UseTenantReturn {
  const [tenantInfo, setTenantInfo] = useState<TenantInfo>({
    subdomain: "ethereum",
    protocol: "ethereum",
    isAuthDomain: false,
    isMainDomain: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get tenant info from current hostname
    const hostname = window.location.hostname;
    const info = getTenantInfo(hostname);
    setTenantInfo(info);
    setIsLoading(false);
  }, []);

  const protocolConfig = getProtocolConfig(tenantInfo.protocol);

  // Map protocol to repository information using the protocol config
  const getRepositoryInfo = (protocol: string) => {
    const config = getProtocolConfig(protocol);

    return {
      owner: config.repoOwner,
      repo: config.repoName,
      fullName: `${config.repoOwner}/${config.repoName}`,
      displayName: config.description,
    };
  };

  const repositoryInfo = getRepositoryInfo(tenantInfo.protocol);

  return {
    ...tenantInfo,
    protocolConfig,
    repositoryInfo,
    isLoading,
  };
}
