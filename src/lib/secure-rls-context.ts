export function setSecureRLSContext(_ctx: { authenticatedUserId: string }) {
  return Promise.resolve();
}
export function clearSecureRLSContext() {
  return Promise.resolve();
}
export function validateUserAccess(_authenticatedUserId: string, _requestedUserId: string, _operation: string) {
  // No-op in stub
}
export function auditSecureOperation(_operation: string, _authenticatedUserId: string, _requestedUserId: string) {
  // No-op in stub
}

