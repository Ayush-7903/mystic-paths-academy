// ============================================
// Constants
// Application-wide constants
// ============================================

// App Info
export const APP_NAME = 'Guardians of New Earth';
export const APP_DESCRIPTION = 'Transform your consciousness through sacred teachings';

// Routes
export const ROUTES = {
  HOME: '/',
  COURSES: '/courses',
  COURSE_DETAIL: '/courses/:id',
  AUTH: '/auth',
  SIGNUP: '/signup',
  DASHBOARD: '/dashboard',
  ADMIN: '/admin',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
} as const;

// API Limits
export const API_LIMITS = {
  MAX_COURSES_PER_PAGE: 50,
  MAX_ENROLLMENTS_PER_PAGE: 100,
  MAX_LESSONS_PER_COURSE: 100,
} as const;

// UI Constants
export const UI = {
  DEBOUNCE_MS: 300,
  TOAST_DURATION_MS: 5000,
  ANIMATION_DURATION_MS: 300,
} as const;

// Course pricing
export const COURSE_PRICE_CENTS = 3000; // $30 USD per course
