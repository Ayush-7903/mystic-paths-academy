-- Create lessons table for course content
CREATE TABLE public.lessons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  order_number INTEGER NOT NULL,
  section TEXT, -- For grouping lessons into parts/sections
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create lesson_completions table to track user progress
CREATE TABLE public.lesson_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

-- Enable RLS
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_completions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lessons (anyone can view)
CREATE POLICY "Anyone can view lessons"
ON public.lessons
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage lessons"
ON public.lessons
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for lesson_completions
CREATE POLICY "Users can view own completions"
ON public.lesson_completions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Members can mark lessons complete"
ON public.lesson_completions
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_member = true
  )
);

CREATE POLICY "Users can delete own completions"
ON public.lesson_completions
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updating lessons updated_at
CREATE TRIGGER update_lessons_updated_at
BEFORE UPDATE ON public.lessons
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to calculate course progress
CREATE OR REPLACE FUNCTION public.calculate_course_progress(p_user_id UUID, p_course_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
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
$$;