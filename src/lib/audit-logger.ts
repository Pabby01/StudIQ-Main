export const auditLogger = {
  log: (event: string, meta?: unknown) => {
    console.info(`[audit] ${event}`, meta ?? '');
  },
  logRateLimitViolation: (meta?: unknown) => {
    console.warn('[audit] rate limit violation', meta ?? '');
  },
  logValidationViolation: (meta?: unknown) => {
    console.warn('[audit] validation violation', meta ?? '');
  },
  logTransaction: (_wallet: string, event: string, meta?: unknown) => {
    console.info(`[audit] transaction ${event}`, meta ?? '');
  },
};

export default auditLogger;
