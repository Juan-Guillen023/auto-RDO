-- =============================================================================
-- 001 — Relatórios (RDO) e fotos
-- Executar uma única vez no SQL Editor do Supabase.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tabela de relatórios
--
-- Modelo "documento": o relatório inteiro (campos + dias + atividades) vive em
-- `dados` (jsonb), no mesmo formato do estado do frontend. As colunas soltas
-- existem só para listar/filtrar sem abrir o JSON.
-- -----------------------------------------------------------------------------
create table public.relatorios (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  cliente       text        not null default '',
  projeto       text        not null default '',
  data_inicio   text        not null default '',  -- DD/MM/AAAA, igual ao formulário
  data_fim      text        not null default '',
  status        text        not null default 'em_andamento'
                            check (status in ('em_andamento', 'finalizado')),
  dados         jsonb       not null,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index relatorios_user_atualizado_idx
  on public.relatorios (user_id, atualizado_em desc);

-- Mantém atualizado_em correto mesmo se alguém esquecer de enviá-lo
create function public.tocar_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

create trigger relatorios_tocar_atualizado_em
  before update on public.relatorios
  for each row execute function public.tocar_atualizado_em();

-- -----------------------------------------------------------------------------
-- Row Level Security: cada técnico só enxerga e altera os próprios relatórios.
-- Sem estas policies, a chave pública do frontend daria acesso a TUDO.
-- `(select auth.uid())` em vez de `auth.uid()` faz o Postgres calcular o valor
-- uma vez por consulta, e não uma vez por linha.
-- -----------------------------------------------------------------------------
alter table public.relatorios enable row level security;

create policy "relatorios: dono lê"
  on public.relatorios for select to authenticated
  using (user_id = (select auth.uid()));

create policy "relatorios: dono cria"
  on public.relatorios for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "relatorios: dono altera"
  on public.relatorios for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "relatorios: dono exclui"
  on public.relatorios for delete to authenticated
  using (user_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- Storage: bucket PRIVADO para as fotos.
-- Caminho dos arquivos: <user_id>/<relatorio_id>/<hash>.jpg
-- A primeira pasta do caminho é o dono — é isso que as policies verificam.
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('fotos', 'fotos', false);

create policy "fotos: dono lê"
  on storage.objects for select to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "fotos: dono envia"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- O upload usa upsert (nome = hash do conteúdo), que exige também UPDATE
create policy "fotos: dono atualiza"
  on storage.objects for update to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'fotos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "fotos: dono exclui"
  on storage.objects for delete to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = (select auth.uid())::text);
