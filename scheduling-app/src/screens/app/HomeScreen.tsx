import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
  Modal, ScrollView, RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getToken } from '../../lib/supabase';
import { API_URL } from '../../lib/config';

// ── Helpers ───────────────────────────────────────────────────────────────────

const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];

function fmtDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatTime(iso: string): string {
  const d = new Date(iso.endsWith('Z') || iso.includes('+') ? iso : iso + 'Z');
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function buildWeekDays(center: Date): Date[] {
  const days: Date[] = [];
  for (let i = -3; i <= 3; i++) {
    const d = new Date(center);
    d.setDate(center.getDate() + i);
    days.push(d);
  }
  return days;
}

// ── Status ────────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  scheduled: 'Agendado',
  confirmed: 'Confirmado',
  completed: 'Concluído',
  cancelled: 'Cancelado',
  no_show: 'Não compareceu',
};

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  scheduled: { bg: '#e3f0fd', text: '#1976d2' },
  confirmed:  { bg: '#edf6ee', text: '#388e3c' },
  completed:  { bg: '#f5f0ef', text: '#8e7f7e' },
  cancelled:  { bg: '#fdecea', text: '#e53935' },
  no_show:    { bg: '#fff8e1', text: '#f9a825' },
};

// ── Subcomponentes ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_COLOR[status] ?? { bg: '#eee', text: '#555' };
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.badgeText, { color: c.text }]}>{STATUS_LABEL[status] ?? status}</Text>
    </View>
  );
}

function AppointmentCard({ appt, professionals, onPress }: {
  appt: any; professionals: any[]; onPress: () => void;
}) {
  const pro = professionals.find(p => p.id === appt.professional_id);
  const proColor = pro?.color ?? '#8e7f7e';
  return (
    <TouchableOpacity style={[styles.card, { borderLeftColor: proColor }]} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.cardRow}>
        <Text style={styles.cardTime}>{formatTime(appt.starts_at)} – {formatTime(appt.ends_at)}</Text>
        <StatusBadge status={appt.status} />
      </View>
      <Text style={styles.cardClient}>{appt.client_name}</Text>
      {pro && (
        <View style={[styles.proChip, { backgroundColor: proColor + '22' }]}>
          <Text style={[styles.proChipText, { color: proColor }]}>{pro.name}</Text>
        </View>
      )}
      {appt.notes ? <Text style={styles.cardNotes} numberOfLines={1}>{appt.notes}</Text> : null}
    </TouchableOpacity>
  );
}

// ── Modal de detalhe ──────────────────────────────────────────────────────────

const STATUS_ACTIONS: Record<string, { label: string; next: string; color: string }[]> = {
  scheduled: [
    { label: 'Confirmar', next: 'confirmed', color: '#388e3c' },
    { label: 'Cancelar',  next: 'cancelled', color: '#e53935' },
  ],
  confirmed: [
    { label: 'Concluir',      next: 'completed', color: '#8e7f7e' },
    { label: 'Não compareceu',next: 'no_show',   color: '#f9a825' },
    { label: 'Cancelar',      next: 'cancelled', color: '#e53935' },
  ],
  completed: [],
  cancelled: [],
  no_show:   [],
};

