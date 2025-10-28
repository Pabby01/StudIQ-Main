/**
 * Comprehensive environment variable validation for mainnet deployment
 * This ensures all required environment variables are properly configured
 * and prevents runtime failures due to missing configuration.
 */

import { secureLogger } from './secure-logger';

export interface EnvironmentValidationResult {
  isValid: boolean;
  missing: string[];
  warnings: string[];
  errors: string[];
}

class EnvironmentValidator {
  private readonly requiredVars = [
    'NEXT_PUBLIC_PRIVY_APP_ID',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXT_PUBLIC_ENCRYPTION_KEY',
    'NEXT_PUBLIC_SOLANA_RPC_URL',
    'NEXT_PUBLIC_HELIUS_API_KEY',
    'OPENAI_API_KEY',
  ];

  private readonly optionalVars = [
    'NEXT_PUBLIC_COINGECKO_API_URL',
    'NEXT_PUBLIC_JUPITER_API_URL',
    'NEXT_PUBLIC_SOLANA_RPC_FALLBACKS',
    'NEXT_PUBLIC_CRYPTO_API_URL',
    'NEXT_PUBLIC_CRYPTO_API_KEY',
    'REDIS_URL',
    'UPSTASH_REDIS_URL',
    'NEXT_PUBLIC_WEBSOCKET_URL',
    'NEXT_PUBLIC_API_URL',
    'NODE_ENV',
    'LOG_LEVEL',
  ];

  private readonly securityRequirements = {
    'NEXT_PUBLIC_ENCRYPTION_KEY': (value: string) => value.length >= 32,
    'SUPABASE_SERVICE_ROLE_KEY': (value: string) => value.startsWith('eyJ') && value.length > 50,
    'NEXT_PUBLIC_HELIUS_API_KEY': (value: string) => value.length >= 32 && !value.includes('demo'),
    'OPENAI_API_KEY': (value: string) => value.startsWith('sk-') && value.length > 20,
    'REDIS_URL': (value: string) => value.startsWith('redis://') || value.startsWith('rediss://'),
    'UPSTASH_REDIS_URL': (value: string) => value.includes('upstash.io') && value.startsWith('https://'),
    'NODE_ENV': (value: string) => ['development', 'staging', 'production'].includes(value),
    'LOG_LEVEL': (value: string) => ['error', 'warn', 'info', 'debug'].includes(value),
  };

  validate(): EnvironmentValidationResult {
    const result: EnvironmentValidationResult = {
      isValid: true,
      missing: [],
      warnings: [],
      errors: [],
    };

    // Check required variables
    for (const envVar of this.requiredVars) {
      // For client-side validation, only check NEXT_PUBLIC_ variables
      if (typeof window !== 'undefined' && !envVar.startsWith('NEXT_PUBLIC_')) {
        continue; // Skip non-public variables on client side
      }

      const value = process.env[envVar];
      
      if (!value) {
        result.missing.push(envVar);
        result.errors.push(`Required environment variable ${envVar} is not set`);
        result.isValid = false;
        continue;
      }

      // Check security requirements
      const securityCheck = this.securityRequirements[envVar as keyof typeof this.securityRequirements];
      if (securityCheck && !securityCheck(value)) {
        result.errors.push(`Environment variable ${envVar} does not meet security requirements`);
        result.isValid = false;
      }
    }

    // Check for demo/insecure values
    this.checkForInsecureValues(result);

    // Log validation results
    this.logValidationResults(result);

    return result;
  }

  private checkForInsecureValues(result: EnvironmentValidationResult): void {
    const insecurePatterns = [
      { pattern: /demo|test|example/i, message: 'contains demo/test value' },
      { pattern: /^(password|123456|admin)$/i, message: 'uses common insecure value' },
      { pattern: /^.{0,15}$/, message: 'is too short for security requirements' },
    ];

    for (const envVar of this.requiredVars) {
      // For client-side validation, only check NEXT_PUBLIC_ variables
      if (typeof window !== 'undefined' && !envVar.startsWith('NEXT_PUBLIC_')) {
        continue; // Skip non-public variables on client side
      }

      const value = process.env[envVar];
      if (!value) continue;

      for (const { pattern, message } of insecurePatterns) {
        if (pattern.test(value)) {
          result.warnings.push(`Environment variable ${envVar} ${message}`);
        }
      }
    }
  }

