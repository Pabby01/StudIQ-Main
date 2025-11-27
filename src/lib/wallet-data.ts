/* eslint-disable @typescript-eslint/no-unused-vars */
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { secureLogger, secureLogUtils } from './secure-logger';
import { getHeliusService } from './helius-rpc-service';
import { solflareWalletService, SolflareWalletService } from './solflare-wallet-service';
import type { ParsedTransactionWithMeta } from '@solana/web3.js';
import type { 
  WalletBalance as HeliusWalletBalance, 
  TransactionData as HeliusTransactionData 
} from './helius-rpc-service';

// Types for wallet data
export interface TokenBalance {
  mint: string;
  symbol: string;
  name: string;
  balance: number;
  decimals: number;
  uiAmount: number;
  usdValue: number;
  logoURI?: string;
}

export interface WalletBalance {
  solBalance: number;
  totalUsdValue: number;
  tokens: TokenBalance[];
  lastUpdated: Date;
}

export interface Transaction {
  signature: string;
  timestamp: Date;
  type: 'send' | 'receive' | 'swap' | 'stake' | 'unstake';
  amount: number;
  symbol: string;
  tokenSymbol?: string;
  usdValue: number;
  from?: string;
  to?: string;
  counterparty?: string;
  status: 'confirmed' | 'pending' | 'failed';
}

export interface WalletPortfolio {
  balance: WalletBalance;
  transactions: Transaction[];
  performance: {
    dayChange: number;
    dayChangePercent: number;
    weekChange: number;
    weekChangePercent: number;
  };
}

// Solana connection configuration - Use environment variables for RPC endpoints
const getSolanaRpcEndpoints = (): string[] => {
  // Primary RPC endpoint from environment
  const primaryRpc = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
  if (!primaryRpc) {
    throw new Error('NEXT_PUBLIC_SOLANA_RPC_URL is required. Please set this environment variable with your Solana RPC endpoint.');
  }
  
  // Fallback endpoints from environment (optional)
  const fallbackRpcs = process.env.NEXT_PUBLIC_SOLANA_RPC_FALLBACKS 
    ? process.env.NEXT_PUBLIC_SOLANA_RPC_FALLBACKS.split(',')
    : [];
  
  return [primaryRpc, ...fallbackRpcs];
};

// Token price API endpoints - Use environment variables
const getPriceApiEndpoints = () => {
  const coingeckoApi = process.env.NEXT_PUBLIC_COINGECKO_API_URL || 'https://api.coingecko.com/api/v3';
  const jupiterApi = process.env.NEXT_PUBLIC_JUPITER_API_URL || 'https://price.jup.ag/v4/price';
  
  return {
    coingecko: coingeckoApi,
    jupiter: jupiterApi,
  };
};

// Common token addresses on Solana
const COMMON_TOKENS = {
  SOL: 'So11111111111111111111111111111111111111112',
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  RAY: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
  SRM: 'SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt',
};

class WalletDataService {
  private connection: Connection;
  private priceCache: Map<string, { price: number; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 60000; // 1 minute cache
  private readonly rpcEndpoints: string[];
  private readonly priceEndpoints: { coingecko: string; jupiter: string };
  private currentRpcIndex = 0;

  constructor() {
    // Initialize RPC endpoints from environment
    const envRpcs = getSolanaRpcEndpoints();
    const defaults = ['https://api.mainnet-beta.solana.org'];
    const merged = [...envRpcs, ...defaults.filter(u => !envRpcs.includes(u))];
    this.rpcEndpoints = merged;
    this.priceEndpoints = getPriceApiEndpoints();
    
    // Initialize with the first RPC endpoint, fallback to others if needed
    this.connection = new Connection(this.rpcEndpoints[0], 'confirmed');
  }

  private switchToNextRpc() {
    this.currentRpcIndex = (this.currentRpcIndex + 1) % this.rpcEndpoints.length;
    this.connection = new Connection(this.rpcEndpoints[this.currentRpcIndex], 'confirmed');
  }

  // Get SOL price from CoinGecko
  private async getSolPrice(): Promise<number> {
    const cacheKey = 'SOL';
    const cached = this.priceCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.price;
    }

    try {
      const response = await fetch(
        `${this.priceEndpoints.coingecko}/simple/price?ids=solana&vs_currencies=usd`
      );
      const data = await response.json();
      const price = data.solana?.usd || 0;
      
      this.priceCache.set(cacheKey, { price, timestamp: Date.now() });
      return price;
    } catch (error) {
      secureLogger.error('Failed to fetch SOL price', { error });
      return 0;
    }
  }

  // Get token prices for multiple tokens
  private async getTokenPrices(tokenMints: string[]): Promise<Map<string, number>> {
    const prices = new Map<string, number>();
    
    try {
      // For now, we'll use mock prices for tokens other than SOL
      // In production, you'd integrate with Jupiter API or similar
      const mockPrices = {
        [COMMON_TOKENS.USDC]: 1.00,
        [COMMON_TOKENS.USDT]: 1.00,
        [COMMON_TOKENS.RAY]: 0.25,
        [COMMON_TOKENS.SRM]: 0.15,
      };

      tokenMints.forEach(mint => {
        prices.set(mint, mockPrices[mint] || 0);
      });

      return prices;
    } catch (error) {
      secureLogger.error('Failed to fetch token prices', error);
      return prices;
    }
  }

