import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
  Modal, ScrollView, TextInput, RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getToken } from '../../lib/supabase';
import { API_URL } from '../../lib/config';
import { useCurrentUser } from '../../lib/UserContext';

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface Professional { id: string; name: string; color?: string; }
interface Appointment {
  id: string; professional_id: string; client_name: string;
  client_phone?: string; client_email?: string; starts_at: string;
  ends_at: string; status: string; notes?: string;
}
type DateFilter = 'today' | 'week' | 'month' | 'all';

// ── Helpers ───────────────────────────────────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, '0');
const fmtDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function formatDateTime(iso: string): string {
  const d = new Date(iso.endsWith('Z') || iso.includes('+') ? iso : iso + 'Z');
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const months = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function formatTime(iso: string): string {
  const d = new Date(iso.endsWith('Z') || iso.includes('+') ? iso : iso + 'Z');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function getDateRange(filter: DateFilter): { date_from?: string; date_to?: string } {
  const now = new Date();
  if (filter === 'today') {
    const s = fmtDate(now);
    return { date_from: `${s}T00:00:00`, date_to: `${s}T23:59:59` };
  }
  if (filter === 'week') {
    const start = new Date(now);
    const dow = now.getDay() === 0 ? 6 : now.getDay() - 1;
    start.setDate(now.getDate() - dow);
    const end = new Date(start); end.setDate(start.getDate() + 6);
    return { date_from: `${fmtDate(start)}T00:00:00`, date_to: `${fmtDate(end)}T23:59:59` };
  }
  if (filter === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { date_from: `${fmtDate(start)}T00:00:00`, date_to: `${fmtDate(end)}T23:59:59` };
  }
  return {};
}

// ── Constantes ────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  scheduled: 'Agendado', confirmed: 'Confirmado', completed: 'Concluído',
  cancelled: 'Cancelado', no_show: 'Não compareceu',
};
const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  scheduled: { bg: '#e3f0fd', text: '#1976d2' },
  confirmed:  { bg: '#edf6ee', text: '#388e3c' },
  completed:  { bg: '#f5f0ef', text: '#8e7f7e' },
  cancelled:  { bg: '#fdecea', text: '#e53935' },
  no_show:    { bg: '#fff8e1', text: '#f9a825' },
};
const DATE_FILTERS: { key: DateFilter; label: string }[] = [
  { key: 'today', label: 'Hoje' }, { key: 'week', label: 'Semana' },
  { key: 'month', label: 'Mês' }, { key: 'all', label: 'Todos' },
];
const STATUS_ACTIONS: Record<string, { label: string; next: string; color: string }[]> = {
  scheduled: [
    { label: 'Confirmar', next: 'confirmed', color: '#388e3c' },
    { label: 'Cancelar',  next: 'cancelled', color: '#e53935' },
  ],
  confirmed: [
    { label: 'Concluir',       next: 'completed', color: '#8e7f7e' },
    { label: 'Não compareceu', next: 'no_show',   color: '#f9a825' },
    { label: 'Cancelar',       next: 'cancelled', color: '#e53935' },
  ],
};

// ── Subcomponentes ────────────────────────────────────────────────────────────

function Badge({ status }: { status: string }) {
  const c = STATUS_COLOR[status] ?? { bg: '#eee', text: '#555' };
  return (
    <View style={[st.badge, { backgroundColor: c.bg }]}>
      <Text style={[st.badgeText, { color: c.text }]}>{STATUS_LABEL[status] ?? status}</Text>
    </View>
  );
}

