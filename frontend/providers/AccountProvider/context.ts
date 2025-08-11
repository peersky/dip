import { createContext } from "react";
import { Address } from "viem";

export interface AccountProviderInterface {
  // Core properties
  account: Address;
  chainId: number;


  isCheckingOnboarding: boolean;


  refreshUserData: () => Promise<void>;
}

export const AccountProviderContext = createContext<AccountProviderInterface>({
  // Core properties
  account: "0x0000000000000000000000000000000000000000" as `0x${string}`,
  chainId: 1337,
  isCheckingOnboarding: false,
  refreshUserData: async () => {},
});

export default AccountProviderContext;
