/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Helius RPC Service for Mainnet Operations
 * Provides real blockchain data and transaction capabilities using Helius RPC endpoints
 */

import { Connection, PublicKey, LAMPORTS_PER_SOL, Transaction, SystemProgram, sendAndConfirmTransaction, Keypair } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { secureLogger } from './secure-logger';

export interface HeliusConfig {
  apiKey: string;
  cluster: 'mainnet-beta' | 'devnet' | 'testnet';
  rpcUrl?: string;
  webhookUrl?: string;
}

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

export interface TransactionData {
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
  blockTime?: number;
  slot?: number;
  fee?: number;
}

export interface SendTransactionParams {
  fromWallet: string;
  toWallet: string;
  amount: number;
  tokenMint?: string; // If undefined, sends SOL
  memo?: string;
}

export interface TransactionResult {
  signature: string;
  success: boolean;
  status: string;
  error?: string;
}

class HeliusRPCService {
  private connection: Connection;
  private config: HeliusConfig;
  private priceCache: Map<string, { price: number; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 60000; // 1 minute cache
  private cooldownUntil = 0;
  private fallbackRpcUrl: string | null = null;

  constructor(config: HeliusConfig) {
    this.config = config;
    
    // Construct Helius RPC URL
    const rpcUrl = config.rpcUrl || `https://rpc.helius.xyz/?api-key=${config.apiKey}`;
    
    this.connection = new Connection(rpcUrl, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 60000,
    });

    const envFallbacks = (process.env.NEXT_PUBLIC_SOLANA_RPC_FALLBACKS || '').split(',').map(s => s.trim()).filter(Boolean);
    this.fallbackRpcUrl = envFallbacks.length > 0 ? envFallbacks[0] : 'https://api.mainnet-beta.solana.org';

    secureLogger.info('Helius RPC Service initialized', {
      cluster: config.cluster,
      hasApiKey: !!config.apiKey,
    });
  }

  /**
   * Get real-time wallet balance including SOL and SPL tokens
   */
  async getWalletBalance(walletAddress: string): Promise<WalletBalance> {
    try {
      const publicKey = new PublicKey(walletAddress);
      
      // Get SOL balance
      if (Date.now() < this.cooldownUntil && this.fallbackRpcUrl) {
        this.connection = new Connection(this.fallbackRpcUrl, { commitment: 'confirmed' });
      }
      let solBalance: number;
      try {
        solBalance = await this.connection.getBalance(publicKey);
      } catch (e: any) {
        const msg = e && e.message ? String(e.message) : '';
        const isRateLimited = msg.includes('429') || msg.includes('max usage') || msg.includes('-32429');
        if (isRateLimited && this.fallbackRpcUrl) {
          this.cooldownUntil = Date.now() + 5 * 60 * 1000;
          this.connection = new Connection(this.fallbackRpcUrl, { commitment: 'confirmed' });
          solBalance = await this.connection.getBalance(publicKey);
        } else {
          throw e;
        }
      }
      const solAmount = solBalance / LAMPORTS_PER_SOL;
      
      // Get SOL price
      const solPrice = await this.getTokenPrice('SOL');
      
      // Get SPL token accounts using Helius enhanced API
      const tokenAccounts = await this.getEnhancedTokenAccounts(walletAddress);
      
      const tokens: TokenBalance[] = [];
      let totalUsdValue = solAmount * solPrice;

      // Process token accounts with metadata
      for (const tokenAccount of tokenAccounts) {
        if (tokenAccount.amount > 0) {
          const tokenPrice = await this.getTokenPrice(tokenAccount.mint);
          const usdValue = tokenAccount.amount * tokenPrice;
          
          tokens.push({
            mint: tokenAccount.mint,
            symbol: tokenAccount.symbol || 'UNKNOWN',
            name: tokenAccount.name || 'Unknown Token',
            balance: tokenAccount.amount * Math.pow(10, tokenAccount.decimals),
            decimals: tokenAccount.decimals,
            uiAmount: tokenAccount.amount,
            usdValue,
            logoURI: tokenAccount.logoURI,
          });
          
          totalUsdValue += usdValue;
        }
      }

      return {
        solBalance: solAmount,
        totalUsdValue,
        tokens,
        lastUpdated: new Date(),
      };

    } catch (error) {
      secureLogger.error('Failed to get wallet balance', { error, walletAddress });
      throw new Error(`Failed to fetch wallet balance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get enhanced token accounts using Helius API
   */
  private async getEnhancedTokenAccounts(walletAddress: string) {
    try {
      const response = await fetch(`https://api.helius.xyz/v0/addresses/${walletAddress}/balances?api-key=${this.config.apiKey}`);
      
      if (!response.ok) {
        throw new Error(`Helius API error: ${response.status}`);
      }
      
      const data = await response.json();
      return data.tokens || [];
      
    } catch (error) {
      secureLogger.warn('Failed to get enhanced token accounts, falling back to standard RPC', { error });
      
      // Fallback to standard RPC
      const publicKey = new PublicKey(walletAddress);
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
        publicKey,
        { programId: TOKEN_PROGRAM_ID }
      );

      return tokenAccounts.value.map(account => {
        const tokenInfo = account.account.data.parsed.info;
        return {
          mint: tokenInfo.mint,
          amount: tokenInfo.tokenAmount.uiAmount || 0,
          decimals: tokenInfo.tokenAmount.decimals,
          symbol: null,
          name: null,
          logoURI: null,
        };
      });
    }
  }

