// @vitest-environment jsdom
import { expect, test } from 'vitest';
import { ESCOPO_PERIODO, recortarPayload, validarCamposDoEscopo } from './escopoRelatorio';

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

/** Formulário com um campo geral e um campo obrigatório por dia. */
function montarFormulario({ geral = 'ACME', dia1 = '', dia2 = '' } = {}) {
  const form = document.createElement('form');
  form.innerHTML = `
    <input name="cliente" required value="${geral}">
    <div data-escopo="01/09/2026"><input name="hora" required value="${dia1}"></div>
    <div data-escopo="02/09/2026"><input name="hora" required value="${dia2}"></div>
  `;
  return form;
}

test('dia: ignora campos obrigatórios vazios de outros dias', () => {
  const form = montarFormulario({ dia1: '08:00' });
  expect(validarCamposDoEscopo(form, '01/09/2026')).toBe(true);
});

test('dia: bloqueia se o próprio dia estiver incompleto', () => {
  const form = montarFormulario({ dia2: '08:00' });
  expect(validarCamposDoEscopo(form, '01/09/2026')).toBe(false);
});

test('dia: campos gerais continuam obrigatórios', () => {
  const form = montarFormulario({ geral: '', dia1: '08:00' });
  expect(validarCamposDoEscopo(form, '01/09/2026')).toBe(false);
});

test('período: exige os campos de todos os dias', () => {
  const form = montarFormulario({ dia1: '08:00' });
  expect(validarCamposDoEscopo(form, ESCOPO_PERIODO)).toBe(false);
});
