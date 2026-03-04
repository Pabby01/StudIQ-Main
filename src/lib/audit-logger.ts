export const auditLogger = {
  log: (event: string, meta?: unknown) => {
    // eslint-disable-next-line no-console
    console.info(`[audit] ${event}`, meta ?? '');
  },
  logRateLimitViolation: (meta?: unknown) => {
    // eslint-disable-next-line no-console
    console.warn('[audit] rate limit violation', meta ?? '');
  },
  logValidationViolation: (meta?: unknown) => {
    // eslint-disable-next-line no-console
    console.warn('[audit] validation violation', meta ?? '');
  },
  logTransaction: (_wallet: string, event: string, meta?: unknown) => {
    // eslint-disable-next-line no-console
    console.info(`[audit] transaction ${event}`, meta ?? '');
  },
};

export default auditLogger;
