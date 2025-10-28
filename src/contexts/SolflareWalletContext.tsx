/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { PublicKey } from '@solana/web3.js';
import { 
  SolflareWalletService, 
  WalletConnectionState, 
  TransactionResult, 
  SendTransactionParams,
  WalletConnectionError,
  TransactionError,
  NetworkError
} from '@/lib/solflare-wallet-service';
import { solflareErrorHandler, SolflareError, UnknownError } from '@/lib/solflare-error-handler';

// Context types
interface SolflareWalletContextType {
  // Connection state
  isConnected: boolean;
  publicKey: PublicKey | null;
  balance: number;
  network: string;
  isConnecting: boolean;
  
  // Methods
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  sendTransaction: (params: SendTransactionParams) => Promise<TransactionResult>;
  updateBalance: () => Promise<void>;
  signMessage: (message: string) => Promise<Uint8Array>;
  
  // Error handling
  error: string | null;
  clearError: () => void;
  
  // Transaction state
  isTransacting: boolean;
  isTransactionPending: boolean; // Alias for isTransacting for backward compatibility
  lastTransaction: TransactionResult | null;
}

// Create context
const SolflareWalletContext = createContext<SolflareWalletContextType | null>(null);

// Provider props
interface SolflareWalletProviderProps {
  children: ReactNode;
  rpcEndpoint?: string;
  network?: string;
  autoConnect?: boolean;
}

/**
 * Solflare Wallet Provider Component
 * Manages wallet state and provides methods to interact with Solflare wallet
 */
