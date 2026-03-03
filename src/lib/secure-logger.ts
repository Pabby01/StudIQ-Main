type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogMeta = unknown;

const redact = (value: unknown): unknown => {
  if (typeof value === 'string') {
    // Redact obvious secrets and long hex/base58-like strings
    if (value.length > 40) return `${value.slice(0, 6)}…${value.slice(-4)}`;
    return value
      .replace(/(eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+)/g, '***.***.***') // JWT
      .replace(/(api[_-]?key|secret|token)=([^&\s]+)/gi, '$1=***'); // query params
  }
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') {
    const obj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (/pass|secret|token|key/i.test(k)) {
        obj[k] = '***';
      } else {
        obj[k] = redact(v);
      }
    }
    return obj;
  }
  return value;
};

const log = (level: LogLevel, message: string, meta?: unknown) => {
  const payload = meta ? redact(meta) : undefined;
  const ts = new Date().toISOString();
  // eslint-disable-next-line no-console
  console[level](`[${ts}] ${message}`, payload ?? '');
};

export const secureLogger = {
  debug: (message: string, meta?: unknown) => log('debug', message, meta),
  info: (message: string, meta?: unknown) => log('info', message, meta),
  warn: (message: string, meta?: unknown) => log('warn', message, meta),
  error: (message: string, meta?: unknown) => log('error', message, meta),
};

export const secureLogUtils = {
  maskWalletAddress: (addr?: string | null) => {
    if (!addr) return '';
    if (addr.length <= 8) return addr;
    return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
  },
  maskUserId: (id?: string | null) => {
    if (!id) return '';
    if (id.length <= 8) return id;
    return `${id.slice(0, 4)}…${id.slice(-4)}`;
  },
};

export default secureLogger;
