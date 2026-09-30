-- =============================================================================
-- 004 — Administradores também EXCLUEM relatórios de qualquer usuário.
-- A exclusão das fotos já é permitida pela policy "fotos: admin exclui" (003).
-- Executar uma única vez no SQL Editor do Supabase, depois da 003.
-- =============================================================================

create policy "relatorios: admin exclui todos"
  on public.relatorios for delete to authenticated
  using ((select public.eh_admin()));
