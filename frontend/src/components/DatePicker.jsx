import { useEffect, useRef, useState } from 'react';
import { mascaraData } from '../utils/mascaras';
import { parseDataBR, formatarDataBR, mesmoDia, gradeDoMes } from '../utils/datas';
import styles from './DatePicker.module.css';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/**
 * Campo de data com calendário pop-up. Aceita tanto digitação (DD/MM/AAAA)
 * quanto seleção com o mouse. O valor continua sendo a string "DD/MM/AAAA",
 * então o resto do formulário não precisa saber que existe um calendário.
 *
 * @param {{
 *   label: string,
 *   value: string,
 *   onChange: (valor: string) => void,
 *   minDate?: string,   // DD/MM/AAAA — dias anteriores ficam desabilitados
 *   required?: boolean,
 * }} props
 */
function DatePicker({ label, value, onChange, minDate, required }) {
  const [aberto, setAberto] = useState(false);
  const [mesVisivel, setMesVisivel] = useState(() => mesInicial(value, minDate));
  const containerRef = useRef(null);

  const selecionada = parseDataBR(value);
  const minima = parseDataBR(minDate);
  const hoje = new Date();

  // Fecha ao clicar fora do componente ou apertar Esc
  useEffect(() => {
    if (!aberto) return;

    const handleClickFora = (e) => {
      if (!containerRef.current?.contains(e.target)) setAberto(false);
    };
    const handleEsc = (e) => {
      if (e.key === 'Escape') setAberto(false);
    };

    document.addEventListener('mousedown', handleClickFora);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickFora);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [aberto]);

  const abrir = () => {
    // Sempre abre no mês da data escolhida (ou da mínima / de hoje)
    setMesVisivel(mesInicial(value, minDate));
    setAberto(true);
  };

  const navegarMes = (delta) => {
    setMesVisivel(({ ano, mes }) => {
      const d = new Date(ano, mes + delta, 1);
      return { ano: d.getFullYear(), mes: d.getMonth() };
    });
  };

  const selecionarDia = (data) => {
    onChange(formatarDataBR(data));
    setAberto(false);
  };

  return (
    <div className={styles.container} ref={containerRef}>
      <label className={styles.label}>{label}</label>

      <div className={styles.campo}>
        <input
          type="text"
          placeholder="DD/MM/AAAA"
          value={value}
          onChange={(e) => onChange(mascaraData(e.target.value))}
          onClick={abrir}
          required={required}
        />
        <button
          type="button"
          className={styles.btnIcone}
          onClick={() => (aberto ? setAberto(false) : abrir())}
          aria-label="Abrir calendário"
        >
          <IconeCalendario />
        </button>
      </div>

      {aberto && (
        <div className={styles.popup} role="dialog" aria-label={`Calendário: ${label}`}>
          <div className={styles.cabecalho}>
            <span className={styles.mesAno}>
              {MESES[mesVisivel.mes]} {mesVisivel.ano}
            </span>
            <div className={styles.navegacao}>
              <button type="button" onClick={() => navegarMes(-1)} aria-label="Mês anterior">▲</button>
              <button type="button" onClick={() => navegarMes(1)} aria-label="Próximo mês">▼</button>
            </div>
          </div>

          <div className={styles.grade}>
            {DIAS_SEMANA.map((d) => (
              <span key={d} className={styles.diaSemana}>{d}</span>
            ))}

            {gradeDoMes(mesVisivel.ano, mesVisivel.mes).map((data) => {
              const foraDoMes = data.getMonth() !== mesVisivel.mes;
              const desabilitado = minima && data < minima;
              const classes = [
                styles.dia,
                foraDoMes && styles.foraDoMes,
                mesmoDia(data, hoje) && styles.hoje,
                mesmoDia(data, selecionada) && styles.selecionado,
              ].filter(Boolean).join(' ');

              return (
                <button
                  key={data.getTime()}
                  type="button"
                  className={classes}
                  disabled={desabilitado}
                  onClick={() => selecionarDia(data)}
                >
                  {data.getDate()}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className={styles.btnHoje}
            disabled={minima && hoje < minima}
            onClick={() => selecionarDia(hoje)}
          >
            Hoje
          </button>
        </div>
      )}
    </div>
  );
}

function mesInicial(value, minDate) {
  const base = parseDataBR(value) || parseDataBR(minDate) || new Date();
  return { ano: base.getFullYear(), mes: base.getMonth() };
}

function IconeCalendario() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
      <rect x="2" y="3" width="12" height="11" rx="1.5" />
      <path d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3" strokeLinecap="round" />
    </svg>
  );
}

export default DatePicker;
