import { usePrivy } from "@privy-io/react-auth";
import { LoadingOverlay } from "@mantine/core";

export const PrivyLoader = ({ children }: { children: React.ReactNode }) => {
    const { ready } = usePrivy();

    if (!ready) {
        return <LoadingOverlay />;
    } else {
        return children;
    }
};
