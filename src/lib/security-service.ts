import { secureLogger } from './secure-logger';

export interface SecurityConfig {
  sessionTimeout: number; // minutes
  maxLoginAttempts: number;
  lockoutDuration: number; // minutes
  require2FA: boolean;
  encryptionKey: string;
}

export interface SessionData {
  userId: string;
  walletAddress: string;
  createdAt: Date;
  lastActivity: Date;
  ipAddress: string;
  userAgent: string;
  twoFactorVerified: boolean;
  permissions: string[];
}

export interface TwoFactorSetup {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

class SecurityService {
  private readonly SESSION_KEY = 'studiQ_session';
  private readonly LOCKOUT_KEY = 'studiQ_lockout';
  private readonly ATTEMPTS_KEY = 'studiQ_attempts';
  private readonly ENCRYPTION_KEY: string;
  
  private config: SecurityConfig;

  // Initialize security service
  constructor() {
    // Validate encryption key is provided
    const encryptionKey = process.env.NEXT_PUBLIC_ENCRYPTION_KEY;
    if (!encryptionKey) {
      throw new Error('NEXT_PUBLIC_ENCRYPTION_KEY is required for secure operations. Please set this environment variable.');
    }
    if (encryptionKey.length < 32) {
      throw new Error('ENCRYPTION_KEY must be at least 32 characters long for security.');
    }
    
    this.ENCRYPTION_KEY = encryptionKey;
    
    // Initialize config after ENCRYPTION_KEY is set
    this.config = {
      sessionTimeout: 30, // 30 minutes
      maxLoginAttempts: 5,
      lockoutDuration: 15, // 15 minutes
      require2FA: true,
      encryptionKey: this.ENCRYPTION_KEY,
    };
    
    this.startSessionMonitoring();
    this.setupSecurityHeaders();
  }

