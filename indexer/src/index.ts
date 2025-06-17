import { PrismaClient } from '@prisma/client';
import { ethers } from 'ethers';
import winston from 'winston';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});

class GasMetricsIndexer {
  private provider: ethers.JsonRpcProvider;
  private networks: string[];

  constructor() {
    this.provider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL);
    this.networks = ['ethereum']; // Add more networks as needed
  }

  async processBlock(blockNumber: number, network: string) {
    try {
      const block = await this.provider.getBlock(blockNumber, true);
      if (!block) return;

      for (const tx of block.transactions) {
        if (typeof tx === 'string') continue;
        
        await this.processTransaction(tx, network);
      }
    } catch (error) {
      logger.error(`Error processing block ${blockNumber}:`, error);
    }
  }

  private async processTransaction(tx: ethers.TransactionResponse, network: string) {
    try {
      const receipt = await this.provider.getTransactionReceipt(tx.hash);
      if (!receipt) return;

      // Store transaction data
      await prisma.transaction.create({
        data: {
          txHash: tx.hash,
          walletAddress: tx.from.toLowerCase(),
          network,
          gasUsed: BigInt(receipt.gasUsed),
          gasPrice: BigInt(tx.gasPrice || 0),
          blockNumber: receipt.blockNumber,
          timestamp: new Date((await receipt.getBlock()).timestamp * 1000),
          status: receipt.status ? 'success' : 'failed',
        },
      });

      // Update gas metrics
      await this.updateGasMetrics(tx.from.toLowerCase(), network, receipt);
    } catch (error) {
      logger.error(`Error processing transaction ${tx.hash}:`, error);
    }
  }

  private async updateGasMetrics(walletAddress: string, network: string, receipt: ethers.TransactionReceipt) {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1); // Monthly periods

    const gasCost = BigInt(receipt.gasUsed) * BigInt(receipt.gasPrice);

    await prisma.walletGasMetrics.upsert({
      where: {
        id: `${walletAddress}-${network}-${periodStart.toISOString()}`,
      },
      create: {
        id: `${walletAddress}-${network}-${periodStart.toISOString()}`,
        walletAddress,
        network,
        periodStart,
        periodEnd: new Date(now.getFullYear(), now.getMonth() + 1, 0),
        gasSpent: gasCost,
        gasEarned: BigInt(0),
      },
      update: {
        gasSpent: {
          increment: gasCost,
        },
      },
    });
  }

  async start() {
    logger.info('Starting Gas Metrics Indexer...');
    
    for (const network of this.networks) {
      const startBlock = parseInt(process.env[`${network.toUpperCase()}_START_BLOCK`] || '0');
      let currentBlock = startBlock;

      while (true) {
        try {
          const latestBlock = await this.provider.getBlockNumber();
          
          if (currentBlock > latestBlock) {
            await new Promise(resolve => setTimeout(resolve, 12000)); // Wait for new blocks
            continue;
          }

          await this.processBlock(currentBlock, network);
          currentBlock++;
        } catch (error) {
          logger.error(`Error in main loop for ${network}:`, error);
          await new Promise(resolve => setTimeout(resolve, 5000)); // Wait before retrying
        }
      }
    }
  }
}

// Start the indexer
const indexer = new GasMetricsIndexer();
indexer.start().catch(error => {
  logger.error('Fatal error:', error);
  process.exit(1);
}); 