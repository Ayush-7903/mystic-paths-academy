// ============================================
// Centralized API Service Layer
// All Supabase interactions go through this layer
// ============================================

import { supabase } from '@/integrations/supabase/client';
import type { 
  Course, 
  Lesson, 
  Profile, 
  EnrollmentWithCourse,
  UserRole,
  LessonCompletion,
  CourseFormData,
  ApiError 
} from '@/types';

// ============================================
// Error Handling Utilities
// ============================================

const handleError = (error: unknown): ApiError => {
  if (error instanceof Error) {
    return {
      message: error.message,
      details: error.stack,
    };
  }
  return {
    message: 'An unexpected error occurred',
  };
};

// ============================================
// Authentication Services
// ============================================

export const authService = {
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) throw error;
    return data;
  },

  async signUp(email: string, password: string, fullName: string, redirectUrl: string) {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName.trim(),
        },
      },
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  },
};

// ============================================
// Profile Services
// ============================================

export const profileService = {
  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    
    if (error) throw handleError(error);
    return data;
  },

  async updateProfile(userId: string, updates: Partial<Profile>) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    
    if (error) throw handleError(error);
    return data;
  },
};

// ============================================
// Purchase Services
// ============================================

export const purchaseService = {
  async checkPurchase(userId: string, courseId: string): Promise<boolean> {
    const { data } = await supabase
      .from('purchases')
      .select('id')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .eq('status', 'completed')
      .maybeSingle();
    
    return !!data;
  },

  async getUserPurchases(userId: string) {
    const { data, error } = await supabase
      .from('purchases')
      .select(`
        id,
        course_id,
        purchased_at,
        amount_cents,
        courses (
          id,
          title,
          description,
          image_url
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'completed');
    
    if (error) throw handleError(error);
    return data || [];
  },
};

// ============================================
// User Role Services
// ============================================

export const roleService = {
  async checkAdminRole(userId: string): Promise<boolean> {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();
    
    return !!data;
  },

  async getUserRoles(userId: string): Promise<UserRole[]> {
    const { data, error } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', userId);
    
    if (error) throw handleError(error);
    return data || [];
  },
};

// ============================================
// Course Services
// ============================================

export const courseService = {
  async getAllCourses(): Promise<Course[]> {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (error) throw handleError(error);
    return data || [];
  },

  async getCourseById(courseId: string): Promise<Course | null> {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .maybeSingle();
    
    if (error) throw handleError(error);
    return data;
  },

  async createCourse(courseData: CourseFormData): Promise<Course> {
    const { data, error } = await supabase
      .from('courses')
      .insert([courseData])
      .select()
      .single();
    
    if (error) throw handleError(error);
    return data;
  },

  async updateCourse(courseId: string, courseData: Partial<CourseFormData>): Promise<Course> {
    const { data, error } = await supabase
      .from('courses')
      .update(courseData)
      .eq('id', courseId)
      .select()
      .single();
    
    if (error) throw handleError(error);
    return data;
  },

  async deleteCourse(courseId: string): Promise<void> {
    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', courseId);
    
    if (error) throw handleError(error);
  },
};

// ============================================
// Lesson Services
// ============================================

export const lessonService = {
  async getLessonsByCourse(courseId: string): Promise<Lesson[]> {
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('course_id', courseId)
      .order('order_number');
    
    if (error) throw handleError(error);
    return data || [];
  },

  async getUserCompletions(userId: string): Promise<LessonCompletion[]> {
    const { data, error } = await supabase
      .from('lesson_completions')
      .select('*')
      .eq('user_id', userId);
    
    if (error) throw handleError(error);
    return data || [];
  },

  async markLessonComplete(userId: string, lessonId: string): Promise<void> {
    const { error } = await supabase
      .from('lesson_completions')
      .insert({
        user_id: userId,
        lesson_id: lessonId,
      });
    
    if (error) throw handleError(error);
  },

  async markLessonIncomplete(userId: string, lessonId: string): Promise<void> {
    const { error } = await supabase
      .from('lesson_completions')
      .delete()
      .eq('user_id', userId)
      .eq('lesson_id', lessonId);
    
    if (error) throw handleError(error);
  },
};

// ============================================
// Enrollment Services
// ============================================

export const enrollmentService = {
  async getUserEnrollments(userId: string): Promise<EnrollmentWithCourse[]> {
    const { data, error } = await supabase
      .from('enrollments')
      .select(`
        id,
        progress,
        user_id,
        course_id,
        enrolled_at,
        courses (
          id,
          title,
          description,
          image_url,
          video_url,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', userId);
    
    if (error) throw handleError(error);
    return (data || []) as unknown as EnrollmentWithCourse[];
  },

  async checkEnrollment(userId: string, courseId: string): Promise<boolean> {
    const { data } = await supabase
      .from('enrollments')
      .select('id')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .maybeSingle();
    
    return !!data;
  },

  async enrollInCourse(userId: string, courseId: string): Promise<void> {
    const { error } = await supabase
      .from('enrollments')
      .insert({
        user_id: userId,
        course_id: courseId,
      });
    
    if (error) throw handleError(error);
  },

  async unenrollFromCourse(userId: string, courseId: string): Promise<void> {
    const { error } = await supabase
      .from('enrollments')
      .delete()
      .eq('user_id', userId)
      .eq('course_id', courseId);
    
    if (error) throw handleError(error);
  },
};