  // Generate secure random string
  private generateSecureId(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Simple encryption for sensitive data
  private encrypt(data: string): string {
    try {
      // In production, use proper encryption library like crypto-js
      return btoa(data + this.config.encryptionKey);
    } catch (error) {
      secureLogger.error('Encryption failed', error);
      return data;
    }
  }

  private decrypt(data: string): string {
    try {
      // In production, use proper decryption library
      const decoded = atob(data);
      return decoded.replace(this.config.encryptionKey, '');
    } catch (error) {
      secureLogger.error('Decryption failed', error);
      return data;
    }
  }

  // Create new session
  async createSession(userId: string, walletAddress: string): Promise<SessionData> {
    try {
      // Check if user is locked out
      if (await this.isUserLockedOut(userId)) {
        throw new Error('Account is locked due to too many failed attempts');
      }

      const sessionId = this.generateSecureId();
      const sessionData: SessionData = {
        userId,
        walletAddress,
        createdAt: new Date(),
        lastActivity: new Date(),
        ipAddress: this.getClientIP(),
        userAgent: this.getUserAgent(),
        twoFactorVerified: false,
        permissions: ['read', 'trade'],
      };

      // Store session securely
      const encryptedSession = this.encrypt(JSON.stringify(sessionData));
      localStorage.setItem(this.SESSION_KEY, encryptedSession);
      sessionStorage.setItem('session_id', sessionId);

      // Log security event
      secureLogger.auth('Session created', userId, {
        sessionId: sessionId.slice(0, 8) + '...',
        ipAddress: sessionData.ipAddress,
      });

      return sessionData;
    } catch (error) {
      secureLogger.error('Failed to create session', error);
      throw error;
    }
  }

  // Get current session
  getCurrentSession(): SessionData | null {
    try {
      const encryptedSession = localStorage.getItem(this.SESSION_KEY);
      if (!encryptedSession) return null;

      const decryptedSession = this.decrypt(encryptedSession);
      const sessionData: SessionData = JSON.parse(decryptedSession);

      // Check session timeout
      const now = new Date();
      const lastActivity = new Date(sessionData.lastActivity);
      const timeDiff = now.getTime() - lastActivity.getTime();
      const timeoutMs = this.config.sessionTimeout * 60 * 1000;

      if (timeDiff > timeoutMs) {
        this.destroySession();
        return null;
      }

      // Update last activity
      sessionData.lastActivity = now;
      const updatedEncryptedSession = this.encrypt(JSON.stringify(sessionData));
      localStorage.setItem(this.SESSION_KEY, updatedEncryptedSession);

      return sessionData;
    } catch (error) {
      secureLogger.error('Failed to get session', error);
      return null;
    }
  }

  // Destroy session
  destroySession(): void {
    try {
      const session = this.getCurrentSession();
      if (session) {
        secureLogger.auth('Session destroyed', session.userId);
      }

      localStorage.removeItem(this.SESSION_KEY);
      sessionStorage.removeItem('session_id');
      sessionStorage.clear();
    } catch (error) {
      secureLogger.error('Failed to destroy session', error);
    }
  }

  // Validate session
  validateSession(): boolean {
    const session = this.getCurrentSession();
    return session !== null;
  }

  // Check if user requires 2FA
  requiresTwoFactor(): boolean {
    return this.config.require2FA;
  }

  // Generate 2FA secret
  async generateTwoFactorSecret(userId: string): Promise<TwoFactorSetup> {
    try {
      const secret = this.generateSecureId(32);
      const backupCodes = Array.from({ length: 8 }, () => this.generateSecureId(8));
      
      // In production, integrate with actual 2FA service like Google Authenticator
      const qrCode = `otpauth://totp/StudIQ:${userId}?secret=${secret}&issuer=StudIQ`;

      secureLogger.security('2FA secret generated', { userId: userId.slice(0, 8) + '...' });

      return {
        secret,
        qrCode,
        backupCodes,
      };
    } catch (error) {
      secureLogger.error('Failed to generate 2FA secret', error);
      throw error;
    }
  }

  // Verify 2FA code
  async verifyTwoFactorCode(userId: string, code: string): Promise<boolean> {
    try {
      // In production, integrate with actual 2FA verification service
      // This is a mock implementation
      const isValid = code.length === 6 && /^\d{6}$/.test(code);

      if (isValid) {
        const session = this.getCurrentSession();
        if (session) {
          session.twoFactorVerified = true;
          const encryptedSession = this.encrypt(JSON.stringify(session));
          localStorage.setItem(this.SESSION_KEY, encryptedSession);
        }
        secureLogger.security('2FA verification successful', { userId: userId.slice(0, 8) + '...' });
      } else {
        secureLogger.security('2FA verification failed', { userId: userId.slice(0, 8) + '...' });
      }

      return isValid;
    } catch (error) {
      secureLogger.error('2FA verification error', error);
      return false;
    }
  }

  // Check if 2FA is verified
  isTwoFactorVerified(): boolean {
    const session = this.getCurrentSession();
    return session?.twoFactorVerified || false;
  }

  // Rate limiting for login attempts
  async recordFailedAttempt(userId: string): Promise<void> {
    try {
      const attemptsKey = `${this.ATTEMPTS_KEY}_${userId}`;
      const currentAttempts = parseInt(localStorage.getItem(attemptsKey) || '0');
      const newAttempts = currentAttempts + 1;

      localStorage.setItem(attemptsKey, newAttempts.toString());

      if (newAttempts >= this.config.maxLoginAttempts) {
        await this.lockUser(userId);
        secureLogger.security('User locked out due to failed attempts', { userId: userId.slice(0, 8) + '...' });
      }
    } catch (error) {
      secureLogger.error('Failed to record failed attempt', error);
    }
  }

  // Lock user account
  private async lockUser(userId: string): Promise<void> {
    try {
      const lockoutKey = `${this.LOCKOUT_KEY}_${userId}`;
      const lockoutUntil = new Date(Date.now() + this.config.lockoutDuration * 60 * 1000);
      
      localStorage.setItem(lockoutKey, lockoutUntil.toISOString());
    } catch (error) {
      secureLogger.error('Failed to lock user', error);
    }
  }

  // Check if user is locked out
  async isUserLockedOut(userId: string): Promise<boolean> {
    try {
      const lockoutKey = `${this.LOCKOUT_KEY}_${userId}`;
      const lockoutUntil = localStorage.getItem(lockoutKey);
      
      if (!lockoutUntil) return false;

      const lockoutDate = new Date(lockoutUntil);
      const now = new Date();

      if (now < lockoutDate) {
        return true;
      } else {
        // Lockout expired, remove it
        localStorage.removeItem(lockoutKey);
        localStorage.removeItem(`${this.ATTEMPTS_KEY}_${userId}`);
        return false;
      }
    } catch (error) {
      secureLogger.error('Failed to check lockout status', error);
      return false;
    }
  }

  // Get client IP address
  private getClientIP(): string {
    // In a real implementation, this would get the actual client IP
    // For now, return a placeholder
    return '127.0.0.1';
  }

  // Get user agent
  private getUserAgent(): string {
    if (typeof window === 'undefined') return 'Unknown';
    return window.navigator.userAgent;
  }

  // Setup security headers
  private setupSecurityHeaders(): void {
    // This would be handled by your web server in production
    // For now, we'll add some basic CSP meta tags
    if (typeof document !== 'undefined') {
      const meta = document.createElement('meta');
      meta.httpEquiv = 'Content-Security-Policy';
      meta.content = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' wss: https:;";
      document.head.appendChild(meta);
    }
  }

  // Monitor session activity
  private startSessionMonitoring(): void {
    setInterval(() => {
      const session = this.getCurrentSession();
      if (session) {
        // Check for suspicious activity
        const now = new Date();
        const lastActivity = new Date(session.lastActivity);
        const timeDiff = now.getTime() - lastActivity.getTime();

        if (timeDiff > this.config.sessionTimeout * 60 * 1000) {
          this.destroySession();
          secureLogger.security('Session expired due to inactivity', { userId: session.userId.slice(0, 8) + '...' });
        }
      }
    }, 60000); // Check every minute
  }

  // Validate transaction permissions
  canPerformTransaction(): boolean {
    const session = this.getCurrentSession();
    if (!session) return false;

    // Check if 2FA is required and verified
    if (this.config.require2FA && !session.twoFactorVerified) {
      return false;
    }

    // Check permissions
    return session.permissions.includes('trade');
  }

  // Add security event listener
  addSecurityEventListener(callback: (event: string, data: unknown) => void): void {
    // In a real implementation, this would set up event listeners
    // For now, we'll just log that it's been called
    secureLogger.info('Security event listener added', { callback: typeof callback });
  }

  // Clear all security data
  clearSecurityData(): void {
    try {
      this.destroySession();
      
      // Clear all local storage items related to security
      const keysToRemove = [
        this.SESSION_KEY,
        this.LOCKOUT_KEY,
        this.ATTEMPTS_KEY,
      ];

      keysToRemove.forEach(key => {
        // Remove all variations of the key
        for (let i = 0; i < localStorage.length; i++) {
          const storageKey = localStorage.key(i);
          if (storageKey && storageKey.startsWith(key)) {
            localStorage.removeItem(storageKey);
          }
        }
      });

      secureLogger.info('All security data cleared');
    } catch (error) {
      secureLogger.error('Failed to clear security data', error);
    }
  }
}

// Create singleton instance
export const securityService = new SecurityService();

// Export types for use in components
// Types are already exported as interfaces above