create table if not exists deepworion_runs (
  id          uuid primary key default gen_random_uuid(),
  task        text        not null,
  resposta    text,
  modelo      text,
  agente      text,
  reads       text,
  files       text,
  exec_usado  boolean     default false,
  created_at  timestamptz default now()
);

alter table deepworion_runs enable row level security;

drop policy if exists "deepworion insert" on deepworion_runs;
drop policy if exists "deepworion select" on deepworion_runs;

create policy "deepworion insert" on deepworion_runs
  for insert
  with check (true);

create policy "deepworion select" on deepworion_runs
  for select
  using (true);
