# Spiritual Learning Portal

A production-ready spiritual education platform built with React, Vite, TypeScript, and Lovable Cloud.

## 🏗️ Architecture Overview

This project follows a **clear frontend/backend separation** within Lovable Cloud's architecture:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                PROJECT ROOT                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   📁 src/                          📁 supabase/                          │
│   ══════════════════               ════════════════════                  │
│   FRONTEND                         BACKEND                               │
│   (React + Vite)                   (Lovable Cloud)                       │
│                                                                          │
│   ├── components/                  ├── functions/                        │
│   │   ├── common/                  │   └── (Edge Functions)              │
│   │   ├── layout/                  │                                     │
│   │   └── ui/                      ├── migrations/                       │
│   │                                │   └── (Schema changes)              │
│   ├── pages/                       │                                     │
│   │   ├── Home.tsx                 └── config.toml                       │
│   │   ├── Courses.tsx                  (Backend config)                  │
│   │   ├── Dashboard.tsx                                                  │
│   │   └── Admin.tsx                                                      │
│   │                                                                      │
│   ├── hooks/                       🗄️ Database (PostgreSQL)              │
│   │   ├── useAuth.ts               ├── courses                           │
│   │   ├── useCourses.ts            ├── lessons                           │
│   │   └── useEnrollment.ts         ├── enrollments                       │
│   │                                ├── profiles                          │
│   ├── services/                    └── user_roles                        │
│   │   └── api.ts                                                         │
│   │                                🔐 Authentication                     │
│   ├── types/                       └── Email/Password + Sessions         │
│   │   └── index.ts                                                       │
│   │                                                                      │
│   └── utils/                                                             │
│       ├── validation.ts                                                  │
│       └── constants.ts                                                   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Separation of Concerns

| Layer | Location | Responsibility |
|-------|----------|----------------|
| **Frontend** | `src/` | UI, user interactions, client-side state |
| **Backend** | `supabase/` | Data persistence, auth, business logic |
| **API Layer** | `src/services/api.ts` | Centralized backend communication |
| **Security** | Database RLS | Server-side access control |

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS, shadcn/ui |
| State | TanStack Query, Custom Hooks |
| Backend | Lovable Cloud (PostgreSQL + Edge Functions) |
| Database | PostgreSQL with Row Level Security |
| Auth | Email/Password with session persistence |

## 📁 Detailed Project Structure

### Frontend (`src/`)

```
src/
├── components/
│   ├── common/          # LoadingSpinner, ErrorDisplay, EmptyState
│   ├── layout/          # PageLayout, Footer
│   └── ui/              # shadcn/ui components
├── hooks/               # Custom React hooks
│   ├── useAuth.ts       # Authentication state & actions
│   ├── useCourses.ts    # Course data management
│   └── useEnrollment.ts # Enrollment management
├── pages/               # Route pages
├── services/            # API service layer
│   └── api.ts           # ALL backend calls go here
├── types/               # TypeScript type definitions
│   └── index.ts         # Centralized types
├── utils/               # Utility functions
│   ├── validation.ts    # Zod schemas for input validation
│   └── constants.ts     # App constants
└── integrations/        # Auto-generated (DO NOT EDIT)
    └── supabase/        # Backend client & types
```

### Backend (`supabase/`)

```
supabase/
├── functions/           # Edge Functions (serverless)
│   └── [function-name]/ # Each function has its own folder
│       └── index.ts     # Function entry point
├── migrations/          # Database schema migrations
│   └── *.sql            # Versioned SQL changes
└── config.toml          # Backend configuration
```

## 🔐 Security Features

- ✅ **Row Level Security (RLS)** on all tables - server-side enforcement
- ✅ **Role-based access control** (Admin/Member/Visitor)
- ✅ **Input validation** with Zod schemas (client-side)
- ✅ **Secure authentication** with session management
- ✅ **No secrets in frontend code** - all sensitive ops in backend
- ✅ **Security definer functions** - prevents RLS recursion attacks
- ✅ **Private profile data** - users can only view their own profiles

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment Variables

Environment variables are auto-managed by Lovable Cloud. See `.env.example` for reference:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
VITE_SUPABASE_PROJECT_ID=your_project_id
```

## 📦 Build & Deployment

```bash
# Production build
npm run build

# Preview production build
npm run preview
```

### Deployment
1. Click **Publish** in Lovable
2. Frontend and backend deploy automatically
3. Database migrations apply automatically

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [BACKEND.md](./BACKEND.md) | Database schema, RLS policies, Edge Functions |
| [SECURITY.md](./SECURITY.md) | Security architecture and recommendations |

## 🎨 Design System

Uses CSS custom properties defined in `src/index.css`:
- Semantic color tokens (light/dark themes)
- Custom shadows and gradients
- Typography: Playfair Display (headings) + Inter (body)

## 📊 Database Schema

| Table | Purpose | Access |
|-------|---------|--------|
| `courses` | Course content | Public read, Admin write |
| `lessons` | Course lessons | Public read, Admin write |
| `enrollments` | User enrollments | Own records only |
| `lesson_completions` | Progress tracking | Own records only |
| `profiles` | User profile data | Own record only |
| `user_roles` | Role-based access | Own read, Admin write |

## 🔄 API Layer

All backend interactions go through `src/services/api.ts`:

```typescript
import { courseService, authService, enrollmentService } from '@/services/api';

// Fetch courses (public)
const courses = await courseService.getAllCourses();

// Authentication
await authService.signIn(email, password);
await authService.signUp(email, password, fullName, redirectUrl);

// Enrollments (requires auth)
await enrollmentService.enrollInCourse(userId, courseId);
```

## ✅ Production Readiness Checklist

### Completed
- [x] RLS policies on all tables
- [x] Role-based access control
- [x] Input validation (Zod)
- [x] Centralized API layer
- [x] Error handling patterns
- [x] Security definer functions
- [x] Private user profiles

### Recommended Before Launch
- [ ] Enable leaked password protection (Supabase Auth settings)
- [ ] Disable auto-confirm emails for production
- [ ] Set up real payment integration (currently demo)
- [ ] Configure email templates
- [ ] Set up monitoring/alerting
- [ ] Add rate limiting to Edge Functions

## 📝 License

© 2025 Spiritual Learning Portal. All rights reserved.
