// Minimal stub for server-only code paths that import supabaseAdmin
export const supabaseAdmin: any = {
  auth: {
    async getUser(_token: string): Promise<any> {
      return { data: { user: { id: 'stub-user-id' } }, error: null };
    },
  },
  from(_table: string): any {
    return {
      select(_columns?: string): any {
        return {
          eq(_column?: string, _value?: any): any {
            return {
              async single(): Promise<any> {
                return { data: { user_id: 'stub-user-id', wallet_address: null }, error: null };
              },
            };
          },
        };
      },
    };
  },
};

export function handleSupabaseError(error: any, context?: string): string {
  const msg = error?.message ? String(error.message) : String(error);
  return context ? `${context}: ${msg}` : msg;
}

export default supabaseAdmin;
