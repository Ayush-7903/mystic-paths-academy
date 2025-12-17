# Backend Documentation (Lovable Cloud)

This document describes the backend architecture located in the `supabase/` directory.

## 🏗️ Backend Structure

```
supabase/                     # BACKEND ROOT
├── functions/                # Edge Functions (serverless)
│   └── [function-name]/      # Each function folder
│       └── index.ts          # Function entry point
│
├── migrations/               # Database schema migrations
│   └── *.sql                 # Versioned SQL changes
│
└── config.toml               # Backend configuration
```

### Key Principle: Separation of Concerns

| What | Where | Purpose |
|------|-------|---------|
| UI Logic | `src/` (frontend) | User interface, client state |
| Business Logic | `supabase/functions/` | Secure server-side processing |
| Data Access | Database RLS | Enforced at database level |
| External APIs | Edge Functions | No secrets in frontend |

## 🏛️ Database Architecture

### Tables

#### `profiles`
User profile information, auto-created on signup via trigger.
```sql
- id: UUID (references auth.users)
- full_name: TEXT
- is_member: BOOLEAN
- member_since: TIMESTAMP
- created_at, updated_at: TIMESTAMP
```

#### `user_roles`
Role-based access control (RBAC). **Stored separately from profiles for security.**
```sql
- id: UUID
- user_id: UUID (references auth.users)
- role: ENUM ('admin', 'user')
- created_at: TIMESTAMP
```

#### `courses`
Course content storage.
```sql
- id: UUID
- title: TEXT
- description: TEXT
- video_url: TEXT
- image_url: TEXT (nullable)
- created_at, updated_at: TIMESTAMP
```

#### `lessons`
Course lessons with section grouping.
```sql
- id: UUID
- course_id: UUID (references courses)
- title: TEXT
- content: TEXT
- order_number: INTEGER
- section: TEXT (nullable)
- created_at, updated_at: TIMESTAMP
```

#### `enrollments`
User course enrollment tracking.
```sql
- id: UUID
- user_id: UUID
- course_id: UUID (references courses)
- progress: INTEGER (0-100)
- enrolled_at: TIMESTAMP
```

#### `lesson_completions`
Per-lesson progress tracking.
```sql
- id: UUID
- user_id: UUID
- lesson_id: UUID (references lessons)
- completed_at: TIMESTAMP
```

## 🔐 Row Level Security (RLS) Policies

All tables have RLS enabled. Access is enforced at the database level.

### courses
| Operation | Policy | Notes |
|-----------|--------|-------|
| SELECT | Anyone | Public course catalog |
| INSERT | Admins only | Via `has_role()` function |
| UPDATE | Admins only | Via `has_role()` function |
| DELETE | Admins only | Via `has_role()` function |

### lessons
| Operation | Policy | Notes |
|-----------|--------|-------|
| SELECT | Anyone | Public lesson content |
| ALL | Admins only | Full CRUD for admins |

### enrollments
| Operation | Policy | Notes |
|-----------|--------|-------|
| SELECT | Own records OR Admin | Users see own, admins see all |
| INSERT | Members only | Must be member + own user_id |
| UPDATE | Own records only | Progress updates |
| DELETE | Own records only | Unenroll |

### lesson_completions
| Operation | Policy | Notes |
|-----------|--------|-------|
| SELECT | Own records only | Privacy protected |
| INSERT | Members only | Must be member |
| DELETE | Own records only | Unmark complete |

### profiles
| Operation | Policy | Notes |
|-----------|--------|-------|
| SELECT | Own record only | ✅ **Privacy protected** |
| INSERT | Own record only | Auto-created via trigger |
| UPDATE | Own record only | User updates own profile |

### user_roles
| Operation | Policy | Notes |
|-----------|--------|-------|
| SELECT | Own records only | Users see own roles |
| ALL | Admins only | Role management |

## 🔧 Database Functions

### `has_role(user_id, role)`
Security definer function to check user roles without triggering RLS recursion.

```sql
-- Usage in RLS policy
USING (public.has_role(auth.uid(), 'admin'))
```

**Why Security Definer?** Prevents infinite recursion when RLS policies need to check the `user_roles` table.

### `calculate_course_progress(user_id, course_id)`
Calculate completion percentage for a user's course.

```sql
SELECT calculate_course_progress('user-uuid', 'course-uuid'); 
-- Returns INTEGER (0-100)
```

### `handle_new_user()`
Trigger function that auto-creates profile on user signup.

### `update_updated_at_column()`
Trigger function for automatic timestamp updates.

## 🚀 Edge Functions

Edge Functions provide serverless backend logic. Located in `supabase/functions/`.

### Creating an Edge Function

```typescript
// supabase/functions/my-function/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Your logic here
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

### Use Cases for Edge Functions
- External API integrations (with secrets)
- Webhook handlers
- Custom business logic
- Rate limiting
- Data processing

## ⚙️ Security Configuration

### Current Auth Settings
- ✅ Email/password authentication enabled
- ⚠️ Auto-confirm enabled (disable for production)
- ✅ Session persistence via localStorage

### Security Definer Functions
All helper functions use `SECURITY DEFINER` with explicit `search_path`:

```sql
CREATE FUNCTION my_function()
RETURNS ...
SECURITY DEFINER
SET search_path = public
AS $$ ... $$;
```

## ⚠️ Production Recommendations

1. **Enable leaked password protection** - Auth settings
2. **Disable auto-confirm emails** - Require email verification
3. **Configure email templates** - Branded emails
4. **Set up custom domain** - For auth emails
5. **Enable MFA for admins** - Extra security layer
6. **Add rate limiting** - Edge Functions
7. **Set up monitoring** - Error tracking

## 📊 Accessing Backend

View and manage your backend via Lovable Cloud:

1. Open project in Lovable
2. Navigate to **Cloud** tab
3. Access:
   - Database tables & records
   - User management
   - Storage buckets
   - Edge function logs
   - Auth settings

## 🔄 Migrations

Database migrations are in `supabase/migrations/`:

- Auto-applied on deployment
- Version controlled
- Use Lovable's migration tool for changes

### Migration Best Practices
- Never modify existing migrations
- Create new migrations for changes
- Test migrations in development first
- Include RLS policies in migrations
