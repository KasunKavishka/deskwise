create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  desk_id text not null check (desk_id in ('desk-01', 'desk-02', 'desk-03', 'desk-04')),
  user_id uuid not null references auth.users (id) on delete cascade,
  booking_date date not null,
  created_at timestamptz not null default now(),
  constraint reservations_desk_booking_date_key unique (desk_id, booking_date)
);

create index if not exists reservations_booking_date_idx
  on public.reservations (booking_date);

alter table public.reservations enable row level security;

revoke all on table public.reservations from anon, authenticated;
grant all on table public.reservations to service_role;
