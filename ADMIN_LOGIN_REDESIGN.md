# Admin Login System Redesign

## Overview
The admin login system has been revamped to use the standard login flow. Admins now login like regular users, and are automatically redirected to the admin panel based on their role.

---

## What Changed

### ✅ Before (Old System)
```
1. Admins used: POST /api/auth/admin-demo-login
2. Special demo admin endpoint with hardcoded credentials
3. Different login flow than regular users
4. Confusing UX with multiple login paths
```

### ✅ After (New System)
```
1. All users (including admins) use: POST /api/auth/login
2. Standard email/username + password login
3. Same login flow for everyone
4. Role-based redirect after successful login
5. Admin emails configured in backend (src/config/admin.ts)
```

---

## How It Works

### Backend Changes

#### 1. Auth Controller (src/controllers/auth-controller.ts)
- **Standard login:** Already returns user role in response
- **Admin demo login:** Now deprecated (returns 410 Gone)
- **Admin detection:** Uses `isAdminEmail()` from config/admin.ts

#### 2. Admin Email Configuration (src/config/admin.ts)
```typescript
// Admins are defined by email in the config
const DEFAULT_ADMIN_EMAILS = [
  "asirmahmuhddd@gmail.com",
  "mustahid000@gmail.com",
  "siam.khandaker@g.bracu.ac.bd",
  "farhan.tanvir3@g.bracu.ac.bd"
];

// Can also be set via env variable
process.env.ADMIN_EMAILS = "admin1@example.com,admin2@example.com"
```

**When a user signs up or logs in with an admin email:**
- Role is automatically set to "ADMIN"
- JWT token includes `role: "ADMIN"`

---

### Frontend Changes

#### 1. NextAuth Configuration (src/auth.ts)
**Removed:** Special demo admin detection logic
```typescript
// ❌ OLD - Checked for demo admin identifier
const isDemoAdmin = identifier === "admin@meeramoot.demo";
const loginPath = isDemoAdmin ? "/api/auth/admin-demo-login" : "/api/auth/login";
```

**Now:** All users use standard endpoint
```typescript
// ✅ NEW - Always use standard login
const res = await fetch(`${apiBase}/api/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ identifier, password }),
});
```

#### 2. Login Redirect Logic (src/components/auth/AuthCard.tsx)
Already present - checks user role after login:
```typescript
if (user.role === "ADMIN") {
  router.push("/admin/vendors");
  router.refresh();
  return;
}
```

#### 3. Route Protection Middleware (src/middleware.ts)
**New file** that protects role-based routes:
```typescript
// Protects /admin/* routes - only ADMIN role can access
if (pathname.startsWith("/admin")) {
  if (!token || token.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/login", req.url));
  }
}

// Protects /vendor/* routes - only VENDOR role can access
if (pathname.startsWith("/vendor")) {
  if (!token || token.role !== "VENDOR") {
    return NextResponse.redirect(new URL("/", req.url));
  }
}

// Similarly protects /delivery/* and /delivery-admin/*
```

---

## Login Flow Diagram

```
┌─────────────────┐
│  Login Page     │
│ (all users)     │
└────────┬────────┘
         │
         v
┌─────────────────────────┐
│ POST /api/auth/login    │
│ identifier + password   │
└────────┬────────────────┘
         │
         v
┌──────────────────────────────┐
│ Backend validates creds      │
│ Checks if email is admin     │
│ Returns JWT + user role      │
└────────┬─────────────────────┘
         │
         v
┌────────────────────────────────┐
│ Frontend receives response      │
│ Stores token in NextAuth session│
│ JWT now contains: role         │
└────────┬───────────────────────┘
         │
         v
