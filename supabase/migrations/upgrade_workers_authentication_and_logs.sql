-- workers: passwordless magic-token columns. access_token is SINGLE-USE and
-- short-lived; a server action redeems it for a REAL Supabase session (never a
-- hand-rolled cookie) so RLS keeps protecting every worker action. UNIQUE allows
-- many NULLs (unused workers).
alter table public.workers add column if not exists access_token            text unique;
alter table public.workers add column if not exists access_token_expires_at timestamptz;

-- is_active: the spec's instant-block flag, kept as a GENERATED mirror of the
-- canonical `status` column so the two can never drift.
do $$
begin
  if not exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='workers' and column_name='is_active') then
    alter table public.workers add column is_active boolean generated always as (status = 'active') stored;
  end if;
end $$;

-- worker_activities: append-only audit trail.
create table if not exists public.worker_activities (
  id           uuid primary key default gen_random_uuid(),
  worker_id    uuid references public.workers (id) on delete cascade,
  merchant_id  uuid not null,
  action_type  text not null,
  description  text,
  timestamp    timestamptz not null default now()
);
create index if not exists worker_activities_merchant_time_idx on public.worker_activities (merchant_id, timestamp desc);
create index if not exists worker_activities_worker_idx on public.worker_activities (worker_id);

-- RLS: owners READ their own center's log; all writes come from service-role
-- server actions.
alter table public.worker_activities enable row level security;
drop policy if exists worker_activities_owner_select on public.worker_activities;
create policy worker_activities_owner_select on public.worker_activities
  for select to authenticated using (auth.uid() = merchant_id);
