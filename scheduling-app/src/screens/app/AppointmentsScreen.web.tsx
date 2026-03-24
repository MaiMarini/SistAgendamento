import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getToken } from '../../lib/supabase';
import { parseNaive, formatDateTime, formatTime, STATUS_LABEL, getBadgeStyle, patchAppointmentStatus } from '../../lib/appointmentUtils';
import { API_URL } from '../../lib/config';
import { styles, cardStyles } from './AppointmentsScreen.web.styles';
import { useResponsiveWeb } from '../../lib/useResponsiveWeb';
import { useDrawerNav } from '../../lib/useDrawerNav';
import BookingModal from './BookingModal.web';
import AppointmentDetailModal from './AppointmentDetailModal.web';
import DateInputWithPicker from './DateInputWithPicker.web';
import { useBookingModal } from '../../hooks/useBookingModal';
import { useAppointmentDetailModal } from '../../hooks/useAppointmentDetailModal';
import { useCurrentUser } from '../../lib/UserContext';

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface Professional {
  id: string;
  name: string;
  specialty?: string;
  color?: string;
  default_duration_minutes?: number;
}

interface Appointment {
  id: string;
  company_id: string;
  professional_id: string;
  client_name: string;
  client_email?: string;
  client_phone?: string;
  client_cpf?: string;
  starts_at: string;
  ends_at: string;
  status: string;
  notes?: string;
  created_at: string;
  professional?: Professional;
}

type DateFilter = 'today' | 'week' | 'month' | 'all' | 'custom';

const ALL_STATUSES = ['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'];

