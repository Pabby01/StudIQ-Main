/* eslint-disable @typescript-eslint/no-explicit-any */
import { secureLogger } from './secure-logger';

export interface MarketData {
  symbol: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  volume24h: number;
  marketCap: number;
  timestamp: Date;
}

export interface PortfolioUpdate {
  walletAddress: string;
  balance: number;
  totalUsdValue: number;
  tokenUpdates: TokenUpdate[];
}

export interface TokenUpdate {
  mint: string;
  symbol: string;
  price: number;
  change24h: number;
  balance: number;
  usdValue: number;
}

export interface TransactionNotification {
  signature: string;
  type: 'send' | 'receive' | 'swap';
  amount: number;
  symbol: string;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: Date;
}

export interface WebSocketMessage {
  type: string;
  payload?: unknown;
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectInterval = 5000;
  private maxReconnectAttempts = 2;
  private reconnectAttempts = 0;
  private messageHandlers: Map<string, Set<(data: unknown) => void>> = new Map();
  private connectionPromise: Promise<void> | null = null;
  private isIntentionallyClosed = false;

  constructor(private url: string = (typeof process !== 'undefined' && (process as any).env?.NEXT_PUBLIC_WS_URL) || 'wss://api.studiq.com/ws') {}

  // Connect to WebSocket server
  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);
        this.isIntentionallyClosed = false;

        this.ws.onopen = () => {
          secureLogger.info('WebSocket connected');
          this.reconnectAttempts = 0;
          this.connectionPromise = null;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (error) {
            secureLogger.error('Failed to parse WebSocket message', error);
          }
        };

        this.ws.onclose = () => {
          secureLogger.info('WebSocket disconnected');
          this.ws = null;
          this.connectionPromise = null;
          
          if (!this.isIntentionallyClosed && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          secureLogger.warn('WebSocket error', error);
          this.connectionPromise = null;
          reject(error);
        };
      } catch (error) {
        secureLogger.error('Failed to create WebSocket connection', error);
        this.connectionPromise = null;
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  // Disconnect from WebSocket server
  disconnect(): void {
    this.isIntentionallyClosed = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  // Schedule reconnection attempt
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      secureLogger.warn('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1), 30000);
    
    secureLogger.info(`Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    setTimeout(() => {
      if (!this.isIntentionallyClosed) {
        this.connect().catch(error => {
          secureLogger.error('Reconnection failed', error);
        });
      }
    }, delay);
  }

  // Handle incoming messages
  private handleMessage(data: unknown): void {
    const message = data as WebSocketMessage;
    const { type, payload } = message;
    
    if (type && this.messageHandlers.has(type)) {
      const handlers = this.messageHandlers.get(type)!;
      handlers.forEach(handler => {
        try {
          handler(payload);
        } catch (error) {
          secureLogger.error('Error in message handler', error);
        }
      });
    }
  }

  // Subscribe to specific message types
  subscribe(type: string, handler: (data: unknown) => void): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }
    
    this.messageHandlers.get(type)!.add(handler);
    
    // Return unsubscribe function
    return () => {
      const handlers = this.messageHandlers.get(type);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.messageHandlers.delete(type);
        }
      }
    };
  }

  // Send message to server
  send(type: string, payload: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    } else {
      secureLogger.warn('WebSocket not connected, message not sent', { type, payload });
    }
  }

  // Subscribe to market data updates
  subscribeToMarketData(symbols: string[], handler: (data: MarketData[]) => void): () => void {
    // Send subscription request
    this.send('subscribe_market_data', { symbols });
    
    return this.subscribe('market_data_update', (data: unknown) => handler(data as MarketData[]));
  }

  // Subscribe to portfolio updates
  subscribeToPortfolioUpdates(walletAddress: string, handler: (data: PortfolioUpdate) => void): () => void {
    this.send('subscribe_portfolio', { walletAddress });
    
    return this.subscribe('portfolio_update', (data: unknown) => handler(data as PortfolioUpdate));
  }

  // Subscribe to transaction notifications
  subscribeToTransactions(walletAddress: string, handler: (data: TransactionNotification) => void): () => void {
    this.send('subscribe_transactions', { walletAddress });
    
    return this.subscribe('transaction_notification', (data: unknown) => handler(data as TransactionNotification));
  }

  // Get connection status
  getConnectionStatus(): 'connected' | 'connecting' | 'disconnected' {
    if (!this.ws) return 'disconnected';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting';
      case WebSocket.OPEN:
        return 'connected';
      case WebSocket.CLOSING:
      case WebSocket.CLOSED:
        return 'disconnected';
      default:
        return 'disconnected';
    }
  }
}

// Create singleton instance
export const websocketService = new WebSocketService();

export default WebSocketService;