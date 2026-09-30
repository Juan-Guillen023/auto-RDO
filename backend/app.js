const express = require('express');
const cors = require('cors');
const { rateLimit } = require('express-rate-limit');

const { criarAutenticacao } = require('./auth/autenticar');
const { resolverDocumento } = require('./documentos/registro');
const { gerarPdf, cabecalhoDownload } = require('./documentos/gerarPdf');
const { validarPayload } = require('./documentos/validarPayload');
const { gerarEmailRdo } = require('./services/EmailService');

const QUINZE_MINUTOS = 15 * 60 * 1000;

/**
 * Monta o app sem abrir porta nem ler variáveis de ambiente: tudo que varia
 * entre produção e teste entra por parâmetro.
 *
 * @param {{
 *   verificarToken: import('./auth/autenticar').VerificarToken,
 *   origensPermitidas: string[],
 *   gerarEmail?: (dados: object) => Promise<object>,
 *   limiteEmailsPorJanela?: number,
 * }} opcoes
 */
function criarApp({ verificarToken, origensPermitidas, gerarEmail = gerarEmailRdo, limiteEmailsPorJanela = 20 }) {
  const app = express();

  app.use(cors({
    origin: origensPermitidas,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
  // As fotos vão em base64 dentro do JSON, daí o limite alto
  app.use(express.json({ limit: '50mb' }));

  app.get('/', (req, res) => res.send('O servidor RDO está online!'));

  const api = express.Router();
  api.use(criarAutenticacao(verificarToken));

  api.post('/gerar-rdo', rotaDePdf('rdo'));
  api.post('/gerar-timesheet', rotaDePdf('timesheet'));

  // Cada e-mail custa uma chamada ao Gemini: limite por USUÁRIO (não por IP,
  // que numa rede corporativa é o mesmo para todo mundo)
  const limitarEmails = rateLimit({
    windowMs: QUINZE_MINUTOS,
    limit: limiteEmailsPorJanela,
    keyGenerator: (req) => req.usuario.id,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Muitos e-mails gerados em pouco tempo. Aguarde alguns minutos.' },
  });

  api.post('/gerar-email', limitarEmails, async (req, res) => {
    const erro = validarPayload(req.body);
    if (erro) return res.status(400).json({ error: erro });

    try {
      res.json(await gerarEmail(req.body));
    } catch (err) {
      console.error('Erro ao gerar email:', err);
      res.status(500).json({ error: 'Erro interno ao gerar o email.' });
    }
  });

  app.use('/api', api);

  // JSON malformado ou grande demais: responde em JSON, não na página HTML padrão do Express
  app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);
    const status = err.status >= 400 && err.status < 500 ? err.status : 500;
    if (status === 500) console.error('Erro não tratado:', err);
    res.status(status).json({ error: status === 500 ? 'Erro interno.' : 'Requisição inválida.' });
  });

  return app;
}

/** Rota genérica: valida, escolhe a estratégia no registro e devolve o PDF. */
function rotaDePdf(tipoDocumento) {
  return async (req, res) => {
    const dados = req.body;
    const erro = validarPayload(dados);
    if (erro) return res.status(400).json({ error: erro });

    const resolvido = resolverDocumento(tipoDocumento, dados.tipoLayout);
    if (!resolvido) return res.status(400).json({ error: 'Tipo de layout não suportado.' });

    try {
      const { documento, estrategia } = resolvido;
      const pdf = await gerarPdf(estrategia, documento.opcoesPdf, dados);
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': cabecalhoDownload(documento.prefixoArquivo, dados.cliente),
      });
      res.send(pdf);
    } catch (err) {
      console.error(`Erro ao gerar ${tipoDocumento}:`, err);
      res.status(500).json({ error: 'Erro interno ao gerar o PDF.' });
    }
  };
}

module.exports = { criarApp };
