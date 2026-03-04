export function AuthDebugTest({ className }: { className?: string }) {
  return (
    <div className={`p-4 border rounded bg-yellow-50 text-yellow-800 ${className ?? ''}`}>
      Auth debug tools are not available in this build.
    </div>
  );
}

export default AuthDebugTest;
