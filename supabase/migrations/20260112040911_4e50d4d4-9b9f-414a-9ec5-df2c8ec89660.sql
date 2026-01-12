-- Drop the old membership-based policy for lesson completions
DROP POLICY IF EXISTS "Members can mark lessons complete" ON public.lesson_completions;

-- Create new policy that allows users who purchased the course to mark lessons complete
CREATE POLICY "Purchasers can mark lessons complete"
  ON public.lesson_completions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id 
    AND EXISTS (
      SELECT 1 FROM public.purchases p
      JOIN public.lessons l ON l.course_id = p.course_id
      WHERE p.user_id = auth.uid()
      AND p.status = 'completed'
      AND l.id = lesson_id
    )
  );

-- Also add a policy for members (backwards compatibility)
CREATE POLICY "Members can mark lessons complete"
  ON public.lesson_completions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id 
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.is_member = true
    )
  );