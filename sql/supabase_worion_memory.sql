-- Worion Memory Supabase schema
-- Execute este arquivo no SQL Editor do projeto Supabase:
-- https://tjjyqoblhgrqmanlbqut.supabase.co

create table if not exists public.worion_memory_conversations (
  id text primary key,
  title text not null default 'Conversa sem titulo',
  agent_id text,
  agent_name text,
  active_skill_id text,
  project_id text,
  project_title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb
);

create index if not exists worion_memory_conversations_updated_at_idx
  on public.worion_memory_conversations (updated_at desc);

create index if not exists worion_memory_conversations_agent_id_idx
  on public.worion_memory_conversations (agent_id);

alter table public.worion_memory_conversations enable row level security;

drop policy if exists "worion memory anon select" on public.worion_memory_conversations;
drop policy if exists "worion memory anon insert" on public.worion_memory_conversations;
drop policy if exists "worion memory anon update" on public.worion_memory_conversations;
drop policy if exists "worion memory anon delete" on public.worion_memory_conversations;

create policy "worion memory anon select"
  on public.worion_memory_conversations
  for select
  to anon
  using (true);

create policy "worion memory anon insert"
  on public.worion_memory_conversations
  for insert
  to anon
  with check (true);

create policy "worion memory anon update"
  on public.worion_memory_conversations
  for update
  to anon
  using (true)
  with check (true);

create policy "worion memory anon delete"
  on public.worion_memory_conversations
  for delete
  to anon
  using (true);

create or replace function public.set_worion_memory_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = coalesce(new.updated_at, now());
  return new;
end;
$$;

drop trigger if exists set_worion_memory_conversations_updated_at
  on public.worion_memory_conversations;

create trigger set_worion_memory_conversations_updated_at
before insert or update on public.worion_memory_conversations
for each row
execute function public.set_worion_memory_updated_at();
