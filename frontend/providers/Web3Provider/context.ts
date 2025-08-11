import { createContext } from "react";
import { Address, Chain, PublicClient, WalletClient } from "viem";

export interface Web3ProviderInterface {
    currentChain: Chain | undefined;
    account: Address | null;
    isConnected: boolean;
    logout: () => Promise<void>;
    publicClient: PublicClient | undefined;
    walletClient: WalletClient | undefined;
}

export const Web3ProviderContext = createContext<Web3ProviderInterface>({
    logout: async () => {
        console.error("not initialized");
    },
    currentChain: undefined,
    account: null,
    isConnected: false,
    publicClient: undefined,
    walletClient: undefined,
});

export default Web3ProviderContext;
