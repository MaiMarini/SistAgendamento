import { StyleSheet } from 'react-native';

// ── CSS do FullCalendar (injetado no <head> do browser) ────────────────────────
export const CALENDAR_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');

  .fc { font-family: 'Inter', sans-serif !important; }
  .fc-theme-standard .fc-scrollgrid { border: none !important; }
  .fc-theme-standard td, .fc-theme-standard th { border: 1px solid #f7f2f1 !important; }

  .fc-col-header-cell-cushion {
    padding: 12px 0 !important;
    color: #a08c8b !important;
    font-weight: 600 !important;
    font-size: 0.72rem !important;
    text-transform: uppercase;
    text-decoration: none !important;
  }

  .fc-daygrid-day-number {
    color: #8e7f7e !important;
    font-weight: 400;
    font-size: 0.85rem !important;
    padding: 10px !important;
    text-decoration: none !important;
  }

  .fc-daygrid-day { cursor: pointer; transition: background-color 0.15s ease; }
  .fc-daygrid-day:hover { background-color: #fff8d6 !important; }
  .fc-daygrid-day:hover .fc-daygrid-day-number { color: #635857 !important; font-weight: 600 !important; }

  .fc-day-today { background-color: #fdfaf9 !important; }
  .fc-day-today .fc-daygrid-day-number { color: #635857 !important; font-weight: 600 !important; }

  .fc-button-primary {
    background-color: #ffffff !important;
    border-color: #efeae8 !important;
    color: #a08c8b !important;
    font-family: 'Inter', sans-serif !important;
    font-weight: 500 !important;
    font-size: 0.8rem !important;
    border-radius: 20px !important;
    padding: 6px 16px !important;
  }
  .fc-button-primary:hover {
    background-color: #f7f2f1 !important;
    border-color: #e0d8d7 !important;
    color: #635857 !important;
  }
  .fc-button-primary:not(:disabled):active,
  .fc-button-primary:not(:disabled).fc-button-active {
    background-color: #8e7f7e !important;
    border-color: #8e7f7e !important;
    color: #ffffff !important;
  }

  .fc-toolbar-title {
    color: #635857 !important;
    font-weight: 400 !important;
    font-size: 1.1rem !important;
    text-transform: capitalize;
    cursor: pointer !important;
    border-radius: 6px;
    padding: 2px 8px !important;
    transition: background 0.15s;
  }
  .fc-toolbar-title:hover {
    background-color: #f0ebe9 !important;
  }
  .fc-toolbar-title::after {
    content: ' ▾';
    font-size: 0.85em;
    color: #a08c8b;
  }

  .fc-toolbar-chunk:nth-child(2) {
    display: flex !important;
    flex-direction: row !important;
    align-items: center !important;
    gap: 2px;
  }
  h2.fc-toolbar-title {
    display: inline-block !important;
  }

  .fc-today-button.fc-today-visible {
    background-color: #8e7f7e !important;
    border-color: #8e7f7e !important;
    color: #ffffff !important;
    font-weight: 600 !important;
  }

  .fc-toolbar-chunk:nth-child(3) {
    display: flex !important;
    gap: 4px !important;
  }
  .fc-toolbar-chunk:nth-child(3) .fc-button-group {
    display: flex !important;
    gap: 4px !important;
  }

  .fc-prev-button,
  .fc-next-button {
    background-color: transparent !important;
    border-color: transparent !important;
    color: #a08c8b !important;
    box-shadow: none !important;
    padding: 4px 8px !important;
  }
  .fc-prev-button:hover,
  .fc-next-button:hover {
    background-color: #f0ebe9 !important;
    border-color: transparent !important;
    color: #635857 !important;
  }
  .fc-prev-button:not(:disabled):active,
  .fc-next-button:not(:disabled):active {
    background-color: #e8e0de !important;
    border-color: transparent !important;
    color: #635857 !important;
  }

  .fc-timegrid-slot { height: 48px !important; }
  .fc-timegrid-slot-label {
    color: #a08c8b !important;
    font-size: 0.72rem !important;
    font-weight: 500 !important;
  }

  .fc-scrollgrid-section-header th { background-color: #faf8f7 !important; }
  .fc-timegrid-axis { border-color: #f7f2f1 !important; }

  :focus { outline: none !important; }
  a { text-decoration: none !important; }

  /* ── Células do mês ── */
  .fc-daygrid-day { min-height: 90px !important; vertical-align: top; }
  .fc-daygrid-day-frame { padding: 4px !important; }
  .fc-daygrid-day-top { justify-content: flex-start !important; padding: 4px 6px 2px !important; }

  /* Número do dia */
  .fc-daygrid-day-number {
    color: #a08c8b !important;
    font-weight: 500 !important;
    font-size: 0.82rem !important;
    padding: 0 !important;
    text-decoration: none !important;
    width: 26px;
    height: 26px;
    display: flex !important;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: background 0.15s;
  }
  .fc-day-today .fc-daygrid-day-number {
    background-color: #8e7f7e !important;
    color: #fff !important;
    font-weight: 700 !important;
  }
  .fc-daygrid-day:not(.fc-day-today):hover .fc-daygrid-day-number {
    background-color: #f0ebe9 !important;
    color: #635857 !important;
  }

  /* Remover hover background do próprio cell */
  .fc-daygrid-day:hover { background-color: transparent !important; }
  .fc-day-today { background-color: #fdfaf9 !important; }

  /* Eventos no mês */
  .fc-daygrid-event-harness { margin-bottom: 2px !important; }
  .fc-daygrid-event {
    border-radius: 4px !important;
    background: transparent !important;
    padding: 0 !important;
    box-shadow: none !important;
  }
  .fc-event { cursor: pointer !important; border: none !important; }
  .fc-event-main { padding: 0 !important; }

  /* Eventos na grade horária (semana/dia) */
  .fc-timegrid-event {
    border-radius: 6px !important;
    border-width: 0 !important;
    box-shadow: 0 1px 4px rgba(0,0,0,0.12) !important;
  }
  .fc-timegrid-slot { height: 40px !important; }

  /* Link "+ N mais" */
  .fc-daygrid-more-link {
    font-size: 11px !important;
    color: #8e7f7e !important;
    font-weight: 600 !important;
    padding: 1px 4px !important;
  }

  /* Eventos passados */
  .fc-event-past { opacity: 0.6; }
`;

// ── Estilos do componente ──────────────────────────────────────────────────────
export const styles = StyleSheet.create({
  // ── Layout geral
  container: {
    flex: 1,
    backgroundColor: '#fcfaf9',
  },

  // ── Barra superior
  topBar: {
    paddingHorizontal: 28,
    paddingVertical: 18,
  },
  topBarTitle: {
    fontSize: 40,
    fontWeight: '300',
    color: '#635857',
    letterSpacing: 0.3,
  },

  // ── Área do calendário
  calendarWrapper: {
    flex: 1,
    padding: 24,
  },
  calendarCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#efeae8',
    padding: 20,
    shadowColor: '#8e7f7e',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    overflow: 'hidden',
  },
});
