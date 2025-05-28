import { NextResponse } from "next/server";
import { getProtocolConfig } from "@/lib/subdomain-utils";

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Debug endpoint only available in development" }, { status: 403 });
  }

  const envVars = {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_ETHEREUM_REPO_OWNER: process.env.NEXT_PUBLIC_ETHEREUM_REPO_OWNER,
    NEXT_PUBLIC_ETHEREUM_REPO_NAME: process.env.NEXT_PUBLIC_ETHEREUM_REPO_NAME,
    NEXT_PUBLIC_ETHEREUM_REPO_DESCRIPTION: process.env.NEXT_PUBLIC_ETHEREUM_REPO_DESCRIPTION,
    NEXT_PUBLIC_GITHUB_APP_NAME: process.env.NEXT_PUBLIC_GITHUB_APP_NAME,
  };

  const ethereumConfig = getProtocolConfig("ethereum");

  return NextResponse.json({
    environmentVariables: envVars,
    ethereumProtocolConfig: ethereumConfig,
    message: "Environment variables and protocol config for debugging",
  });
}
