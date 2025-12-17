-- =====================================================
-- SECURITY HARDENING MIGRATION
-- Fix exposed profiles table and duplicate policies
-- =====================================================

-- 1. Remove the dangerous public profiles policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- 2. Remove duplicate INSERT policies (keep one)
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- 3. Remove duplicate UPDATE policies (keep one)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- 4. Remove redundant admin SELECT policy on enrollments (users already restricted)
DROP POLICY IF EXISTS "Admins can view all enrollments" ON public.enrollments;

-- 5. Add admin SELECT policy that works alongside user policy
CREATE POLICY "Admins can view all enrollments"
ON public.enrollments
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));