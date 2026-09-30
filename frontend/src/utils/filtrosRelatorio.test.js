import { describe, expect, test } from 'vitest';
import { combinar, deOutrosUsuarios, doAutor, doUsuario, emailsDosAutores } from './filtrosRelatorio';

const relatorios = [
  { id: '1', userId: 'eu', autorEmail: 'eu@x.com' },
  { id: '2', userId: 'joao', autorEmail: 'joao@x.com' },
  { id: '3', userId: 'maria', autorEmail: 'maria@x.com' },
  { id: '4', userId: 'joao', autorEmail: 'joao@x.com' },
];

const ids = (lista) => lista.map((r) => r.id);

describe('abas', () => {
  test('"Meus" e "Todos" são disjuntas e juntas cobrem a lista', () => {
    const meus = relatorios.filter(doUsuario('eu'));
    const deOutros = relatorios.filter(deOutrosUsuarios('eu'));

    expect(ids(meus)).toEqual(['1']);
    expect(ids(deOutros)).toEqual(['2', '3', '4']);
    expect(meus.length + deOutros.length).toBe(relatorios.length);
  });
});

describe('doAutor', () => {
  test('filtra pelo e-mail exato', () => {
    expect(ids(relatorios.filter(doAutor('joao@x.com')))).toEqual(['2', '4']);
  });

  test('e-mail vazio não filtra ("Todos os técnicos")', () => {
    expect(relatorios.filter(doAutor(''))).toHaveLength(relatorios.length);
  });
});

test('combinar aplica todos os filtros (E lógico)', () => {
  const filtro = combinar(deOutrosUsuarios('eu'), doAutor('maria@x.com'));
  expect(ids(relatorios.filter(filtro))).toEqual(['3']);
});

test('emailsDosAutores: distintos, ordenados e sem vazios', () => {
  const comVazio = [...relatorios, { id: '5', userId: 'x', autorEmail: '' }];
  expect(emailsDosAutores(comVazio)).toEqual(['eu@x.com', 'joao@x.com', 'maria@x.com']);
});
