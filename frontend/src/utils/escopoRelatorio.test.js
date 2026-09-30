import { expect, test } from 'vitest';
import { ESCOPO_PERIODO, recortarPayload } from './escopoRelatorio';

const campos = { cliente: 'ACME', dataInicio: '01/09/2026', dataFim: '03/09/2026' };
const dias = [{ data: '01/09/2026' }, { data: '02/09/2026' }, { data: '03/09/2026' }];

test('período: envia todos os dias e as datas originais', () => {
  expect(recortarPayload(campos, dias, ESCOPO_PERIODO)).toEqual({ ...campos, dias });
});

test('um dia: o período do documento vira aquele dia', () => {
  const payload = recortarPayload(campos, dias, '02/09/2026');
  expect(payload.dataInicio).toBe('02/09/2026');
  expect(payload.dataFim).toBe('02/09/2026');
  expect(payload.dias).toEqual([{ data: '02/09/2026' }]);
});
