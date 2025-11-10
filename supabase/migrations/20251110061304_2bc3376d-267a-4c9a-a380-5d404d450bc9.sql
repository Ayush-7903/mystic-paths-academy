-- Add membership tracking to profiles
ALTER TABLE public.profiles 
ADD COLUMN is_member BOOLEAN DEFAULT FALSE,
ADD COLUMN member_since TIMESTAMP WITH TIME ZONE;

-- Update RLS policies for courses to require membership
DROP POLICY IF EXISTS "Anyone can view courses" ON public.courses;
CREATE POLICY "Members can view courses" 
ON public.courses 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_member = TRUE
  )
);

-- Update enrollment policies to require membership
DROP POLICY IF EXISTS "Users can enroll in courses" ON public.enrollments;
CREATE POLICY "Members can enroll in courses" 
ON public.enrollments 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_member = TRUE
  )
);