require('dotenv').config();

const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

// RETORNA PARA O PDFKIT PADRÃO (Sem tabelas fantasmas que criam páginas)
const PDFDocument = require('pdfkit'); 

const RdoContext = require('./context/RdoContext');
const ResidentialRdoStrategy = require('./rdo/renders/ResidentialRdoStrategy');
const { gerarEmailRdo } = require('./services/EmailService');


app.use(cors());

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const estrategiasDisponiveis = {
  'residencial': new ResidentialRdoStrategy()
};

app.post('/api/gerar-rdo', async (req, res) => {
  const dadosRDO = req.body;
  const tipoLayout = dadosRDO.tipoLayout || 'residencial'; 

  try {
    const rdoContext = new RdoContext();
    const estrategiaEscolhida = estrategiasDisponiveis[tipoLayout];

    if (!estrategiaEscolhida) {
      return res.status(400).json({ error: "Tipo de RDO não suportado." });
    }

    rdoContext.setStrategy(estrategiaEscolhida);

    // Inicializa o PDFKit padrão com margens zeradas para controlarm os blocos na margem
    const doc = new PDFDocument({ 
      size: 'A4', 
      margins: { top: 100, bottom: 90, left: 50, right: 50 },
      bufferPages: true 
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=RDO_${dadosRDO.cliente.replace(/\s+/g, '_')}.pdf`);
    doc.pipe(res);

    await rdoContext.gerarDocumento(doc, dadosRDO);

    doc.end();

  } catch (error) {
    console.error("Erro:", error);
    res.status(500).json({ error: "Erro interno ao gerar o PDF." });
  }
});

app.post('/api/gerar-email', async (req, res) => {
  const dadosRDO = req.body;

  try {
    const email = await gerarEmailRdo(dadosRDO);
    res.json(email);
  } catch (error) {
    console.error("Erro ao gerar email:", error);
    res.status(500).json({ error: "Erro interno ao gerar o email." });
  }
});

const PORT = process.env.PORT || 3001;
app.get('/', (req, res) => {
  res.send('O servidor RDO está online!');
});
app.listen(PORT, () => console.log(`🚀 Servidor Rodando na porta ${PORT}`));