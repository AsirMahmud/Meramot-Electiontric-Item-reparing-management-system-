# Meeramoot Electric Item Repairing Management System
## Comprehensive Routes & Authorization Audit

**Last Updated:** April 28, 2026  
**Project:** Full-stack marketplace for electric item repair management  
**Backend:** Express.js (TypeScript), Prisma ORM, PostgreSQL  

---

## 📋 Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Middleware Stack](#middleware-stack)
3. [Authentication Systems](#authentication-systems)
4. [Route Structure](#route-structure)
5. [Detailed Endpoints by Resource](#detailed-endpoints-by-resource)
6. [Authorization Matrix](#authorization-matrix)
7. [File Structure Reference](#file-structure-reference)

---

## Architecture Overview

### Key Entry Points
- **Main App:** [src/app.ts](src/app.ts) - Express app factory with all routes mounted
- **Routes Index:** [src/routes/index.ts](src/routes/index.ts) - Main route grouping
- **Middleware Auth:** [src/middleware/require-auth.ts](src/middleware/require-auth.ts), [src/middleware/require-admin.ts](src/middleware/require-admin.ts)

### API Base URLs
```
Public Routes:       /api/...
Admin Routes:        /api/admin/...
Delivery Routes:     /api/delivery/...
Delivery Admin:      /api/delivery-admin/...
```

### Request Flow
```
Express App (port 4000)
  ↓
CORS Middleware (frontend origin: http://localhost:3000)
  ↓
Rate Limiter (apiRateLimiter)
  ↓
Route Handler
  ↓
Middleware (auth, requireAdmin, etc.)
  ↓
Controller
  ↓
Prisma Query
```

---

## Middleware Stack

### Core Authentication Middleware

#### 1. `requireAuth` [src/middleware/require-auth.ts](src/middleware/require-auth.ts)
**Purpose:** Validates JWT token and extracts user context  
**Token Type:** JWT (HS256)  
**Secret:** `env.jwtSecret`  
**JWT Payload Structure:**
```typescript
{
  sub: string;        // User ID
  role?: string;      // User role (CUSTOMER, VENDOR, ADMIN, DELIVERY, DELIVERY_ADMIN)
  username?: string;
  email?: string;
}
```
**Exports:**
- `AuthenticatedRequest` - Express Request type with `user` property
- `requireAuth` - Middleware function

**Usage:** Applied to protected routes requiring any authenticated user

---

#### 2. `requireAdmin` [src/middleware/require-admin.ts](src/middleware/require-admin.ts)
**Purpose:** Restricts access to ADMIN role only  
**Prerequisite:** `requireAuth` must be called first  
**Check:** `req.user.role === "ADMIN"`  
**Error Response:** 403 Forbidden if role !== ADMIN

**Usage:** Applied to all `/api/admin/*` routes

---

#### 3. `requireDeliveryAuth` [src/middleware/delivery-auth-middleware.ts](src/middleware/delivery-auth-middleware.ts)
**Purpose:** Validates delivery partner JWT token  
**Token Type:** JWT (HS256)  
**Secret:** `env.jwtSecretDelivery`  
**JWT Payload Structure:**
```typescript
{
  sub: string;       // User ID
  aud: "delivery";   // Audience (must be "delivery")
}
```
**Checks:**
- Token exists and has Bearer prefix
- `aud === "delivery"`
- User exists and has role === "DELIVERY"
- User status === "ACTIVE"

**Exports:**
- `requireDeliveryAuth` - Validates token
- `requireApprovedDeliveryPartner` - Checks `registrationStatus === "APPROVED"`

**Usage:** Applied to `/api/delivery/*` routes

---

#### 4. `requireDeliveryAdminAuth` [src/middleware/delivery-admin-auth-middleware.ts](src/middleware/delivery-admin-auth-middleware.ts)
**Purpose:** Validates delivery admin JWT token  
**Token Type:** JWT (HS256)  
**Secret:** `env.jwtSecretDeliveryAdmin`  
**JWT Payload Structure:**
```typescript
{
  sub: string;              // User ID
  aud: "delivery_admin";    // Audience (must be "delivery_admin")
}
```
**Checks:**
- Token exists and has Bearer prefix
- `aud === "delivery_admin"`
- User exists and has role === "ADMIN" or "DELIVERY_ADMIN"
- User status === "ACTIVE"

**Usage:** Applied to `/api/delivery-admin/*` routes

---

#### 5. Rate Limiter [src/middleware/rate-limit.ts](src/middleware/rate-limit.ts)
**Types:**
- `apiRateLimiter` - Applied to `/api/*` (global)
- `loginRateLimiter` - Applied to login endpoints

**Usage Pattern:**
```javascript
router.post("/login", loginRateLimiter, login);
```

---

## Authentication Systems

### System 1: Standard User Authentication
**Token Secret:** `env.jwtSecret`  
**Users:** CUSTOMER, VENDOR, ADMIN  
**Endpoint:** `POST /api/auth/login`  
**Response:** JWT token with user role

### System 2: Delivery Partner Authentication
**Token Secret:** `env.jwtSecretDelivery`  
**Audience:** `delivery`  
**Users:** DELIVERY role  
**Endpoints:**
- `POST /api/delivery/auth/register` - Create delivery account
- `POST /api/delivery/auth/login` - Authenticate delivery partner

**Flow:**
1. Create account with documents (NID, education, CV)
2. Status starts as PENDING
3. Admin approves via `PATCH /api/delivery-admin/partners/:id/approve`
4. Once approved, can access delivery routes

### System 3: Delivery Admin Authentication
**Token Secret:** `env.jwtSecretDeliveryAdmin`  
**Audience:** `delivery_admin`  
**Users:** DELIVERY_ADMIN or ADMIN role  
**Endpoint:** `POST /api/delivery-admin/auth/login`

### System 4: Standard Admin Login
**Type:** Demo admin login (for testing)  
**Endpoint:** `POST /api/auth/admin-demo-login`  
**Rate Limited:** Yes

---

## Route Structure

### Mount Points (from [src/app.ts](src/app.ts))

```
/api                          → [src/routes/index.ts](src/routes/index.ts)
├── /health                   → Health check endpoint
├── /auth                      → [src/routes/auth-routes.ts](src/routes/auth-routes.ts)
├── /shops                     → [src/routes/shop-routes.ts](src/routes/shop-routes.ts)
├── /profile                   → [src/routes/profile-routes.ts](src/routes/profile-routes.ts)
├── /notifications             → [src/routes/notification-routes.ts](src/routes/notification-routes.ts)
├── /cart                      → [src/routes/cart-routes.ts](src/routes/cart-routes.ts)
├── /requests                  → [src/routes/request-routes.ts](src/routes/request-routes.ts)
├── /ai                        → [src/routes/ai-routes.ts](src/routes/ai-routes.ts)
├── /payments                  → [src/routes/payment-routes.ts](src/routes/payment-routes.ts)
├── /payments/:paymentId/invoice → [src/routes/invoice-routes.ts](src/routes/invoice-routes.ts)
├── /vendor                    → [src/routes/vendor-status-routes.ts](src/routes/vendor-status-routes.ts)
│
└── /admin                     → [src/routes/admin-routes.ts](src/routes/admin-routes.ts)
    ├── /admin                 → [src/routes/admin-routes.ts](src/routes/admin-routes.ts)
    ├── /admin                 → [src/routes/vendor-review-routes.ts](src/routes/vendor-review-routes.ts)
    ├── /admin                 → [src/routes/support-ticket-routes.ts](src/routes/support-ticket-routes.ts)
    ├── /admin                 → [src/routes/dispute-routes.ts](src/routes/dispute-routes.ts)
    ├── /admin                 → [src/routes/refund-routes.ts](src/routes/refund-routes.ts)
    └── /admin                 → [src/routes/financial-ledger-routes.ts](src/routes/financial-ledger-routes.ts)

/api/delivery/auth            → [src/routes/delivery-auth-routes.ts](src/routes/delivery-auth-routes.ts)
/api/delivery                 → [src/routes/delivery-routes.ts](src/routes/delivery-routes.ts)
/api/delivery-admin/auth      → [src/routes/delivery-admin-auth-routes.ts](src/routes/delivery-admin-auth-routes.ts)
/api/delivery-admin           → [src/routes/delivery-admin-routes.ts](src/routes/delivery-admin-routes.ts)
```

---

## Detailed Endpoints by Resource

### 🔐 Authentication Routes
**File:** [src/routes/auth-routes.ts](src/routes/auth-routes.ts)  
**Mount:** `/api/auth`

| Method | Endpoint | Auth | Rate Limit | Purpose |
|--------|----------|------|-----------|---------|
| POST | `/signup` | None | - | User registration |
| POST | `/login` | None | ✅ loginRateLimiter | Standard login |
| POST | `/admin-demo-login` | None | ✅ loginRateLimiter | Admin demo account |
| GET | `/check-username` | None | - | Check username availability |
| POST | `/google-exchange` | None | - | Google OAuth exchange |

**Controllers:** [src/controllers/auth-controller.ts](src/controllers/auth-controller.ts)

---

### 🏪 Shop Routes
**File:** [src/routes/shop-routes.ts](src/routes/shop-routes.ts)  
**Mount:** `/api/shops`

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/` | None | List all shops with filters |
| GET | `/featured` | None | Get featured shops |
| GET | `/:slug` | None | Get shop by slug |
| GET | `/:shopSlug/reviews` | None | Get shop reviews |
| GET | `/:shopSlug/review-eligibility` | ✅ requireAuth | Check if user can review |
| POST | `/:shopSlug/reviews` | ✅ requireAuth | Create review |

**Controllers:** [src/controllers/shop-controllers.ts](src/controllers/shop-controllers.ts), [src/controllers/review-controller.ts](src/controllers/review-controller.ts)

---

### 📦 Repair Request Routes
**File:** [src/routes/request-routes.ts](src/routes/request-routes.ts)  
**Mount:** `/api/requests`  
**Auth:** ✅ requireAuth (all routes)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/mine` | List current user's repair requests |
| POST | `/` | Create new repair request |
| PATCH | `/:requestId/status` | Update request status |

**Controllers:** [src/controllers/request-controller.ts](src/controllers/request-controller.ts)

---

### 👤 Profile Routes
**File:** [src/routes/profile-routes.ts](src/routes/profile-routes.ts)  
**Mount:** `/api/profile`  
**Auth:** ✅ requireAuth (all routes)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/me` | Get current user profile |
| PATCH | `/me` | Update current user profile |

**Controllers:** [src/controllers/profile-controller.ts](src/controllers/profile-controller.ts)

---

### 🛒 Cart Routes
**File:** [src/routes/cart-routes.ts](src/routes/cart-routes.ts)  
**Mount:** `/api/cart`  
**Auth:** ✅ requireAuth (all routes)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/` | Get active carts |
| POST | `/items` | Add item to cart |
| PATCH | `/items/:itemId` | Update cart item |
| DELETE | `/items/:itemId` | Remove cart item |
| POST | `/:cartId/checkout` | Checkout cart |

**Controllers:** [src/controllers/cart-controller.ts](src/controllers/cart-controller.ts)

---

### 💳 Payment Routes
**File:** [src/routes/payment-routes.ts](src/routes/payment-routes.ts)  
**Mount:** `/api/payments`

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/sslcommerz/init` | ✅ requireAuth | Initiate SSLCommerz payment |
| GET\|POST | `/sslcommerz/success` | None | Success callback |
| GET\|POST | `/sslcommerz/fail` | None | Failure callback |
| GET\|POST | `/sslcommerz/cancel` | None | Cancellation callback |
| GET\|POST | `/sslcommerz/ipn` | None | IPN webhook |
| GET | `/admin/list` | ✅ requireAuth, requireAdmin | List all payments |
| GET | `/sslcommerz/transaction/:tranId` | ✅ requireAuth, requireAdmin | Query transaction |
| POST | `/sslcommerz/refund/initiate` | ✅ requireAuth, requireAdmin | Initiate refund |
| GET | `/sslcommerz/refund/:refundRefId` | ✅ requireAuth, requireAdmin | Query refund |
| GET | `/:paymentId` | ✅ requireAuth | Get user's payment |

**Controllers:** [src/controllers/payment-controller.ts](src/controllers/payment-controller.ts)  
**Payment Gateway:** SSLCommerz (Bangladeshi payment processor)

---

### 🎫 Invoice Routes
**File:** [src/routes/invoice-routes.ts](src/routes/invoice-routes.ts)  
**Mount:** `/api/payments`  
**Auth:** ✅ requireAuth

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/payments/:paymentId/invoice` | Get invoice for payment (owner or admin) |

**Controllers:** [src/controllers/payment-controller.ts](src/controllers/payment-controller.ts)

---

### 🤖 AI Routes
**File:** [src/routes/ai-routes.ts](src/routes/ai-routes.ts)  
**Mount:** `/api/ai`

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/chat` | None | Chat with AI assistant |

**Controllers:** [src/controllers/ai-controller.ts](src/controllers/ai-controller.ts)

---

### 📬 Notification Routes
**File:** [src/routes/notification-routes.ts](src/routes/notification-routes.ts)  
**Mount:** `/api/notifications`

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/test-order-status` | None | Send test notification |

**Controllers:** [src/controllers/notification-controller.ts](src/controllers/notification-controller.ts)

---

### 🚚 Delivery Routes
**File:** [src/routes/delivery-routes.ts](src/routes/delivery-routes.ts)  
**Mount:** `/api/delivery`  
**Auth:** ✅ requireDeliveryAuth, requireApprovedDeliveryPartner (except /me)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/me` | Get current delivery partner profile (requireDeliveryAuth only) |
| GET | `/deliveries` | List my active deliveries |
| PATCH | `/deliveries/:id/accept` | Accept delivery assignment |
| PATCH | `/deliveries/:id/status` | Update delivery status |
| PATCH | `/location` | Update current GPS location |
| GET | `/payouts` | Get payout summary |
| POST | `/payouts/request` | Request payout |
| GET | `/deliveries/:id/chat` | Get chat messages for delivery |
| POST | `/deliveries/:id/chat` | Send chat message |

**Controllers:** [src/controllers/delivery-controller.ts](src/controllers/delivery-controller.ts)

---

### 🚚 Delivery Authentication
**File:** [src/routes/delivery-auth-routes.ts](src/routes/delivery-auth-routes.ts)  
**Mount:** `/api/delivery/auth`

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/register` | Register as delivery partner (PENDING) |
| POST | `/login` | Login as delivery partner |

**Controllers:** [src/controllers/delivery-auth-controller.ts](src/controllers/delivery-auth-controller.ts)

---

### 🚚 Delivery Admin Routes
**File:** [src/routes/delivery-admin-routes.ts](src/routes/delivery-admin-routes.ts)  
**Mount:** `/api/delivery-admin`  
**Auth:** ✅ requireDeliveryAdminAuth (all routes)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/me` | Get current delivery admin profile |
| GET | `/stats` | Get delivery admin statistics |
| GET | `/partners` | List all delivery partners |
| PATCH | `/partners/:id/approve` | Approve partner registration |
| PATCH | `/partners/:id/reject` | Reject partner registration |
| GET | `/payout-requests` | List payout requests |
| PATCH | `/payout-requests/:id/approve` | Approve payout |
| GET | `/deliveries` | List all delivery orders |
| PATCH | `/deliveries/:id/assign` | Assign delivery to partner |
| GET | `/deliveries/:id/timeline` | Get delivery timeline |
| GET | `/deliveries/:id/chat` | Get delivery chat |
| POST | `/deliveries/:id/chat` | Send delivery chat |

**Controllers:** [src/controllers/delivery-admin-controller.ts](src/controllers/delivery-admin-controller.ts)

---

### 🚚 Delivery Admin Authentication
**File:** [src/routes/delivery-admin-auth-routes.ts](src/routes/delivery-admin-auth-routes.ts)  
**Mount:** `/api/delivery-admin/auth`

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/login` | Login as delivery admin |

**Controllers:** [src/controllers/delivery-admin-auth-controller.ts](src/controllers/delivery-admin-auth-controller.ts)

---

### 👨‍💼 Admin Dashboard Routes
**File:** [src/routes/admin-routes.ts](src/routes/admin-routes.ts)  
**Mount:** `/api/admin`  
**Auth:** ✅ requireAuth, requireAdmin (all routes)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/dashboard` | Admin dashboard overview |
| GET | `/users` | List all users (search, filter by role/status) |
| GET | `/users/:id` | Get user detail with history |
| PATCH | `/users/:id/status` | Ban/suspend/restore user (ACTIVE, SUSPENDED, DELETED) |
| GET | `/reviews` | List all reviews (pagination, filters) |
| DELETE | `/reviews/:id` | Delete review (recalculates shop rating) |
| PATCH | `/shops/:id/active` | Suspend/reinstate shop |

**Controllers:** [src/controllers/admin-controller.ts](src/controllers/admin-controller.ts)

---

### 🏪 Admin Vendor Review Routes
**File:** [src/routes/vendor-review-routes.ts](src/routes/vendor-review-routes.ts)  
**Mount:** `/api/admin`  
**Auth:** ✅ requireAuth, requireAdmin (all routes)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/vendors` | List all vendor applications |
| GET | `/vendors/pending` | List pending applications |
| GET | `/vendors/:id` | Get vendor application detail |
| PATCH | `/vendors/:id/approve` | Approve vendor (creates shop, updates role) |
| PATCH | `/vendors/:id/reject` | Reject vendor application |

**Controllers:** [src/controllers/vendor-status-controller.ts](src/controllers/vendor-status-controller.ts)

---

### 🎫 Admin Support Ticket Routes
**File:** [src/routes/support-ticket-routes.ts](src/routes/support-ticket-routes.ts)  
**Mount:** `/api/admin`  
**Auth:** ✅ requireAuth, requireAdmin (all routes)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/tickets` | List support tickets (filter by status) |
| GET | `/tickets/:id` | Get ticket detail with messages |
| PATCH | `/tickets/:id` | Update ticket (status, priority, notes, assign) |
| POST | `/tickets/:id/reply` | Send admin reply |
| POST | `/tickets/:id/escalate` | Escalate to dispute |

**Controllers:** [src/controllers/support-ticket-controller.ts](src/controllers/support-ticket-controller.ts)

---

### ⚖️ Admin Dispute Routes
**File:** [src/routes/dispute-routes.ts](src/routes/dispute-routes.ts)  
**Mount:** `/api/admin`  
**Auth:** ✅ requireAuth, requireAdmin (all routes)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/disputes` | List disputes (filter by status) |
| GET | `/disputes/:id` | Get dispute detail with notes |
| POST | `/disputes/:id/note` | Add internal/external note |
| PATCH | `/disputes/:id/resolve` | Resolve dispute |
| PATCH | `/disputes/:id/hold` | Put dispute on hold (waiting evidence) |

**Controllers:** [src/controllers/dispute-controller.ts](src/controllers/dispute-controller.ts)

---

### 💰 Admin Refund Routes
**File:** [src/routes/refund-routes.ts](src/routes/refund-routes.ts)  
**Mount:** `/api/admin`  
**Auth:** ✅ requireAuth, requireAdmin (all routes)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/refunds` | List all refunds |
| POST | `/refunds/:caseId/issue` | Issue full refund |
| POST | `/refunds/:caseId/partial` | Issue partial refund |
| POST | `/refunds/:caseId/deny` | Deny refund request |

**Controllers:** [src/controllers/refund-controller.ts](src/controllers/refund-controller.ts)

---

### 📊 Admin Financial Ledger Routes
**File:** [src/routes/financial-ledger-routes.ts](src/routes/financial-ledger-routes.ts)  
**Mount:** `/api/admin`  
**Auth:** ✅ requireAuth, requireAdmin (all routes)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/financial/summary` | Get platform financial summary |
| GET | `/ledger` | List ledger entries (pagination, filters) |
| GET | `/ledger/shop/:shopId` | Get ledger for specific shop |
| POST | `/ledger/settle/:paymentId` | Settle payment with commission |
| GET | `/settlements` | List settlement records |

**Controllers:** [src/controllers/financial-ledger-controller.ts](src/controllers/financial-ledger-controller.ts)  
**Commission Rate:** 5% (PLATFORM_COMMISSION_RATE)

---

### 👨‍🏭 Vendor Status Routes
**File:** [src/routes/vendor-status-routes.ts](src/routes/vendor-status-routes.ts)  
**Mount:** `/api/vendor`

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/` | None | Get vendor application status |
| PATCH | `/` | None | Update vendor application |

**Controllers:** [src/controllers/vendor-status-controller.ts](src/controllers/vendor-status-controller.ts)

---

## Authorization Matrix

### By User Role

#### 🟢 CUSTOMER
- ✅ Browse shops
- ✅ Create repair requests
- ✅ Place bids (if vendor)
- ✅ Make payments (SSLCommerz)
- ✅ Leave reviews
- ✅ Use cart system
- ✅ Chat during delivery
- ❌ Admin panel
- ❌ Delivery operations
- ❌ Access delivery admin

#### 🟢 VENDOR
- ✅ All CUSTOMER features
- ✅ Manage repair shop
- ✅ Respond to bids/quotes
- ✅ Manage services
- ✅ Receive payments
- ✅ View financial ledger (own)
- ❌ Admin panel
- ❌ Delivery operations
- ❌ Admin financial ledger

#### 🟡 ADMIN
- ✅ All CUSTOMER features
- ✅ Admin dashboard (overview)
- ✅ User management (list, search, ban, suspend)
- ✅ Review moderation (list, delete)
- ✅ Shop management (suspend/activate)
- ✅ Vendor approval (review applications)
- ✅ Support ticket management
- ✅ Dispute management (investigate, resolve)
- ✅ Refund management (issue, deny, partial)
- ✅ Financial ledger (view all, settle payments)
- ✅ Delivery admin management
- ❌ Delivery operations

#### 🔵 DELIVERY
- ✅ View assigned deliveries
- ✅ Accept delivery orders
- ✅ Update delivery status
- ✅ Send GPS location
- ✅ Request payouts
- ✅ Chat with customers
- ❌ Admin panel
- ❌ Approve other partners

#### 🔵 DELIVERY_ADMIN
- ✅ Same as ADMIN for delivery system
- ✅ Approve delivery partners
- ✅ Assign delivery orders
- ✅ Manage payouts
- ✅ View delivery analytics
- ✅ Chat with partners
- ❌ User management
- ❌ Vendor approval
- ❌ Dispute management

---

## File Structure Reference

### Controllers (Business Logic)
```
src/controllers/
├── auth-controller.ts              → signup, login, admin-demo-login, google-exchange
├── shop-controllers.ts             → getShops, getFeaturedShops, getShopBySlug
├── review-controller.ts            → canReviewShop, createReview, getShopReviews
├── request-controller.ts           → createRepairRequest, listMyRequests, updateRequestStatus
├── profile-controller.ts           → getProfile, updateProfile
├── cart-controller.ts              → cart operations
├── payment-controller.ts           → SSLCommerz payment handling
├── delivery-controller.ts          → Delivery partner operations
├── delivery-auth-controller.ts     → Delivery partner registration/login
├── delivery-admin-controller.ts    → Delivery admin management
├── delivery-admin-auth-controller.ts → Delivery admin login
├── vendor-status-controller.ts     → Vendor application status
├── ai-controller.ts                → AI chat endpoint
├── notification-controller.ts      → Notification sending
├── admin-controller.ts             → Admin dashboard, user management
├── support-ticket-controller.ts    → Support ticket management
├── dispute-controller.ts           → Dispute case management
├── refund-controller.ts            → Refund processing
└── financial-ledger-controller.ts  → Financial settlement
```

### Routes (Endpoint Definitions)
```
src/routes/
├── index.ts                        → Main route mounting point
├── auth-routes.ts                  → /api/auth/* endpoints
├── shop-routes.ts                  → /api/shops/* endpoints
├── request-routes.ts               → /api/requests/* endpoints
├── profile-routes.ts               → /api/profile/* endpoints
├── cart-routes.ts                  → /api/cart/* endpoints
├── payment-routes.ts               → /api/payments/* endpoints
├── invoice-routes.ts               → /api/payments/:paymentId/invoice
├── ai-routes.ts                    → /api/ai/* endpoints
├── notification-routes.ts          → /api/notifications/* endpoints
├── delivery-routes.ts              → /api/delivery/* endpoints
├── delivery-auth-routes.ts         → /api/delivery/auth/* endpoints
├── delivery-admin-routes.ts        → /api/delivery-admin/* endpoints
├── delivery-admin-auth-routes.ts   → /api/delivery-admin/auth/* endpoints
├── vendor-status-routes.ts         → /api/vendor/* endpoints
├── admin-routes.ts                 → /api/admin/* endpoints (dashboard)
├── vendor-review-routes.ts         → /api/admin/* endpoints (vendor approval)
├── support-ticket-routes.ts        → /api/admin/* endpoints (tickets)
├── dispute-routes.ts               → /api/admin/* endpoints (disputes)
├── refund-routes.ts                → /api/admin/* endpoints (refunds)
└── financial-ledger-routes.ts      → /api/admin/* endpoints (ledger)
```

### Middleware (Authentication & Protection)
```
src/middleware/
├── auth.ts                         → Re-exports requireAuth
├── require-auth.ts                 → JWT token validation (users)
├── require-admin.ts                → ADMIN role check
├── delivery-auth-middleware.ts     → JWT validation (delivery partners)
├── delivery-admin-auth-middleware.ts → JWT validation (delivery admins)
└── rate-limit.ts                   → API rate limiting (loginRateLimiter, apiRateLimiter)
```

### Types & Models
```
src/types/
└── express.d.ts                    → Express augmentation (user, deliveryAuth, deliveryAdminAuth)

src/models/
└── prisma.ts                       → Prisma client instance
```

### Configuration
```
src/config/
├── app.ts                          → APP_DISPLAY_NAME, APP_SLUG constants
├── admin.ts                        → Admin configuration
└── env.ts                          → Environment variables
```

---

## Key Implementation Patterns

### 1. Route Protection Pattern
```typescript
// Public route
router.get("/", handler);

// Authenticated users only
router.use(requireAuth);
router.get("/me", handler);

// Admin only
router.use(requireAdmin);
router.get("/dashboard", handler);

// Delivery partners
router.use(requireDeliveryAuth);
router.get("/deliveries", handler);
```

### 2. Error Handling Pattern
```typescript
if (!resource) {
  return res.status(404).json({
    success: false,
    message: "Resource not found"
  });
}

if (userRole !== "ADMIN") {
  return res.status(403).json({
    success: false,
    message: "Admin access only"
  });
}
```

### 3. Transaction Pattern (Admin operations)
```typescript
const result = await prisma.$transaction(async (tx) => {
  // Update multiple tables atomically
  await tx.table1.update(...);
  await tx.table2.create(...);
  return result;
});
```

### 4. Pagination Pattern
```typescript
const take = Math.min(100, Math.max(1, Number(req.query.take || 25)));
const page = Math.max(1, Number(req.query.page || 1));
const skip = (page - 1) * take;

const [data, total] = await Promise.all([
  prisma.model.findMany({ skip, take }),
  prisma.model.count()
]);
```

---

## Environment Variables Required

```env
# Core
NODE_ENV=development
PORT=4000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/meeramoot

# JWT Secrets (must be different for each system)
JWT_SECRET=your-secret-key
JWT_SECRET_DELIVERY=your-delivery-secret
JWT_SECRET_DELIVERY_ADMIN=your-delivery-admin-secret

# Frontend
FRONTEND_ORIGIN=http://localhost:3000

# SSLCommerz
SSLCOMMERZ_STORE_ID=your-store-id
SSLCOMMERZ_STORE_PASSWORD=your-store-password

# Uploadthing (optional)
UPLOADTHING_SECRET=your-uploadthing-secret

# Pusher (optional)
PUSHER_APP_ID=your-pusher-app-id
PUSHER_SECRET=your-pusher-secret
```

---

## Summary Statistics

- **Total Route Files:** 20
- **Total Middleware Files:** 5
- **Total Controllers:** ~15
- **Total Endpoints:** ~80+
- **Authentication Systems:** 4 (Standard, Delivery, DeliveryAdmin, AdminDemo)
- **User Roles:** 5 (CUSTOMER, VENDOR, ADMIN, DELIVERY, DELIVERY_ADMIN)
- **Rate Limited Endpoints:** 2 (login, admin-demo-login)

---

## Next Steps for Revamping

Based on this audit, areas for potential improvement:
1. **Standardize error handling** across all controllers
2. **Create shared validation middleware** for request body validation
3. **Implement pagination consistently** across all list endpoints
4. **Add request/response types** for better TypeScript coverage
5. **Consolidate admin routes** - currently spread across 6 files mounted at `/api/admin`
6. **Add API documentation** (Swagger/OpenAPI)
7. **Create permission service** instead of inline checks
8. **Implement audit logging** for admin actions
9. **Add webhook system** for notifications
10. **Create service layer** to extract business logic from controllers

---

**Generated:** April 28, 2026
