-- Run once in the Supabase SQL editor.
-- Daily counts behind the usage limits. Buckets are scrambled and change every day,
-- so they can't be traced to a person or linked between days.

create table if not exists public.usage_counters (
  day date not null,
  bucket text not null,
  used integer not null default 0,
  primary key (day, bucket)
);

-- Only the server (service role) may touch this table.
alter table public.usage_counters enable row level security;
grant select, insert, update, delete on public.usage_counters to service_role;

-- Counts against every bucket together. If one is already full, nothing is counted and
-- that bucket's name is returned. Returns null when the request can go ahead.
create or replace function public.consume_allowance(
  p_day date,
  p_buckets text[],
  p_limits integer[]
) returns text
language plpgsql
set search_path = ''
as $$
declare
  i integer;
  v_used integer;
begin
  for i in 1 .. array_length(p_buckets, 1) loop
    insert into public.usage_counters (day, bucket, used)
    values (p_day, p_buckets[i], 1)
    on conflict (day, bucket)
    do update set used = public.usage_counters.used + 1
    returning used into v_used;

    if v_used > p_limits[i] then
      update public.usage_counters
      set used = used - 1
      where day = p_day and bucket = any (p_buckets[1:i]);
      return p_buckets[i];
    end if;
  end loop;

  return null;
end;
$$;

-- Hands an allowance back, for a request that failed.
create or replace function public.release_allowance(
  p_day date,
  p_buckets text[]
) returns void
language sql
set search_path = ''
as $$
  update public.usage_counters
  set used = greatest(used - 1, 0)
  where day = p_day and bucket = any (p_buckets);
$$;

revoke all on function public.consume_allowance(date, text[], integer[]) from public, anon, authenticated;
revoke all on function public.release_allowance(date, text[]) from public, anon, authenticated;
grant execute on function public.consume_allowance(date, text[], integer[]) to service_role;
grant execute on function public.release_allowance(date, text[]) to service_role;
