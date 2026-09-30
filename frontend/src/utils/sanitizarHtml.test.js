// @vitest-environment jsdom
import { describe, expect, test } from 'vitest';
import { sanitizarHtml } from './sanitizarHtml';

describe('mantém a formatação do editor', () => {
  test.each([
    '<b>negrito</b> <i>itálico</i> <u>sublinhado</u>',
    '<strong>a</strong><em>b</em>',
    '<div>linha 1</div><div>linha 2<br></div>',
    '<span style="font-size: 18px;">grande</span>',
  ])('%s', (html) => {
    expect(sanitizarHtml(html)).toBe(html);
  });
});

describe('remove o que pode executar código', () => {
  test('atributo de evento', () => {
    expect(sanitizarHtml('<img src=x onerror="alert(1)">texto')).toBe('texto');
  });

  test('script', () => {
    expect(sanitizarHtml('<script>alert(1)</script>ok')).toBe('ok');
  });

  test('link javascript: (a tag some, o texto fica)', () => {
    expect(sanitizarHtml('<a href="javascript:alert(1)">clique</a>')).toBe('clique');
  });

  test('evento dentro de uma tag permitida', () => {
    expect(sanitizarHtml('<b onclick="alert(1)">x</b>')).toBe('<b>x</b>');
  });
});

test('style só aceita tamanho de fonte', () => {
  expect(sanitizarHtml('<span style="position:fixed;inset:0">x</span>')).toBe('<span>x</span>');
});

test('vazio ou nulo vira string vazia', () => {
  expect(sanitizarHtml(null)).toBe('');
  expect(sanitizarHtml(undefined)).toBe('');
});
