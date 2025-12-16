-- Fix function search_path for security
-- Update calculate_course_progress function
CREATE OR REPLACE FUNCTION public.calculate_course_progress(p_user_id uuid, p_course_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $function$
DECLARE
  total_lessons INTEGER;
  completed_lessons INTEGER;
  progress_percentage INTEGER;
BEGIN
  -- Get total lessons for the course
  SELECT COUNT(*) INTO total_lessons
  FROM public.lessons
  WHERE course_id = p_course_id;
  
  -- Return 0 if no lessons
  IF total_lessons = 0 THEN
    RETURN 0;
  END IF;
  
  -- Get completed lessons for the user
  SELECT COUNT(*) INTO completed_lessons
  FROM public.lesson_completions lc
  JOIN public.lessons l ON l.id = lc.lesson_id
  WHERE lc.user_id = p_user_id
  AND l.course_id = p_course_id;
  
  -- Calculate percentage
  progress_percentage := (completed_lessons * 100) / total_lessons;
  
  RETURN progress_percentage;
END;
$function$;

-- Update update_updated_at_column function  
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;