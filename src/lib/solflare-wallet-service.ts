/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import Solflare from '@solflare-wallet/sdk';
import { 
  Connection, 
  PublicKey, 
  Transaction, 
  VersionedTransaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  SendOptions,
  TransactionSignature,
  Commitment,
  Cluster
} from '@solana/web3.js';
import { EventEmitter } from 'events';
import { solflareErrorHandler, SolflareError, UnknownError } from './solflare-error-handler';

// Types for wallet operations
export interface WalletConnectionState {
  isConnected: boolean;
  publicKey: PublicKey | null;
  balance: number;
  network: string;
}

export interface TransactionResult {
  signature: string;
  success: boolean;
  error?: string;
}

export interface SendTransactionParams {
  recipientAddress: string;
  amount: number; // in SOL
  memo?: string;
}

export interface SolflareWalletError extends Error {
  code?: string;
  details?: any;
}

// Custom error classes for better error handling
export class WalletConnectionError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'WalletConnectionError';
  }
}

export class TransactionError extends Error {
  constructor(message: string, public code?: string, public details?: any) {
    super(message);
    this.name = 'TransactionError';
  }
}

export class NetworkError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

/**
 * Comprehensive Solflare Wallet Service
 * Handles wallet connection, transaction processing, and error management
 */
export class SolflareWalletService extends EventEmitter {
  private wallet: Solflare | null = null;
  private connection: Connection;
  private isInitialized = false;
  private connectionState: WalletConnectionState = {
    isConnected: false,
    publicKey: null,
    balance: 0,
    network: 'mainnet-beta'
  };

  constructor(rpcEndpoint?: string, network: string = 'mainnet-beta') {
    super();
    
    // Use provided RPC endpoint or default to public endpoints
    const defaultEndpoint = network === 'devnet' 
      ? 'https://api.devnet.solana.com'
      : 'https://api.mainnet-beta.solana.com';
    
    this.connection = new Connection(rpcEndpoint || defaultEndpoint, 'confirmed');
    this.connectionState.network = network;
    
    this.initializeWallet();
  }

  /**
   * Initialize the Solflare wallet instance
   */
  private initializeWallet(): void {
    try {
      this.wallet = new Solflare({ network: this.connectionState.network as Cluster });
      
      // Set up event listeners
      this.wallet.on('connect', this.handleWalletConnect.bind(this));
      this.wallet.on('disconnect', this.handleWalletDisconnect.bind(this));
      
      this.isInitialized = true;
      this.emit('initialized');
    } catch (error) {
      const walletError = new WalletConnectionError(
        `Failed to initialize Solflare wallet: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'INIT_FAILED'
      );
      this.emit('error', walletError);
      throw walletError;
    }
  }

  /**
   * Handle wallet connection event
   */
  private async handleWalletConnect(): Promise<void> {
    try {
      if (!this.wallet?.publicKey) {
        throw new WalletConnectionError('Wallet connected but no public key available', 'NO_PUBLIC_KEY');
      }

      this.connectionState.isConnected = true;
      this.connectionState.publicKey = this.wallet.publicKey;
      
      // Fetch initial balance
      await this.updateBalance();
      
      this.emit('connect', this.connectionState);
      console.log('Solflare wallet connected:', this.wallet.publicKey.toString());
    } catch (error) {
      const connectionError = new WalletConnectionError(
        `Failed to handle wallet connection: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CONNECT_HANDLER_FAILED'
      );
      this.emit('error', connectionError);
    }
  }

  /**
   * Handle wallet disconnection event
   */
  private handleWalletDisconnect(): void {
    this.connectionState.isConnected = false;
    this.connectionState.publicKey = null;
    this.connectionState.balance = 0;
    
    this.emit('disconnect', this.connectionState);
    console.log('Solflare wallet disconnected');
  }

  /**
   * Connect to the Solflare wallet
   */
  async connect(): Promise<WalletConnectionState> {
    if (!this.isInitialized || !this.wallet) {
      const error = solflareErrorHandler.parseError(new Error('Wallet not initialized'));
      this.emit('error', error);
      throw new WalletConnectionError(error.userMessage, 'NOT_INITIALIZED');
    }

    if (this.connectionState.isConnected) {
      return this.connectionState;
    }

    try {
      await this.wallet.connect();
      return this.connectionState;
    } catch (error) {
      const parsedError = solflareErrorHandler.parseError(error as UnknownError);
      this.emit('error', parsedError);
      throw new WalletConnectionError(parsedError.userMessage, parsedError.type);
    }
  }

  /**
   * Disconnect from the Solflare wallet
   */
  async disconnect(): Promise<void> {
    if (!this.wallet) {
      return;
    }

    try {
      await this.wallet.disconnect();
    } catch (error) {
      const disconnectionError = new WalletConnectionError(
        `Failed to disconnect from Solflare wallet: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DISCONNECTION_FAILED'
      );
      this.emit('error', disconnectionError);
      throw disconnectionError;
    }
  }

  /**
   * Update wallet balance
   */
  async updateBalance(): Promise<number> {
    if (!this.connectionState.publicKey) {
      throw new WalletConnectionError('Wallet not connected', 'NOT_CONNECTED');
    }

    try {
      const balance = await this.connection.getBalance(this.connectionState.publicKey);
      this.connectionState.balance = balance / LAMPORTS_PER_SOL;
      this.emit('balanceUpdated', this.connectionState.balance);
      return this.connectionState.balance;
    } catch (error) {
      const networkError = new NetworkError(
        `Failed to fetch balance: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'BALANCE_FETCH_FAILED'
      );
      this.emit('error', networkError);
      throw networkError;
    }
  }

