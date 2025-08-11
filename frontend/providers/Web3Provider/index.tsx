import React, { useEffect, useState } from "react";
import { ConnectedWallet, usePrivy, useWallets, } from "@privy-io/react-auth";
import { Web3ProviderContext } from "./context";
import { Chain, Address } from 'viem';
import { useAccount, useSwitchChain, type UseAccountReturnType, useWalletClient, usePublicClient } from "wagmi";
import { disconnect } from '@wagmi/core'
import { SUPPORTED_CHAINS, wagmiConfig } from "../../config";
import { getConnections, switchAccount } from "@wagmi/core";
import { Container, Text, Button, Stack } from "@mantine/core";

// Simple component to handle unsupported chains
function UnsupportedChainMessage() {
  return (
    <Container size="sm" py="xl">
      <Stack gap="md" align="center">
        <Text size="lg" fw={500}>Unsupported Network</Text>
        <Text size="sm" c="dimmed" ta="center">
          Please switch to a supported network to continue using the application.
        </Text>
        <Button onClick={() => window.location.reload()}>
          Refresh Page
        </Button>
      </Stack>
    </Container>
  );
}

export const Web3Provider = ({ children }: { children: React.ReactNode }) => {
    const [isConnected, setIsConnected] = useState<boolean>(false);
    const [hadWagmiChainChanged, setHadWagmiChainChanged] = useState<boolean>(false);
    const [privyWalletChainId, setPrivyWalletChainId] = useState<number | null>(null);
    const [currentChain, setCurrentChain] = useState<Chain>();
    const [account, setAccount] = useState<Address | null>(null);
    const { data: walletClient } = useWalletClient();
    const publicClient = usePublicClient();
    const { logout: privyLogout, authenticated, user } = usePrivy();
    const { wallets }: { wallets: ConnectedWallet[] } = useWallets();

    const { switchChain } = useSwitchChain();
    const wagmiAccount: UseAccountReturnType = useAccount();

    useEffect(() => {
        (async () => {
            try {
                if (authenticated && user && wallets.length > 0) {
                    const embedWallet = wallets.find((wallet) => wallet.walletClientType === "privy");
                    const wallet: ConnectedWallet = embedWallet ?? wallets[0];
                    const privyWalletChainId = parseInt(wallet.chainId.split(":")[1]);
                    setPrivyWalletChainId(privyWalletChainId);
                    const activeSupportedChain = SUPPORTED_CHAINS.find((chain) => chain.id === privyWalletChainId);
                    if (activeSupportedChain !== undefined) {
                        if (wagmiAccount.status === "connected") {
                            if (wagmiAccount.address !== wallet.address) { //if privy and wagmi accounts are not in sync
                                const connections = getConnections(wagmiConfig)
                                const connectionWithPrivyEmbeddedWallet = connections.find(
                                    connection => connection.accounts.includes(wallet.address as Address)
                                );
                                if (connectionWithPrivyEmbeddedWallet) {
                                    await switchAccount(wagmiConfig, {
                                        connector: connectionWithPrivyEmbeddedWallet.connector,
                                    })
                                    return;
                                } else {
                                    console.error("No connection found for the embedded wallet");
                                    window.location.reload();
                                    return;
                                }
                            } else {
                                setAccount(wagmiAccount.address);
                                setCurrentChain(activeSupportedChain);
                                setIsConnected(true);
                                console.log("connected to chain", activeSupportedChain);
                            }
                        } else {
                            if (!hadWagmiChainChanged) {
                                setHadWagmiChainChanged(true);
                                await switchChain({ chainId: privyWalletChainId });
                            }
                        }
                    }
                } else {
                    setAccount(null);
                    setCurrentChain(undefined);
                    setIsConnected(false);
                    setHadWagmiChainChanged(false);
                    setPrivyWalletChainId(null);
                }
            } catch (error) {
                console.error("Error during login:", error);
            }
        })();
    }, [wallets, wagmiAccount, authenticated, user, switchChain, hadWagmiChainChanged]);

    const logout = async () => {
        try {
            const wallet: ConnectedWallet = wallets[0];
            if (wallet) {
                await wallet.disconnect();
            }
            if (window.ethereum) {
                window.ethereum = null;
            }
            await disconnect(wagmiConfig);
            await privyLogout();
            setIsConnected(false);
            setAccount(null);
            setCurrentChain(undefined);
            setHadWagmiChainChanged(false);
            setPrivyWalletChainId(null);
        } catch (error) {
            console.error("Error during logout:", error);
        }
    };

    return (
        <Web3ProviderContext.Provider
            value={{
                currentChain,
                account,
                isConnected,
                logout,
                publicClient,
                walletClient
            }}
        >
            {SUPPORTED_CHAINS.find((chain) => chain.id === privyWalletChainId) === undefined && privyWalletChainId !== null ?
                <UnsupportedChainMessage />
                : children
            }
        </Web3ProviderContext.Provider>
    );
};

export default Web3Provider;
