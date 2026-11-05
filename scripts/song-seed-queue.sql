-- Run once in the Supabase SQL editor.
-- The to-do list of songs the nightly job looks up with spare YouTube searches.
-- The weekly job (api/weekly-song-list.ts) refills it.

create table if not exists public.song_seed_queue (
  cache_key text primary key,
  title text not null,
  artist text not null,
  genre text,
  -- 0 = needed by a real playlist, 1 = Claude's likely picks, 2 = popular songs
  source_rank smallint not null default 1,
  -- Position within a genre, so each night takes a few songs from every genre.
  rotation integer not null default 0,
  times_suggested integer not null default 1,
  status text not null default 'pending'
    check (status in ('pending', 'done', 'not_found')),
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists song_seed_queue_next_up
  on public.song_seed_queue (status, source_rank, rotation, genre);

-- Only the server (service role) may touch this table.
alter table public.song_seed_queue enable row level security;
grant select, insert, update, delete on public.song_seed_queue to service_role;
