-- Drop existing RLS policies for user_profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.user_profiles;

-- Create new RLS policies for user_profiles
CREATE POLICY "Allow full access to service_role" ON public.user_profiles
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow individual access for authenticated users" ON public.user_profiles
    FOR ALL
    TO authenticated
    USING ((auth.jwt() ->> 'sub')::text = user_id)
    WITH CHECK ((auth.jwt() ->> 'sub')::text = user_id);