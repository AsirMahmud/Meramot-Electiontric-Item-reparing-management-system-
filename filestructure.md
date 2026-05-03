# Meeramoot Electric Item Repairing Management System - File Structure

This document outlines the complete file structure, naming conventions, and organization of the Meeramoot Electric Item Repairing Management System project.

## Project Overview

**Project Name:** Meeramoot Electric Item Repairing Management System
**Version:** 1.0.0
**Architecture:** Full-stack application with separate backend (Express API) and frontend (Next.js) servers

---

## Root Directory Structure

```
meeramoot-electiontric-item-reparing-management-system-/
├── backend/                          # Express.js API server
├── frontend/                         # Next.js web application
├── SSLCommerz-NodeJS-master/        # Payment gateway integration module
├── .git/                            # Git version control
├── .gitignore                       # Git ignore rules
├── docker-compose.yml               # Docker compose configuration
├── package.json                     # Root package (workspace reference)
├── package-lock.json                # Dependency lock file
└── README.md                        # Project README
```

---

## Backend Structure (`/backend`)

### Purpose
Express.js-based REST API that handles all business logic, database operations, authentication, and payment processing.

### Naming Convention for Files
- **Controllers:** `{feature}-controller.ts` (e.g., `auth-controller.ts`, `payment-controller.ts`)
- **Routes:** `{feature}-routes.ts` (e.g., `auth-routes.ts`, `payment-routes.ts`)
- **Middleware:** `{type}-middleware.ts` or `{type}.ts` (e.g., `auth-middleware.ts`, `rate-limit.ts`)
- **Services:** `{feature}-service.ts` (e.g., `email-service.ts`, `ai-chat-service.ts`)
- **Configuration:** `{type}.ts` in `/config` (e.g., `env.ts`, `app.ts`)
- **Database Seeders:** `seed.{entity}.ts` or `seed-{entity}.ts` (e.g., `seed.customers.ts`, `seed-delivery.ts`)

### Directory Structure

```
backend/
├── src/
│   ├── app.ts                       # Express app initialization
│   ├── server.ts                    # Server entry point
│   │
│   ├── config/
│   │   ├── env.ts                   # Environment variable configuration
│   │   ├── app.ts                   # App-level configuration
│   │   └── admin.ts                 # Admin configuration
│   │
│   ├── controllers/                 # Request handlers (14 total)
│   │   ├── ai-controller.ts
│   │   ├── auth-controller.ts
│   │   ├── cart-controller.ts
│   │   ├── delivery-controller.ts
│   │   ├── delivery-admin-controller.ts
│   │   ├── delivery-admin-auth-controller.ts
│   │   ├── delivery-auth-controller.ts
│   │   ├── notification-controller.ts
│   │   ├── payment-controller.ts
│   │   ├── profile-controller.ts
│   │   ├── request-controller.ts
│   │   ├── review-controller.ts
│   │   ├── shop-controllers.ts
│   │   └── vendor-status-controller.ts
│   │
│   ├── routes/                      # API endpoint definitions (21 total)
│   │   ├── index.ts                 # Route aggregator
│   │   ├── admin-routes.ts
│   │   ├── ai-routes.ts
│   │   ├── auth-routes.ts
│   │   ├── cart-routes.ts
│   │   ├── delivery-routes.ts
│   │   ├── delivery-admin-routes.ts
│   │   ├── delivery-admin-auth-routes.ts
│   │   ├── delivery-auth-routes.ts
│   │   ├── dispute-routes.ts
│   │   ├── financial-ledger-routes.ts
│   │   ├── invoice-routes.ts
│   │   ├── notification-routes.ts
│   │   ├── payment-routes.ts
│   │   ├── profile-routes.ts
│   │   ├── refund-routes.ts
│   │   ├── request-routes.ts
│   │   ├── shop-routes.ts
│   │   ├── support-ticket-routes.ts
│   │   ├── vendor-review-routes.ts
│   │   └── vendor-status-routes.ts
│   │
│   ├── middleware/                  # Request middleware (6 total)
│   │   ├── auth.ts                  # General authentication
│   │   ├── require-auth.ts          # Auth requirement middleware
│   │   ├── require-admin.ts         # Admin role requirement
│   │   ├── delivery-auth-middleware.ts    # Delivery partner auth
│   │   ├── delivery-admin-auth-middleware.ts # Delivery admin auth
│   │   └── rate-limit.ts            # Rate limiting
│   │
│   ├── services/                    # Business logic (5 core services)
│   │   ├── ai-chat-service.ts       # AI chat functionality
│   │   ├── email-service.ts         # Email operations
│   │   ├── delivery-credentials-email-service.ts # Delivery credentials emails
│   │   ├── pusher-service.ts        # Real-time notifications via Pusher
│   │   └── sslcommerz.ts            # Payment gateway integration
│   │
│   ├── models/
│   │   └── prisma.ts                # Prisma client initialization
│   │
│   ├── types/
│   │   └── express.d.ts             # Express type definitions
│   │
│   └── views/                       # Email templates and views
│
├── prisma/
│   ├── schema.prisma                # Database schema definition
│   ├── seed.ts                      # Main seed file
│   ├── seed.customers.ts            # Customer data seed
│   ├── seed.shops.ts                # Shop data seed
│   ├── seed-delivery.ts             # Delivery partner seed
│   │
│   └── migrations/                  # Database migration history
│       ├── migration_lock.toml       # Migration lock file
│       ├── 20260410180621_init_customer_schema/
│       ├── 20260412135521_new/
│       ├── 20260415172000_financial_ledger_commission/
│       ├── 20260422075550_revert/
│       └── 20260422140403_fix/
│
├── scratch/
│   └── test_ssl.ts                  # Testing and scratch work
│
├── package.json                     # Backend dependencies
├── tsconfig.json                    # TypeScript configuration
└── test-db.ts                       # Database testing file
```

