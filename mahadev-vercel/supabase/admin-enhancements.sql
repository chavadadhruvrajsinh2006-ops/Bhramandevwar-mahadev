-- Brahmandeshwar admin enhancements
alter table public.profiles add column if not exists username text;
create unique index if not exists profiles_username_unique on public.profiles(username) where username is not null;

-- The extra security key requested for the admin UI is implemented as a client-side SHA-256 gate.
-- Supabase Auth + RLS remain the real backend security boundary.
