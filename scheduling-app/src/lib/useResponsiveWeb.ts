import { useEffect } from 'react';

const RESPONSIVE_CSS = `
  @media (max-width: 767px) {
    /* ── Modais: largura adaptada ── */
    [data-modal="true"] { width: 92% !important; padding: 20px !important; }

    /* ── Layouts de duas colunas viram coluna única ── */
    [data-two-col="true"] { flex-direction: column !important; }
    /* filhos deixam de dividir altura e ocupam largura total */
    [data-two-col="true"] > * { flex: none !important; width: 100% !important; }

    /* ── Grid de cards de profissionais ── */
    [data-pro-grid="true"] { flex-direction: column !important; }
    [data-pro-card="true"] { width: 100% !important; }

    /* ── Título da home menor ── */
    [data-top-title="true"] { font-size: 22px !important; }

    /* ── Calendário com menos padding ── */
    [data-cal-wrapper="true"] { padding: 8px !important; }
    [data-cal-card="true"] { padding: 10px !important; }

    /* ── Filtros podem quebrar linha ── */
    [data-filter-row="true"] { flex-wrap: wrap !important; }

    /* ── Padding lateral reduzido ── */
    [data-content-pad="true"] { padding-left: 16px !important; padding-right: 16px !important; }

    /* ── FullCalendar: toolbar em coluna em telas pequenas ── */
    .fc-toolbar { flex-direction: column !important; gap: 8px !important; }
    .fc-toolbar-chunk { display: flex !important; justify-content: center !important; }

    /* ── Botões do FullCalendar menores ── */
    .fc-button-primary { padding: 4px 10px !important; font-size: 0.72rem !important; }

    /* ── Células do calendário menores ── */
    .fc-daygrid-day { min-height: 60px !important; }
    .fc-daygrid-day-number { font-size: 0.72rem !important; }

    /* ── Painel lateral de detalhes ocupa tela toda ── */
    [data-detail-panel="true"] { width: 100% !important; position: fixed !important; top: 0 !important; right: 0 !important; bottom: 0 !important; left: 0 !important; border-radius: 0 !important; }

    /* ── Botão "Novo" no topBar quebra para linha separada em telas muito pequenas ── */
    [data-top-actions="true"] { flex-wrap: wrap !important; gap: 8px !important; }
  }

  @media (max-width: 480px) {
    /* ── Padding mínimo em telas muito pequenas ── */
    [data-content-pad="true"] { padding-left: 12px !important; padding-right: 12px !important; }

    /* ── Ocultar colunas secundárias nas tabelas de cards ── */
    [data-col-secondary="true"] { display: none !important; }

    /* ── Filtros de status em wrap ── */
    [data-filter-row="true"] { gap: 6px !important; }
  }
`;

let injected = false;

export function useResponsiveWeb() {
  useEffect(() => {
    if (typeof document === 'undefined' || injected) return;
    injected = true;
    const el = document.createElement('style');
    el.id = '__responsive_web__';
    el.textContent = RESPONSIVE_CSS;
    document.head.appendChild(el);
  }, []);
}