function DetailModal({ appt, professionals, visible, onClose, onStatusChange }: {
  appt: any; professionals: any[]; visible: boolean;
  onClose: () => void; onStatusChange: (id: string, status: string) => void;
}) {
  if (!appt) return null;
  const pro = professionals.find(p => p.id === appt.professional_id);
  const actions = STATUS_ACTIONS[appt.status] ?? [];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <ScrollView>
          <Text style={styles.sheetClient}>{appt.client_name}</Text>
          <StatusBadge status={appt.status} />
          <View style={styles.sheetDivider} />

          <View style={styles.sheetRow}>
            <Text style={styles.sheetLabel}>Horário</Text>
            <Text style={styles.sheetValue}>{formatTime(appt.starts_at)} – {formatTime(appt.ends_at)}</Text>
          </View>
          {pro && (
            <View style={styles.sheetRow}>
              <Text style={styles.sheetLabel}>Profissional</Text>
              <Text style={[styles.sheetValue, { color: pro.color ?? '#8e7f7e' }]}>{pro.name}</Text>
            </View>
          )}
          {appt.client_phone ? (
            <View style={styles.sheetRow}>
              <Text style={styles.sheetLabel}>Telefone</Text>
              <Text style={styles.sheetValue}>{appt.client_phone}</Text>
            </View>
          ) : null}
          {appt.notes ? (
            <View style={styles.sheetRow}>
              <Text style={styles.sheetLabel}>Notas</Text>
              <Text style={styles.sheetValue}>{appt.notes}</Text>
            </View>
          ) : null}

          {actions.length > 0 && (
            <>
              <View style={styles.sheetDivider} />
              {actions.map(a => (
                <TouchableOpacity
                  key={a.next}
                  style={[styles.actionBtn, { borderColor: a.color }]}
                  onPress={() => onStatusChange(appt.id, a.next)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.actionBtnText, { color: a.color }]}>{a.label}</Text>
                </TouchableOpacity>
              ))}
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Tela principal ────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(today);
  const [weekDays, setWeekDays] = useState(() => buildWeekDays(today));
  const [appointments, setAppointments] = useState<any[]>([]);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState<any>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  const fetchProfessionals = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    const res = await fetch(`${API_URL}/professionals/`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setProfessionals(await res.json());
  }, []);

  const fetchAppointments = useCallback(async (refresh = false) => {
    const token = await getToken();
    if (!token) return;
    if (refresh) setRefreshing(true);
    else setLoading(true);
    const dateStr = fmtDate(selectedDate);
    const res = await fetch(
      `${API_URL}/appointments/?date_from=${dateStr}T00:00:00&date_to=${dateStr}T23:59:59`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (res.ok) {
      const data = await res.json();
      setAppointments(data.sort((a: any, b: any) => a.starts_at.localeCompare(b.starts_at)));
    }
    setLoading(false);
    setRefreshing(false);
  }, [selectedDate]);

  useFocusEffect(useCallback(() => {
    fetchProfessionals();
    fetchAppointments();
  }, [fetchAppointments, fetchProfessionals]));

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  const handleStatusChange = async (id: string, status: string) => {
    const token = await getToken();
    if (!token) return;
    const res = await fetch(`${API_URL}/appointments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setDetailVisible(false);
      fetchAppointments();
    }
  };

  const selectDay = (d: Date) => {
    setSelectedDate(d);
    setWeekDays(buildWeekDays(d));
  };

  const isToday = isSameDay(selectedDate, today);
  const dayLabel = isToday
    ? 'Hoje'
    : `${WEEKDAYS_SHORT[selectedDate.getDay()]}, ${selectedDate.getDate()} ${MONTHS[selectedDate.getMonth()]}`;

  return (
    <View style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Calendário</Text>
      </View>

      {/* Week strip */}
      <View style={styles.weekStrip}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.weekScroll}>
          {weekDays.map((d, i) => {
            const selected = isSameDay(d, selectedDate);
            const isT = isSameDay(d, today);
            return (
              <TouchableOpacity key={i} style={[styles.dayCell, selected && styles.dayCellActive]} onPress={() => selectDay(d)} activeOpacity={0.7}>
                <Text style={[styles.dayWeekday, selected && styles.dayTextActive]}>{WEEKDAYS_SHORT[d.getDay()]}</Text>
                <Text style={[styles.dayNum, selected && styles.dayTextActive, isT && !selected && styles.dayNumToday]}>{d.getDate()}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Day label */}
      <View style={styles.dayLabelRow}>
        <Text style={styles.dayLabel}>{dayLabel}</Text>
        <Text style={styles.apptCount}>{appointments.length} agendamento{appointments.length !== 1 ? 's' : ''}</Text>
      </View>

      {/* List */}
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#8e7f7e" />
      ) : (
        <FlatList
          data={appointments}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchAppointments(true)} colors={['#8e7f7e']} />}
          ListEmptyComponent={<Text style={styles.emptyText}>Nenhum agendamento neste dia.</Text>}
          renderItem={({ item }) => (
            <AppointmentCard
              appt={item}
              professionals={professionals}
              onPress={() => { setSelectedAppt(item); setDetailVisible(true); }}
            />
          )}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => Alert.alert('Novo agendamento', 'Use a versão web para criar agendamentos.')}
        activeOpacity={0.85}
      >
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>

      <DetailModal
        appt={selectedAppt}
        professionals={professionals}
        visible={detailVisible}
        onClose={() => setDetailVisible(false)}
        onStatusChange={handleStatusChange}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fcfaf9' },
  topBar: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#efeae8' },
  topBarTitle: { fontSize: 20, fontWeight: '700', color: '#635857' },

  weekStrip: { backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#efeae8' },
  weekScroll: { paddingHorizontal: 12, paddingVertical: 10, gap: 4 },
  dayCell: { alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, minWidth: 44 },
  dayCellActive: { backgroundColor: '#8e7f7e' },
  dayWeekday: { fontSize: 11, color: '#a08c8b', fontWeight: '500', marginBottom: 4 },
  dayNum: { fontSize: 16, fontWeight: '700', color: '#635857' },
  dayNumToday: { color: '#8e7f7e' },
  dayTextActive: { color: '#ffffff' },

  dayLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  dayLabel: { fontSize: 15, fontWeight: '600', color: '#635857' },
  apptCount: { fontSize: 12, color: '#a08c8b' },

  listContent: { padding: 16, gap: 10 },
  emptyText: { textAlign: 'center', color: '#a08c8b', marginTop: 40, fontSize: 14 },

  card: { backgroundColor: '#ffffff', borderRadius: 12, padding: 14, borderLeftWidth: 4, shadowColor: '#8e7f7e', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardTime: { fontSize: 12, color: '#a08c8b', fontWeight: '600' },
  cardClient: { fontSize: 15, fontWeight: '700', color: '#3d2f2e', marginBottom: 6 },
  proChip: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, marginBottom: 4 },
  proChipText: { fontSize: 11, fontWeight: '600' },
  cardNotes: { fontSize: 12, color: '#a08c8b', marginTop: 4 },

  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '600' },

  fab: { position: 'absolute', bottom: 24, right: 24, width: 52, height: 52, borderRadius: 26, backgroundColor: '#8e7f7e', justifyContent: 'center', alignItems: 'center', shadowColor: '#8e7f7e', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  fabText: { color: '#ffffff', fontSize: 24, lineHeight: 28, marginTop: -2 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { backgroundColor: '#ffffff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '80%' },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#efeae8', alignSelf: 'center', marginBottom: 20 },
  sheetClient: { fontSize: 18, fontWeight: '700', color: '#3d2f2e', marginBottom: 8 },
  sheetDivider: { height: 1, backgroundColor: '#efeae8', marginVertical: 16 },
  sheetRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  sheetLabel: { fontSize: 13, color: '#a08c8b' },
  sheetValue: { fontSize: 13, color: '#635857', fontWeight: '600', flex: 1, textAlign: 'right' },
  actionBtn: { borderWidth: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginBottom: 10 },
  actionBtnText: { fontSize: 14, fontWeight: '600' },
});