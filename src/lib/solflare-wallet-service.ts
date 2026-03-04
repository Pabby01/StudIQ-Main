import { PublicKey } from '@solana/web3.js';
import { EventEmitter } from 'events';

export type SendTransactionParams = {
  recipientAddress: string;
  amount: number;
  memo?: string;
};

export type TransactionResult = {
  signature: string;
  success: boolean;
  error?: string;
};

export type WalletConnectionState = {
  isConnected: boolean;
  publicKey: PublicKey | null;
  balance: number;
  network: string;
};

export class WalletConnectionError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'WalletConnectionError';
  }
}
export class TransactionError extends Error {
  constructor(message: string, public code?: string) {
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

export class SolflareWalletService extends EventEmitter {
  private state: WalletConnectionState;
  constructor(private rpcEndpoint?: string, private network: string = 'mainnet-beta') {
    super();
    this.state = { isConnected: false, publicKey: null, balance: 0, network: this.network };
  }

  async connect(): Promise<WalletConnectionState> {
    // Simulate a connection with a random public key
    const dummy = new PublicKey('11111111111111111111111111111111');
    this.state = { isConnected: true, publicKey: dummy, balance: 0, network: this.network };
    this.emit('connect', this.state);
    return this.state;
  }

  async disconnect(): Promise<void> {
    this.state = { isConnected: false, publicKey: null, balance: 0, network: this.network };
    this.emit('disconnect', this.state);
  }

  async updateBalance(): Promise<number> {
    const balance = this.state.balance; // no-op placeholder
    this.emit('balanceUpdated', balance);
    return balance;
  }

  async sendTransaction(params: SendTransactionParams): Promise<TransactionResult> {
    if (!this.state.isConnected) throw new WalletConnectionError('Wallet not connected', 'NOT_CONNECTED');
    void params;
    const result: TransactionResult = { signature: Math.random().toString(36).slice(2), success: true };
    this.emit('transactionComplete', result);
    return result;
  }

  async signMessage(message: string): Promise<Uint8Array> {
    if (!this.state.isConnected) throw new WalletConnectionError('Wallet not connected', 'NOT_CONNECTED');
    return new TextEncoder().encode(message);
  }

  // Helpers used in wallet-data
  isConnected(): boolean {
    return this.state.isConnected;
  }
  getPublicKey(): PublicKey | null {
    return this.state.publicKey;
  }
  getBalance(): number {
    return this.state.balance;
  }
  getNetwork(): string {
    return this.state.network;
  }
  static isValidAddress(addr: string): boolean {
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr);
  }
}

export const solflareWalletService = new SolflareWalletService();