  /**
   * Send SOL transaction
   */
  async sendTransaction(params: SendTransactionParams): Promise<TransactionResult> {
    if (!this.wallet || !this.connectionState.isConnected || !this.connectionState.publicKey) {
      throw new WalletConnectionError('Wallet not connected', 'NOT_CONNECTED');
    }

    try {
      // Validate recipient address
      let recipientPubkey: PublicKey;
      try {
        recipientPubkey = new PublicKey(params.recipientAddress);
      } catch {
        throw new TransactionError('Invalid recipient address', 'INVALID_RECIPIENT');
      }

      // Validate amount
      if (params.amount <= 0) {
        throw new TransactionError('Amount must be greater than 0', 'INVALID_AMOUNT');
      }

      if (params.amount > this.connectionState.balance) {
        throw new TransactionError('Insufficient balance', 'INSUFFICIENT_BALANCE');
      }

      // Create transaction
      const transaction = new Transaction();
      
      // Add transfer instruction
      const transferInstruction = SystemProgram.transfer({
        fromPubkey: this.connectionState.publicKey,
        toPubkey: recipientPubkey,
        lamports: params.amount * LAMPORTS_PER_SOL,
      });
      
      transaction.add(transferInstruction);

      // Add memo if provided
      if (params.memo) {
        const { createMemoInstruction } = await import('@solana/spl-memo');
        const memoInstruction = createMemoInstruction(
          params.memo,
          [this.connectionState.publicKey!]
        );
        transaction.add(memoInstruction);
      }

      // Get recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = this.connectionState.publicKey;

      // Sign and send transaction
      const signature = await this.wallet.signAndSendTransaction(transaction);
      
      // Wait for confirmation
      await this.connection.confirmTransaction(signature, 'confirmed');
      
      // Update balance after successful transaction
      await this.updateBalance();
      
      const result: TransactionResult = {
        signature,
        success: true
      };

      this.emit('transactionComplete', result);
      return result;

    } catch (error) {
      const parsedError = solflareErrorHandler.parseError(error as UnknownError);
      
      const result: TransactionResult = {
        signature: '',
        success: false,
        error: parsedError.userMessage
      };

      this.emit('transactionFailed', result);
      this.emit('error', parsedError);
      
      const transactionError = new TransactionError(
        parsedError.userMessage,
        parsedError.type,
        error
      );
      
      throw transactionError;
    }
  }

  /**
   * Sign a transaction without sending it
   */
  async signTransaction(transaction: Transaction | VersionedTransaction): Promise<Transaction | VersionedTransaction> {
    if (!this.wallet || !this.connectionState.isConnected) {
      throw new WalletConnectionError('Wallet not connected', 'NOT_CONNECTED');
    }

    try {
      return await this.wallet.signTransaction(transaction);
    } catch (error) {
      const signingError = new TransactionError(
        `Failed to sign transaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'SIGNING_FAILED'
      );
      this.emit('error', signingError);
      throw signingError;
    }
  }

  /**
   * Sign multiple transactions
   */
  async signAllTransactions(transactions: (Transaction | VersionedTransaction)[]): Promise<(Transaction | VersionedTransaction)[]> {
    if (!this.wallet || !this.connectionState.isConnected) {
      throw new WalletConnectionError('Wallet not connected', 'NOT_CONNECTED');
    }

    try {
      return await this.wallet.signAllTransactions(transactions);
    } catch (error) {
      const signingError = new TransactionError(
        `Failed to sign transactions: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'BATCH_SIGNING_FAILED'
      );
      this.emit('error', signingError);
      throw signingError;
    }
  }

  /**
   * Sign a message
   */
  async signMessage(message: string): Promise<Uint8Array> {
    if (!this.wallet || !this.connectionState.isConnected) {
      throw new WalletConnectionError('Wallet not connected', 'NOT_CONNECTED');
    }

    try {
      const messageBytes = new TextEncoder().encode(message);
      return await this.wallet.signMessage(messageBytes, 'utf8');
    } catch (error) {
      const signingError = new TransactionError(
        `Failed to sign message: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'MESSAGE_SIGNING_FAILED'
      );
      this.emit('error', signingError);
      throw signingError;
    }
  }

  /**
   * Get current connection state
   */
  getConnectionState(): WalletConnectionState {
    return { ...this.connectionState };
  }

  /**
   * Check if wallet is connected
   */
  isConnected(): boolean {
    return this.connectionState.isConnected;
  }

  /**
   * Get wallet public key
   */
  getPublicKey(): PublicKey | null {
    return this.connectionState.publicKey;
  }

  /**
   * Get wallet balance
   */
  getBalance(): number {
    return this.connectionState.balance;
  }

  /**
   * Get network
   */
  getNetwork(): string {
    return this.connectionState.network;
  }

  /**
   * Validate a Solana address
   */
  static isValidAddress(address: string): boolean {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Convert SOL to lamports
   */
  static solToLamports(sol: number): number {
    return sol * LAMPORTS_PER_SOL;
  }

  /**
   * Convert lamports to SOL
   */
  static lamportsToSol(lamports: number): number {
    return lamports / LAMPORTS_PER_SOL;
  }
}

// Export a singleton instance for global use
export const solflareWalletService = new SolflareWalletService();

// Export types and classes
export default SolflareWalletService;