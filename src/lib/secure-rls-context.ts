export function setSecureRLSContext(ctx: { authenticatedUserId: string }) {
  void ctx;
  return Promise.resolve();
}
export function clearSecureRLSContext() {
  return Promise.resolve();
}
export function validateUserAccess(authenticatedUserId: string, requestedUserId: string, operation: string) {
  void authenticatedUserId;
  void requestedUserId;
  void operation;
  // No-op in stub
}
export function auditSecureOperation(operation: string, authenticatedUserId: string, requestedUserId: string) {
  void operation;
  void authenticatedUserId;
  void requestedUserId;
  // No-op in stub
}
