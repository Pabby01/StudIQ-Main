-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Service role can manage user profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.user_profiles;

-- Policies for service_role (backend operations)
CREATE POLICY "Service role can insert user profiles" ON public.user_profiles FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role can view all user profiles" ON public.user_profiles FOR SELECT TO service_role USING (true);
CREATE POLICY "Service role can update all user profiles" ON public.user_profiles FOR UPDATE TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role can delete all user profiles" ON public.user_profiles FOR DELETE TO service_role USING (true);

-- Policies for authenticated users (client-side operations)
CREATE POLICY "Authenticated users can view their own profile" ON public.user_profiles FOR SELECT TO authenticated USING ((current_setting('request.jwt.claims', true)::jsonb ->> 'sub') = user_id);