const STATUS_PILL_COLOR: Record<string, { bg: string; text: string; activeBg: string; activeText: string }> = {
  scheduled: { bg: '#e8f0fb', text: '#1976d2', activeBg: '#1976d2', activeText: '#fff' },
  confirmed: { bg: '#edf6ee', text: '#4caf50', activeBg: '#4caf50', activeText: '#fff' },
  completed: { bg: '#f5f0ef', text: '#8e7f7e', activeBg: '#8e7f7e', activeText: '#fff' },
  cancelled: { bg: '#fdecea', text: '#e53935', activeBg: '#e53935', activeText: '#fff' },
  no_show: { bg: '#fff8e1', text: '#f9a825', activeBg: '#f9a825', activeText: '#fff' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────



function getDateRange(filter: DateFilter): { date_from?: string; date_to?: string } {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  if (filter === 'today') {
    const today = fmt(now);
    return { date_from: `${today}T00:00:00`, date_to: `${today}T23:59:59` };
  }
  if (filter === 'week') {
    const start = new Date(now);
    const day = now.getDay() === 0 ? 6 : now.getDay() - 1; // Monday = 0
    start.setDate(now.getDate() - day);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { date_from: `${fmt(start)}T00:00:00`, date_to: `${fmt(end)}T23:59:59` };
  }
  if (filter === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { date_from: `${fmt(start)}T00:00:00`, date_to: `${fmt(end)}T23:59:59` };
  }
  return {};
}

// ── Card de agendamento ───────────────────────────────────────────────────────

function AppCard({ appointment, onPress }: { appointment: Appointment; onPress: () => void }) {
  const badge = getBadgeStyle(appointment.status);
  const label = STATUS_LABEL[appointment.status] ?? appointment.status;
  const dateStr = formatDateTime(appointment.starts_at);
  const endTime = formatTime(appointment.ends_at);
  const proName = appointment.professional?.name ?? '—';
  const proColor = appointment.professional?.color;

  return (
    <TouchableOpacity style={[cardStyles.card, proColor ? { borderLeftWidth: 4, borderLeftColor: proColor } : undefined]} onPress={onPress} activeOpacity={0.75}>
      <View style={cardStyles.cardHeader}>
        <Text style={cardStyles.dateTime}>{dateStr} – {endTime}</Text>
        <View style={[cardStyles.badge, badge.bg]}>
          <Text style={[cardStyles.badgeText, badge.text]}>{label}</Text>
        </View>
      </View>
      <Text style={cardStyles.clientName}>{appointment.client_name}</Text>
      <View style={cardStyles.meta}>
        {appointment.client_phone ? (
          <>
            <Text style={cardStyles.metaText}>{appointment.client_phone}</Text>
            <View style={cardStyles.separator} />
          </>
        ) : null}
        {proColor ? (
          <View style={{ paddingVertical: 3, paddingHorizontal: 9, borderRadius: 20, backgroundColor: proColor + '26' }}>
            <Text style={[cardStyles.metaText, { color: proColor, fontWeight: '600' }]}>{proName}</Text>
          </View>
        ) : (
          <Text style={cardStyles.metaText}>{proName}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ── Constantes ────────────────────────────────────────────────────────────────

const DATE_FILTERS: { key: DateFilter; label: string }[] = [
  { key: 'today', label: 'Hoje' },
  { key: 'week', label: 'Esta Semana' },
  { key: 'month', label: 'Este Mês' },
  { key: 'all', label: 'Todos' },
];

// ── Tela principal ────────────────────────────────────────────────────────────

export default function AppointmentsScreen() {
  useResponsiveWeb();
  const { isMobile, openDrawer } = useDrawerNav();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<DateFilter>('week');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);  // vazio = sem filtro (todos)
  const [proFilter, setProFilter] = useState<string[]>([]);   // vazio = todos
  const [clientNameFilter, setClientNameFilter] = useState('');
  const [showStatusDrop, setShowStatusDrop] = useState(false);

  const { userType, userId } = useCurrentUser();
  const booking = useBookingModal();
  const apptDetail = useAppointmentDetailModal<Appointment>();


  // ── Buscar dados ────────────────────────────────────────────────────────────

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    const token = await getToken();
    let date_from: string | undefined, date_to: string | undefined;
    if (customFrom || customTo) {
      if (customFrom) date_from = `${customFrom}T00:00:00`;
      if (customTo) date_to = `${customTo}T23:59:59`;
    } else {
      ({ date_from, date_to } = getDateRange(dateFilter));
    }
    const params = new URLSearchParams();
    if (date_from) params.set('date_from', date_from);
    if (date_to) params.set('date_to', date_to);
    const res = await fetch(`${API_URL}/appointments/?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setAppointments(await res.json());
    setLoading(false);
  }, [dateFilter, customFrom, customTo]);

  const fetchProfessionals = useCallback(async () => {
    const token = await getToken();
    const res = await fetch(`${API_URL}/professionals/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data: any[] = await res.json();
      setProfessionals(data.map(p => ({
        id: p.id, name: p.name, specialty: p.specialty,
        color: p.color,
        default_duration_minutes: p.default_duration_minutes,
      })));
    }
  }, []);

  useEffect(() => { fetchProfessionals(); }, [fetchProfessionals]);
  useFocusEffect(useCallback(() => { fetchAppointments(); }, [fetchAppointments]));

  // ── Atualizar status ────────────────────────────────────────────────────────

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    await patchAppointmentStatus(id, newStatus);
    apptDetail.close();
    fetchAppointments();
  };

  const handleUpdateAppointment = (updated: any) => {
    apptDetail.open(updated);
    fetchAppointments();
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  const isAllSelected = statusFilter.length === 0;  // vazio = "Todos" (sem filtro)
  const isAllProsSelected = proFilter.length === 0;
  const hasActiveFilters = !isAllSelected || !isAllProsSelected || clientNameFilter.trim().length > 0 || (dateFilter === 'custom' && (!!customFrom || !!customTo));

  const toggleStatus = (s: string) => {
    setStatusFilter(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    );
  };

  const toggleAll = () => {
    setStatusFilter([]);  // limpa = sem filtro de status
  };

  const togglePro = (id: string) => {
    setProFilter(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const clientQuery = clientNameFilter.trim().toLowerCase();

  const visibleAppointments = appointments
    .filter(a => statusFilter.length === 0 || statusFilter.includes(a.status))
    .filter(a => proFilter.length === 0 || proFilter.includes(a.professional_id))
    .filter(a => !clientQuery
      || a.client_name.toLowerCase().includes(clientQuery)
      || (a.client_phone ?? '').includes(clientQuery)
      || (a.client_cpf ?? '').replace(/\D/g, '').includes(clientQuery.replace(/\D/g, ''))
    )
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));

  const upcomingAppts = visibleAppointments.filter(a => a.status === 'scheduled' || a.status === 'confirmed');
  const pastAppts     = visibleAppointments.filter(a => a.status !== 'scheduled' && a.status !== 'confirmed');

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {isMobile && (
            <TouchableOpacity onPress={openDrawer} style={{ marginRight: 14, padding: 4 }}>
              <Text style={{ fontSize: 22, color: '#8e7f7e', lineHeight: 22 }}>☰</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.topBarTitle}>Agendamentos</Text>
        </View>
        <TouchableOpacity
          style={[styles.btnNew, isMobile && { paddingHorizontal: 14, paddingVertical: 8 }]}
          onPress={() => booking.open()}
          activeOpacity={0.8}
        >
          <Text style={styles.btnNewText}>{isMobile ? '+' : '+ Novo Agendamento'}</Text>
        </TouchableOpacity>
      </View>

      {/* Filtros de data + dropdown de status */}
      <View {...{ dataSet: { filterRow: 'true' } } as any} style={[styles.filterRow, { justifyContent: 'space-between' }, isMobile && { flexDirection: 'column', alignItems: 'flex-start', gap: 10 }]}>
        <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap' }}>
          {DATE_FILTERS.map(f => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterTab, dateFilter === f.key && styles.filterTabActive]}
              onPress={() => setDateFilter(f.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterTabText, dateFilter === f.key && styles.filterTabTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
          {dateFilter === 'custom' && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 4 }}>
              <input
                type="date"
                value={customFrom}
                onChange={(e: any) => setCustomFrom(e.target.value)}
                style={{ fontSize: 12, color: '#635857', border: '1px solid #efeae8', borderRadius: 8, padding: '5px 10px', outline: 'none', fontFamily: 'inherit', backgroundColor: '#fff' }}
              />
              <Text style={{ fontSize: 12, color: '#a08c8b' }}>até</Text>
              <input
                type="date"
                value={customTo}
                min={customFrom}
                onChange={(e: any) => setCustomTo(e.target.value)}
                style={{ fontSize: 12, color: '#635857', border: '1px solid #efeae8', borderRadius: 8, padding: '5px 10px', outline: 'none', fontFamily: 'inherit', backgroundColor: '#fff' }}
              />
            </View>
          )}
        </View>

        {/* Botão de filtros */}
        <TouchableOpacity
          onPress={() => setShowStatusDrop(v => !v)}
          activeOpacity={0.7}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 6,
            paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8,
            backgroundColor: isAllSelected ? '#f5f0ef' : '#8e7f7e',
            borderWidth: 1, borderColor: isAllSelected ? '#efeae8' : '#8e7f7e',
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: '600', color: hasActiveFilters ? '#fff' : '#8e7f7e' }}>
            Filtros{hasActiveFilters ? ` (${statusFilter.length + proFilter.length + (clientNameFilter.trim() ? 1 : 0) + (customFrom || customTo ? 1 : 0)})` : ''}
          </Text>
          <Text style={{ fontSize: 10, color: hasActiveFilters ? '#fff' : '#8e7f7e' }}>☰</Text>
        </TouchableOpacity>
      </View>

      {/* Lista de agendamentos */}
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <View style={styles.emptyState}><ActivityIndicator color="#8e7f7e" /></View>
        ) : visibleAppointments.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Nenhum agendamento encontrado.</Text>
          </View>
        ) : (
          <>
            {upcomingAppts.length > 0 && (
              <>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#a08c8b', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10, marginTop: 4 } as any}>
                  Próximos
                </Text>
                {upcomingAppts.map(app => (
                  <AppCard key={app.id} appointment={app} onPress={() => { apptDetail.open(app); }} />
                ))}
              </>
            )}

            {pastAppts.length > 0 && (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: upcomingAppts.length > 0 ? 20 : 4, marginBottom: 10 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#a08c8b', letterSpacing: 1, textTransform: 'uppercase' } as any}>
                    Histórico
                  </Text>
                  <View style={{ flex: 1, height: 1, backgroundColor: '#efeae8' }} />
                </View>
                {pastAppts.map(app => (
                  <AppCard key={app.id} appointment={app} onPress={() => { apptDetail.open(app); }} />
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>

      <BookingModal
        visible={booking.visible}
        onClose={booking.close}
        professionals={professionals}
        preselectedProfessionalId={userType === 'professional' ? userId : null}
        onSuccess={fetchAppointments}
      />
      <AppointmentDetailModal
        visible={apptDetail.visible}
        onClose={apptDetail.close}
        appointment={apptDetail.appointment}
        onUpdateStatus={handleUpdateStatus}
        onUpdate={handleUpdateAppointment}
      />

      {/* ── Painel lateral de filtros de status ── */}
      {showStatusDrop && (
        <>
          {/* Backdrop */}
          <TouchableOpacity
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.18)', zIndex: 200 }}
            onPress={() => setShowStatusDrop(false)}
            activeOpacity={1}
          />
          {/* Painel */}
          <View style={{
            position: 'absolute', top: 0, right: 0, bottom: 0, zIndex: 201,
            width: 240, backgroundColor: '#fff',
            shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 16, shadowOffset: { width: -2, height: 0 },
            paddingTop: 24, paddingHorizontal: 16,
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#3d2f2e', letterSpacing: 0.3 }}>Filtros</Text>
              <TouchableOpacity onPress={() => setShowStatusDrop(false)} activeOpacity={0.7}>
                <Text style={{ fontSize: 22, color: '#8e7f7e', lineHeight: 24 }}>×</Text>
              </TouchableOpacity>
            </View>

            {/* ── Seção: Cliente ── */}
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#b0a09e', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
              Cliente
            </Text>
            <View style={{ marginBottom: 20 }}>
              <TextInput
                style={{
                  borderWidth: 1, borderColor: clientNameFilter ? '#8e7f7e' : '#efeae8',
                  borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12,
                  fontSize: 13, color: '#635857', backgroundColor: '#fdfcfc',
                }}
                value={clientNameFilter}
                onChangeText={setClientNameFilter}
                placeholder="Buscar por nome, CPF ou telefone..."
                placeholderTextColor="#c2b4b2"
              />
              {clientNameFilter.length > 0 && (
                <TouchableOpacity
                  onPress={() => setClientNameFilter('')}
                  activeOpacity={0.7}
                  style={{ position: 'absolute', right: 10, top: 0, bottom: 0, justifyContent: 'center' }}
                >
                  <Text style={{ fontSize: 16, color: '#b0a09e' }}>×</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={{ height: 1, backgroundColor: '#efeae8', marginBottom: 14 }} />

            {/* ── Seção: Período ── */}
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#b0a09e', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
              Período
            </Text>
            <Text style={{ fontSize: 11, color: '#a08c8b', marginBottom: 6 }}>De</Text>
            <DateInputWithPicker value={customFrom} onChange={setCustomFrom} />
            <Text style={{ fontSize: 11, color: '#a08c8b', marginTop: 12, marginBottom: 6 }}>Até</Text>
            <DateInputWithPicker value={customTo} onChange={setCustomTo} minDate={customFrom} />
            {(customFrom || customTo) && (
              <TouchableOpacity
                onPress={() => { setCustomFrom(''); setCustomTo(''); }}
                activeOpacity={0.7}
                style={{ marginTop: 10, marginBottom: 4 }}
              >
                <Text style={{ fontSize: 12, color: '#a08c8b', textDecorationLine: 'underline' }}>Limpar datas</Text>
              </TouchableOpacity>
            )}

            <View style={{ height: 1, backgroundColor: '#efeae8', marginBottom: 14 }} />

            {/* ── Seção: Status ── */}
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#b0a09e', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
              Status
            </Text>

            {/* Todos */}
            <TouchableOpacity
              onPress={toggleAll}
              activeOpacity={0.7}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 12,
                paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8,
                backgroundColor: isAllSelected ? '#f5f0ef' : 'transparent',
                marginBottom: 4,
              }}
            >
              <View style={{
                width: 18, height: 18, borderRadius: 4, borderWidth: 1.5,
                borderColor: isAllSelected ? '#635857' : '#c2b4b2',
                backgroundColor: isAllSelected ? '#635857' : '#fff',
                alignItems: 'center', justifyContent: 'center',
              }}>
                {isAllSelected && <Text style={{ color: '#fff', fontSize: 11, lineHeight: 13 }}>✓</Text>}
              </View>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#635857' }}>Todos</Text>
            </TouchableOpacity>

            <View style={{ height: 1, backgroundColor: '#efeae8', marginVertical: 6 }} />

            {ALL_STATUSES.map(s => {
              const active = statusFilter.includes(s);
              const c = STATUS_PILL_COLOR[s];
              return (
                <TouchableOpacity
                  key={s}
                  onPress={() => toggleStatus(s)}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 12,
                    paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8,
                    backgroundColor: active ? c.bg : 'transparent',
                    marginBottom: 2,
                  }}
                >
                  <View style={{
                    width: 18, height: 18, borderRadius: 4, borderWidth: 1.5,
                    borderColor: active ? c.activeBg : '#c2b4b2',
                    backgroundColor: active ? c.activeBg : '#fff',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    {active && <Text style={{ color: '#fff', fontSize: 11, lineHeight: 13 }}>✓</Text>}
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: active ? c.activeBg : '#8e7f7e' }}>
                    {STATUS_LABEL[s]}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {/* ── Seção: Profissional ── */}
            {professionals.length > 0 && (
              <>
                <View style={{ height: 1, backgroundColor: '#efeae8', marginTop: 10, marginBottom: 14 }} />
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#b0a09e', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
                  Profissional
                </Text>

                {/* Todos */}
                <TouchableOpacity
                  onPress={() => setProFilter([])}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 12,
                    paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8,
                    backgroundColor: isAllProsSelected ? '#f5f0ef' : 'transparent',
                    marginBottom: 4,
                  }}
                >
                  <View style={{
                    width: 18, height: 18, borderRadius: 4, borderWidth: 1.5,
                    borderColor: isAllProsSelected ? '#635857' : '#c2b4b2',
                    backgroundColor: isAllProsSelected ? '#635857' : '#fff',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    {isAllProsSelected && <Text style={{ color: '#fff', fontSize: 11, lineHeight: 13 }}>✓</Text>}
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#635857' }}>Todos</Text>
                </TouchableOpacity>

                <View style={{ height: 1, backgroundColor: '#efeae8', marginVertical: 6 }} />

                {professionals.map(pro => {
                  const active = proFilter.includes(pro.id);
                  const color = pro.color ?? '#8e7f7e';
                  const bgColor = color + '26';
                  return (
                    <TouchableOpacity
                      key={pro.id}
                      onPress={() => togglePro(pro.id)}
                      activeOpacity={0.7}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 12,
                        paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8,
                        backgroundColor: active ? bgColor : 'transparent',
                        marginBottom: 2,
                      }}
                    >
                      <View style={{
                        width: 18, height: 18, borderRadius: 4, borderWidth: 1.5,
                        borderColor: active ? color : '#c2b4b2',
                        backgroundColor: active ? color : '#fff',
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        {active && <Text style={{ color: '#fff', fontSize: 11, lineHeight: 13 }}>✓</Text>}
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
                        <Text style={{ fontSize: 14, fontWeight: '600', color: active ? color : '#8e7f7e', flex: 1 }} numberOfLines={1}>
                          {pro.name}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </>
            )}
          </View>
        </>
      )}
    </View>
  );
}
