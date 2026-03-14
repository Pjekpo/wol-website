create table if not exists public.discount_claims (
  email text primary key,
  source text not null default 'scratchcard',
  reward text not null default '10% off',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  emailed_at timestamptz null,
  discount_code text null,
  promotion_code_id text null,
  coupon_id text null,
  resend_email_id text null,
  last_error text null
);

create index if not exists discount_claims_emailed_at_idx
  on public.discount_claims (emailed_at);

create table if not exists public.launch_discount_state (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.discount_claims enable row level security;
alter table public.launch_discount_state enable row level security;
