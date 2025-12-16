// ============================================
// Courses Hook
// Course data fetching and management
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { courseService } from '@/services/api';
import type { Course, ApiError, CourseFormData } from '@/types';

interface UseCoursesReturn {
  courses: Course[];
  loading: boolean;
  error: ApiError | null;
  refetch: () => Promise<void>;
  createCourse: (data: CourseFormData) => Promise<void>;
  updateCourse: (id: string, data: Partial<CourseFormData>) => Promise<void>;
  deleteCourse: (id: string) => Promise<void>;
}

export const useCourses = (): UseCoursesReturn => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await courseService.getAllCourses();
      setCourses(data);
    } catch (err) {
      setError({
        message: err instanceof Error ? err.message : 'Failed to fetch courses',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const createCourse = useCallback(async (data: CourseFormData) => {
    await courseService.createCourse(data);
    await fetchCourses();
  }, [fetchCourses]);

  const updateCourse = useCallback(async (id: string, data: Partial<CourseFormData>) => {
    await courseService.updateCourse(id, data);
    await fetchCourses();
  }, [fetchCourses]);

  const deleteCourse = useCallback(async (id: string) => {
    await courseService.deleteCourse(id);
    await fetchCourses();
  }, [fetchCourses]);

  return {
    courses,
    loading,
    error,
    refetch: fetchCourses,
    createCourse,
    updateCourse,
    deleteCourse,
  };
};

// ============================================
// Single Course Hook
// ============================================

interface UseCourseReturn {
  course: Course | null;
  loading: boolean;
  error: ApiError | null;
  refetch: () => Promise<void>;
}

export const useCourse = (courseId: string | undefined): UseCourseReturn => {
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const fetchCourse = useCallback(async () => {
    if (!courseId) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const data = await courseService.getCourseById(courseId);
      setCourse(data);
    } catch (err) {
      setError({
        message: err instanceof Error ? err.message : 'Failed to fetch course',
      });
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchCourse();
  }, [fetchCourse]);

  return {
    course,
    loading,
    error,
    refetch: fetchCourse,
  };
};
