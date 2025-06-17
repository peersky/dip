type EnvioConfig = {
  networks: {
    [key: string]: {
      rpcUrl: string;
      chainId: number;
    };
  };
  contracts?: {
    [key: string]: any;
  };
  startBlock: {
    [key: string]: number;
  };
  batchSize: number;
  blockRange: number;
  retryAttempts: number;
  retryDelay: number;
}

const config: EnvioConfig = {
  networks: {
    ethereum: {
      rpcUrl: process.env.ETHEREUM_RPC_URL || '',
      chainId: 1,
    },
    // Add more networks as needed
  },
  contracts: {
    // Add contract configurations here
  },
  startBlock: {
    ethereum: parseInt(process.env.ETHEREUM_START_BLOCK || '0'),
  },
  batchSize: 1000,
  blockRange: 1000,
  retryAttempts: 3,
  retryDelay: 1000,
};

export default config; 