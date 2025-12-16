# Spiritual Learning Portal

A production-ready spiritual education platform built with React, Vite, TypeScript, and Lovable Cloud.

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React + Vite)                   │
├─────────────────────────────────────────────────────────────────┤
│  Pages          │  Components      │  Hooks          │  Services │
│  ├── Home       │  ├── common/     │  ├── useAuth    │  └── api  │
│  ├── Courses    │  ├── layout/     │  ├── useCourses │           │
│  ├── Dashboard  │  └── ui/         │  └── useEnroll  │           │
│  └── Admin      │                  │                  │           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       LOVABLE CLOUD (Backend)                    │
├─────────────────────────────────────────────────────────────────┤
│  Database (PostgreSQL)  │  Authentication  │  Edge Functions     │
│  ├── courses            │  ├── Email/Pass  │  └── (Extensible)   │
│  ├── lessons            │  └── Auto-confirm│                     │
│  ├── enrollments        │                  │                     │
│  ├── profiles           │                  │                     │
│  └── user_roles         │                  │                     │
└─────────────────────────────────────────────────────────────────┘
```

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS, shadcn/ui |
| State | TanStack Query, Custom Hooks |
| Backend | Lovable Cloud |
| Database | PostgreSQL with RLS |
| Auth | Email/Password Authentication |

## 📁 Project Structure

```
src/
├── components/
│   ├── common/          # Reusable components (Loading, Error, Empty)
│   ├── layout/          # Page layouts, headers, footer
│   └── ui/              # shadcn/ui components
├── hooks/               # Custom React hooks
│   ├── useAuth.ts       # Authentication state
│   ├── useCourses.ts    # Course data management
│   └── useEnrollment.ts # Enrollment management
├── pages/               # Route pages
├── services/            # API service layer
│   └── api.ts           # Centralized backend calls
├── types/               # TypeScript type definitions
├── utils/               # Utility functions
│   ├── validation.ts    # Input validation with Zod
│   └── constants.ts     # App constants
└── integrations/        # Auto-generated backend client
```

## 🔐 Security Features

- **Row Level Security (RLS)** on all database tables
- **Role-based access control** (Admin/Member/Visitor)
- **Input validation** with Zod schemas
- **Secure authentication** with session management
- **No secrets in frontend code**

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

Environment variables are auto-managed by Lovable Cloud. See `.env.example` for reference.

## 📦 Build & Deployment

```bash
# Production build
npm run build

# Preview production build
npm run preview
```

### Deployment
- Click **Publish** in Lovable to deploy
- Frontend and backend deploy automatically

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [BACKEND.md](./BACKEND.md) | Database schema, RLS policies, edge functions |
| [SECURITY.md](./SECURITY.md) | Security architecture and recommendations |

## 🎨 Design System

Uses CSS custom properties defined in `src/index.css`:
- Semantic color tokens (light/dark themes)
- Custom shadows and gradients
- Consistent typography with Playfair Display + Inter

## 📊 Database Schema

| Table | Purpose |
|-------|---------|
| `courses` | Course content |
| `lessons` | Course lessons with ordering |
| `enrollments` | User course enrollments |
| `lesson_completions` | Progress tracking |
| `profiles` | User profile data |
| `user_roles` | Role-based access control |

## 🔄 API Layer

All backend interactions go through `src/services/api.ts`:

```typescript
import { courseService, authService } from '@/services/api';

const courses = await courseService.getAllCourses();
await authService.signIn(email, password);
```

## 📝 License

© 2025 Spiritual Learning Portal. All rights reserved.
