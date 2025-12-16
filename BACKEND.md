# Backend Documentation (Lovable Cloud)

This project uses Lovable Cloud, which provides a fully managed backend powered by Supabase.

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
Role-based access control (RBAC).
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

### courses
| Operation | Policy |
|-----------|--------|
| SELECT | Anyone (public) |
| INSERT | Admins only |
| UPDATE | Admins only |
| DELETE | Admins only |

### lessons
| Operation | Policy |
|-----------|--------|
| SELECT | Anyone (public) |
| ALL | Admins only |

### enrollments
| Operation | Policy |
|-----------|--------|
| SELECT | Own records OR admin |
| INSERT | Members only (own records) |
| UPDATE | Own records only |
| DELETE | Own records only |

### lesson_completions
| Operation | Policy |
|-----------|--------|
| SELECT | Own records only |
| INSERT | Members only (own records) |
| DELETE | Own records only |

### profiles
| Operation | Policy |
|-----------|--------|
| SELECT | Public |
| INSERT | Own record only |
| UPDATE | Own record only |

### user_roles
| Operation | Policy |
|-----------|--------|
| SELECT | Own records only |
| ALL | Admins only |

## 🔧 Database Functions

### `has_role(user_id, role)`
Security definer function to check user roles without triggering RLS recursion.
```sql
SELECT has_role(auth.uid(), 'admin'); -- Returns BOOLEAN
```

### `calculate_course_progress(user_id, course_id)`
Calculate completion percentage for a user's course.
```sql
SELECT calculate_course_progress('user-uuid', 'course-uuid'); -- Returns INTEGER (0-100)
```

### `handle_new_user()`
Trigger function that auto-creates profile on user signup.

## 🚀 Edge Functions (Future)

Edge functions can be added in `/supabase/functions/` for:
- External API integrations
- Webhook handlers
- Custom business logic
- Rate limiting

## ⚙️ Security Configuration

### Auth Settings
- Email/password authentication enabled
- Auto-confirm enabled (for development)
- Session persistence via localStorage

### Recommendations for Production
1. Enable leaked password protection in auth settings
2. Configure proper email templates
3. Set up custom domain for auth emails
4. Enable MFA for admin accounts

## 📊 Accessing Backend Data

View and manage your backend via Lovable Cloud dashboard:

1. Open project in Lovable
2. Navigate to Cloud tab
3. Access:
   - Database tables
   - User management
   - Storage buckets
   - Edge function logs

## 🔄 Migrations

Database migrations are managed through Lovable's migration system:
- Located in `/supabase/migrations/`
- Auto-applied on deployment
- Version controlled with project
