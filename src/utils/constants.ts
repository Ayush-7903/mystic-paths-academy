// ============================================
// Constants
// Application-wide constants
// ============================================

// App Info
export const APP_NAME = 'Spiritual Learning Portal';
export const APP_DESCRIPTION = 'Transform your consciousness through sacred teachings';

// Routes
export const ROUTES = {
  HOME: '/',
  COURSES: '/courses',
  COURSE_DETAIL: '/courses/:id',
  AUTH: '/auth',
  MEMBERSHIP: '/membership',
  DASHBOARD: '/dashboard',
  ADMIN: '/admin',
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

// Membership Benefits (for display)
export const MEMBERSHIP_BENEFITS = [
  'Access to all spiritual courses',
  'Lifetime enrollment capability',
  'Track your spiritual journey',
  'Join our community of seekers',
] as const;
