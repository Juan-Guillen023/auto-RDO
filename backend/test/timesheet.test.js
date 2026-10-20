const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  formatarData, formatarMesAno, formatarHoras, formatarProjeto, montarLinhas, somarPorTipo,
} = require('../timesheet/formatacao');
const { gerarPdf } = require('../documentos/gerarPdf');
const TimesheetStrategy = require('../timesheet/renders/TimesheetStrategy');

describe('formatação do Timesheet', () => {
  test('data no formato da coluna Date', () => {
    assert.equal(formatarData('27/07/2026'), '27/jul/26');
    assert.equal(formatarData('05/02/26'), '05/fev/26');
  });

  test('data inválida é mantida como veio', () => {
    assert.equal(formatarData('2026-07-27'), '2026-07-27');
    assert.equal(formatarData('27/13/2026'), '27/13/2026');
    assert.equal(formatarData(undefined), '');
  });

  test('Month / Year a partir da data de início', () => {
    assert.equal(formatarMesAno('27/07/2026'), 'jul/26');
    assert.equal(formatarMesAno(''), '');
  });

  test('horas zeradas viram "-"', () => {
    assert.equal(formatarHoras(0), '-');
    assert.equal(formatarHoras(7.5), '7.5');
  });

  test('projeto e task no formato "Projeto: X Task: Y"', () => {
    assert.equal(formatarProjeto('PROJ. 3342786', '05GMF'), 'Projeto: PROJ. 3342786 Task: 05GMF');
    assert.equal(formatarProjeto('PROJ. 3342786', ''), 'Projeto: PROJ. 3342786');
  });

  test('uma linha por atividade com título, ignorando as sem título', () => {
    const linhas = montarLinhas([
      { data: '27/07/2026', atividades: [{ titulo: ' Relatório ', horas: '8', tipoHora: 'overtime' }, { titulo: '  ', horas: 2 }] },
      { data: '28/07/2026', atividades: [{ titulo: 'Visita' }] },
    ]);
    assert.deepEqual(linhas, [
      { data: '27/jul/26', descricao: 'Relatório', horas: 8, tipoHora: 'overtime' },
      { data: '28/jul/26', descricao: 'Visita', horas: 0, tipoHora: 'working' },
    ]);
  });

  test('tipo de hora ausente ou desconhecido conta como working', () => {
    const [semTipo, invalido] = montarLinhas([{
      data: '27/07/2026',
      atividades: [{ titulo: 'A', horas: 1 }, { titulo: 'B', horas: 1, tipoHora: 'xpto' }],
    }]);
    assert.equal(semTipo.tipoHora, 'working');
    assert.equal(invalido.tipoHora, 'working');
  });

  test('soma as horas por coluna, na ordem da tabela', () => {
    const totais = somarPorTipo([
      { horas: 4, tipoHora: 'travelling' },
      { horas: 8, tipoHora: 'working' },
      { horas: 2, tipoHora: 'working' },
      { horas: 3, tipoHora: 'holiday' },
    ]);
    assert.deepEqual(totais, [4, 0, 10, 0, 3]);
  });
});

describe('TimesheetStrategy', () => {
  const opcoesPdf = { size: 'A4', margins: { top: 40, bottom: 40, left: 50, right: 50 }, bufferPages: true };
  const contarPaginas = (pdf) => pdf.toString('latin1').match(/\/Type \/Page\b/g).length;

  test('poucas atividades cabem em uma página', async () => {
    const pdf = await gerarPdf(new TimesheetStrategy(), opcoesPdf, {
      dataInicio: '27/07/2026',
      dias: [{ data: '27/07/2026', atividades: [{ titulo: 'Relatório', horas: 8 }] }],
    });
    assert.equal(contarPaginas(pdf), 1);
  });

  test('muitas atividades e descrição longa quebram página sem erro', async () => {
    const atividades = Array.from({ length: 60 }, (_, i) => ({
      titulo: i % 5 ? `Atividade ${i}` : 'Descrição bem longa '.repeat(15),
      horas: 1,
    }));
    const pdf = await gerarPdf(new TimesheetStrategy(), opcoesPdf, {
      dias: [{ data: '27/07/2026', atividades }],
    });
    assert.ok(contarPaginas(pdf) > 1);
  });
});
