import { useContext } from "react";
import AccountProviderContext, { AccountProviderInterface } from "@/providers/AccountProvider/context";

/**
 * Custom hook to access account data and settings from the AccountProvider context
 * with TypeScript type safety and convenience methods
 */
export const useAccount = (): AccountProviderInterface => {
  const context = useContext(AccountProviderContext);

  if (!context) {
    throw new Error("useAccount must be used within an AccountProvider");
  }

  return context;
};

export default useAccount;
