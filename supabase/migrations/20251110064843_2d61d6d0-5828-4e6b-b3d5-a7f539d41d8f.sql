-- Drop the existing restrictive policy for viewing courses
DROP POLICY IF EXISTS "Members can view courses" ON courses;

-- Allow anyone to view the course list (even non-logged-in users)
CREATE POLICY "Anyone can view courses"
ON courses
FOR SELECT
USING (true);