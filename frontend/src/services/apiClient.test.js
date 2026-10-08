import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('./supabaseClient', () => ({ supabase: {} }));

import { acordarServidor } from './apiClient';

afterEach(() => vi.unstubAllGlobals());

describe('acordarServidor', () => {
  it('faz GET na raiz do servidor, fora de /api (que exige token)', () => {
    const fetchFalso = vi.fn().mockResolvedValue(new Response('ok'));
    vi.stubGlobal('fetch', fetchFalso);

    acordarServidor();

    expect(fetchFalso).toHaveBeenCalledOnce();
    const [url, opcoes] = fetchFalso.mock.calls[0];
    expect(url).not.toMatch(/\/api/);
    expect(opcoes).toEqual({ cache: 'no-store' });
  });

  it('não propaga falha de rede', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    expect(() => acordarServidor()).not.toThrow();
    // Deixa a promise rejeitada assentar: se não houvesse catch, o Vitest acusaria unhandled rejection
    await new Promise((r) => setTimeout(r, 0));
  });
});
