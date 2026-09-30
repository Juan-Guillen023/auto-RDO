import { describe, it, expect, vi } from 'vitest';

vi.mock('../services/supabaseClient', () => ({ supabase: {} }));

import { mensagemParaUsuario } from './useGeracao';
import { ErroApi } from '../services/apiClient';

const GENERICA = 'Erro ao gerar o PDF. Verifique o servidor.';

describe('mensagemParaUsuario', () => {
  it('4xx mostra a mensagem do servidor', () => {
    expect(mensagemParaUsuario(new ErroApi(429, 'Aguarde.'), GENERICA)).toBe('Aguarde.');
  });

  it('503 mostra a mensagem do servidor', () => {
    const err = new ErroApi(503, 'Não foi possível verificar a sessão. Tente novamente.');
    expect(mensagemParaUsuario(err, GENERICA)).toBe(err.message);
  });

  it('500 fica com a mensagem genérica', () => {
    expect(mensagemParaUsuario(new ErroApi(500, 'Erro interno.'), GENERICA)).toBe(GENERICA);
  });

  it('falha de rede fica com a mensagem genérica', () => {
    expect(mensagemParaUsuario(new TypeError('Failed to fetch'), GENERICA)).toBe(GENERICA);
  });
});
