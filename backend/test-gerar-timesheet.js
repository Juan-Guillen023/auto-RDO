// Teste manual do gerador de PDF do Timesheet.
// Rode direto com: node test-gerar-timesheet.js
// Gera um arquivo timesheet-teste.pdf na pasta backend para inspeção visual.

const fs = require('fs');
const PDFDocument = require('pdfkit');
const RdoContext = require('./context/RdoContext');
const TimesheetStrategy = require('./timesheet/renders/TimesheetStrategy');

const dadosTeste = {
  cliente: 'ENGIE',
  projeto: 'PROJ. 3342786',
  task: '05GMF',
  po: '4500123456',
  tecnico: 'RAFAEL CABRAL',
  localizacao: 'ITABUNA - BAHIA',
  dataInicio: '26/07/2026',
  dataFim: '30/07/2026',
  dias: [
    {
      data: '26/07/26',
      atividades: [
        { titulo: 'Deslocamento até o site', horas: 4 },
      ],
    },
    {
      data: '27/07/26',
      atividades: [
        { titulo: 'Elaboração do relatório referente a GC de ITABUNA - BA', horas: 8 },
        { titulo: 'Reunião de alinhamento com o cliente', horas: 2 },
      ],
    },
    {
      data: '28/07/26',
      atividades: [
        { titulo: 'Comissionamento de instrumentos de campo', horas: 8 },
      ],
    },
  ],
};

const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 40, bottom: 40, left: 50, right: 50 },
  bufferPages: true,
});

const stream = fs.createWriteStream(__dirname + '/timesheet-teste.pdf');
doc.pipe(stream);

const context = new RdoContext();
context.setStrategy(new TimesheetStrategy());

context.gerarDocumento(doc, dadosTeste)
  .then(() => {
    doc.end();
    stream.on('finish', () => console.log('SUCESSO: timesheet-teste.pdf gerado.'));
  })
  .catch((e) => console.log('ERRO:', e));
