const CAMPOS_TEXTO = [
  'cliente', 'projeto', 'task', 'po', 'tecnico', 'localizacao',
  'servico', 'escopo', 'dataInicio', 'dataFim', 'tipoLayout',
];

/**
 * Checa a FORMA dos dados antes de gerar qualquer documento. Não valida
 * regra de negócio (campos obrigatórios etc.), isso é do formulário. Aqui só
 * garantimos que as estratégias não vão quebrar com um tipo inesperado.
 *
 * @param {unknown} dados
 * @returns {string | null} mensagem de erro, ou null se válido
 */
function validarPayload(dados) {
  if (!dados || typeof dados !== 'object' || Array.isArray(dados)) {
    return 'O corpo da requisição deve ser um objeto JSON.';
  }

  const campoInvalido = CAMPOS_TEXTO.find((campo) => dados[campo] != null && typeof dados[campo] !== 'string');
  if (campoInvalido) return `O campo "${campoInvalido}" deve ser texto.`;

  if (!Array.isArray(dados.dias)) return 'O campo "dias" deve ser uma lista.';

  const diaInvalido = dados.dias.some((dia) => !dia || typeof dia !== 'object' || !Array.isArray(dia.atividades));
  if (diaInvalido) return 'Cada dia deve ter uma lista "atividades".';

  return null;
}

module.exports = { validarPayload };
