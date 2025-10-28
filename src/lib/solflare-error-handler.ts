/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Comprehensive error handling service for Solflare wallet operations
 * Provides specific error types, user-friendly messages, and recovery suggestions
 */

import { secureLogger } from './secure-logger';

export enum SolflareErrorType {
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  WALLET_NOT_FOUND = 'WALLET_NOT_FOUND',
  USER_REJECTED = 'USER_REJECTED',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  INVALID_ADDRESS = 'INVALID_ADDRESS',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  SIGNATURE_FAILED = 'SIGNATURE_FAILED',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface SolflareError {
  type: SolflareErrorType;
  message: string;
  userMessage: string;
  recoveryAction?: string;
  originalError?: Error;
  timestamp: Date;
}

// Type for unknown errors that might come from various sources
export type UnknownError = Error | { message?: string; code?: string | number; stack?: string } | string | null | undefined;

export class SolflareErrorHandler {
  private static instance: SolflareErrorHandler;

  public static getInstance(): SolflareErrorHandler {
    if (!SolflareErrorHandler.instance) {
      SolflareErrorHandler.instance = new SolflareErrorHandler();
    }
    return SolflareErrorHandler.instance;
  }

  /**
   * Convert UnknownError to Error type for originalError property
   */
  private toError(error: UnknownError): Error | undefined {
    if (error instanceof Error) {
      return error;
    }
    if (typeof error === 'string') {
      return new Error(error);
    }
    if (error && typeof error === 'object' && 'message' in error) {
      const err = new Error(error.message || 'Unknown error');
      if ('stack' in error && error.stack) {
        err.stack = error.stack;
      }
      return err;
    }
    return undefined;
  }

  /**
   * Parse and categorize errors from Solflare operations
   */
  public parseError(error: UnknownError): SolflareError {
    const timestamp = new Date();
    
    // Log the original error for debugging
    secureLogger.error('Solflare operation error:', {
      error: (error as any)?.message || error,
      stack: (error as any)?.stack,
      timestamp
    });

    // Check for specific error patterns
    if (this.isConnectionError(error)) {
      return {
        type: SolflareErrorType.CONNECTION_FAILED,
        message: 'Failed to connect to Solflare wallet',
        userMessage: 'Unable to connect to your Solflare wallet. Please make sure the Solflare extension is installed and unlocked.',
        recoveryAction: 'Install or unlock Solflare wallet extension',
        originalError: this.toError(error),
        timestamp
      };
    }

    if (this.isWalletNotFoundError(error)) {
      return {
        type: SolflareErrorType.WALLET_NOT_FOUND,
        message: 'Solflare wallet not detected',
        userMessage: 'Solflare wallet extension not found. Please install the Solflare browser extension.',
        recoveryAction: 'Install Solflare extension from the Chrome Web Store',
        originalError: this.toError(error),
        timestamp
      };
    }

    if (this.isUserRejectionError(error)) {
      return {
        type: SolflareErrorType.USER_REJECTED,
        message: 'User rejected the transaction',
        userMessage: 'Transaction was cancelled. Please try again and approve the transaction in your wallet.',
        recoveryAction: 'Retry and approve the transaction',
        originalError: this.toError(error),
        timestamp
      };
    }

    if (this.isInsufficientFundsError(error)) {
      return {
        type: SolflareErrorType.INSUFFICIENT_FUNDS,
        message: 'Insufficient funds for transaction',
        userMessage: 'You don\'t have enough SOL to complete this transaction, including network fees.',
        recoveryAction: 'Add more SOL to your wallet or reduce the transaction amount',
        originalError: this.toError(error),
        timestamp
      };
    }

    if (this.isInvalidAddressError(error)) {
      return {
        type: SolflareErrorType.INVALID_ADDRESS,
        message: 'Invalid recipient address',
        userMessage: 'The recipient address is not valid. Please check and try again.',
        recoveryAction: 'Verify the recipient address format',
        originalError: this.toError(error),
        timestamp
      };
    }

    if (this.isNetworkError(error)) {
      return {
        type: SolflareErrorType.NETWORK_ERROR,
        message: 'Network connection error',
        userMessage: 'Unable to connect to the Solana network. Please check your internet connection.',
        recoveryAction: 'Check internet connection and try again',
        originalError: this.toError(error),
        timestamp
      };
    }

    if (this.isTransactionFailedError(error)) {
      return {
        type: SolflareErrorType.TRANSACTION_FAILED,
        message: 'Transaction failed on the blockchain',
        userMessage: 'The transaction failed to process on the Solana network. This may be due to network congestion.',
        recoveryAction: 'Wait a moment and try again',
        originalError: this.toError(error),
        timestamp
      };
    }

    if (this.isSignatureFailedError(error)) {
      return {
        type: SolflareErrorType.SIGNATURE_FAILED,
        message: 'Failed to sign transaction',
        userMessage: 'Unable to sign the transaction. Please make sure your wallet is unlocked.',
        recoveryAction: 'Unlock your wallet and try again',
        originalError: this.toError(error),
        timestamp
      };
    }

    if (this.isTimeoutError(error)) {
      return {
        type: SolflareErrorType.TIMEOUT,
        message: 'Operation timed out',
        userMessage: 'The operation took too long to complete. Please try again.',
        recoveryAction: 'Try again with a stable internet connection',
        originalError: this.toError(error),
        timestamp
      };
    }

    // Default unknown error
    return {
      type: SolflareErrorType.UNKNOWN_ERROR,
      message: (error as any)?.message || 'Unknown error occurred',
      userMessage: 'An unexpected error occurred. Please try again or contact support if the problem persists.',
      recoveryAction: 'Try again or contact support',
      originalError: this.toError(error),
      timestamp
    };
  }