  private logValidationResults(result: EnvironmentValidationResult): void {
    if (result.isValid) {
      secureLogger.security('Environment validation passed', {
        requiredVars: this.requiredVars.length,
        optionalVars: this.optionalVars.length,
      });
    } else {
      secureLogger.security('Environment validation failed', {
        missing: result.missing.length,
        errors: result.errors.length,
        warnings: result.warnings.length,
      });
    }

    if (result.missing.length > 0) {
      secureLogger.error('Missing required environment variables', { missing: result.missing });
    }

    if (result.warnings.length > 0) {
      secureLogger.warn('Environment configuration warnings', { warnings: result.warnings });
    }
  }

  // Generate environment template for developers
  generateEnvTemplate(): string {
    const template = [
      '# StudIQ Environment Configuration',
      '# Copy this to .env.local and fill in your actual values',
      '',
      '# Required Environment Variables',
      ...this.requiredVars.map(envVar => {
        const description = this.getEnvVarDescription(envVar);
        return `# ${description}\n${envVar}=your_${envVar.toLowerCase().replace(/_/g, '_')}_here`;
      }),
      '',
      '# Optional Environment Variables',
      ...this.optionalVars.map(envVar => {
        const description = this.getEnvVarDescription(envVar);
        const example = this.getEnvVarExample(envVar);
        return `# ${description}\n# ${envVar}=${example}`;
      }),
      '',
      '# Security Notes:',
      '# - NEXT_PUBLIC_ENCRYPTION_KEY must be at least 32 characters long',
      '# - SUPABASE_SERVICE_ROLE_KEY must be a valid JWT token',
      '# - OPENAI_API_KEY must start with "sk-" and be at least 20 characters',
      '# - REDIS_URL must start with "redis://" or "rediss://"',
      '# - UPSTASH_REDIS_URL must be an HTTPS URL containing "upstash.io"',
      '# - NODE_ENV must be one of: development, staging, production',
      '# - LOG_LEVEL must be one of: error, warn, info, debug',
      '# - Never commit .env.local to version control',
      '# - Use strong, unique values for production',
    ];

    return template.join('\n');
  }

  private getEnvVarDescription(envVar: string): string {
    const descriptions: Record<string, string> = {
      'NEXT_PUBLIC_PRIVY_APP_ID': 'Privy application ID for authentication',
      'NEXT_PUBLIC_SUPABASE_URL': 'Supabase project URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY': 'Supabase anonymous key for client-side operations',
      'SUPABASE_SERVICE_ROLE_KEY': 'Supabase service role key for admin operations',
      'NEXT_PUBLIC_ENCRYPTION_KEY': 'Encryption key for sensitive data (minimum 32 characters)',
      'NEXT_PUBLIC_SOLANA_RPC_URL': 'Primary Solana RPC endpoint for blockchain operations',
      'NEXT_PUBLIC_HELIUS_API_KEY': 'Helius API key for enhanced Solana RPC operations and indexing',
      'OPENAI_API_KEY': 'OpenAI API key for AI tutor functionality',
      'NEXT_PUBLIC_COINGECKO_API_URL': 'CoinGecko API base URL for price data',
      'NEXT_PUBLIC_JUPITER_API_URL': 'Jupiter API base URL for token prices',
      'NEXT_PUBLIC_SOLANA_RPC_FALLBACKS': 'Comma-separated list of fallback RPC endpoints',
      'NEXT_PUBLIC_CRYPTO_API_URL': 'Alternative crypto API URL (defaults to CoinGecko)',
      'NEXT_PUBLIC_CRYPTO_API_KEY': 'API key for crypto data services',
      'REDIS_URL': 'Redis connection URL for rate limiting and caching',
      'UPSTASH_REDIS_URL': 'Upstash Redis URL (alternative to REDIS_URL)',
      'NEXT_PUBLIC_WEBSOCKET_URL': 'WebSocket server URL for real-time updates',
      'NEXT_PUBLIC_API_URL': 'Base API URL for backend services',
      'NODE_ENV': 'Application environment (development, staging, production)',
      'LOG_LEVEL': 'Logging level (error, warn, info, debug)',
    };

    return descriptions[envVar] || 'Configuration variable';
  }