### Key Backend Patterns

**Controllers:** Handle HTTP requests and responses, call services for business logic
```
export const handleAuth = async (req: Request, res: Response) => { ... }
```

**Routes:** Map HTTP methods and paths to controllers
```
router.post('/auth/login', authController.handleAuth)
```

**Middleware:** Execute code before reaching controllers (auth, logging, rate-limiting)
```
router.use(requireAuth) // protects subsequent routes
```

**Services:** Encapsulate reusable business logic (email, payments, AI)

**Prisma:** ORM for database operations with migrations for schema changes

---

## Frontend Structure (`/frontend`)

### Purpose
Next.js-based web application providing the user interface for customers, vendors, delivery partners, and admins.

### Naming Convention for Files
- **Pages/Routes:** Directory structure mirrors URL paths (e.g., `/app/shops/page.tsx` → `/shops`)
- **Components:** `{ComponentName}.tsx` in lowercase directories (e.g., `/components/auth/LoginForm.tsx`)
- **Utilities:** `{utility-name}.ts` in `/lib` (e.g., `api-client.ts`)
- **Types:** `{feature}.types.ts` in `/types`
- **Configuration:** `*.config.ts` (e.g., `tailwind-config.ts`, `next.config.ts`)

### Directory Structure

```
frontend/
├── src/
│   ├── auth.ts                      # Authentication configuration (NextAuth)
│   ├── app/                         # Next.js app directory
│   │   ├── layout.tsx               # Root layout component
│   │   ├── page.tsx                 # Home page
│   │   ├── globals.css              # Global styles
│   │   ├── providers.tsx            # Context/provider setup
│   │   ├── favicon.ico              # Site icon
│   │   │
│   │   ├── account/                 # User account pages
│   │   ├── admin/                   # Admin dashboard pages
│   │   ├── ai-chat/                 # AI chat interface pages
│   │   ├── api/                     # API routes
│   │   ├── cart/                    # Shopping cart pages
│   │   ├── checkout/                # Checkout flow pages
│   │   ├── delivery/                # Delivery partner pages
│   │   ├── delivery-admin/          # Delivery admin dashboard
│   │   ├── login/                   # Login page
│   │   ├── signup/                  # Signup page
│   │   ├── orders/                  # Customer orders page
│   │   ├── payment/                 # Payment pages
│   │   ├── profile/                 # User profile pages
│   │   ├── requests/                # Request listing/management
│   │   ├── shops/                   # Shop listing pages
│   │   └── vendor/                  # Vendor dashboard pages
│   │
│   ├── components/                  # Reusable UI components (organized by feature)
│   │   ├── auth/                    # Authentication-related components
│   │   ├── chat/                    # Chat interface components
│   │   ├── delivery/                # Delivery feature components
│   │   ├── home/                    # Home page components
│   │   ├── shops/                   # Shop-related components
│   │   ├── theme/                   # Theme/layout components
│   │   └── vendor/                  # Vendor dashboard components
│   │
│   ├── lib/                         # Utility functions and helpers
│   │   └── [utility files]          # API clients, formatters, validators
│   │
│   └── types/                       # TypeScript type definitions
│       └── [type definition files]
│
├── public/
│   └── images/                      # Static image assets
│
├── next.config.ts                   # Next.js configuration
├── tailwind-config.ts               # Tailwind CSS configuration
├── postcss.config.mjs               # PostCSS configuration
├── eslint.config.mjs                # ESLint configuration
├── tsconfig.json                    # TypeScript configuration
├── package.json                     # Frontend dependencies
│
├── AGENTS.md                        # Custom agent instructions
├── CLAUDE.md                        # Claude-specific instructions
├── README.md                        # Frontend README
├── README_ENV_LOCAL.md              # Environment setup instructions
└── [other config files]
```