function AppCard({ appt, pro, onPress }: { appt: Appointment; pro?: Professional; onPress: () => void }) {
  return (
    <TouchableOpacity style={[st.card, { borderLeftColor: pro?.color ?? '#8e7f7e' }]} onPress={onPress} activeOpacity={0.75}>
      <View style={st.cardTop}>
        <Text style={st.cardDateTime}>{formatDateTime(appt.starts_at)}</Text>
        <Badge status={appt.status} />
      </View>
      <Text style={st.cardClient}>{appt.client_name}</Text>
      {pro && (
        <View style={[st.proChip, { backgroundColor: (pro.color ?? '#8e7f7e') + '22' }]}>
          <Text style={[st.proChipText, { color: pro.color ?? '#8e7f7e' }]}>{pro.name}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function DetailModal({ appt, pro, visible, onClose, onStatusChange }: {
  appt: Appointment | null; pro?: Professional; visible: boolean;
  onClose: () => void; onStatusChange: (id: string, s: string) => void;
}) {
  if (!appt) return null;
  const actions = STATUS_ACTIONS[appt.status] ?? [];
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={st.overlay} activeOpacity={1} onPress={onClose} />
      <View style={st.sheet}>
        <View style={st.sheetHandle} />
        <ScrollView>
          <Text style={st.sheetClient}>{appt.client_name}</Text>
          <Badge status={appt.status} />
          <View style={st.divider} />
          <View style={st.row}><Text style={st.rowLabel}>Horário</Text><Text style={st.rowValue}>{formatTime(appt.starts_at)} – {formatTime(appt.ends_at)}</Text></View>
          {pro && <View style={st.row}><Text style={st.rowLabel}>Profissional</Text><Text style={[st.rowValue, { color: pro.color }]}>{pro.name}</Text></View>}
          {appt.client_phone ? <View style={st.row}><Text style={st.rowLabel}>Telefone</Text><Text style={st.rowValue}>{appt.client_phone}</Text></View> : null}
          {appt.client_email ? <View style={st.row}><Text style={st.rowLabel}>E-mail</Text><Text style={st.rowValue}>{appt.client_email}</Text></View> : null}
          {appt.notes ? <View style={st.row}><Text style={st.rowLabel}>Notas</Text><Text style={st.rowValue}>{appt.notes}</Text></View> : null}
          {actions.length > 0 && (
            <>
              <View style={st.divider} />
              {actions.map(a => (
                <TouchableOpacity key={a.next} style={[st.actionBtn, { borderColor: a.color }]} onPress={() => onStatusChange(appt.id, a.next)} activeOpacity={0.8}>
                  <Text style={[st.actionBtnText, { color: a.color }]}>{a.label}</Text>
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

export default function AppointmentsScreen() {
  const { userType } = useCurrentUser();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilter>('week');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  const fetchAll = useCallback(async (refresh = false) => {
    const token = await getToken();
    if (!token) return;
    if (refresh) setRefreshing(true); else setLoading(true);
    const { date_from, date_to } = getDateRange(dateFilter);
    const params = new URLSearchParams();
    if (date_from) params.set('date_from', date_from);
    if (date_to) params.set('date_to', date_to);
    const [apptRes, proRes] = await Promise.all([
      fetch(`${API_URL}/appointments/?${params}`, { headers: { Authorization: `Bearer ${token}` } }),
      userType === 'company'
        ? fetch(`${API_URL}/professionals/`, { headers: { Authorization: `Bearer ${token}` } })
        : Promise.resolve(null),
    ]);
    if (apptRes.ok) setAppointments(await apptRes.json());
    if (proRes?.ok) setProfessionals(await proRes.json());
    setLoading(false);
    setRefreshing(false);
  }, [dateFilter, userType]);

  useFocusEffect(useCallback(() => { fetchAll(); }, [fetchAll]));

  const handleStatusChange = async (id: string, status: string) => {
    const token = await getToken();
    if (!token) return;
    await fetch(`${API_URL}/appointments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    });
    setDetailVisible(false);
    fetchAll();
  };

  const q = search.trim().toLowerCase();
  const visible = appointments
    .filter(a => statusFilter.length === 0 || statusFilter.includes(a.status))
    .filter(a => !q || a.client_name.toLowerCase().includes(q) || (a.client_phone ?? '').includes(q))
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));

  const upcoming = visible.filter(a => a.status === 'scheduled' || a.status === 'confirmed');
  const past     = visible.filter(a => a.status !== 'scheduled' && a.status !== 'confirmed');

  type ListItem =
    | { type: 'header'; title: string; key: string }
    | { type: 'item'; appt: Appointment; key: string };

  const listData: ListItem[] = [];
  if (upcoming.length) {
    listData.push({ type: 'header', title: `Próximos (${upcoming.length})`, key: 'h-upcoming' });
    upcoming.forEach(a => listData.push({ type: 'item', appt: a, key: a.id }));
  }
  if (past.length) {
    listData.push({ type: 'header', title: `Histórico (${past.length})`, key: 'h-past' });
    past.forEach(a => listData.push({ type: 'item', appt: a, key: `p-${a.id}` }));
  }

  const selectedPro = selectedAppt ? professionals.find(p => p.id === selectedAppt.professional_id) : undefined;

  return (
    <View style={st.container}>
      {/* Top bar */}
      <View style={st.topBar}>
        <Text style={st.topBarTitle}>Agendamentos</Text>
        <TouchableOpacity style={st.btnNew} onPress={() => Alert.alert('Novo agendamento', 'Use a versão web para criar agendamentos.')} activeOpacity={0.8}>
          <Text style={st.btnNewText}>＋ Novo</Text>
        </TouchableOpacity>
      </View>

      {/* Date filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.filterScroll} contentContainerStyle={st.filterContent}>
        {DATE_FILTERS.map(f => (
          <TouchableOpacity key={f.key} style={[st.filterTab, dateFilter === f.key && st.filterTabActive]} onPress={() => setDateFilter(f.key)} activeOpacity={0.7}>
            <Text style={[st.filterTabText, dateFilter === f.key && st.filterTabTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Status pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.filterScroll} contentContainerStyle={st.filterContent}>
        <TouchableOpacity style={[st.pill, statusFilter.length === 0 && st.pillActive]} onPress={() => setStatusFilter([])} activeOpacity={0.7}>
          <Text style={[st.pillText, statusFilter.length === 0 && st.pillTextActive]}>Todos</Text>
        </TouchableOpacity>
        {Object.keys(STATUS_LABEL).map(s => {
          const on = statusFilter.includes(s);
          const c = STATUS_COLOR[s];
          return (
            <TouchableOpacity key={s} style={[st.pill, on && { backgroundColor: c.text }]} onPress={() => setStatusFilter(prev => on ? prev.filter(x => x !== s) : [...prev, s])} activeOpacity={0.7}>
              <Text style={[st.pillText, on && { color: '#fff' }]}>{STATUS_LABEL[s]}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Search */}
      <View style={st.searchRow}>
        <TextInput style={st.searchInput} placeholder="Buscar cliente..." placeholderTextColor="#c2b4b2" value={search} onChangeText={setSearch} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#8e7f7e" />
      ) : (
        <FlatList
          data={listData}
          keyExtractor={item => item.key}
          contentContainerStyle={st.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchAll(true)} colors={['#8e7f7e']} />}
          ListEmptyComponent={<Text style={st.emptyText}>Nenhum agendamento encontrado.</Text>}
          renderItem={({ item }) => {
            if (item.type === 'header') return <Text style={st.sectionHeader}>{item.title}</Text>;
            const appt = item.appt;
            const pro = professionals.find(p => p.id === appt.professional_id);
            return <AppCard appt={appt} pro={pro} onPress={() => { setSelectedAppt(appt); setDetailVisible(true); }} />;
          }}
        />
      )}

      <DetailModal appt={selectedAppt} pro={selectedPro} visible={detailVisible} onClose={() => setDetailVisible(false)} onStatusChange={handleStatusChange} />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fcfaf9' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#efeae8' },
  topBarTitle: { fontSize: 20, fontWeight: '700', color: '#635857' },
  btnNew: { backgroundColor: '#8e7f7e', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  btnNewText: { color: '#ffffff', fontSize: 13, fontWeight: '600' },

  filterScroll: { maxHeight: 44, backgroundColor: '#ffffff' },
  filterContent: { paddingHorizontal: 16, paddingVertical: 8, gap: 6 },
  filterTab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f7f2f1' },
  filterTabActive: { backgroundColor: '#8e7f7e' },
  filterTabText: { fontSize: 13, color: '#635857', fontWeight: '500' },
  filterTabTextActive: { color: '#ffffff' },
  pill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, backgroundColor: '#f7f2f1' },
  pillActive: { backgroundColor: '#8e7f7e' },
  pillText: { fontSize: 12, color: '#635857', fontWeight: '500' },
  pillTextActive: { color: '#ffffff' },

  searchRow: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#efeae8' },
  searchInput: { backgroundColor: '#f7f2f1', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9, fontSize: 14, color: '#635857' },

  listContent: { padding: 16, gap: 10 },
  sectionHeader: { fontSize: 12, fontWeight: '700', color: '#a08c8b', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 8, marginBottom: 4 },
  emptyText: { textAlign: 'center', color: '#a08c8b', marginTop: 40, fontSize: 14 },

  card: { backgroundColor: '#ffffff', borderRadius: 12, padding: 14, borderLeftWidth: 4, shadowColor: '#8e7f7e', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardDateTime: { fontSize: 12, color: '#a08c8b', fontWeight: '500', flex: 1, marginRight: 8 },
  cardClient: { fontSize: 15, fontWeight: '700', color: '#3d2f2e', marginBottom: 6 },
  proChip: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  proChipText: { fontSize: 11, fontWeight: '600' },

  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '600' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { backgroundColor: '#ffffff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '80%' },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#efeae8', alignSelf: 'center', marginBottom: 20 },
  sheetClient: { fontSize: 18, fontWeight: '700', color: '#3d2f2e', marginBottom: 8 },
  divider: { height: 1, backgroundColor: '#efeae8', marginVertical: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  rowLabel: { fontSize: 13, color: '#a08c8b', flex: 1 },
  rowValue: { fontSize: 13, color: '#635857', fontWeight: '600', flex: 2, textAlign: 'right' },
  actionBtn: { borderWidth: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginBottom: 10 },
  actionBtnText: { fontSize: 14, fontWeight: '600' },
});