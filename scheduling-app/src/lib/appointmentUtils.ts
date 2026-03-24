import { cardStyles } from '../screens/app/AppointmentsScreen.web.styles';
import { getToken } from './supabase';
import { API_URL } from './config';

// ── Timezone helpers ───────────────────────────────────────────────────────────

/** Remove timezone suffix — returns string (for FullCalendar). */
export function naiveIso(iso: string): string {
  return iso.replace('Z', '').replace(/[+-]\d{2}:\d{2}$/, '');
}

/** Remove timezone suffix — returns Date (for display formatting). */
export function parseNaive(iso: string): Date {
  return new Date(naiveIso(iso));
}

export function fmtDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function formatDateTime(iso: string): string {
  return parseNaive(iso).toLocaleString('pt-BR', {
    weekday: 'short', day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit',
  });
}

export function formatTime(iso: string): string {
  return parseNaive(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export const STATUS_LABEL: Record<string, string> = {
  scheduled: 'Agendado',
  confirmed: 'Confirmado',
  completed: 'Concluído',
  cancelled: 'Cancelado',
  no_show: 'Não compareceu',
};

export function getBadgeStyle(apptStatus: string) {
  switch (apptStatus) {
    case 'confirmed': return { bg: cardStyles.badgeConfirmed, text: cardStyles.badgeConfirmedText };
    case 'completed': return { bg: cardStyles.badgeCompleted, text: cardStyles.badgeCompletedText };
    case 'cancelled': return { bg: cardStyles.badgeCancelled, text: cardStyles.badgeCancelledText };
    case 'no_show':   return { bg: cardStyles.badgeNoShow,    text: cardStyles.badgeNoShowText    };
    default:          return { bg: cardStyles.badgeScheduled, text: cardStyles.badgeScheduledText };
  }
}

// ── API ────────────────────────────────────────────────────────────────────────

export async function patchAppointmentStatus(id: string, newStatus: string): Promise<void> {
  const token = await getToken();
  await fetch(`${API_URL}/appointments/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ status: newStatus }),
  });
}

export async function patchAppointmentTime(
  id: string,
  startsAt: string,
  durationMinutes: number,
): Promise<any> {
  const token = await getToken();
  const res = await fetch(`${API_URL}/appointments/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ starts_at: startsAt, duration_minutes: durationMinutes }),
  });
  if (!res.ok) throw new Error('Failed to update appointment time');
  return res.json();
}