### Key Frontend Patterns

**App Router:** File-based routing where directory structure = URL paths
```
/app/shops/page.tsx → http://localhost:3000/shops
/app/checkout/page.tsx → http://localhost:3000/checkout
```

**Components:** Organized by feature in lowercase directories with PascalCase React components
```
/components/auth/LoginForm.tsx
/components/shops/ShopCard.tsx
```

**Lib:** Utility functions for API calls, data formatting, and business logic
```
/lib/api-client.ts → fetch data from backend
/lib/validators.ts → form validation
```

---

## Payment Integration (`/SSLCommerz-NodeJS-master`)

Third-party payment gateway library for handling SSL Commerz integration.

```
SSLCommerz-NodeJS-master/
├── index.js                         # Main entry point
├── package.json                     # Package configuration
├── readme.md                        # Integration guide
├── api/
│   ├── fetch.js                     # API fetch utilities
│   ├── payment-controller.js        # Payment control logic
│   ├── payment-init-data-process.js # Payment initialization
└── [other payment-related files]
```

---

## Configuration Files (Root Level)

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Docker container orchestration (database, services) |
| `package.json` | Root workspace package configuration |
| `package-lock.json` | Dependency lock file for reproducible installs |
| `README.md` | Main project documentation |
| `.gitignore` | Git ignore rules |

---

## Entity Organization Pattern

The project follows a **feature-based organization** where related functionality is grouped together:

### Example: Auth Feature

**Backend:**
- `controllers/auth-controller.ts` - Handles auth endpoints
- `routes/auth-routes.ts` - Defines auth routes
- `middleware/auth.ts` - Auth logic
- `middleware/require-auth.ts` - Auth verification

**Frontend:**
- `/app/login/page.tsx` - Login page
- `/app/signup/page.tsx` - Signup page
- `/components/auth/` - Auth-related components
- `auth.ts` - NextAuth configuration

### Example: Delivery Feature

**Backend:**
- `controllers/delivery-controller.ts` - Main delivery endpoints
- `controllers/delivery-admin-controller.ts` - Delivery admin endpoints
- `routes/delivery-routes.ts` - Delivery routes
- `middleware/delivery-auth-middleware.ts` - Delivery auth

**Frontend:**
- `/app/delivery/` - Delivery partner pages
- `/app/delivery-admin/` - Delivery admin pages
- `/components/delivery/` - Delivery components

---

## Database & Migrations

**Location:** `/backend/prisma/`

