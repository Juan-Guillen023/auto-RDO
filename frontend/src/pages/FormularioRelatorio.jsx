import { useRef, useState } from 'react';
import InputDinamico from '../components/InputDinamico';
import DiaBox from '../components/DiaBox';
import SaveBar from '../components/SaveBar';
import EmailModal from '../components/EmailModal';
import DatePicker from '../components/DatePicker';
import { useRdoForm } from '../hooks/useRdoForm';
import { useRelatorioPersistence } from '../hooks/useRelatorioPersistence';
import { useGeracao } from '../hooks/useGeracao';
import { GERADORES } from '../services/geradores';
import { ESCOPO_PERIODO, recortarPayload, validarCamposDoEscopo } from '../utils/escopoRelatorio';
import { FUNCIONALIDADES } from '../constants/funcionalidades';
import styles from './FormularioRelatorio.module.css';

/**
 * Formulário de um relatório já carregado (novo ou aberto do banco).
 * @param {{
 *   relatorio: import('../repositories/RelatorioRepository').Relatorio & { id: string },
 *   repositorio: import('../repositories/RelatorioRepository').RelatorioRepository,
 *   onVoltar: () => void,
 * }} props
 */
function FormularioRelatorio({ relatorio, repositorio, onVoltar }) {
  const {
    campos,
    diasDados,
    erro,
    handleCampoChange,
    handleDiaChange,
    handleAtividadeChange,
    addNovaAtividade,
    removerAtividade,
    handleImageUpload,
    removerImagem,
  } = useRdoForm(relatorio);

  const [status, setStatus] = useState(relatorio.status ?? 'em_andamento');
  const finalizado = status === 'finalizado';

  const persistencia = useRelatorioPersistence({
    repositorio,
    id: relatorio.id,
    status,
    campos,
    diasDados,
  });

  const geracao = useGeracao(GERADORES);
  const [emailGerado, setEmailGerado] = useState(null);
  const formRef = useRef(null);

  const handleVoltar = async () => {
    if (persistencia.temAlteracoes && !(await persistencia.salvar())) {
      const sairMesmoAssim = window.confirm(
        'Não foi possível salvar as últimas alterações. Sair mesmo assim e perdê-las?'
      );
      if (!sairMesmoAssim) return;
    }
    onVoltar();
  };

  const gerar = (tipo, escopo) =>
    geracao.executar(tipo, escopo, recortarPayload(campos, diasDados, escopo));

  // PDF exige os campos obrigatórios do escopo; os balões nativos do navegador
  // aparecem igual ao submit do formulário
  const gerarPdf = (escopo) => {
    if (validarCamposDoEscopo(formRef.current, escopo)) gerar('pdf', escopo);
  };

  const gerarEmail = async (escopo) => {
    const email = await gerar('email', escopo);
    if (email) setEmailGerado(email);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    gerar('pdf', ESCOPO_PERIODO);
  };

  const acoesDoDia = (data) => ({
    ocupado: geracao.ocupado,
    gerandoPdf: geracao.estaGerando('pdf', data),
    gerandoEmail: geracao.estaGerando('email', data),
    erro: geracao.erroDoEscopo(data),
    onGerarPdf: () => gerarPdf(data),
    onGerarEmail: () => gerarEmail(data),
  });

  return (
    <div className={styles.container}>
      <button type="button" className={styles.btnVoltar} onClick={handleVoltar}>
        ← Meus relatórios
      </button>
      <h1 className={styles.titulo}>
        Relatório Diário de Obra
        {finalizado && <span className={styles.seloFinalizado}>✅ Finalizado</span>}
      </h1>
      <p className={styles.subtitulo}>Preencha o formulário para gerar o RDO automático</p>

      <form ref={formRef} onSubmit={handleSubmit} className={styles.form}>

<SaveBar
          estado={persistencia.estado}
          ultimoSalvamento={persistencia.ultimoSalvamento}
          onSalvar={persistencia.salvar}
        />

        <InputDinamico label="Cliente" value={campos.cliente} onChange={(e) => handleCampoChange('cliente', e.target.value)} placeholder="Nome do cliente..." required />
        <InputDinamico label="Projeto" value={campos.projeto} onChange={(e) => handleCampoChange('projeto', e.target.value)} placeholder="Nome do projeto..." required />
        <InputDinamico label="Task" value={campos.task} onChange={(e) => handleCampoChange('task', e.target.value)} placeholder="Número da Task..." />
        <InputDinamico label="PO" value={campos.po} onChange={(e) => handleCampoChange('po', e.target.value)} placeholder="Purchase order..." />
        <InputDinamico label="Técnico" value={campos.tecnico} onChange={(e) => handleCampoChange('tecnico', e.target.value)} placeholder="Nome do técnico..." required />
        <InputDinamico label="Localização" value={campos.localizacao} onChange={(e) => handleCampoChange('localizacao', e.target.value)} placeholder="Nome da Cidade" />
        <InputDinamico label="Serviço" value={campos.servico} onChange={(e) => handleCampoChange('servico', e.target.value)} placeholder="Descreva o titulo do serviço..." required />
        <InputDinamico label="Escopo do Serviço Contratado" value={campos.escopo} onChange={(e) => handleCampoChange('escopo', e.target.value)} placeholder="Digite o escopo detalhado..." tipo="textarea" required />

        <div className={styles.linhaHorizontal}>
          <DatePicker
            label="Data de Início"
            value={campos.dataInicio}
            onChange={(valor) => handleCampoChange('dataInicio', valor)}
            required
          />
          <DatePicker
            label="Data de Fim"
            value={campos.dataFim}
            onChange={(valor) => handleCampoChange('dataFim', valor)}
            minDate={campos.dataInicio}
            required
          />
        </div>

        {erro && <p className={styles.erro}>{erro}</p>}

        {diasDados.length > 0 && (
          <section className={styles.secaoDias}>
            <h3 className={styles.secaoTitulo}>Detalhamento Diário</h3>
            {diasDados.map((dia, indexDia) => (
              <DiaBox
                key={dia.data}
                dia={dia}
                indexDia={indexDia}
                onDiaChange={handleDiaChange}
                onAtividadeChange={handleAtividadeChange}
                onAddAtividade={addNovaAtividade}
                onRemoverAtividade={removerAtividade}
                onImageUpload={handleImageUpload}
                onRemoverImagem={removerImagem}
                acoes={acoesDoDia(dia.data)}
              />
            ))}
          </section>
        )}

        <section className={styles.secaoPeriodo}>
          <h3 className={styles.secaoTitulo}>Relatório de todo o período</h3>

          {geracao.erroDoEscopo(ESCOPO_PERIODO) && (
            <p className={styles.erro} role="alert">{geracao.erroDoEscopo(ESCOPO_PERIODO)}</p>
          )}

          <div className={styles.linhaBotoes}>
            <button type="submit" className={styles.btnSubmit} disabled={geracao.ocupado}>
              {geracao.estaGerando('pdf', ESCOPO_PERIODO) ? 'Gerando PDF...' : '📄 PDF consolidado'}
            </button>

            <button
              type="button"
              className={styles.btnEmail}
              disabled={geracao.ocupado}
              onClick={() => gerarEmail(ESCOPO_PERIODO)}
            >
              {geracao.estaGerando('email', ESCOPO_PERIODO) ? 'Gerando e-mail...' : '📧 E-mail do período'}
            </button>

            {FUNCIONALIDADES.timesheet && (
              <button
                type="button"
                className={styles.btnTimesheet}
                disabled={geracao.ocupado}
                onClick={() => gerar('timesheet', ESCOPO_PERIODO)}
              >
                {geracao.estaGerando('timesheet', ESCOPO_PERIODO) ? 'Gerando Timesheet...' : '🕒 Timesheet'}
              </button>
            )}
          </div>

          <button
            type="button"
            className={finalizado ? styles.btnReabrir : styles.btnFinalizar}
            onClick={() => setStatus(finalizado ? 'em_andamento' : 'finalizado')}
          >
            {finalizado ? '↩ Reabrir relatório' : '✅ Marcar relatório como finalizado'}
          </button>
        </section>

      </form>

      {emailGerado && (
        <EmailModal email={emailGerado} onFechar={() => setEmailGerado(null)} />
      )}
    </div>
  );
}

export default FormularioRelatorio;
