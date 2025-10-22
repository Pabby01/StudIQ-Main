import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { secureLogger, secureLogUtils } from './secure-logger';
import type { ParsedTransactionWithMeta } from '@solana/web3.js';

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

// Solana connection configuration
const SOLANA_RPC_ENDPOINTS = [
  'https://api.mainnet-beta.solana.com',
  'https://solana-api.projectserum.com',
  'https://rpc.ankr.com/solana',
];

// Token price API endpoints
const PRICE_API_ENDPOINTS = {
  coingecko: 'https://api.coingecko.com/api/v3',
  jupiter: 'https://price.jup.ag/v4/price',
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

  constructor() {
    // Initialize with the first RPC endpoint, fallback to others if needed
    this.connection = new Connection(SOLANA_RPC_ENDPOINTS[0], 'confirmed');
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
        `${PRICE_API_ENDPOINTS.coingecko}/simple/price?ids=solana&vs_currencies=usd`
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
        return this.getMockWalletBalance();
      }
      const publicKey = new PublicKey(walletAddress);
      
      // Get SOL balance
      const solBalance = await this.connection.getBalance(publicKey);
      const solAmount = solBalance / LAMPORTS_PER_SOL;
      
      // Get SOL price
      const solPrice = await this.getSolPrice();
      
      // Get SPL token accounts
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
        publicKey,
        { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
      );

      const tokens: TokenBalance[] = [];
      const tokenMints: string[] = [];

      // Process token accounts
      for (const account of tokenAccounts.value) {
        const tokenInfo = account.account.data.parsed.info;
        const mint = tokenInfo.mint;
        const balance = tokenInfo.tokenAmount.uiAmount || 0;
        
        if (balance > 0) {
          tokenMints.push(mint);
          
          // Get token metadata (simplified - in production use Metaplex or similar)
          const tokenData = this.getTokenMetadata(mint);
          
          tokens.push({
            mint,
            symbol: tokenData.symbol,
            name: tokenData.name,
            balance: tokenInfo.tokenAmount.amount,
            decimals: tokenInfo.tokenAmount.decimals,
            uiAmount: balance,
            usdValue: 0, // Will be calculated after getting prices
            logoURI: tokenData.logoURI,
          });
        }
      }

      // Get token prices and calculate USD values
      const tokenPrices = await this.getTokenPrices(tokenMints);
      
      tokens.forEach(token => {
        const price = tokenPrices.get(token.mint) || 0;
        token.usdValue = token.uiAmount * price;
      });

      const totalTokenValue = tokens.reduce((sum, token) => sum + token.usdValue, 0);
      const totalUsdValue = (solAmount * solPrice) + totalTokenValue;

      return {
        solBalance: solAmount,
        totalUsdValue,
        tokens,
        lastUpdated: new Date(),
      };
    } catch (error) {
      secureLogger.error('Failed to fetch wallet balance', error);
      
      // Return mock data as fallback
      return this.getMockWalletBalance();
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
        return this.getMockTransactions();
      }
      const publicKey = new PublicKey(walletAddress);
      
      // Get recent transaction signatures
      const signatures = await this.connection.getSignaturesForAddress(
        publicKey,
        { limit }
      );

      const transactions: Transaction[] = [];

      // Process each transaction (simplified)
      for (const sig of signatures.slice(0, 5)) { // Limit to 5 for performance
        try {
          const tx = await this.connection.getParsedTransaction(sig.signature);
          
          if (tx && tx.meta && !tx.meta.err) {
            const transaction = this.parseTransaction(tx);
            if (transaction) {
              transactions.push(transaction);
            }
          }
        } catch (error) {
          secureLogger.error('Failed to parse transaction', error);
        }
      }

      return transactions;
    } catch (error) {
      secureLogger.error('Failed to fetch wallet transactions', error);
      return this.getMockTransactions();
    }
  }

  // Parse transaction data (simplified)
  private parseTransaction(tx: ParsedTransactionWithMeta): Transaction | null {
    try {
      const signature = tx.transaction.signatures[0];
      const blockTimeSec = tx.blockTime ?? Math.floor(Date.now() / 1000);
      const timestamp = new Date(blockTimeSec * 1000);
      
      // Simplified transaction parsing
      // In production, you'd need more sophisticated parsing
      const preBalance = tx.meta?.preBalances?.[0] ?? 0;
      const postBalance = tx.meta?.postBalances?.[0] ?? 0;
      const balanceChange = (postBalance - preBalance) / LAMPORTS_PER_SOL;
      
      return {
        signature,
        timestamp,
        type: balanceChange > 0 ? 'receive' : 'send',
        amount: Math.abs(balanceChange),
        symbol: 'SOL',
        usdValue: 0, // Would calculate based on SOL price at transaction time
        status: 'confirmed',
      };
    } catch (error) {
      secureLogger.error('Failed to parse transaction', error);
      return null;
    }
  }

  // Get complete wallet portfolio
  async getWalletPortfolio(walletAddress: string): Promise<WalletPortfolio> {
    try {
      const [balance, transactions] = await Promise.all([
        this.getWalletBalance(walletAddress),
        this.getWalletTransactions(walletAddress),
      ]);

      // Calculate performance (mock data for now)
      const performance = {
        dayChange: 12.45,
        dayChangePercent: 5.2,
        weekChange: -8.32,
        weekChangePercent: -3.1,
      };

      return {
        balance,
        transactions,
        performance,
      };
    } catch (error) {
      secureLogger.error('Failed to fetch wallet portfolio', error);
      return this.getMockPortfolio();
    }
  }

  // Fallback mock data
  private getMockWalletBalance(): WalletBalance {
    return {
      solBalance: 2.45,
      totalUsdValue: 245.32,
      tokens: [
        {
          mint: COMMON_TOKENS.USDC,
          symbol: 'USDC',
          name: 'USD Coin',
          balance: 156780000,
          decimals: 6,
          uiAmount: 156.78,
          usdValue: 156.78,
        },
      ],
      lastUpdated: new Date(),
    };
  }

  private getMockTransactions(): Transaction[] {
    return [
      {
        signature: '5j7s8K9mN2pQ3rT4uV5wX6yZ7a8B9c0D1e2F3g4H5i6J7k8L9m0N1o2P3q4R5s6T',
        timestamp: new Date(Date.now() - 3600000), // 1 hour ago
        type: 'receive',
        amount: 0.5,
        symbol: 'SOL',
        usdValue: 45.50,
        status: 'confirmed',
      },
      {
        signature: '2a3B4c5D6e7F8g9H0i1J2k3L4m5N6o7P8q9R0s1T2u3V4w5X6y7Z8a9B0c1D2e3F',
        timestamp: new Date(Date.now() - 7200000), // 2 hours ago
        type: 'send',
        amount: 50.0,
        symbol: 'USDC',
        usdValue: 50.0,
        status: 'confirmed',
      },
    ];
  }

  private getMockPortfolio(): WalletPortfolio {
    return {
      balance: this.getMockWalletBalance(),
      transactions: this.getMockTransactions(),
      performance: {
        dayChange: 12.45,
        dayChangePercent: 5.2,
        weekChange: -8.32,
        weekChangePercent: -3.1,
      },
    };
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