  // Get wallet balance including SOL and SPL tokens
  async getWalletBalance(walletAddress: string): Promise<WalletBalance> {
    try {
      // Guard against non-Solana addresses (e.g., Ethereum '0x' hex)
      if (walletAddress.startsWith('0x')) {
        secureLogger.warn('Ethereum address used for Solana balance; returning fallback.');
        throw new Error('Invalid Solana wallet address format');
      }

      // Use Helius RPC service for real blockchain data
      const heliusService = getHeliusService();
      const realBalance = await heliusService.getWalletBalance(walletAddress);
      
      secureLogger.info('Retrieved real wallet balance', {
        walletAddress: walletAddress.slice(0, 8) + '...',
        solBalance: realBalance.solBalance,
        tokenCount: realBalance.tokens.length,
        totalUsdValue: realBalance.totalUsdValue,
      });

      return realBalance;

    } catch (error) {
      secureLogger.warn('Failed to fetch wallet balance from Helius, using fallback');
      try {
        this.switchToNextRpc();
        const publicKey = new PublicKey(walletAddress);
        const lamports = await this.connection.getBalance(publicKey);
        const solAmount = lamports / LAMPORTS_PER_SOL;
        const solPrice = await this.getSolPrice();
        return {
          solBalance: solAmount,
          totalUsdValue: solAmount * solPrice,
          tokens: [],
          lastUpdated: new Date(),
        };
      } catch (fallbackError) {
        secureLogger.error('Fallback wallet balance fetch failed', fallbackError);
        throw new Error(`Failed to fetch wallet balance: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  // Get simplified token metadata
  private getTokenMetadata(mint: string): { symbol: string; name: string; logoURI?: string } {
    const knownTokens: Record<string, { symbol: string; name: string; logoURI?: string }> = {
      [COMMON_TOKENS.USDC]: {
        symbol: 'USDC',
        name: 'USD Coin',
        logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png'
      },
      [COMMON_TOKENS.USDT]: {
        symbol: 'USDT',
        name: 'Tether USD',
        logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.jpg'
      },
      [COMMON_TOKENS.RAY]: {
        symbol: 'RAY',
        name: 'Raydium',
        logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R/logo.png'
      },
    };

    return knownTokens[mint] || {
      symbol: 'UNKNOWN',
      name: 'Unknown Token',
    };
  }

  // Get recent transactions for a wallet
  async getWalletTransactions(walletAddress: string, limit: number = 10): Promise<Transaction[]> {
    try {
      // Guard against non-Solana addresses (e.g., Ethereum '0x' hex)
      if (walletAddress.startsWith('0x')) {
        secureLogger.warn('Ethereum address used for Solana transactions; returning fallback.');
        throw new Error('Invalid Solana wallet address format');
      }

      // Use Helius RPC service for real transaction data
      const heliusService = getHeliusService();
      const realTransactions = await heliusService.getTransactionHistory(walletAddress, limit);
      
      // Convert Helius transaction format to our format
      const transactions: Transaction[] = realTransactions.map(tx => ({
        signature: tx.signature,
        timestamp: tx.timestamp,
        type: tx.type,
        amount: tx.amount,
        symbol: tx.symbol,
        tokenSymbol: tx.tokenSymbol,
        usdValue: tx.usdValue,
        from: tx.from,
        to: tx.to,
        counterparty: tx.counterparty,
        status: tx.status,
      }));

      secureLogger.info('Retrieved real transaction history', {
        walletAddress: walletAddress.slice(0, 8) + '...',
        transactionCount: transactions.length,
      });

      return transactions;

    } catch (error) {
      secureLogger.warn('Failed to fetch wallet transactions from Helius, returning empty list');
      return [];
    }
  }

  // Get complete wallet portfolio
  async getWalletPortfolio(walletAddress: string): Promise<WalletPortfolio> {
    try {
      const [balance, transactions] = await Promise.all([
        this.getWalletBalance(walletAddress),
        this.getWalletTransactions(walletAddress),
      ]);

      // Use Helius service to get real performance data
      const heliusService = getHeliusService();
      const performance = await heliusService.getPortfolioPerformance(walletAddress);

      secureLogger.info('Retrieved real portfolio data', {
        walletAddress: walletAddress.slice(0, 8) + '...',
        totalValue: balance.totalUsdValue,
        transactionCount: transactions.length,
      });

      return {
        balance,
        transactions,
        performance,
      };
    } catch (error) {
      secureLogger.error('Failed to fetch wallet portfolio', error);
      
      // For mainnet, we should not fall back to mock data
      throw new Error(`Failed to fetch wallet portfolio: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Send transaction functionality using Solflare wallet
  async sendTransaction(
    fromWallet: string,
    toWallet: string,
    amount: number,
    tokenMint?: string,
    memo?: string
  ): Promise<{ signature: string; status: string }> {
    try {
      // Check if Solflare wallet is connected
      if (!solflareWalletService.isConnected()) {
        throw new Error('Solflare wallet is not connected. Please connect your wallet first.');
      }

      // Verify the fromWallet matches the connected wallet
      const connectedPublicKey = solflareWalletService.getPublicKey();
      if (!connectedPublicKey || connectedPublicKey.toString() !== fromWallet) {
        throw new Error('Transaction can only be sent from the connected wallet address.');
      }

      // For now, only support SOL transfers (token transfers can be added later)
      if (tokenMint && tokenMint !== 'So11111111111111111111111111111111111111112') {
        throw new Error('Token transfers are not yet supported. Only SOL transfers are currently available.');
      }

      // Validate recipient address
      if (!SolflareWalletService.isValidAddress(toWallet)) {
        throw new Error('Invalid recipient wallet address.');
      }

      // Validate amount
      if (amount <= 0) {
        throw new Error('Transaction amount must be greater than 0.');
      }

      // Check if sender has sufficient balance
      const currentBalance = solflareWalletService.getBalance();
      if (amount > currentBalance) {
        throw new Error(`Insufficient balance. Available: ${currentBalance} SOL, Required: ${amount} SOL`);
      }

      // Send transaction using Solflare wallet service
      const result = await solflareWalletService.sendTransaction({
        recipientAddress: toWallet,
        amount,
        memo
      });

      secureLogger.info('Transaction sent successfully', {
        signature: result.signature,
        from: fromWallet,
        to: toWallet,
        amount,
        success: result.success
      });

      return {
        signature: result.signature,
        status: result.success ? 'confirmed' : 'failed'
      };

    } catch (error) {
      secureLogger.error('Failed to send transaction', {
        error: error instanceof Error ? error.message : 'Unknown error',
        from: fromWallet,
        to: toWallet,
        amount
      });
      throw new Error(`Failed to send transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Monitor transaction confirmation
  async monitorTransaction(signature: string): Promise<{ status: string; confirmations: number }> {
    try {
      const heliusService = getHeliusService();
      const result = await heliusService.monitorTransaction(signature);
      
      secureLogger.info('Transaction status checked', {
        signature: signature.slice(0, 8) + '...',
        status: result.status,
        confirmations: result.confirmations,
      });
      
      return result;
    } catch (error) {
      secureLogger.error('Failed to monitor transaction', error);
      throw new Error(`Failed to monitor transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Solflare wallet integration methods
  
  /**
   * Get wallet portfolio using connected Solflare wallet
   */
  async getSolflareWalletPortfolio(): Promise<WalletPortfolio> {
    try {
      if (!solflareWalletService.isConnected()) {
        throw new Error('Solflare wallet is not connected');
      }

      const publicKey = solflareWalletService.getPublicKey();
      if (!publicKey) {
        throw new Error('No public key available from Solflare wallet');
      }

      // Get portfolio data for the connected wallet
      return await this.getWalletPortfolio(publicKey.toString());
    } catch (error) {
      secureLogger.error('Failed to get Solflare wallet portfolio', error);
      throw new Error(`Failed to get Solflare wallet portfolio: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get current Solflare wallet connection state
   */
  getSolflareConnectionState() {
    return {
      isConnected: solflareWalletService.isConnected(),
      publicKey: solflareWalletService.getPublicKey()?.toString() || null,
      balance: solflareWalletService.getBalance(),
      network: solflareWalletService.getNetwork()
    };
  }

  /**
   * Connect to Solflare wallet
   */
  async connectSolflareWallet() {
    try {
      const connectionState = await solflareWalletService.connect();
      secureLogger.info('Solflare wallet connected', {
        publicKey: connectionState.publicKey?.toString(),
        balance: connectionState.balance
      });
      return connectionState;
    } catch (error) {
      secureLogger.error('Failed to connect Solflare wallet', error);
      throw error;
    }
  }

  /**
   * Disconnect from Solflare wallet
   */
  async disconnectSolflareWallet() {
    try {
      await solflareWalletService.disconnect();
      secureLogger.info('Solflare wallet disconnected');
    } catch (error) {
      secureLogger.error('Failed to disconnect Solflare wallet', error);
      throw error;
    }
  }

  /**
   * Send SOL using connected Solflare wallet
   */
  async sendSolflareTransaction(
    toWallet: string,
    amount: number,
    memo?: string
  ): Promise<{ signature: string; status: string }> {
    try {
      if (!solflareWalletService.isConnected()) {
        throw new Error('Solflare wallet is not connected');
      }

      const publicKey = solflareWalletService.getPublicKey();
      if (!publicKey) {
        throw new Error('No public key available from Solflare wallet');
      }

      return await this.sendTransaction(
        publicKey.toString(),
        toWallet,
        amount,
        undefined, // tokenMint - SOL only for now
        memo
      );
    } catch (error) {
      secureLogger.error('Failed to send Solflare transaction', error);
      throw error;
    }
  }
}

// Export singleton instance
export const walletDataService = new WalletDataService();

// Utility functions
export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatTokenAmount = (amount: number, decimals: number = 6): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: decimals,
  }).format(amount);
};

export const formatAddress = (address: string): string => {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
};