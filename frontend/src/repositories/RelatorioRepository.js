/**
 * Contrato de persistência de relatórios (padrão Repository).
 *
 * A interface do app depende SÓ deste contrato — nunca de Supabase, IndexedDB
 * ou fetch. Qualquer classe que implemente estes quatro métodos pode ser usada
 * no lugar de outra (é o Strategy aplicado ao armazenamento).
 *
 * As imagens entram e saem como data URL, exatamente como o formulário e o PDF
 * já usam. Como elas são armazenadas por baixo é detalhe de cada implementação.
 *
 * @typedef {'em_andamento' | 'finalizado'} StatusRelatorio
 *
 * @typedef {object} ResumoRelatorio
 * @property {string} id
 * @property {string} userId          - dono do relatório
 * @property {string} autorEmail      - e-mail do dono (preenchido pelo banco)
 * @property {string} cliente
 * @property {string} projeto
 * @property {string} tecnico
 * @property {string} po
 * @property {string} task
 * @property {string} dataInicio      - DD/MM/AAAA
 * @property {string} dataFim         - DD/MM/AAAA
 * @property {StatusRelatorio} status
 * @property {Date} atualizadoEm
 *
 * @typedef {object} Relatorio
 * @property {string} [id]            - ausente em relatório novo
 * @property {string} [userId]        - dono; ausente em relatório novo (é do usuário atual)
 * @property {object} campos          - mesmo formato de useRdoForm
 * @property {object[]} diasDados     - mesmo formato de useRdoForm
 * @property {StatusRelatorio} [status]
 *
 * @typedef {object} RelatorioRepository
 * @property {() => Promise<ResumoRelatorio[]>} listar
 *   Resumos dos relatórios do usuário, mais recentes primeiro (sem fotos — é leve).
 * @property {(id: string) => Promise<Relatorio>} abrir
 *   Relatório completo, com as fotos prontas para exibir.
 * @property {(relatorio: Relatorio) => Promise<string>} salvar
 *   Cria ou atualiza. Devolve o id (novo ou existente). Lança
 *   ConflitoDeVersaoError se o relatório mudou no banco desde que foi aberto
 *   (ou salvo) nesta sessão: nunca sobrescreve o trabalho de outra pessoa.
 * @property {(id: string) => Promise<void>} excluir
 *   Remove o relatório e suas fotos.
 */

/**
 * Faz parte do contrato: toda implementação lança ESTE erro em caso de
 * conflito, para a interface reagir sem conhecer o armazenamento.
 */
export class ConflitoDeVersaoError extends Error {
  constructor() {
    super('Este relatório foi alterado por outra pessoa depois que você o abriu.');
    this.name = 'ConflitoDeVersaoError';
  }
}
