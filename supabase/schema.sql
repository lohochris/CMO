-- Supabase schema for Holy Cross CMO Management Portal
-- PostgreSQL tables and storage bucket definitions.

-- 1. Members table stores all users, officers, and members.
create table if not exists members (
  id text primary key,
  name text not null,
  status text not null,
  role text not null,
  balance numeric default 0 not null,
  phone text,
  email text,
  home_town_address text,
  residential_address text,
  marital_status text,
  communicant boolean default false,
  post_held text,
  number_of_children integer,
  wife_name text,
  wife_phone text,
  profile_picture_url text,
  created_at timestamptz default timezone('utc', now()) not null,
  updated_at timestamptz default timezone('utc', now()) not null
);

create or replace function set_updated_at()
  returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql;

create trigger members_updated_at
  before update on members
  for each row execute procedure set_updated_at();

-- 2. Transactions table records member payments and contributions.
create table if not exists transactions (
  id serial primary key,
  member_id text not null references members(id) on delete cascade,
  amount numeric not null,
  purpose text not null,
  timestamp timestamptz default timezone('utc', now()) not null
);

-- 3. Welfare tickets store assistance requests and approval workflow.
create table if not exists welfare_tickets (
  ticket_id text primary key,
  member_id text not null references members(id) on delete cascade,
  member_name text not null,
  category text not null,
  requested_amount numeric not null,
  status text not null,
  created_at timestamptz default timezone('utc', now()) not null,
  approved_at timestamptz,
  settled_at timestamptz
);

-- 4. Expenses table for treasurer records.
create table if not exists expenses (
  id text primary key,
  amount numeric not null,
  purpose text not null,
  date date not null,
  recorded_by text not null,
  created_at timestamptz default timezone('utc', now()) not null
);

-- 5. Announcements table with 48-hour expiry.
create table if not exists announcements (
  id text primary key,
  title text not null,
  content text not null,
  author text not null,
  timestamp timestamptz default timezone('utc', now()) not null,
  expires_at timestamptz not null
);

-- 6. Storage bucket for profile pictures.
-- Create this bucket in Supabase Storage, or use the CLI:
-- select storage.create_bucket('profile-pictures', { public: false });
-- Use signed URLs or authenticated storage policies for secure image delivery.

-- 7. Recommended index for announcements expiration queries.
create index if not exists announcements_expires_at_idx on announcements (expires_at);

-- 8. Example policy placeholders for secure access.
-- insert into auth.users ... not in this schema file
-- grant usage on schema public to authenticated;
-- grant select, insert, update, delete on members to authenticated;
-- grant select, insert, update, delete on transactions to authenticated;
-- grant select, insert, update, delete on welfare_tickets to authenticated;
-- grant select, insert, update, delete on expenses to authenticated;
-- grant select, insert, update, delete on announcements to authenticated;
