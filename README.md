# Melon - Household Expense Tracker

> **Live:** [expensetracker-kappa-six.vercel.app](https://expensetracker-kappa-six.vercel.app)
> **Repo:** [github.com/21betmaster-byte/melon-expense-tracker](https://github.com/21betmaster-byte/melon-expense-tracker)

A mobile-first Progressive Web App for couples to track shared and solo expenses, automate debt settlement, and visualize spending trends. Built with Next.js 16, Firebase, and Zustand.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router, Turbopack) |
| **UI** | React 19, TailwindCSS, shadcn/ui, Radix UI, Lucide Icons |
| **State** | Zustand v5 (persisted to localStorage with Timestamp serialization) |
| **Auth** | Firebase Authentication (Email/Password + Google OAuth) |
| **Database** | Cloud Firestore (NoSQL, real-time subscriptions) |
| **Push** | Firebase Cloud Messaging (FCM) via Firebase Admin SDK |
| **Charts** | Recharts (SVG) |
| **Forms** | React Hook Form + Zod validation |
| **Testing** | Playwright (E2E, 430+ tests) |
| **Deploy** | Vercel (production) |
| **Blog/SEO** | MDX blog engine, sitemap, robots.txt |

---

## Features

### Core
- **Expense Tracking** - Solo, joint, and settlement expenses with customizable split ratios
- **Smart Categorization** - Keyword-based auto-categorization with learning memory
- **Expense Groups** - Context switching (e.g., "Day to Day", "Goa Trip") with isolated data
- **Settlement Math** - Dynamic net balance calculation, one-tap settle up
- **Analytics** - Trend lines, category pie charts, MoM comparison, member contributions, insights engine
- **Push Notifications** - Real-time alerts when your partner logs expenses or settlements

### Additional
- Per-expense currency override (8 currencies)
- Recurring expenses (daily/weekly/monthly/yearly)
- Inline category creation from expense form
- CSV export, search, sort, advanced filters
- Edit/delete expenses
- Settlement history with mark-as-settled
- Savings goals with progress tracking
- Onboarding stepper with feature tour
- Help contact form and feedback collection
- Multi-household support with household switching
- User offboarding (account + data deletion)
- SEO blog with 15 MDX articles across 6 categories

### Production Bug Fixes (10 bugs fixed)
1. Google Sign-In specific error messages
2. Non-blocking email verification (banner instead of full gate)
3. Branded MelonLoader during auth loading
4. Resilient invite partner with retry fallback
5. Groups/categories loading states with disabled inputs
6. Help contact error handling
7. Tour overlay safety (no blocking when targets missing)
8. Push notification toggle with specific error messages
9. Category dropdown loading states in expense form
10. Resilient `createHousehold` (sets `household_id` before seeding defaults)

### Enhancements (6 shipped)
1. Custom MelonLoader with Melon branding
2. Non-blocking email verification banner
3. Empty state screens (reusable EmptyState component)
4. Auto-create household on signup
5. Renamed default groups ("Day to Day Expenses", "Annual Expenses")
6. Tooltips on all interactive sections

---

## Quick Start

### Prerequisites
- Node.js 18+
- Firebase project with Authentication and Firestore enabled
- (Optional) Firebase Cloud Messaging for push notifications

### 1. Clone and install

```bash
git clone https://github.com/21betmaster-byte/melon-expense-tracker.git
cd melon-expense-tracker
npm install
```

### 2. Configure environment

Create `.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your_vapid_key
FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY=base64_encoded_service_account_json
```

### 3. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Run tests

Create `.env.test` with test user credentials:

```env
TEST_USER_EMAIL=test@yourapp.dev
TEST_USER_PASSWORD=YourTestPassword123
```

```bash
npx playwright test          # Run all tests
npx playwright test --ui     # Interactive test UI
npm run type-check           # TypeScript check
```

### 5. Deploy

```bash
npx vercel --prod
```

**Important:** Add your Vercel domain to Firebase Console > Authentication > Settings > Authorized domains for Google Sign-In to work in production.

---

## Project Structure

```
app/
  (app)/          # Protected routes (AuthGuard wraps all)
    dashboard/    # Settlement card, quick stats, recent expenses
    expenses/     # Tabbed expense list with filters
    analytics/    # Charts, insights, MoM comparison
    goals/        # Savings goals with progress bars
    settings/     # Groups, categories, invite, notifications, help
    onboarding/   # 4-step stepper for new users
  (auth)/         # Public auth routes
    login/        # Email + Google sign-in
    signup/       # Email + Google sign-up
  blog/           # MDX-powered SEO blog
  api/            # Server endpoints
    notifications/send/   # Push notification API (Firebase Admin)
    ingest/email/         # Email receipt ingestion webhook

components/
  auth/           # AuthGuard, LoginForm, SignupForm, VerifyEmailBanner
  layout/         # AppNav, GroupSwitcher, OfflineBanner, ReminderBanner
  dashboard/      # SettlementCard, QuickStats
  expenses/       # ExpenseForm, ExpenseCard, ExpenseList, dialogs
  analytics/      # TrendLineChart, CategoryBarChart, PieChart, Insights
  settings/       # InvitePartner, GroupsManager, CategoriesManager, etc.
  tour/           # TourProvider (6-step feature tour with notification step)
  ui/             # shadcn/ui primitives + MelonLoader + EmptyState

hooks/            # useAuth, useHousehold, useExpenses, useSettlement, etc.
store/            # Zustand global state (useAppStore)
lib/              # Firebase config, utils, analytics, categorization
tests/            # 41 Playwright spec files (430+ tests)
```

---

## Documentation

| Document | Purpose |
|----------|---------|
| [CODEBASE_WALKTHROUGH.md](./CODEBASE_WALKTHROUGH.md) | Architecture deep-dive: directory structure, data model, store, hooks, components, auth flow |
| [FEATURE_REQUIREMENTS.md](./FEATURE_REQUIREMENTS.md) | Feature requirements, bug tracker, enhancement log with test mappings |
| [TEST_PLAN.md](./TEST_PLAN.md) | Complete test inventory: 430+ tests across suites A-J with auth patterns |
| [AGENT_INSTRUCTIONS.md](./AGENT_INSTRUCTIONS.md) | System design document: HLD, LLD, database schemas, user journeys, validation rules |

---

## Scripts

```bash
npm run dev         # Start dev server (Next.js + Turbopack)
npm run build       # Production build
npm run start       # Start production server
npm run lint        # ESLint
npm run type-check  # TypeScript type checking
npm run test        # Playwright E2E tests
npm run test:ui     # Playwright interactive UI
```

---

## Architecture Highlights

- **Auth flow:** Firebase Auth (email/password + Google OAuth) with `AuthGuard` wrapper. Email verification is a non-blocking banner. Auto-creates household on signup.
- **Data loading:** `householdLoading` state in Zustand prevents race conditions. Components show loading/disabled states until data resolves.
- **Offline support:** Firestore local cache + optimistic UI with `_pending` flag on expenses.
- **Push notifications:** Client calls `POST /api/notifications/send` after mutations. Server-side Firebase Admin SDK sends FCM to partner. Foreground toast via `onForegroundMessage`.
- **Tour system:** 6-step feature tour with spotlight overlay. Polls for target elements before starting. Null-check prevents blocking when targets are missing.
- **createHousehold resilience:** Sets `household_id` on user BEFORE seeding defaults, so household link is never lost even if seed batch fails.
