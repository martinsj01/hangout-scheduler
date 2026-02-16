-- Users table (extends Supabase auth.users)
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  first_name text not null,
  username text unique not null,
  profile_photo_url text,
  created_at timestamptz default now()
);

-- Friends table
create table public.friends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  friend_user_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz default now(),
  unique(user_id, friend_user_id)
);

-- Interests table
create table public.interests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  created_at timestamptz default now()
);

-- Hangout suggestions table
create table public.hangout_suggestions (
  id uuid primary key default gen_random_uuid(),
  sender_user_id uuid not null references public.users(id) on delete cascade,
  recipient_user_id uuid not null references public.users(id) on delete cascade,
  interest_id uuid not null references public.interests(id) on delete cascade,
  proposed_datetime timestamptz not null,
  message text,
  location text,
  description text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz default now()
);

-- Row Level Security
alter table public.users enable row level security;
alter table public.friends enable row level security;
alter table public.interests enable row level security;
alter table public.hangout_suggestions enable row level security;

-- RLS Policies
create policy "Users are viewable by authenticated users" on public.users for select to authenticated using (true);
create policy "Users can update own record" on public.users for update to authenticated using (auth.uid() = id);
create policy "Users can insert own record" on public.users for insert to authenticated with check (auth.uid() = id);

create policy "Users can view own friendships" on public.friends for select to authenticated using (user_id = auth.uid() or friend_user_id = auth.uid());
create policy "Users can send friend requests" on public.friends for insert to authenticated with check (user_id = auth.uid());
create policy "Users can update friend requests sent to them" on public.friends for update to authenticated using (friend_user_id = auth.uid());
create policy "Users can delete own friendships" on public.friends for delete to authenticated using (user_id = auth.uid() or friend_user_id = auth.uid());

create policy "Interests are viewable by authenticated users" on public.interests for select to authenticated using (true);
create policy "Users can manage own interests" on public.interests for insert to authenticated with check (user_id = auth.uid());
create policy "Users can delete own interests" on public.interests for delete to authenticated using (user_id = auth.uid());

create policy "Users can view own suggestions" on public.hangout_suggestions for select to authenticated using (sender_user_id = auth.uid() or recipient_user_id = auth.uid());
create policy "Users can create suggestions" on public.hangout_suggestions for insert to authenticated with check (sender_user_id = auth.uid());
create policy "Recipients can update suggestions" on public.hangout_suggestions for update to authenticated using (recipient_user_id = auth.uid());
