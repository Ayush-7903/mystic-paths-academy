// ============================================
// Enrollment Hook
// Enrollment state and actions management
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { enrollmentService, lessonService } from '@/services/api';
import type { EnrollmentWithCourse, LessonWithCompletion, Lesson, ApiError } from '@/types';

interface UseEnrollmentsReturn {
  enrollments: EnrollmentWithCourse[];
  loading: boolean;
  error: ApiError | null;
  refetch: () => Promise<void>;
}

export const useEnrollments = (userId: string | undefined): UseEnrollmentsReturn => {
  const [enrollments, setEnrollments] = useState<EnrollmentWithCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const fetchEnrollments = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const data = await enrollmentService.getUserEnrollments(userId);
      setEnrollments(data);
    } catch (err) {
      setError({
        message: err instanceof Error ? err.message : 'Failed to fetch enrollments',
      });
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchEnrollments();
  }, [fetchEnrollments]);

  return {
    enrollments,
    loading,
    error,
    refetch: fetchEnrollments,
  };
};

// ============================================
// Course Enrollment Hook
// Single course enrollment management
// ============================================

interface UseCourseEnrollmentReturn {
  isEnrolled: boolean;
  enrolling: boolean;
  error: ApiError | null;
  enroll: () => Promise<void>;
  checkEnrollment: () => Promise<void>;
}

export const useCourseEnrollment = (
  userId: string | undefined,
  courseId: string | undefined
): UseCourseEnrollmentReturn => {
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const checkEnrollment = useCallback(async () => {
    if (!userId || !courseId) return;
    
    try {
      const enrolled = await enrollmentService.checkEnrollment(userId, courseId);
      setIsEnrolled(enrolled);
    } catch (err) {
      console.error('Error checking enrollment:', err);
    }
  }, [userId, courseId]);

  useEffect(() => {
    checkEnrollment();
  }, [checkEnrollment]);

  const enroll = useCallback(async () => {
    if (!userId || !courseId) return;
    
    setEnrolling(true);
    setError(null);
    try {
      await enrollmentService.enrollInCourse(userId, courseId);
      setIsEnrolled(true);
    } catch (err) {
      setError({
        message: err instanceof Error ? err.message : 'Failed to enroll',
      });
      throw err;
    } finally {
      setEnrolling(false);
    }
  }, [userId, courseId]);

  return {
    isEnrolled,
    enrolling,
    error,
    enroll,
    checkEnrollment,
  };
};

// ============================================
// Lessons Hook
// Lessons with completion status
// ============================================

interface UseLessonsReturn {
  lessons: LessonWithCompletion[];
  loading: boolean;
  error: ApiError | null;
  progress: number;
  refetch: () => Promise<void>;
  toggleCompletion: (lessonId: string, completed: boolean) => Promise<void>;
}

export const useLessons = (
  courseId: string | undefined,
  userId: string | undefined
): UseLessonsReturn => {
  const [lessons, setLessons] = useState<LessonWithCompletion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [progress, setProgress] = useState(0);

  const fetchLessons = useCallback(async () => {
    if (!courseId) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const lessonsData = await lessonService.getLessonsByCourse(courseId);
      
      let lessonsWithCompletion: LessonWithCompletion[];
      
      if (userId) {
        const completionsData = await lessonService.getUserCompletions(userId);
        const completedLessonIds = new Set(completionsData.map(c => c.lesson_id));
        
        lessonsWithCompletion = lessonsData.map(lesson => ({
          ...lesson,
          completed: completedLessonIds.has(lesson.id),
        }));
        
        const completedCount = lessonsWithCompletion.filter(l => l.completed).length;
        const totalLessons = lessonsData.length;
        setProgress(totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0);
      } else {
        lessonsWithCompletion = lessonsData.map(lesson => ({
          ...lesson,
          completed: false,
        }));
        setProgress(0);
      }
      
      setLessons(lessonsWithCompletion);
    } catch (err) {
      setError({
        message: err instanceof Error ? err.message : 'Failed to fetch lessons',
      });
    } finally {
      setLoading(false);
    }
  }, [courseId, userId]);

  useEffect(() => {
    fetchLessons();
  }, [fetchLessons]);

  const toggleCompletion = useCallback(async (lessonId: string, currentlyCompleted: boolean) => {
    if (!userId) return;
    
    try {
      if (currentlyCompleted) {
        await lessonService.markLessonIncomplete(userId, lessonId);
      } else {
        await lessonService.markLessonComplete(userId, lessonId);
      }
      await fetchLessons();
    } catch (err) {
      throw err;
    }
  }, [userId, fetchLessons]);

  return {
    lessons,
    loading,
    error,
    progress,
    refetch: fetchLessons,
    toggleCompletion,
  };
};
