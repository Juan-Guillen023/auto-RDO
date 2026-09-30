-- =============================================================================
-- 005 — E-mail do autor no relatório, para o admin filtrar a lista por ele.
-- Executar uma única vez no SQL Editor do Supabase, depois da 004.
-- =============================================================================

-- O e-mail mora em auth.users, que a API não expõe ao frontend. Guardamos uma
-- cópia na própria linha: a listagem continua sendo um SELECT simples, sem
-- join nem função extra, e o RLS existente já decide quem enxerga o quê.
alter table public.relatorios
  add column autor_email text not null default '';

-- A cópia é SEMPRE derivada do dono (user_id) pelo banco — nunca aceita do
-- cliente. Mesmo que alguém envie `autor_email` no upsert, o trigger
-- sobrescreve. Rodar também no UPDATE faz a cópia se corrigir sozinha se o
-- e-mail do usuário mudar (no próximo salvamento).
-- `security definer`: o usuário comum não tem permissão para ler auth.users.
create function public.preencher_autor_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select u.email into new.autor_email
  from auth.users u
  where u.id = new.user_id;

  new.autor_email := coalesce(new.autor_email, '');
  return new;
end;
$$;

revoke execute on function public.preencher_autor_email() from public, anon, authenticated;

create trigger relatorios_preencher_autor_email
  before insert or update on public.relatorios
  for each row execute function public.preencher_autor_email();

-- Relatórios que já existiam
update public.relatorios r
set autor_email = u.email
from auth.users u
where u.id = r.user_id;
