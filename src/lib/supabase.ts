// Minimal stub for server-only code paths that import supabaseAdmin
export const supabaseAdmin = {
  auth: {
    async getUser(_token: string) {
      return { data: { user: null }, error: null };
    },
  },
  from(_table: string) {
    return {
      select() {
        return {
          eq() {
            return {
              async single() {
                return { data: null, error: null };
              },
            };
          },
        };
      },
    };
  },
};

export default supabaseAdmin;
