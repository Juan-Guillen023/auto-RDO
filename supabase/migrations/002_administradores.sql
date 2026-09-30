-- =============================================================================
-- 002 — Administradores: podem LER os relatórios e fotos de todos os usuários.
-- Editar e excluir continuam restritos ao dono (policies da 001, inalteradas).
-- Executar uma única vez no SQL Editor do Supabase.
-- =============================================================================

create table public.administradores (
  user_id   uuid        primary key references auth.users (id) on delete cascade,
  criado_em timestamptz not null default now()
);

-- RLS ligado e NENHUMA policy: pela API ninguém lê, cria ou altera esta tabela.
-- Assim nenhum usuário consegue se promover sozinho — só quem tem acesso ao
-- SQL Editor do projeto.
alter table public.administradores enable row level security;

-- `security definer`: roda com as permissões do dono da função, então consegue
-- consultar `administradores` mesmo sem policy. `search_path = ''` impede que
-- alguém "sequestre" nomes de tabela criando objetos em outro schema.
create function public.eh_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.administradores where user_id = (select auth.uid())
  );
$$;

revoke execute on function public.eh_admin() from public, anon;
grant execute on function public.eh_admin() to authenticated;

-- Policies do mesmo comando são combinadas com OR: continua valendo
-- "dono lê" (001) e passa a valer também "admin lê".
create policy "relatorios: admin lê todos"
  on public.relatorios for select to authenticated
  using ((select public.eh_admin()));

create policy "fotos: admin lê todas"
  on storage.objects for select to authenticated
  using (bucket_id = 'fotos' and (select public.eh_admin()));
