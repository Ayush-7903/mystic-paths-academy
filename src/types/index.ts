// ============================================
// Application Types - Centralized Type Definitions
// ============================================

import { User, Session } from '@supabase/supabase-js';

// Database Types
export interface Course {
  id: string;
  title: string;
  description: string;
  video_url: string;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Lesson {
  id: string;
  course_id: string;
  title: string;
  content: string;
  order_number: number;
  section: string | null;
  created_at: string;
  updated_at: string;
}

export interface LessonWithCompletion extends Lesson {
  completed: boolean;
}

export interface Profile {
  id: string;
  full_name: string;
  is_member: boolean | null;
  member_since: string | null;
  created_at: string;
  updated_at: string;
}

export interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  progress: number | null;
  enrolled_at: string;
}

export interface EnrollmentWithCourse extends Enrollment {
  courses: Course;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: 'admin' | 'user';
  created_at: string;
}

export interface LessonCompletion {
  id: string;
  user_id: string;
  lesson_id: string;
  completed_at: string;
}

// Auth Types
export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
}

// API Response Types
export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
  loading: boolean;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: string;
}

// Form Types
export interface CourseFormData {
  title: string;
  description: string;
  video_url: string;
  image_url: string;
}

export interface AuthFormData {
  email: string;
  password: string;
}

export interface MembershipFormData extends AuthFormData {
  fullName: string;
  cardNumber: string;
  expiryDate: string;
  cvv: string;
}

// Component Props Types
export interface LoadingStateProps {
  message?: string;
}

export interface ErrorStateProps {
  error: ApiError | null;
  onRetry?: () => void;
}
