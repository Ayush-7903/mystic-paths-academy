# Security Documentation

## 🛡️ Security Architecture

This document outlines the security measures implemented in the Spiritual Learning Portal.

## Authentication

### Implementation
- **Method**: Email/password via Supabase Auth
- **Session Storage**: localStorage with auto-refresh
- **Token Refresh**: Automatic via Supabase client

### Security Measures
- Password minimum 6 characters
- Email validation with Zod
- Session persistence with proper cleanup
- Auth state listener with deadlock prevention

### Recommendations
⚠️ **Enable for Production**:
- Leaked password protection
- Email confirmation (currently auto-confirm for dev)
- Rate limiting on auth endpoints

## Authorization

### Role-Based Access Control (RBAC)
```
┌─────────────┬──────────────────────────────────────────┐
│ Role        │ Permissions                              │
├─────────────┼──────────────────────────────────────────┤
│ Admin       │ Full CRUD on courses, lessons, roles     │
│ Member      │ Enroll, track progress, view content     │
│ Visitor     │ View courses (public)                    │
└─────────────┴──────────────────────────────────────────┘
```

### Role Checking
Roles are stored separately from profiles to prevent privilege escalation:
```typescript
// ✅ Correct: Query separate roles table
const { data } = await supabase
  .from('user_roles')
  .select('role')
  .eq('user_id', userId)
  .eq('role', 'admin');

// ❌ Wrong: Never store roles on profile/user table
```

## Row Level Security (RLS)

All tables have RLS enabled with restrictive policies:

### Policy Types
1. **Restrictive (USING)**: Filter rows user can see
2. **Permissive (WITH CHECK)**: Validate data user can insert

### Security Definer Functions
Used to prevent RLS recursion when checking roles:
```sql
CREATE FUNCTION has_role(_user_id uuid, _role app_role)
RETURNS boolean
SECURITY DEFINER  -- Executes with owner privileges
SET search_path = public  -- Prevents search_path attacks
```

## Input Validation

### Client-Side (Zod)
All forms use Zod schemas for validation:
```typescript
import { emailSchema, passwordSchema } from '@/utils/validation';

// Validates: format, length, required
emailSchema.parse(userInput);
```

### Server-Side (RLS)
Database constraints and RLS policies provide additional validation:
- NOT NULL constraints
- Foreign key constraints
- RLS policy checks

## API Security

### Supabase Client
- Uses anon key (safe to expose)
- All queries filtered by RLS
- No raw SQL execution in frontend

### Edge Functions (Future)
When implementing:
- Input validation required
- CORS headers configured
- Rate limiting via middleware
- No secrets in responses

## Data Protection

### Sensitive Data
| Data Type | Protection Method |
|-----------|-------------------|
| Passwords | Hashed by Supabase Auth |
| User emails | RLS restricted |
| Payment info | Demo only (not stored) |

### What's NOT Stored
- Real payment card numbers
- Social security numbers
- Any PII beyond email/name

## Security Checklist

### ✅ Implemented
- [x] RLS enabled on all tables
- [x] Role-based access control
- [x] Input validation (client)
- [x] Auth state management
- [x] Secure function search_path
- [x] XSS prevention (React)
- [x] CSRF protection (Supabase)

### ⚠️ Recommended for Production
- [ ] Enable leaked password protection
- [ ] Implement rate limiting
- [ ] Add audit logging
- [ ] Set up security monitoring
- [ ] Configure CSP headers
- [ ] Enable MFA for admins

## Vulnerability Reporting

If you discover a security vulnerability, please:
1. Do NOT create a public issue
2. Contact the development team directly
3. Allow time for a fix before disclosure

## Security Updates

Keep dependencies updated:
```bash
npm audit
npm update
```

Monitor Supabase security advisories and apply patches promptly.
