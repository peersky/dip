import { Chain, defineChain, http } from "viem";
import { SiteMap } from "./types";
import { createConfig } from "@privy-io/wagmi";
// Import only what's needed
import { celo, celoAlfajores } from "viem/chains";

export function getProcessEnv(key: string, devFallback?: string) {
  const ret = process.env[key];
  if (!ret) {
    if (devFallback && process.env.NODE_ENV !== "production") {
      return devFallback;
    }
    throw new Error(key + " must be exported in env");
  }
  return ret;
}

export const NODE_ENV = process.env.NODE_ENV;
export const GTAG = getProcessEnv("NEXT_PUBLIC_ENGINE_GTAG", "xxx");
export const PRIVY_APP_ID = getProcessEnv("NEXT_PUBLIC_PRIVY_APP_ID");
export const SUPPORTED_CHAINS: [Chain, ...Chain[]] = [] as unknown as [Chain, ...Chain[]];
export const DEFAULT_CHAIN_NAME = "celo";

if (process.env.NODE_ENV !== "production") {
  const LOCALHOST_CHAIN_ID = process.env.NEXT_PUBLIC_LOCAL_CHAIN_ID ?? "1337";
  SUPPORTED_CHAINS.push(
    defineChain({
      id: parseInt(LOCALHOST_CHAIN_ID),
      name: "localhost",
      nativeCurrency: {
        decimals: 18,
        name: "Ethereum",
        symbol: "ETH",
      },
      rpcUrls: {
        default: {
          http: [process.env.NEXT_PUBLIC_LOCAL_CHAIN_RPC_TARGET ?? "http://localhost:8545"],
        },
        privyWalletOverride: {
          http: [process.env.NEXT_PUBLIC_LOCAL_CHAIN_RPC_TARGET ?? "http://localhost:8545"],
        },
      },
    })
  );
}

SUPPORTED_CHAINS.push(process.env.NEXT_PUBLIC_TESTNET_ENABLED === "true" ? celoAlfajores : celo);

export const wagmiConfig = createConfig({
  chains: SUPPORTED_CHAINS,
  transports: { ...Object.fromEntries(SUPPORTED_CHAINS.map((chain) => [chain.id, http()])) },
});

const _DEFAULT_CHAIN: Chain | undefined = process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_PUBLIC_DEV_MODE === "true" ? (process.env.NEXT_PUBLIC_TESTNET_ENABLED === "true" ? celoAlfajores : celo) : SUPPORTED_CHAINS.find((chain) => chain.name === "localhost");
if (!_DEFAULT_CHAIN) throw new Error("Default chain not found");

export const DEFAULT_CHAIN: Chain = _DEFAULT_CHAIN;
export const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.peeramid.xyz";
export const GITHUB_URL = "https://github.com/peeramid-labs/onchain_solutions/";
export const X_URL = "https://x.com/peeramid_labs";
export const DISCORD_URL = process.env.NEXT_PUBLIC_DISCORD_URL ?? "https://discord.gg/EddGgGUuWC";

const METATAG_TITLE = getProcessEnv("NEXT_PUBLIC_METATAG_TITLE", "World Improvement Proposals");
const METATAG_DESCRIPTION = getProcessEnv("NEXT_PUBLIC_METATAG_DESCRIPTION", "First fully onchain governance system for the citizens of the world. Join today and start voting.");
const METATAG_KEYWORDS = getProcessEnv("NEXT_PUBLIC_METATAG_KEYWORDS", "Blockchain; World Improvement Proposals");
const METATAG_IMAGE = getProcessEnv("NEXT_PUBLIC_METATAG_IMAGE", "/hero.jpeg");
console.log("WEBSITE LAUNCHED WITH FOLLOWING PARAMS: NODE_ENV:", process.env.NODE_ENV, "NEXT_PUBLIC_PUBLIC_DEV_MODE:", process.env.NEXT_PUBLIC_PUBLIC_DEV_MODE, "NEXT_PUBLIC_TESTNET_ENABLED:", process.env.NEXT_PUBLIC_TESTNET_ENABLED);
console.log("DEFAULT CHAIN:", _DEFAULT_CHAIN?.name, _DEFAULT_CHAIN.rpcUrls.default.http[0]);
export const SITEMAP: SiteMap = [
  {
    title: "Docs",
    path: "/docs",
    type: "CONTENT",
  },
  {
    title: "Whitepaper",
    path: "docs/whitepaper",
    type: "CONTENT",
  },
  {
    title: "Stats",
    type: "CONTENT",
    path: "/stats",
  },
  {
    type: "FOOTER_CATEGORY",
    title: "Terms",
    path: "/terms",
  },
  {
    title: "Dashboard",
    type: "CONTENT",
    path: "/dashboard",
    authenticated: true,
  },
];

export const defaultMetaTags = {
  title: METATAG_TITLE,
  keywords: METATAG_KEYWORDS,
  description: METATAG_DESCRIPTION,
  url: BASE_URL,
  image: METATAG_IMAGE,
};
