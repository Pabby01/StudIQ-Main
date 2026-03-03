export type UnknownError = unknown;

export type SolflareError = {
  code?: string;
  userMessage: string;
  retryable?: boolean;
};

export const solflareErrorHandler = {
  parseError(err: UnknownError): SolflareError {
    if (err instanceof Error) {
      return { userMessage: err.message, code: 'ERROR', retryable: false };
    }
    return { userMessage: String(err), code: 'UNKNOWN', retryable: false };
  },
  getErrorMessage(err: SolflareError): string {
    return err.userMessage || 'An unknown error occurred';
  },
  shouldRetry(err: SolflareError): boolean {
    return !!err.retryable;
  },
  getRetryDelay(attempt: number): number {
    return 500 * (attempt + 1);
  },
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

