// ============================================
// Validation Utilities
// Centralized input validation using Zod
// ============================================

import { z } from 'zod';

// Email validation
export const emailSchema = z
  .string()
  .trim()
  .min(1, { message: 'Email is required' })
  .email({ message: 'Invalid email address' })
  .max(255, { message: 'Email must be less than 255 characters' });

// Password validation
export const passwordSchema = z
  .string()
  .min(6, { message: 'Password must be at least 6 characters' })
  .max(72, { message: 'Password must be less than 72 characters' });

// Full name validation
export const fullNameSchema = z
  .string()
  .trim()
  .min(1, { message: 'Full name is required' })
  .max(100, { message: 'Full name must be less than 100 characters' });

// Course form validation
export const courseFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, { message: 'Title is required' })
    .max(200, { message: 'Title must be less than 200 characters' }),
  description: z
    .string()
    .trim()
    .min(1, { message: 'Description is required' })
    .max(5000, { message: 'Description must be less than 5000 characters' }),
  video_url: z
    .string()
    .trim()
    .url({ message: 'Must be a valid URL' })
    .refine(
      (url) => url.includes('youtube.com') || url.includes('youtu.be') || url.includes('vimeo.com'),
      { message: 'Must be a YouTube or Vimeo URL' }
    ),
  image_url: z
    .string()
    .trim()
    .optional()
    .refine(
      (url) => !url || url.startsWith('/') || url.startsWith('http'),
      { message: 'Must be a valid image path or URL' }
    ),
});

// Login form validation
export const loginFormSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

// Membership signup form validation
export const membershipFormSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  fullName: fullNameSchema,
  // Note: Card details are demo-only, minimal validation
  cardNumber: z.string().min(1, { message: 'Card number is required' }),
  expiryDate: z.string().min(1, { message: 'Expiry date is required' }),
  cvv: z.string().min(1, { message: 'CVV is required' }),
});

// Validation helper function
export const validateForm = <T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } => {
  try {
    const validData = schema.parse(data);
    return { success: true, data: validData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        error: error.errors[0]?.message || 'Validation failed' 
      };
    }
    return { success: false, error: 'Validation failed' };
  }
};

// Individual field validation
export const validateEmail = (email: string) => validateForm(emailSchema, email);
export const validatePassword = (password: string) => validateForm(passwordSchema, password);
export const validateFullName = (name: string) => validateForm(fullNameSchema, name);
