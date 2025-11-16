/* eslint-disable @typescript-eslint/no-explicit-any */
import { secureLogger } from './secure-logger';

export interface HeliusTransaction {
  signature: string;
  slot: number;
  timestamp: number;
  tokenTransfers: Array<{
    fromTokenAccount: string;
    toTokenAccount: string;
    fromUserAccount: string;
    toUserAccount: string;
    tokenAmount: number;
    mint: string;
    tokenStandard: string;
  }>;
  nativeTransfers: Array<{
    fromUserAccount: string;
    toUserAccount: string;
    amount: number;
  }>;
  accountData: Array<{
    account: string;
    nativeBalanceChange: number;
    tokenBalanceChanges: Array<{
      userAccount: string;
      tokenAccount: string;
      rawTokenAmount: {
        tokenAmount: string;
        decimals: number;
      };
      mint: string;
    }>;
  }>;
  transactionError: string | null;
  instructions: Array<{
    accounts: string[];
    data: string;
    programId: string;
    innerInstructions: Array<{
      accounts: string[];
      data: string;
      programId: string;
    }>;
  }>;
  events: {
    nft?: any;
    swap?: any;
    compressed?: any;
  };
}

export interface ProcessedTransaction {
  signature: string;
  timestamp: Date;
  type: 'send' | 'receive' | 'swap' | 'nft' | 'unknown';
  amount: number;
  symbol: string;
  tokenSymbol?: string;
  usdValue?: number;
  from: string;
  to: string;
  counterparty: string;
  status: 'confirmed' | 'failed';
  fee?: number;
  mint?: string;
  description: string;
}

class HeliusTransactionService {
  private readonly apiKey = process.env.NEXT_PUBLIC_HELIUS_API_KEY || '';
  private readonly baseUrl = 'https://api.helius.xyz/v0';
  private cooldownUntil = 0;
  private readonly CACHE_MS = 15000;
  private cache = new Map<string, { data: ProcessedTransaction[]; ts: number }>();

  /**
   * Fetch transaction history for a wallet address
   */
  async getTransactionHistory(
    address: string, 
    limit: number = 50,
    before?: string
  ): Promise<ProcessedTransaction[]> {
    try {
      if (!this.apiKey) {
        throw new Error('Missing Helius API key');
      }

      const now = Date.now();
      if (now < this.cooldownUntil) {
        secureLogger.warn('Helius rate limit cooldown active, skipping request', {
          address: address.slice(0, 8) + '...',
          retryAt: new Date(this.cooldownUntil).toISOString()
        });
        const cacheKey = `${address}|${limit}|${before || ''}`;
        const cached = this.cache.get(cacheKey);
        return cached?.data || [];
      }

      const url = new URL(`${this.baseUrl}/addresses/${address}/transactions/`);
      url.searchParams.append('api-key', this.apiKey);
      url.searchParams.append('limit', limit.toString());
      
      if (before) {
        url.searchParams.append('before', before);
      }

      secureLogger.info('Fetching transaction history from Helius', {
        address: address.slice(0, 8) + '...',
        limit,
        before
      });

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After') || '30', 10);
          const backoffMs = Math.max(1000, retryAfter * 1000);
          this.cooldownUntil = Date.now() + backoffMs;
          secureLogger.warn('Helius API rate limited', {
            address: address.slice(0, 8) + '...',
            retryAfterSeconds: retryAfter
          });
          throw new Error(`Helius API error: 429`);
        }
        throw new Error(`Helius API error: ${response.status} ${response.statusText}`);
      }

      const transactions: HeliusTransaction[] = await response.json();
      
      secureLogger.info('Successfully fetched transactions from Helius', {
        address: address.slice(0, 8) + '...',
        count: transactions.length
      });