  /**
   * Get transaction history for a wallet
   */
  async getTransactionHistory(walletAddress: string, limit: number = 50): Promise<TransactionData[]> {
    try {
      const publicKey = new PublicKey(walletAddress);
      
      // Get transaction signatures
      if (Date.now() < this.cooldownUntil && this.fallbackRpcUrl) {
        this.connection = new Connection(this.fallbackRpcUrl, { commitment: 'confirmed' });
      }
      let signatures;
      try {
        signatures = await this.connection.getSignaturesForAddress(publicKey, { limit });
      } catch (e: any) {
        const msg = e && e.message ? String(e.message) : '';
        const isRateLimited = msg.includes('429') || msg.includes('max usage') || msg.includes('-32429');
        if (isRateLimited && this.fallbackRpcUrl) {
          this.cooldownUntil = Date.now() + 5 * 60 * 1000;
          this.connection = new Connection(this.fallbackRpcUrl, { commitment: 'confirmed' });
          signatures = await this.connection.getSignaturesForAddress(publicKey, { limit });
        } else {
          throw e;
        }
      }
      
      const transactions: TransactionData[] = [];
      
      // Process transactions in batches to avoid rate limits
      const batchSize = 10;
      for (let i = 0; i < signatures.length; i += batchSize) {
        const batch = signatures.slice(i, i + batchSize);
        const batchPromises = batch.map(sig => this.parseTransaction(sig.signature, walletAddress));
        const batchResults = await Promise.allSettled(batchPromises);
        
        batchResults.forEach(result => {
          if (result.status === 'fulfilled' && result.value) {
            transactions.push(result.value);
          }
        });
      }
      
      return transactions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
    } catch (error) {
      secureLogger.error('Failed to get transaction history', { error, walletAddress });
      throw new Error(`Failed to fetch transaction history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse individual transaction
   */
  private async parseTransaction(signature: string, walletAddress: string): Promise<TransactionData | null> {
    try {
      const transaction = await this.connection.getParsedTransaction(signature, {
        maxSupportedTransactionVersion: 0,
      });
      
      if (!transaction || !transaction.blockTime) {
        return null;
      }

      const publicKey = new PublicKey(walletAddress);
      const accountKeys = transaction.transaction.message.accountKeys;
      
      // Determine transaction type and amount
      let type: TransactionData['type'] = 'send';
      let amount = 0;
      const symbol = 'SOL';
      let counterparty = '';
      
      // Check if this is a receive transaction
      const isReceive = transaction.meta?.postBalances && transaction.meta?.preBalances &&
        accountKeys.some((key, index) => 
          key.pubkey.equals(publicKey) && 
          (transaction.meta!.postBalances![index] > transaction.meta!.preBalances![index])
        );
      
      if (isReceive) {
        type = 'receive';
      }
      
      // Calculate SOL amount change
      const accountIndex = accountKeys.findIndex(key => key.pubkey.equals(publicKey));
      if (accountIndex !== -1 && transaction.meta?.postBalances && transaction.meta?.preBalances) {
        const preBalance = transaction.meta.preBalances[accountIndex];
        const postBalance = transaction.meta.postBalances[accountIndex];
        amount = Math.abs(postBalance - preBalance) / LAMPORTS_PER_SOL;
      }
      
      // Get counterparty (simplified)
      if (accountKeys.length > 1) {
        const otherAccount = accountKeys.find(key => !key.pubkey.equals(publicKey));
        if (otherAccount) {
          counterparty = otherAccount.pubkey.toString();
        }
      }
      
      const solPrice = await this.getTokenPrice('SOL');
      
      return {
        signature,
        timestamp: new Date(transaction.blockTime * 1000),
        type,
        amount,
        symbol,
        usdValue: amount * solPrice,
        from: type === 'send' ? walletAddress : counterparty,
        to: type === 'send' ? counterparty : walletAddress,
        counterparty,
        status: 'confirmed',
        blockTime: transaction.blockTime,
        slot: transaction.slot,
        fee: transaction.meta?.fee ? transaction.meta.fee / LAMPORTS_PER_SOL : undefined,
      };
      
    } catch (error) {
      secureLogger.warn('Failed to parse transaction', { error, signature });
      return null;
    }
  }

  /**
   * Send SOL or SPL tokens
   */
  async sendTransaction(params: SendTransactionParams, senderKeypair: Keypair): Promise<TransactionResult> {
    try {
      const fromPubkey = new PublicKey(params.fromWallet);
      const toPubkey = new PublicKey(params.toWallet);
      
      let transaction: Transaction;
      
      if (params.tokenMint) {
        // SPL Token transfer
        transaction = await this.createTokenTransferTransaction(
          fromPubkey,
          toPubkey,
          params.amount,
          params.tokenMint
        );
      } else {
        // SOL transfer
        transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey,
            toPubkey,
            lamports: params.amount * LAMPORTS_PER_SOL,
          })
        );
      }
      
      // Add memo if provided
      if (params.memo) {
        // Note: Memo program would be added here in a full implementation
      }
      
      // Send and confirm transaction
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [senderKeypair],
        {
          commitment: 'confirmed',
          preflightCommitment: 'confirmed',
        }
      );
      
      secureLogger.info('Transaction sent successfully', {
        signature,
        from: params.fromWallet,
        to: params.toWallet,
        amount: params.amount,
        tokenMint: params.tokenMint,
      });
      
      return {
        signature,
        success: true,
        status: 'confirmed',
      };
      
    } catch (error) {
      secureLogger.error('Failed to send transaction', { error, params });
      return {
        signature: '',
        success: false,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Create SPL token transfer transaction
   */
  private async createTokenTransferTransaction(
    fromPubkey: PublicKey,
    toPubkey: PublicKey,
    amount: number,
    tokenMint: string
  ): Promise<Transaction> {
    // const mintPubkey = new PublicKey(tokenMint);
    
    // Get or create associated token accounts
    // const fromTokenAccount = await getAssociatedTokenAddress(mintPubkey, fromPubkey);
    // const toTokenAccount = await getAssociatedTokenAddress(mintPubkey, toPubkey);
    
    // This would need to be implemented with proper SPL token transfer instructions
    // For now, returning a basic transaction structure
    const transaction = new Transaction();
    
    // Add token transfer instruction here
    // This is a simplified version - full implementation would use @solana/spl-token
    
    return transaction;
  }

  /**
   * Get token price from various sources
   */
  private async getTokenPrice(tokenSymbol: string): Promise<number> {
    const cacheKey = tokenSymbol.toLowerCase();
    const cached = this.priceCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.price;
    }
    
    try {
      const coingeckoPrice = await this.getCoinGeckoPrice(tokenSymbol);
      if (coingeckoPrice > 0) {
        this.priceCache.set(cacheKey, { price: coingeckoPrice, timestamp: Date.now() });
        return coingeckoPrice;
      }

      const jupiterPrice = await this.getJupiterPrice(tokenSymbol);
      this.priceCache.set(cacheKey, { price: jupiterPrice, timestamp: Date.now() });
      return jupiterPrice;
      
    } catch (error) {
      secureLogger.warn('Failed to get token price', { error, tokenSymbol });
      return 0;
    }
  }

  private async getJupiterPrice(tokenSymbol: string): Promise<number> {
    try {
      const response = await fetch(`https://price.jup.ag/v4/price?ids=${tokenSymbol}`);
      const data = await response.json();
      return data.data?.[tokenSymbol]?.price || 0;
    } catch {
      return 0;
    }
  }

  private async getCoinGeckoPrice(tokenSymbol: string): Promise<number> {
    try {
      const coinId = this.getCoinGeckoId(tokenSymbol);
      const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`);
      const data = await response.json();
      return data[coinId]?.usd || 0;
    } catch {
      return 0;
    }
  }

  private getCoinGeckoId(symbol: string): string {
    const symbolMap: Record<string, string> = {
      'SOL': 'solana',
      'USDC': 'usd-coin',
      'USDT': 'tether',
      'BTC': 'bitcoin',
      'ETH': 'ethereum',
    };
    return symbolMap[symbol.toUpperCase()] || symbol.toLowerCase();
  }

  /**
   * Monitor transaction confirmation
   */
  async monitorTransaction(signature: string): Promise<{ status: string; confirmations: number }> {
    try {
      const confirmation = await this.connection.confirmTransaction(signature, 'confirmed');
      
      if (confirmation.value.err) {
        return {
          status: 'failed',
          confirmations: 0,
        };
      }
      
      // Get transaction details to determine confirmation count
      const transaction = await this.connection.getTransaction(signature, {
        maxSupportedTransactionVersion: 0,
      });
      
      const currentSlot = await this.connection.getSlot();
      const confirmations = transaction?.slot ? Math.max(0, currentSlot - transaction.slot) : 0;
      
      return { 
        status: 'confirmed',
        confirmations,
      };
      
    } catch (error) {
      return {
        status: 'failed',
        confirmations: 0,
      };
    }
  }

  /**
   * Get portfolio performance data
   */
  async getPortfolioPerformance(walletAddress: string): Promise<{
    dayChange: number;
    dayChangePercent: number;
    weekChange: number;
    weekChangePercent: number;
  }> {
    try {
      // For now, return mock performance data
      // In a full implementation, this would calculate actual performance
      // based on historical balance and transaction data
      
      secureLogger.info('Getting portfolio performance', {
        walletAddress: walletAddress.slice(0, 8) + '...',
      });

      // Mock performance data - in production this would be calculated
      // from historical balance data and transaction history
      return {
        dayChange: Math.random() * 200 - 100, // Random change between -100 and +100
        dayChangePercent: Math.random() * 20 - 10, // Random percentage between -10% and +10%
        weekChange: Math.random() * 500 - 250, // Random change between -250 and +250
        weekChangePercent: Math.random() * 30 - 15, // Random percentage between -15% and +15%
      };
    } catch (error) {
      secureLogger.error('Failed to get portfolio performance', { error, walletAddress });
      throw new Error(`Failed to get portfolio performance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get connection health
   */
  async getConnectionHealth(): Promise<{ healthy: boolean; latency?: number }> {
    try {
      const start = Date.now();
      await this.connection.getSlot();
      const latency = Date.now() - start;
      
      return { healthy: true, latency };
    } catch (error) {
      secureLogger.error('Connection health check failed', { error });
      return { healthy: false };
    }
  }
}

// Export singleton instance
let heliusService: HeliusRPCService | null = null;

export const getHeliusService = (): HeliusRPCService => {
  if (!heliusService) {
    const apiKey = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
    if (!apiKey) {
      throw new Error('NEXT_PUBLIC_HELIUS_API_KEY is required for mainnet operations');
    }
    
    heliusService = new HeliusRPCService({
      apiKey,
      cluster: 'mainnet-beta',
    });
  }
  
  return heliusService;
};

export default HeliusRPCService;