┌─────────────────────────────────┐
│ Check user.role in AuthCard     │
├─────────────────────────────────┤
│ If role === "ADMIN"             │
│  → Redirect to /admin/vendors   │
├─────────────────────────────────┤
│ If role === "VENDOR"            │
│  → Check vendor application     │
│  → Redirect to /vendor/* page   │
├─────────────────────────────────┤
│ If role === "CUSTOMER"          │
│  → Redirect to /                │
├─────────────────────────────────┤
│ If role === "DELIVERY"          │
│  → Redirect to /delivery/*      │
└─────────────────────────────────┘
```

---

## Testing the New System

### 1. Create an Admin Account
**Sign up with an admin email:**
```
Email: asirmahmuhddd@gmail.com
Password: SecurePass123!
```

After signup, the system automatically sets role = "ADMIN"

### 2. Login as Admin
```
Email: asirmahmuhddd@gmail.com
Password: SecurePass123!
```

After login:
- ✅ Redirected to `/admin/vendors`
- ✅ Can access all `/admin/*` pages
- ✅ Middleware protects routes

### 3. Try Accessing Admin Routes as Non-Admin
```
1. Login with a customer account
2. Try to navigate to /admin/vendors
3. Middleware redirects to / (home page)
```

---

## API Endpoints

### Standard Login (All Users)
```
POST /api/auth/login
Content-Type: application/json

Request:
{
  "identifier": "asirmahmuhddd@gmail.com",  // email or username
  "password": "SecurePass123!"
}

Response (200 OK):
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-id",
    "name": "Admin Name",
    "username": "admin_username",
    "email": "asirmahmuhddd@gmail.com",
    "phone": "1234567890",
    "role": "ADMIN"  // Role included in response
  }
}
```

### Deprecated Demo Login
```
POST /api/auth/admin-demo-login

Response (410 Gone):
{
  "message": "Deprecated: Use the standard /login endpoint instead...",
  "hint": "Send credentials to POST /api/auth/login..."
}
```

---

## Environment Variables

No new environment variables required. The system uses the existing config:

**src/config/admin.ts:**
```env
# Optional: Set admin emails via environment
ADMIN_EMAILS="admin1@example.com,admin2@example.com"

# Or use defaults in admin.ts:
# - asirmahmuhddd@gmail.com
# - mustahid000@gmail.com
# - siam.khandaker@g.bracu.ac.bd
# - farhan.tanvir3@g.bracu.ac.bd
```

---

## Security Improvements

✅ **Unified login path** - Single, well-tested authentication flow  
✅ **Role-based protection** - Middleware validates user role before accessing admin routes  
✅ **No hardcoded credentials** - Admin status determined by email configuration  
✅ **Consistent JWT usage** - All auth systems use JWT tokens  
✅ **Environment-configurable** - Admin emails can be set via environment variables  

---

## Troubleshooting

### Issue: Admin can't access /admin routes after login
**Cause:** Middleware not loading role from token  
**Solution:** Ensure NextAuth session includes `role` field in JWT callback

### Issue: Non-admin user can access /admin routes
**Cause:** Middleware condition not properly checking role  
**Solution:** Verify middleware.ts is installed in src/ directory

### Issue: Redirect loop between login and admin
**Cause:** Token not being properly stored or read  
**Solution:** Check browser DevTools > Application > Cookies for NextAuth session cookie

---

## Files Modified

### Backend
- `src/controllers/auth-controller.ts` - Deprecated adminDemoLogin
- `src/config/admin.ts` - Admin email configuration (unchanged)

### Frontend
- `src/auth.ts` - Removed demo admin special handling
- `src/components/auth/AuthCard.tsx` - Existing redirect logic (unchanged)
- `src/middleware.ts` - NEW: Route protection middleware

---

## Rollback Instructions

If you need to revert to the old system:

1. **Restore demo login endpoint** in `src/controllers/auth-controller.ts`
2. **Restore demo admin detection** in `src/auth.ts`
3. **Remove middleware.ts** from `src/`

However, the new system is recommended as it's more secure and user-friendly.

---

## Future Enhancements

- [ ] Multi-factor authentication for admins
- [ ] Admin session activity logging
- [ ] Admin permission granularity (super admin, moderators, support)
- [ ] Admin audit trail for all actions
- [ ] Passwordless login option (magic links)
