import { MODO_OFFLINE } from '../config/modo';

/**
 * Feature flags do frontend. Desligar uma flag esconde a funcionalidade da UI
 * sem remover o código, para que ela possa ser reativada sem retrabalho.
 */
export const FUNCIONALIDADES = {
  timesheet: true,
  // O e-mail é escrito pelo Gemini, na nuvem: não existe sem internet.
  emailIa: !MODO_OFFLINE,
};
