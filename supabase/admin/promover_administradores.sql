-- Promove usuários a administrador. NÃO é migração: rode no SQL Editor quando
-- precisar, trocando os e-mails. Os usuários precisam já ter criado a conta.

insert into public.administradores (user_id)
select id
from auth.users
where email in (
  'seu.email@emerson.com',
  'email.do.coordenador@emerson.com'
)
on conflict (user_id) do nothing
returning user_id;  -- deve devolver uma linha por e-mail encontrado

-- Conferir quem é admin:
-- select u.email, a.criado_em
-- from public.administradores a join auth.users u on u.id = a.user_id;

-- Remover um admin:
-- delete from public.administradores
-- where user_id = (select id from auth.users where email = 'email@emerson.com');
