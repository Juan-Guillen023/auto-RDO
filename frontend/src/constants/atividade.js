/**
 * Constantes de domínio de uma atividade do RDO.
 * Os valores de status precisam bater com o STATUS_LABEL do backend
 * (backend/services/EmailService.js).
 */

export const STATUS_ATIVIDADE = [
  { valor: 'concluido', label: '🟢 Concluído' },
  { valor: 'em_progresso', label: '🟡 Em progresso' },
  { valor: 'pendente', label: '⚪ Pendente / Não iniciado' },
  { valor: 'bloqueio', label: '🔴 Bloqueio / Ação necessária' },
];

/**
 * Cria uma atividade em branco. É uma função (e não um objeto constante) para
 * que cada atividade receba seu próprio array `imagens`, sem compartilhar referência.
 * @returns {{ titulo: string, texto: string, status: string, imagens: string[], horas: string }}
 */
export const novaAtividade = () => ({
  titulo: '',
  texto: '',
  status: 'concluido',
  imagens: [],
  horas: '',
});
