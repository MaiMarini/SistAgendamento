// ── Tipos e constantes compartilhados de horários e bloqueios ─────────────

export interface DaySchedule {
  enabled: boolean;
  start: string;
  end: string;
}

export interface TimeBlockItem {
  id: string;
  professional_id?: string;
  company_id?: string;
  is_recurring: boolean;
  starts_at?: string;
  ends_at?: string;
  recurring_start_time?: string;
  recurring_end_time?: string;
  reason?: string;
}

export interface BlockForm {
  isRecurring: boolean;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  recurringStart: string;
  recurringEnd: string;
  reason: string;
}

export const DAYS_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

export const DEFAULT_DAY: DaySchedule = { enabled: false, start: '08:00', end: '18:00' };

export const EMPTY_SCHEDULE: DaySchedule[] = Array.from({ length: 7 }, () => ({ ...DEFAULT_DAY }));

export const EMPTY_BLOCK: BlockForm = {
  isRecurring: false, startDate: '', startTime: '', endDate: '', endTime: '',
  recurringStart: '', recurringEnd: '', reason: '',
};

export const REMINDER_OPTIONS = [
  { label: 'Desativado', value: 0 },
  { label: '1 hora antes', value: 1 },
  { label: '2 horas antes', value: 2 },
  { label: '4 horas antes', value: 4 },
  { label: '24 horas antes', value: 24 },
  { label: '48 horas antes', value: 48 },
];