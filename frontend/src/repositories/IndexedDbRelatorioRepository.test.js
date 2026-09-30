import 'fake-indexeddb/auto';
import { describe, expect, test } from 'vitest';
import { IndexedDbRelatorioRepository } from './IndexedDbRelatorioRepository';
import { ConflitoDeVersaoError } from './RelatorioRepository';

const USUARIO = { id: 'local', email: 'local@offline' };
const FOTO = 'data:image/png;base64,iVBORw0KGgo=';

const relatorio = (campos = {}) => ({
  campos: {
    cliente: 'ACME', projeto: 'P1', tecnico: 'Fulano', po: '123', task: 'T1',
    dataInicio: '01/09/2026', dataFim: '02/09/2026', ...campos,
  },
  diasDados: [{ data: '01/09/2026', atividades: [{ titulo: 'Montagem', imagens: [FOTO] }] }],
});

/** Banco novo por teste; duas instâncias no mesmo banco simulam duas abas. */
function criarAbas(quantidade = 1) {
  const nomeBanco = crypto.randomUUID();
  return Array.from({ length: quantidade }, () => new IndexedDbRelatorioRepository({ usuario: USUARIO, nomeBanco }));
}

describe('IndexedDbRelatorioRepository', () => {
  test('salva e reabre o relatório com as fotos intactas', async () => {
    const [repo] = criarAbas();
    const id = await repo.salvar(relatorio());

    const aberto = await repo.abrir(id);
    expect(aberto).toMatchObject({ id, userId: 'local', status: 'em_andamento', campos: { cliente: 'ACME' } });
    expect(aberto.diasDados[0].atividades[0].imagens).toEqual([FOTO]);
  });

  test('usa o id recebido (o editor gera o id antes do primeiro salvamento)', async () => {
    const [repo] = criarAbas();
    expect(await repo.salvar({ id: 'id-do-editor', ...relatorio() })).toBe('id-do-editor');
  });

  test('lista resumos, do mais recente para o mais antigo', async () => {
    const [repo] = criarAbas();
    const antigo = await repo.salvar(relatorio({ cliente: 'Antigo' }));
    const novo = await repo.salvar(relatorio({ cliente: 'Novo' }));

    const lista = await repo.listar();
    expect(lista.map((r) => r.id)).toEqual([novo, antigo]);
    expect(lista[0]).toMatchObject({
      userId: 'local', autorEmail: 'local@offline', cliente: 'Novo', tecnico: 'Fulano',
      po: '123', task: 'T1', dataInicio: '01/09/2026', dataFim: '02/09/2026',
    });
    expect(lista[0].atualizadoEm).toBeInstanceOf(Date);
  });

  test('salvamentos seguidos na mesma aba não geram conflito', async () => {
    const [repo] = criarAbas();
    const id = await repo.salvar(relatorio());
    await repo.salvar({ id, ...relatorio({ cliente: 'Editado' }), status: 'finalizado' });
    await repo.salvar({ id, ...relatorio({ cliente: 'Editado de novo' }) });

    expect((await repo.abrir(id)).campos.cliente).toBe('Editado de novo');
  });

  test('conflito: não sobrescreve o que outra aba salvou depois', async () => {
    const [abaA, abaB] = criarAbas(2);
    const id = await abaA.salvar(relatorio());
    await abaB.abrir(id);
    await abaA.salvar({ id, ...relatorio({ cliente: 'Da aba A' }) });

    await expect(abaB.salvar({ id, ...relatorio({ cliente: 'Da aba B' }) })).rejects.toBeInstanceOf(ConflitoDeVersaoError);
    expect((await abaA.abrir(id)).campos.cliente).toBe('Da aba A');
  });

  test('conflito: relatório excluído em outra aba não é recriado ao salvar', async () => {
    const [abaA, abaB] = criarAbas(2);
    const id = await abaA.salvar(relatorio());
    await abaB.abrir(id);
    await abaA.excluir(id);

    await expect(abaB.salvar({ id, ...relatorio() })).rejects.toBeInstanceOf(ConflitoDeVersaoError);
    expect(await abaA.listar()).toEqual([]);
  });

  test('exclui o relatório', async () => {
    const [repo] = criarAbas();
    const id = await repo.salvar(relatorio());
    await repo.excluir(id);

    expect(await repo.listar()).toEqual([]);
    await expect(repo.abrir(id)).rejects.toThrow('não encontrado');
  });

  test('excluir um relatório inexistente falha em vez de fingir sucesso', async () => {
    const [repo] = criarAbas();
    await expect(repo.excluir('nao-existe')).rejects.toThrow('não encontrado');
  });
});
