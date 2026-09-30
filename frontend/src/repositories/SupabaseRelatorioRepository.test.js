import { describe, expect, test } from 'vitest';
import { SupabaseRelatorioRepository } from './SupabaseRelatorioRepository';
import { ConflitoDeVersaoError } from './RelatorioRepository';

/**
 * Supabase falso em memória, com UMA linha de relatório. Imita só o que o
 * repositório usa: o builder encadeável (`from().update().eq()...`) e a regra
 * de que `atualizado_em` muda a cada gravação (o trigger do banco real).
 */
function criarSupabaseFalso() {
  const banco = { linha: null, versao: 0 };

  const gravar = (valores) => {
    banco.versao += 1;
    banco.linha = { ...banco.linha, ...valores, atualizado_em: `v${banco.versao}` };
    return { data: [{ atualizado_em: banco.linha.atualizado_em }], error: null };
  };

  const executar = (ops) => {
    const op = (nome) => ops.find((o) => o.nome === nome);
    const filtroVersao = ops.find((o) => o.nome === 'eq' && o.args[0] === 'atualizado_em');

    if (op('insert')) return gravar({ user_id: 'dono', ...op('insert').args[0] });
    if (op('update')) {
      const versaoBate = banco.linha && filtroVersao.args[1] === banco.linha.atualizado_em;
      return versaoBate ? gravar(op('update').args[0]) : { data: [], error: null };
    }
    if (op('maybeSingle')) return { data: banco.linha && { user_id: banco.linha.user_id }, error: null };
    if (op('single')) {
      return { data: { ...banco.linha, dados: { campos: {}, diasDados: [] } }, error: null };
    }
    throw new Error(`Operação não simulada: ${ops.map((o) => o.nome).join('.')}`);
  };

  const builder = () => {
    const ops = [];
    const proxy = new Proxy({}, {
      get(_, nome) {
        if (nome === 'then') {
          return (ok, falha) => Promise.resolve().then(() => executar(ops)).then(ok, falha);
        }
        return (...args) => {
          ops.push({ nome, args });
          return proxy;
        };
      },
    });
    return proxy;
  };

  return {
    from: builder,
    storage: { from: () => ({ list: async () => ({ data: [], error: null }) }) },
    auth: { getSession: async () => ({ data: { session: { user: { id: 'dono' } } } }) },
  };
}

const relatorio = (cliente) => ({ id: 'r1', campos: { cliente }, diasDados: [] });

describe('optimistic locking', () => {
  test('relatório novo: cria e depois atualiza normalmente', async () => {
    const repo = new SupabaseRelatorioRepository(criarSupabaseFalso());
    await repo.salvar(relatorio('v1'));
    await expect(repo.salvar(relatorio('v2'))).resolves.toBe('r1');
  });

  test('salvamentos seguidos na mesma sessão não conflitam entre si', async () => {
    const repo = new SupabaseRelatorioRepository(criarSupabaseFalso());
    await repo.salvar(relatorio('a'));
    // Disparados juntos (auto-save + botão): a fila usa a versão deixada pelo anterior
    await expect(Promise.all([repo.salvar(relatorio('b')), repo.salvar(relatorio('c'))])).resolves.toBeDefined();
  });

  test('duas pessoas no mesmo relatório: quem salva por último recebe conflito', async () => {
    const supabase = criarSupabaseFalso();
    await new SupabaseRelatorioRepository(supabase).salvar(relatorio('original'));

    const tecnico = new SupabaseRelatorioRepository(supabase);
    const admin = new SupabaseRelatorioRepository(supabase);
    await tecnico.abrir('r1');
    await admin.abrir('r1');

    await admin.salvar(relatorio('edição do admin'));
    await expect(tecnico.salvar(relatorio('edição do técnico'))).rejects.toBeInstanceOf(ConflitoDeVersaoError);
  });

  test('depois de reabrir, volta a salvar', async () => {
    const supabase = criarSupabaseFalso();
    await new SupabaseRelatorioRepository(supabase).salvar(relatorio('original'));

    const tecnico = new SupabaseRelatorioRepository(supabase);
    await tecnico.abrir('r1');
    await new SupabaseRelatorioRepository(supabase).salvar(relatorio('outra pessoa'));
    await expect(tecnico.salvar(relatorio('x'))).rejects.toBeInstanceOf(ConflitoDeVersaoError);

    await tecnico.abrir('r1');
    await expect(tecnico.salvar(relatorio('x'))).resolves.toBe('r1');
  });
});
