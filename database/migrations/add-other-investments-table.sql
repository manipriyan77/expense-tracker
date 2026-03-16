-- Other Investments table (PPF, EPF/PF, NPS, Postal, LIC, etc.)
create table if not exists other_investments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('ppf', 'epf', 'nps', 'postal', 'lic', 'other')),
  invested_amount numeric(15, 2) not null default 0,
  current_value numeric(15, 2) not null default 0,
  start_date date not null,
  maturity_date date,
  interest_rate numeric(6, 3),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS
alter table other_investments enable row level security;

create policy "Users can manage their own other investments"
  on other_investments
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Index
create index if not exists other_investments_user_id_idx on other_investments(user_id);
