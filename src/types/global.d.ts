declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

declare module '*.scss' {
  const content: { [className: string]: string };
  export default content;
}

declare module '*.sass' {
  const content: { [className: string]: string };
  export default content;
}

declare module '*.less' {
  const content: { [className: string]: string };
  export default content;
}

// Solflare Wallet types
interface SolflareWallet {
  isConnected: boolean;
  publicKey: string | null;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  signTransaction(transaction: unknown): Promise<unknown>;
  signAllTransactions(transactions: unknown[]): Promise<unknown[]>;
  signMessage(message: Uint8Array): Promise<Uint8Array>;
}

declare global {
  interface Window {
    solflare?: SolflareWallet;
  }
}