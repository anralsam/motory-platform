# VOLD MOTOR — Next.js Dashboard (scaffold)

A React/Next.js (App Router) + Tailwind rebuild of the VOLD MOTOR owner dashboard shell.
Wired to the same Supabase backend as the live vanilla site.

## What's implemented
- **`DashboardLayout`** — enterprise shell:
  - White-labeled sidebar (logo + center name come from the **selected branch**, not a hardcoded wordmark).
  - **Top-header global branch switcher** (`BranchSwitcherDropdown`) — the whole app reacts to it.
  - **Hamburger drawer on mobile** (slide-in) — **no bottom navigation**.
  - Canonical RTL nav: الرئيسية → المخزون → الفواتير → التقارير → الفريق → الرسائل → الإعدادات.
- **`useBranchStore`** (Zustand, persisted) — global branch state. Mirrors the vanilla app's
  `localStorage('vm_active_branch')` + `vm:branch-change` event so both stacks stay in sync.
- **Supabase client** (`lib/supabaseClient.js`) wired to `my_branches()` RPC and branch-scoped reads.
- Sample **الرئيسية** page with branch-reactive KPIs, and a working **Theme Customizer** (5 tints) in Settings.

## Auth (production-ready, cookie-based)
Uses **`@supabase/ssr`** so the session lives in cookies and is shared between the browser,
Server Components, and middleware.
- `lib/supabaseClient.js` — browser client (`createBrowserClient`).
- `lib/supabase/server.js` — server client (`createServerClient` + `next/headers` cookies).
- `middleware.js` — refreshes the session and **protects** `/` & `/dashboard/**`
  (redirects to `/auth/signin`), and keeps signed-in users out of `/auth/**`.
- `components/AuthProvider.jsx` — `useAuth()` exposes `{ user, loading, signOut }`, seeded from
  the server then kept live via `onAuthStateChange`.
- `app/auth/signin/page.jsx` — premium login card, `signInWithPassword`, loading spinner,
  inline red error (no native popups). Commission messaging, no trials.
- `app/dashboard/layout.jsx` — server-side auth gate; passes `initialUser` into `AuthProvider`.

## Run
```bash
cd vold-next
npm install
# optional: cp .env.local.example .env.local  (otherwise the bundled public anon key is used)
npm run dev
# open http://localhost:3000  → /auth/signin (then /dashboard after login)
```

**Log in** with any existing VOLD MOTOR owner account (the same credentials as the live vanilla
site). On success the branch switcher loads that owner's branches via `my_branches()` and the
الرئيسية KPIs light up with their real, branch-scoped data.

## Structure
```
app/
  layout.jsx              root (RTL, Cairo font, globals)
  page.jsx               → redirects to /dashboard
  dashboard/
    layout.jsx            wraps children in <DashboardLayout/>
    page.jsx              الرئيسية (branch-reactive KPIs)
    inventory|invoices|reports|team|messages|settings/page.jsx
components/
  DashboardLayout.jsx     shell (sidebar + drawer + header)
  Sidebar.jsx             white-label sidebar + canonical nav
  BranchSwitcherDropdown.jsx
  Placeholder.jsx, nav.js
store/branchStore.js      Zustand global branch state
lib/supabaseClient.js     Supabase browser client
```
