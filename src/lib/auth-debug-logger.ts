const logs: Array<{ level: 'info' | 'warn' | 'error'; message: unknown[]; timestamp: number }> = [];

export const authDebugLogger = {
  info: (...args: unknown[]) => {
    logs.push({ level: 'info', message: args, timestamp: Date.now() });
    console.info('[auth-debug]', ...args);
  },
  warn: (...args: unknown[]) => {
    logs.push({ level: 'warn', message: args, timestamp: Date.now() });
    console.warn('[auth-debug]', ...args);
  },
  error: (...args: unknown[]) => {
    logs.push({ level: 'error', message: args, timestamp: Date.now() });
    console.error('[auth-debug]', ...args);
  },
  getRecentLogs: (limit = 20) => logs.slice(-limit),
  clearLogs: () => {
    logs.length = 0;
  },
};

export default authDebugLogger;