export function SolflareWalletProvider({ 
  children, 
  rpcEndpoint, 
  network = 'mainnet-beta',
  autoConnect = false 
}: SolflareWalletProviderProps) {
  // State management
  const [walletService] = useState(() => new SolflareWalletService(rpcEndpoint, network));
  const [connectionState, setConnectionState] = useState<WalletConnectionState>({
    isConnected: false,
    publicKey: null,
    balance: 0,
    network
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [isTransacting, setIsTransacting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastTransaction, setLastTransaction] = useState<TransactionResult | null>(null);

  // Clear error function
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Handle wallet connection
  const connect = useCallback(async () => {
    if (isConnecting || connectionState.isConnected) return;
    
    setIsConnecting(true);
    setError(null);
    
    try {
      const state = await walletService.connect();
      setConnectionState(state);
    } catch (err) {
      const parsedError = solflareErrorHandler.parseError(err as UnknownError);
      setError(solflareErrorHandler.getErrorMessage(parsedError));
      console.error('Wallet connection failed:', parsedError);
    } finally {
      setIsConnecting(false);
    }
  }, [walletService, isConnecting, connectionState.isConnected]);

  // Handle wallet disconnection
  const disconnect = useCallback(async () => {
    setError(null);
    
    try {
      await walletService.disconnect();
      setConnectionState({
        isConnected: false,
        publicKey: null,
        balance: 0,
        network
      });
      setLastTransaction(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to disconnect wallet';
      setError(errorMessage);
      console.error('Wallet disconnection failed:', err);
    }
  }, [walletService, network]);

  // Update balance
  const updateBalance = useCallback(async () => {
    if (!connectionState.isConnected) return;
    
    try {
      const balance = await walletService.updateBalance();
      setConnectionState(prev => ({ ...prev, balance }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update balance';
      setError(errorMessage);
      console.error('Balance update failed:', err);
    }
  }, [walletService, connectionState.isConnected]);

  // Send transaction with retry logic
  const sendTransaction = useCallback(async (params: SendTransactionParams): Promise<TransactionResult> => {
    if (!connectionState.isConnected) {
      const error = solflareErrorHandler.parseError(new Error('Wallet not connected'));
      throw new WalletConnectionError(error.userMessage, 'NOT_CONNECTED');
    }
    
    setIsTransacting(true);
    setError(null);
    
    let lastError: SolflareError | null = null;
    const maxRetries = 3;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await walletService.sendTransaction(params);
        setLastTransaction(result);
        
        // Update balance after successful transaction
        if (result.success) {
          await updateBalance();
        }
        
        return result;
      } catch (err) {
        const parsedError = solflareErrorHandler.parseError(err as UnknownError);
        lastError = parsedError;
        
        // Check if we should retry
        if (attempt < maxRetries - 1 && solflareErrorHandler.shouldRetry(parsedError)) {
          const delay = solflareErrorHandler.getRetryDelay(attempt);
          console.log(`Transaction attempt ${attempt + 1} failed, retrying in ${delay}ms:`, parsedError);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        // Final attempt failed or non-retryable error
        const errorMessage = solflareErrorHandler.getErrorMessage(parsedError);
        setError(errorMessage);
        console.error('Transaction failed after all retries:', parsedError);
        
        const failedResult: TransactionResult = {
          signature: '',
          success: false,
          error: parsedError.userMessage
        };
        setLastTransaction(failedResult);
        throw err;
      }
    }
    
    // This should never be reached, but TypeScript requires it
    throw lastError || new Error('Transaction failed');
  }, [walletService, connectionState.isConnected, updateBalance]);

  // Sign message
  const signMessage = useCallback(async (message: string): Promise<Uint8Array> => {
    if (!connectionState.isConnected) {
      throw new WalletConnectionError('Wallet not connected', 'NOT_CONNECTED');
    }
    
    setError(null);
    
    try {
      return await walletService.signMessage(message);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign message';
      setError(errorMessage);
      throw err;
    }
  }, [walletService, connectionState.isConnected]);

  // Set up wallet service event listeners
  useEffect(() => {
    const handleConnect = (state: WalletConnectionState) => {
      setConnectionState(state);
      setIsConnecting(false);
    };

    const handleDisconnect = (state: WalletConnectionState) => {
      setConnectionState(state);
      setLastTransaction(null);
    };

    const handleBalanceUpdate = (balance: number) => {
      setConnectionState(prev => ({ ...prev, balance }));
    };

    const handleTransactionComplete = (result: TransactionResult) => {
      setLastTransaction(result);
      setIsTransacting(false);
    };

    const handleTransactionFailed = (result: TransactionResult) => {
      setLastTransaction(result);
      setIsTransacting(false);
      setError(result.error || 'Transaction failed');
    };

    const handleError = (err: Error) => {
      setError(err.message);
      setIsConnecting(false);
      setIsTransacting(false);
    };

    // Add event listeners
    walletService.on('connect', handleConnect);
    walletService.on('disconnect', handleDisconnect);
    walletService.on('balanceUpdated', handleBalanceUpdate);
    walletService.on('transactionComplete', handleTransactionComplete);
    walletService.on('transactionFailed', handleTransactionFailed);
    walletService.on('error', handleError);

    // Auto-connect if enabled
    if (autoConnect && !connectionState.isConnected && !isConnecting) {
      connect().catch(console.error);
    }

    // Cleanup event listeners
    return () => {
      walletService.removeListener('connect', handleConnect);
      walletService.removeListener('disconnect', handleDisconnect);
      walletService.removeListener('balanceUpdated', handleBalanceUpdate);
      walletService.removeListener('transactionComplete', handleTransactionComplete);
      walletService.removeListener('transactionFailed', handleTransactionFailed);
      walletService.removeListener('error', handleError);
    };
  }, [walletService, autoConnect, connectionState.isConnected, isConnecting, connect]);

  // Context value
  const contextValue: SolflareWalletContextType = {
    // Connection state
    isConnected: connectionState.isConnected,
    publicKey: connectionState.publicKey,
    balance: connectionState.balance,
    network: connectionState.network,
    isConnecting,
    
    // Methods
    connect,
    disconnect,
    sendTransaction,
    updateBalance,
    signMessage,
    
    // Error handling
    error,
    clearError,
    
    // Transaction state
    isTransacting,
    isTransactionPending: isTransacting, // Alias for backward compatibility
    lastTransaction
  };

  return (
    <SolflareWalletContext.Provider value={contextValue}>
      {children}
    </SolflareWalletContext.Provider>
  );
}

/**
 * Hook to use Solflare wallet context
 */
export function useSolflareWallet(): SolflareWalletContextType {
  const context = useContext(SolflareWalletContext);
  
  if (!context) {
    throw new Error('useSolflareWallet must be used within a SolflareWalletProvider');
  }
  
  return context;
}

/**
 * Hook for wallet connection status
 */
export function useWalletConnection() {
  const { isConnected, publicKey, balance, network, isConnecting, connect, disconnect, updateBalance } = useSolflareWallet();
  
  return {
    isConnected,
    publicKey,
    balance,
    network,
    isConnecting,
    connect,
    disconnect,
    updateBalance
  };
}

/**
 * Hook for transaction operations
 */
export function useWalletTransactions() {
  const { 
    sendTransaction, 
    signMessage, 
    isTransacting, 
    isTransactionPending,
    lastTransaction, 
    updateBalance 
  } = useSolflareWallet();
  
  return {
    sendTransaction,
    signMessage,
    isTransacting,
    isTransactionPending,
    lastTransaction,
    updateBalance
  };
}

/**
 * Hook for error handling
 */
export function useWalletErrors() {
  const { error, clearError } = useSolflareWallet();
  
  return {
    error,
    clearError
  };
}

export default SolflareWalletContext;