  private getEnvVarExample(envVar: string): string {
    const examples: Record<string, string> = {
      'NEXT_PUBLIC_COINGECKO_API_URL': 'https://api.coingecko.com/api/v3',
      'NEXT_PUBLIC_JUPITER_API_URL': 'https://price.jup.ag/v4/price',
      'NEXT_PUBLIC_SOLANA_RPC_FALLBACKS': 'https://api.mainnet-beta.solana.com,https://rpc.ankr.com/solana',
      'NEXT_PUBLIC_CRYPTO_API_URL': 'https://api.coingecko.com/api/v3',
      'NEXT_PUBLIC_CRYPTO_API_KEY': 'your_crypto_api_key_here',
      'REDIS_URL': 'redis://localhost:6379',
      'UPSTASH_REDIS_URL': 'https://your-project.upstash.io',
      'NEXT_PUBLIC_WEBSOCKET_URL': 'wss://api.studiq.com/ws',
      'NEXT_PUBLIC_API_URL': 'https://api.studiq.com',
      'NODE_ENV': 'production',
      'LOG_LEVEL': 'error',
    };

    return examples[envVar] || 'your_value_here';
  }
}

export const environmentValidator = new EnvironmentValidator();

// Export validation function for use in application startup
export function validateEnvironment(): EnvironmentValidationResult {
  return environmentValidator.validate();
}

// Export template generator for developers
export function generateEnvTemplate(): string {
  return environmentValidator.generateEnvTemplate();
}

// Export deployment guidance
export function getDeploymentGuidance(environment: 'development' | 'staging' | 'production'): string {
  const guidance = {
    development: [
      '# Development Environment Configuration',
      '# - Use testnet RPC endpoints instead of mainnet',
      '# - Use demo API keys where available',
      '# - Enable debug logging with LOG_LEVEL=debug',
      '# - Use local Redis instance (redis://localhost:6379)',
      '# - Can use shorter encryption keys for testing',
      '# - All services should point to test/sandbox environments',
    ],
    staging: [
      '# Staging Environment Configuration',
      '# - Use mainnet RPC endpoints for realistic testing',
      '# - Use production API keys with rate limits',
      '# - Set LOG_LEVEL=info for monitoring',
      '# - Use managed Redis service (Upstash recommended)',
      '# - Use strong encryption keys (32+ characters)',
      '# - Services should match production configuration',
      '# - Enable all security features',
    ],
    production: [
      '# Production Environment Configuration',
      '# - Use premium/mainnet RPC endpoints only',
      '# - Use production API keys with high rate limits',
      '# - Set LOG_LEVEL=error to reduce noise',
      '# - Use managed Redis cluster with high availability',
      '# - Use cryptographically strong encryption keys (32+ characters)',
      '# - Enable all security features and monitoring',
      '# - Use HTTPS endpoints only',
      '# - Implement proper backup and disaster recovery',
      '# - Monitor all external service dependencies',
    ],
  };

  return guidance[environment].join('\n');
}

// Export service-specific configuration guidance
export function getServiceConfigurationGuidance(): string {
  return [
    '# Service-Specific Configuration Guidance',
    '#',
    '# Solana RPC Configuration:',
    '# - Primary: Use premium services like QuickNode, Alchemy, or Helius',
    '# - Fallbacks: Include 2-3 backup endpoints from different providers',
    '# - Performance: Choose geographically close endpoints',
    '# - Reliability: Monitor RPC health and switch automatically',
    '#',
    '# Supabase Configuration:',
    '# - Use separate projects for different environments',
    '# - Enable Row Level Security (RLS) on all tables',
    '# - Use connection pooling for better performance',
    '# - Monitor database performance and optimize queries',
    '#',
    '# Redis Configuration:',
    '# - Use Redis 6+ for better performance',
    '# - Configure appropriate memory limits',
    '# - Set up persistence for critical data',
    '# - Monitor memory usage and hit ratios',
    '#',
    '# API Rate Limiting:',
    '# - CoinGecko: 10-50 calls/minute for free tier',
    '# - Jupiter: 10 calls/second for public endpoints',
    '# - OpenAI: Monitor token usage and costs',
    '# - Implement circuit breakers for external services',
    '#',
    '# Security Best Practices:',
    '# - Rotate encryption keys regularly',
    '# - Use separate keys for different environments',
    '# - Monitor for suspicious activity',
    '# - Implement proper key management',
    '# - Never expose service role keys client-side',
  ].join('\n');
}