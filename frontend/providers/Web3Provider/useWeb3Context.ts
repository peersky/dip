import { useContext } from 'react';
import { Web3ProviderContext } from './context';

export const useWeb3Context = () => {
    const context = useContext(Web3ProviderContext);
    if (!context) {
        throw new Error('useWeb3Context must be used within a Web3Provider');
    }
    return context;
};