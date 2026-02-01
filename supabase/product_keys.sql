-- Supabase product_keys table for online activation (one-time keys)
-- Run this in Supabase SQL editor.

create table if not exists public.product_keys (
  key_hash text primary key,
  status text not null default 'unused' check (status in ('unused','used')),
  activated_at timestamptz,
  machine_id text,
  machine_name text,
  notes text,
  created_at timestamptz default now()
);

-- Optional: index for status lookups
create index if not exists product_keys_status_idx on public.product_keys(status);

-- RLS policies (allow service role only; REST calls use service key)
alter table public.product_keys enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'product_keys' and policyname = 'service_access'
  ) then
    create policy service_access on public.product_keys
      for all
      using (auth.role() = 'service_role')
      with check (auth.role() = 'service_role');
  end if;
end $$;

-- Insert keys (hash = sha256(normalized_product_key)); set status='unused'
-- Example:
-- insert into public.product_keys (key_hash, status, notes) values ('<hash>', 'unused', 'Internal machine');
