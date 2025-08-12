import { useEffect, useState, useMemo } from "react";
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
    subdomain: "main",
    protocol: "main",
    isAuthDomain: false,
    isMainDomain: true,
  });
  const [protocolConfig, setProtocolConfig] = useState(() => getProtocolConfig("main"));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get tenant info from current hostname
    const hostname = window.location.hostname;
    const info = getTenantInfo(hostname);
    setTenantInfo(info);
    setProtocolConfig(getProtocolConfig(info.protocol));
    setIsLoading(false);
  }, []);

  // Map protocol to repository information using the protocol config
  const getRepositoryInfo = (config: ReturnType<typeof getProtocolConfig>) => {
    return {
      owner: config.repoOwner,
      repo: config.repoName,
      fullName: `${config.repoOwner}/${config.repoName}`,
      displayName: config.description,
    };
  };

  // Derive repositoryInfo when protocolConfig changes
  const repositoryInfo = useMemo(() => getRepositoryInfo(protocolConfig), [protocolConfig]);

  return {
    ...tenantInfo,
    protocolConfig,
    repositoryInfo,
    isLoading,
  };
}