  /**
   * Get user-friendly error message with recovery suggestions
   */
  public getErrorMessage(error: SolflareError): string {
    let message = error.userMessage;
    if (error.recoveryAction) {
      message += `\n\nSuggested action: ${error.recoveryAction}`;
    }
    return message;
  }

  /**
   * Check if error should trigger a retry
   */
  public shouldRetry(error: SolflareError): boolean {
    const retryableErrors = [
      SolflareErrorType.NETWORK_ERROR,
      SolflareErrorType.TIMEOUT,
      SolflareErrorType.TRANSACTION_FAILED
    ];
    return retryableErrors.includes(error.type);
  }

  /**
   * Get retry delay in milliseconds
   */
  public getRetryDelay(attemptNumber: number): number {
    // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
    return Math.min(1000 * Math.pow(2, attemptNumber), 30000);
  }

  // Private error detection methods
  private isConnectionError(error: UnknownError): boolean {
    const message = (error as any)?.message?.toLowerCase() || '';
    return message.includes('connection') || 
           message.includes('connect') ||
           message.includes('wallet not connected') ||
           (error as any)?.code === 4001;
  }

  private isWalletNotFoundError(error: UnknownError): boolean {
    const message = (error as any)?.message?.toLowerCase() || '';
    return message.includes('wallet not found') ||
           message.includes('solflare not found') ||
           message.includes('extension not installed') ||
           typeof window !== 'undefined' && !(window as any).solflare;
  }

  private isUserRejectionError(error: UnknownError): boolean {
    const message = (error as any)?.message?.toLowerCase() || '';
    return message.includes('user rejected') ||
           message.includes('user denied') ||
           message.includes('cancelled') ||
           (error as any)?.code === 4001;
  }

  private isInsufficientFundsError(error: UnknownError): boolean {
    const message = (error as any)?.message?.toLowerCase() || '';
    return message.includes('insufficient') ||
           message.includes('not enough') ||
           message.includes('balance too low') ||
           (error as any)?.code === 'InsufficientFunds';
  }

  private isInvalidAddressError(error: UnknownError): boolean {
    const message = (error as any)?.message?.toLowerCase() || '';
    return message.includes('invalid address') ||
           message.includes('invalid recipient') ||
           message.includes('malformed address') ||
           message.includes('invalid public key');
  }

  private isNetworkError(error: UnknownError): boolean {
    const message = (error as any)?.message?.toLowerCase() || '';
    return message.includes('network') ||
           message.includes('fetch') ||
           message.includes('connection refused') ||
           message.includes('timeout') ||
           (error as any)?.code === 'NETWORK_ERROR';
  }

  private isTransactionFailedError(error: UnknownError): boolean {
    const message = (error as any)?.message?.toLowerCase() || '';
    return message.includes('transaction failed') ||
           message.includes('simulation failed') ||
           message.includes('blockhash not found') ||
           (error as any)?.code === 'TransactionExpiredBlockheightExceededError';
  }

  private isSignatureFailedError(error: UnknownError): boolean {
    const message = (error as any)?.message?.toLowerCase() || '';
    return message.includes('signature') ||
           message.includes('sign') ||
           message.includes('unauthorized') ||
           (error as any)?.code === 'Unauthorized';
  }

  private isTimeoutError(error: UnknownError): boolean {
    const message = (error as any)?.message?.toLowerCase() || '';
    return message.includes('timeout') ||
           message.includes('timed out') ||
           (error as any)?.code === 'TIMEOUT' ||
           (error as any)?.name === 'TimeoutError';
  }
}

// Export singleton instance
export const solflareErrorHandler = SolflareErrorHandler.getInstance();