      const processed = transactions.map(tx => this.processTransaction(tx, address));
      const cacheKey = `${address}|${limit}|${before || ''}`;
      this.cache.set(cacheKey, { data: processed, ts: Date.now() });
      return processed;

    } catch (error) {
      secureLogger.error('Failed to fetch transaction history from Helius', {
        error: error instanceof Error ? error.message : 'Unknown error',
        address: address.slice(0, 8) + '...'
      });
      throw error;
    }
  }

  /**
   * Process raw Helius transaction into our format
   */
  private processTransaction(tx: HeliusTransaction, userAddress: string): ProcessedTransaction {
    const timestamp = new Date(tx.timestamp * 1000);
    const status = tx.transactionError ? 'failed' : 'confirmed';
    
    // Find the user's account data
    const userAccountData = tx.accountData.find(acc => acc.account === userAddress);
    
    // Determine transaction type and details
    let type: ProcessedTransaction['type'] = 'unknown';
    let amount = 0;
    let symbol = 'SOL';
    let from = '';
    let to = '';
    let counterparty = '';
    let description = 'Transaction';
    let mint: string | undefined;

    // Check for SOL transfers
    if (tx.nativeTransfers.length > 0) {
      const nativeTransfer = tx.nativeTransfers[0];
      amount = nativeTransfer.amount / 1e9; // Convert lamports to SOL
      from = nativeTransfer.fromUserAccount;
      to = nativeTransfer.toUserAccount;
      
      if (nativeTransfer.fromUserAccount === userAddress) {
        type = 'send';
        counterparty = to;
        amount = -Math.abs(amount); // Negative for outgoing
        description = `Sent ${Math.abs(amount).toFixed(4)} SOL`;
      } else if (nativeTransfer.toUserAccount === userAddress) {
        type = 'receive';
        counterparty = from;
        amount = Math.abs(amount); // Positive for incoming
        description = `Received ${amount.toFixed(4)} SOL`;
      }
    }

    // Check for token transfers
    if (tx.tokenTransfers.length > 0) {
      const tokenTransfer = tx.tokenTransfers[0];
      mint = tokenTransfer.mint;
      
      // Try to get token symbol from mint (simplified)
      symbol = this.getTokenSymbolFromMint(tokenTransfer.mint);
      
      const tokenAmount = tokenTransfer.tokenAmount;
      amount = tokenAmount;
      from = tokenTransfer.fromUserAccount;
      to = tokenTransfer.toUserAccount;
      
      if (tokenTransfer.fromUserAccount === userAddress) {
        type = 'send';
        counterparty = to;
        amount = -Math.abs(amount);
        description = `Sent ${Math.abs(amount)} ${symbol}`;
      } else if (tokenTransfer.toUserAccount === userAddress) {
        type = 'receive';
        counterparty = from;
        amount = Math.abs(amount);
        description = `Received ${amount} ${symbol}`;
      }
    }

    // Check for swaps
    if (tx.events.swap) {
      type = 'swap';
      description = 'Token Swap';
    }

    // Check for NFT transactions
    if (tx.events.nft) {
      type = 'nft';
      description = 'NFT Transaction';
    }

    // Use native balance change as fallback
    if (amount === 0 && userAccountData?.nativeBalanceChange) {
      amount = userAccountData.nativeBalanceChange / 1e9;
      type = amount > 0 ? 'receive' : 'send';
      description = amount > 0 ? 
        `Received ${amount.toFixed(4)} SOL` : 
        `Sent ${Math.abs(amount).toFixed(4)} SOL`;
    }

    return {
      signature: tx.signature,
      timestamp,
      type,
      amount,
      symbol,
      tokenSymbol: symbol !== 'SOL' ? symbol : undefined,
      from,
      to,
      counterparty,
      status,
      mint,
      description
    };
  }

  /**
   * Get token symbol from mint address (simplified mapping)
   */
  private getTokenSymbolFromMint(mint: string): string {
    const knownTokens: Record<string, string> = {
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC',
      'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'USDT',
      'So11111111111111111111111111111111111111112': 'SOL',
      'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': 'mSOL',
      'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': 'BONK',
      '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs': 'ETH',
    };
    
    return knownTokens[mint] || mint.slice(0, 8) + '...';
  }

  /**
   * Get real-time transaction updates (polling-based)
   */
  async getLatestTransactions(
    address: string, 
    lastSignature?: string
  ): Promise<ProcessedTransaction[]> {
    try {
      const transactions = await this.getTransactionHistory(address, 10);
      
      if (lastSignature) {
        const lastIndex = transactions.findIndex(tx => tx.signature === lastSignature);
        return lastIndex > 0 ? transactions.slice(0, lastIndex) : [];
      }
      
      return transactions;
    } catch (error) {
      secureLogger.error('Failed to get latest transactions', {
        error: error instanceof Error ? error.message : 'Unknown error',
        address: address.slice(0, 8) + '...'
      });
      return [];
    }
  }
}

export const heliusTransactionService = new HeliusTransactionService();