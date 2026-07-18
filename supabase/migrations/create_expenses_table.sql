-- ═══════════════════════════════════════════════════════════════════════════
--  VOLD MOTOR — Professional Expense & Net Profit Engine
--  Migration: create_expenses_table
--
--  IDEMPOTENT BY DESIGN. A legacy `public.expenses` table already exists in this
--  project (carried over from the vanilla expenses.html page) with RLS enabled
--  and four auth.uid() = merchant_id policies. A bare CREATE TABLE would abort
--  the migration; dropping and recreating would destroy any rows an owner has
--  already logged. So every statement below is additive and re-runnable:
--    • CREATE TABLE IF NOT EXISTS       — no-op when the table is present
--    • ADD COLUMN IF NOT EXISTS         — brings a legacy table up to spec
--    • DROP POLICY IF EXISTS + CREATE   — converges policies to the exact spec
--  Safe to run on a fresh database and on the live one.
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ── 1. Table ───────────────────────────────────────────────────────────────
create table if not exists public.expenses (
  id            uuid primary key default gen_random_uuid(),
  merchant_id   uuid not null references auth.users (id) on delete cascade,
  branch_id     uuid references public.branches (id) on delete set null,
  title         text not null,
  amount        numeric(10, 2) not null,
  category      text not null default 'miscellaneous',
  expense_date  timestamptz not null default now(),
  receipt_url   text,
  created_at    timestamptz not null default now()
);

-- ── 2. Bring a legacy table up to spec (each is a no-op if already correct) ──
alter table public.expenses add column if not exists merchant_id  uuid;
alter table public.expenses add column if not exists branch_id    uuid;
alter table public.expenses add column if not exists title        text;
alter table public.expenses add column if not exists amount       numeric(10, 2);
alter table public.expenses add column if not exists category     text default 'miscellaneous';
alter table public.expenses add column if not exists expense_date timestamptz default now();
alter table public.expenses add column if not exists receipt_url  text;
alter table public.expenses add column if not exists created_at   timestamptz default now();

-- ── 3. Constraints ─────────────────────────────────────────────────────────
-- category is strictly constrained to the six operating-expense buckets.
-- NOT VALID: accepts pre-existing legacy rows that may hold other values while
-- enforcing the whitelist on every new write. Run `validate constraint` after
-- backfilling legacy data if you want it enforced retroactively.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'expenses_category_check' and conrelid = 'public.expenses'::regclass
  ) then
    alter table public.expenses
      add constraint expenses_category_check
      check (category in (
        'salaries', 'rent', 'utilities', 'government_fees', 'inventory_purchase', 'miscellaneous'
      )) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'expenses_amount_positive' and conrelid = 'public.expenses'::regclass
  ) then
    alter table public.expenses
      add constraint expenses_amount_positive check (amount >= 0) not valid;
  end if;
end $$;

-- Foreign keys (added separately so a legacy table without them is upgraded).
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'expenses_merchant_id_fkey' and conrelid = 'public.expenses'::regclass
  ) then
    alter table public.expenses
      add constraint expenses_merchant_id_fkey
      foreign key (merchant_id) references auth.users (id) on delete cascade not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'expenses_branch_id_fkey' and conrelid = 'public.expenses'::regclass
  ) then
    alter table public.expenses
      add constraint expenses_branch_id_fkey
      foreign key (branch_id) references public.branches (id) on delete set null not valid;
  end if;
end $$;

-- ── 4. Indexes — the ledger is always read merchant-scoped, newest first ────
create index if not exists expenses_merchant_date_idx
  on public.expenses (merchant_id, expense_date desc);
create index if not exists expenses_branch_idx
  on public.expenses (branch_id);

-- ── 5. Row Level Security — strictly gated, isolated per center owner ───────
alter table public.expenses enable row level security;

drop policy if exists expenses_select on public.expenses;
drop policy if exists expenses_insert on public.expenses;
drop policy if exists expenses_update on public.expenses;
drop policy if exists expenses_delete on public.expenses;

create policy expenses_select on public.expenses
  for select to authenticated using (auth.uid() = merchant_id);

create policy expenses_insert on public.expenses
  for insert to authenticated with check (auth.uid() = merchant_id);

create policy expenses_update on public.expenses
  for update to authenticated
  using (auth.uid() = merchant_id) with check (auth.uid() = merchant_id);

create policy expenses_delete on public.expenses
  for delete to authenticated using (auth.uid() = merchant_id);

-- NOTE: staff (managers/technicians) are deliberately NOT granted access here.
-- Expense visibility is an owner-level financial privilege; the app layer
-- additionally gates the route behind can_view_financials → Forbidden403.
