-- =============================================================================
-- 003 — Administradores também EDITAM relatórios e fotos de qualquer usuário.
-- Excluir o relatório continua exclusivo do dono (policy da 001, inalterada).
-- Executar uma única vez no SQL Editor do Supabase, depois da 002.
-- =============================================================================

-- O salvamento é um upsert: para um relatório existente, vira UPDATE.
-- `with check` garante que a linha continue válida após a alteração (o
-- user_id nunca é enviado pelo app, então o dono original é preservado).
create policy "relatorios: admin altera todos"
  on public.relatorios for update to authenticated
  using ((select public.eh_admin()))
  with check ((select public.eh_admin()));

-- Fotos: ao editar, o admin envia fotos novas e apaga as removidas —
-- sempre na pasta do DONO do relatório.
create policy "fotos: admin envia"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos' and (select public.eh_admin()));

create policy "fotos: admin atualiza"
  on storage.objects for update to authenticated
  using (bucket_id = 'fotos' and (select public.eh_admin()))
  with check (bucket_id = 'fotos' and (select public.eh_admin()));

create policy "fotos: admin exclui"
  on storage.objects for delete to authenticated
  using (bucket_id = 'fotos' and (select public.eh_admin()));