**Key Files:**
- `schema.prisma` - Database schema definition
- Migrations track all schema changes with timestamps:
  - `20260410180621_init_customer_schema/` - Initial setup
  - `20260415172000_financial_ledger_commission/` - Financial features
  - `20260422075550_revert/` - Schema rollback
  - `20260422140403_fix/` - Fix migration

**Seed Files:** Populate database with initial data
- `seed.ts` - Master seed runner
- `seed.customers.ts` - Customer data
- `seed.shops.ts` - Shop data
- `seed-delivery.ts` - Delivery partner data

---

## Technology Stack & Dependencies

### Backend
- **Framework:** Express.js
- **Language:** TypeScript
- **Database ORM:** Prisma
- **Authentication:** JWT (jsonwebtoken)
- **Password Hashing:** bcryptjs
- **Real-time:** Pusher
- **Payment Gateway:** SSLCommerz
- **Email:** Nodemailer (implied by email-service.ts)
- **Rate Limiting:** express-rate-limit
- **CORS:** cors

### Frontend
- **Framework:** Next.js (v16.2.3)
- **UI Library:** React (v19.2.4)
- **Authentication:** NextAuth.js
- **Styling:** Tailwind CSS
- **UI Components:** Lucide React icons
- **Charts:** Recharts
- **Maps:** Leaflet
- **Animation:** Framer Motion
- **Real-time:** Pusher.js
- **File Upload:** Uploadthing
- **Utilities:** clsx, tailwind-merge

---

## Naming Conventions Summary

| Item | Pattern | Example |
|------|---------|---------|
| Controller | `{feature}-controller.ts` | `auth-controller.ts` |
| Route | `{feature}-routes.ts` | `payment-routes.ts` |
| Middleware | `{type}-middleware.ts` or `{type}.ts` | `auth-middleware.ts`, `rate-limit.ts` |
| Service | `{feature}-service.ts` | `email-service.ts` |
| Component | PascalCase in lowercase dirs | `/components/auth/LoginForm.tsx` |
| Page | directory structure mirrors URLs | `/app/checkout/page.tsx` |
| Config | `{type}.config.ts` | `next.config.ts` |
| Seed | `seed.{entity}.ts` | `seed.customers.ts` |
| Type definition | `{feature}.types.ts` | `user.types.ts` |

---

## Key Features & Modules

### Core Features
1. **Authentication** - User registration, login, role-based access
2. **Shop Management** - Vendor shops, product listings
3. **Cart & Checkout** - Shopping cart, order placement
4. **Payment Processing** - SSL Commerz integration
5. **Delivery Management** - Delivery partners, order tracking
6. **AI Chat** - AI-powered chat service
7. **Notifications** - Real-time notifications via Pusher
8. **Admin Dashboard** - System administration
9. **Financial Ledger** - Commission tracking, financial records
10. **Support Tickets** - Customer support system

### Multi-Role Support
- **Customers** - Browse and order
- **Vendors** - Manage shops and inventory
- **Delivery Partners** - Track and deliver orders
- **Admins** - System management
- **Delivery Admins** - Manage delivery partners

---

## Development Workflow

### Backend Scripts
```bash
npm run dev              # Development with auto-reload (tsx watch)
npm run build           # Build TypeScript to JavaScript
npm start               # Run built application
npm run prisma:migrate  # Run database migrations
npm run prisma:studio   # Open Prisma Studio UI
npm run seed:shops      # Seed shop data
npm run seed:customers  # Seed customer data
```

### Frontend Scripts
```bash
npm run dev    # Development server
npm run build  # Production build
npm start      # Run production build
npm run lint   # Run ESLint
```

---

## Notes

- File naming uses **kebab-case** (e.g., `auth-controller.ts`) for backend files
- Directories use **lowercase** in frontend components (e.g., `/components/auth/`)
- React components use **PascalCase** (e.g., `LoginForm.tsx`)
- The project maintains clear **separation of concerns** between backend (API) and frontend (UI)
- Feature-based organization makes it easy to locate related code
- Each role (customer, vendor, delivery) has dedicated routes, controllers, and UI components
