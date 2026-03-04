// Minimal stub for server-only code paths that import supabaseAdmin
type SupabaseUser = { id: string };
type SupabaseResponse<T> = { data: T; error: { message: string } | null };
type SupabaseAuth = { getUser(token: string): Promise<SupabaseResponse<{ user: SupabaseUser | null }>> };
type SupabaseQuery = {
  select(columns?: string): {
    eq(column?: string, value?: unknown): {
      single(): Promise<SupabaseResponse<unknown>>;
    };
  };
};
type SupabaseAdmin = {
  auth: SupabaseAuth;
  from(table: string): SupabaseQuery;
};

export const supabaseAdmin: SupabaseAdmin = {
  auth: {
    async getUser(token: string): Promise<SupabaseResponse<{ user: SupabaseUser | null }>> {
      void token;
      return { data: { user: { id: 'stub-user-id' } }, error: null };
    },
  },
  from(table: string): SupabaseQuery {
    void table;
    return {
      select(columns?: string) {
        void columns;
        return {
          eq(column?: string, value?: unknown) {
            void column;
            void value;
            return {
              async single(): Promise<SupabaseResponse<unknown>> {
                return { data: { user_id: 'stub-user-id', wallet_address: null }, error: null };
              },
            };
          },
        };
      },
    };
  },
};

export function handleSupabaseError(error: unknown, context?: string): string {
  const msg = error instanceof Error ? error.message : String(error);
  return context ? `${context}: ${msg}` : msg;
}

export default supabaseAdmin;
