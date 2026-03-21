-- Add premium-based investment fields to other_investments table
alter table other_investments
  add column if not exists premium_amount numeric(15, 2),
  add column if not exists premium_frequency text check (premium_frequency in ('monthly', 'quarterly', 'semi-annual', 'annual')),
  add column if not exists sum_assured numeric(15, 2);
