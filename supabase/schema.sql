-- FinAgent MVP Schema
-- Run this in Supabase SQL editor after creating a new project

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────
-- user_profiles
-- ─────────────────────────────────────────
create table public.user_profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  email       text not null,
  risk_profile text not null default 'moderate' check (risk_profile in ('conservative', 'moderate', 'aggressive')),
  dhan_token_encrypted text,
  paper_balance numeric not null default 100000,
  onboarding_complete boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

create policy "Users can read own profile"
  on public.user_profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on public.user_profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.user_profiles for insert with check (auth.uid() = id);

-- ─────────────────────────────────────────
-- transactions
-- ─────────────────────────────────────────
create table public.transactions (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid references public.user_profiles(id) on delete cascade not null,
  transaction_id text not null,
  date           date not null,
  description    text not null,
  amount         numeric not null,
  type           text not null check (type in ('debit', 'credit')),
  category       text not null default 'Others',
  raw_data       jsonb,
  created_at     timestamptz not null default now(),
  unique (user_id, transaction_id)
);

alter table public.transactions enable row level security;

create policy "Users can manage own transactions"
  on public.transactions for all using (auth.uid() = user_id);

create index transactions_user_date on public.transactions(user_id, date desc);
create index transactions_user_category on public.transactions(user_id, category);

-- ─────────────────────────────────────────
-- paper_holdings
-- ─────────────────────────────────────────
create table public.paper_holdings (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid references public.user_profiles(id) on delete cascade not null,
  ticker         text not null,
  company_name   text not null,
  quantity       integer not null check (quantity > 0),
  avg_buy_price  numeric not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (user_id, ticker)
);

alter table public.paper_holdings enable row level security;

create policy "Users can manage own holdings"
  on public.paper_holdings for all using (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- paper_trades
-- ─────────────────────────────────────────
create table public.paper_trades (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references public.user_profiles(id) on delete cascade not null,
  ticker      text not null,
  action      text not null check (action in ('buy', 'sell')),
  quantity    integer not null,
  price       numeric not null,
  total_value numeric not null,
  created_at  timestamptz not null default now()
);

alter table public.paper_trades enable row level security;

create policy "Users can manage own trades"
  on public.paper_trades for all using (auth.uid() = user_id);

create index paper_trades_user on public.paper_trades(user_id, created_at desc);

-- ─────────────────────────────────────────
-- watchlist
-- ─────────────────────────────────────────
create table public.watchlist (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid references public.user_profiles(id) on delete cascade not null,
  ticker       text not null,
  company_name text not null,
  added_at     timestamptz not null default now(),
  unique (user_id, ticker)
);

alter table public.watchlist enable row level security;

create policy "Users can manage own watchlist"
  on public.watchlist for all using (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- chat_messages
-- ─────────────────────────────────────────
create table public.chat_messages (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid references public.user_profiles(id) on delete cascade not null,
  role       text not null check (role in ('user', 'assistant')),
  content    text not null,
  tool_calls jsonb,
  created_at timestamptz not null default now()
);

alter table public.chat_messages enable row level security;

create policy "Users can manage own messages"
  on public.chat_messages for all using (auth.uid() = user_id);

create index chat_messages_user on public.chat_messages(user_id, created_at);

-- ─────────────────────────────────────────
-- monthly_reports
-- ─────────────────────────────────────────
create table public.monthly_reports (
  id                    uuid primary key default uuid_generate_v4(),
  user_id               uuid references public.user_profiles(id) on delete cascade not null,
  report_month          text not null,  -- format: "2026-05"
  spending_insights     jsonb not null,
  portfolio_health_score integer not null check (portfolio_health_score between 0 and 100),
  personalized_actions  text[] not null default '{}',
  raw_data              jsonb,
  created_at            timestamptz not null default now(),
  unique (user_id, report_month)
);

alter table public.monthly_reports enable row level security;

create policy "Users can manage own reports"
  on public.monthly_reports for all using (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- auto-update updated_at trigger
-- ─────────────────────────────────────────
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger user_profiles_updated_at before update on public.user_profiles
  for each row execute function update_updated_at();

create trigger paper_holdings_updated_at before update on public.paper_holdings
  for each row execute function update_updated_at();

-- ─────────────────────────────────────────
-- alerts
-- ─────────────────────────────────────────
create table public.alerts (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references public.user_profiles(id) on delete cascade not null,
  type        text not null check (type in ('price_above', 'price_below', 'spend_limit')),
  ticker      text,
  category    text,
  threshold   numeric not null,
  label       text not null,
  triggered   boolean not null default false,
  triggered_at timestamptz,
  created_at  timestamptz not null default now()
);

alter table public.alerts enable row level security;

create policy "Users can manage own alerts"
  on public.alerts for all using (auth.uid() = user_id);

-- Add onboarding_complete to user_profiles if running migration separately
-- alter table public.user_profiles add column if not exists onboarding_complete boolean not null default false;

-- ─────────────────────────────────────────
-- news_cache (shared, no RLS — public news data)
-- ─────────────────────────────────────────
create table public.news_cache (
  ticker      text primary key,
  articles    jsonb not null default '[]',
  fetched_at  timestamptz not null default now()
);

-- Service role can insert/update; anon/authenticated can read
alter table public.news_cache enable row level security;

create policy "Anyone can read news cache"
  on public.news_cache for select using (true);

create policy "Service can upsert news cache"
  on public.news_cache for all using (true) with check (true);
