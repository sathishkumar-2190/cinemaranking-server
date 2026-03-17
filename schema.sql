-- ─────────────────────────────────────────────
--  CinemaRanking — Supabase database schema
--  Run this in: Supabase dashboard → SQL editor
-- ─────────────────────────────────────────────

-- ── PROFILES ──────────────────────────────────
-- Extends Supabase auth.users with display info
create table if not exists profiles (
  id          uuid primary key references auth.users on delete cascade,
  username    text unique,
  avatar_url  text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Auto-create a profile when a user signs up
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ── WATCHLIST ─────────────────────────────────
create table if not exists watchlist (
  id           uuid default gen_random_uuid() primary key,
  user_id      uuid references auth.users on delete cascade not null,
  tmdb_id      integer not null,
  media_type   text not null check (media_type in ('movie', 'tv')),
  title        text not null,
  poster_path  text,
  vote_average numeric(3,1) default 0,
  release_date text,
  note         text default '',
  rank         integer default 0,
  created_at   timestamptz default now(),
  unique(user_id, tmdb_id)
);

-- ── RATINGS ───────────────────────────────────
-- User's personal star ratings (for phase 4)
create table if not exists ratings (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users on delete cascade not null,
  tmdb_id     integer not null,
  media_type  text not null check (media_type in ('movie', 'tv')),
  rating      integer not null check (rating between 1 and 10),
  created_at  timestamptz default now(),
  unique(user_id, tmdb_id)
);

-- ── FAVOURITE ACTORS ──────────────────────────
-- For phase 4 actor tracking
create table if not exists favourite_actors (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references auth.users on delete cascade not null,
  person_id  integer not null,
  name       text not null,
  photo_path text,
  created_at timestamptz default now(),
  unique(user_id, person_id)
);

-- ── ROW LEVEL SECURITY ────────────────────────
-- IMPORTANT: users can only see their own data

alter table profiles          enable row level security;
alter table watchlist         enable row level security;
alter table ratings           enable row level security;
alter table favourite_actors  enable row level security;

-- Profiles: users can read/update their own
create policy "users can view own profile"
  on profiles for select using (auth.uid() = id);
create policy "users can update own profile"
  on profiles for update using (auth.uid() = id);

-- Watchlist: full CRUD on own rows only
create policy "users can view own watchlist"
  on watchlist for select using (auth.uid() = user_id);
create policy "users can insert own watchlist"
  on watchlist for insert with check (auth.uid() = user_id);
create policy "users can update own watchlist"
  on watchlist for update using (auth.uid() = user_id);
create policy "users can delete own watchlist"
  on watchlist for delete using (auth.uid() = user_id);

-- Ratings
create policy "users can manage own ratings"
  on ratings for all using (auth.uid() = user_id);

-- Favourite actors
create policy "users can manage own favourites"
  on favourite_actors for all using (auth.uid() = user_id);