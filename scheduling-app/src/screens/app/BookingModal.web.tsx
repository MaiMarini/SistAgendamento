import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Modal, TextInput, ActivityIndicator,
} from 'react-native';
import { getToken } from '../../lib/supabase';
import { API_URL } from '../../lib/config';
import { modalStyles } from './AppointmentsScreen.web.styles';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface PreselectedClient {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  cpf?: string;
  is_minor?: boolean;
  guardian_phone?: string;
  guardian_email?: string;
}

interface ClientResult {
  id: string;
  name: string;
  cpf?: string;
  phone?: string;
  email?: string;
  is_minor: boolean;
  guardian_phone?: string;
  guardian_email?: string;
}

interface Professional {
  id: string;
  name: string;
  specialty?: string;
  default_duration_minutes?: number;
}

interface BookingModalProps {
  visible: boolean;
  onClose: () => void;
  preselectedClient?: PreselectedClient | null;
  preselectedProfessionalId?: string | null;
  professionals: Professional[];
  onSuccess?: () => void;
}

const EMPTY_FORM = {
  professionalId: '',
  date: '',
  time: '',
  duration: '60',
  notes: '',
};

// ── Helpers ────────────────────────────────────────────────────────────────────

const maskCPF = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0,3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`;
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
};

const validateCPF = (cpf: string): boolean => {
  const d = cpf.replace(/\D/g, '');
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(d[i]) * (10 - i);
  let r = (sum * 10) % 11; if (r === 10 || r === 11) r = 0;
  if (r !== parseInt(d[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(d[i]) * (11 - i);
  r = (sum * 10) % 11; if (r === 10 || r === 11) r = 0;
  return r === parseInt(d[10]);
};

const maskCEP = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 8);
  return d.length > 5 ? `${d.slice(0,5)}-${d.slice(5)}` : d;
};

const maskPhone = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0,2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
};

// ── Sub-components ─────────────────────────────────────────────────────────────

const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DAY_NAMES = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];
const pad2 = (n: number) => String(n).padStart(2, '0');

export function CalendarDatePicker({ professionalId, selected, onSelect }: {
  professionalId: string; selected: string; onSelect: (date: string) => void;
}) {
  const todayDate = new Date();
  const initYear  = selected ? parseInt(selected.slice(0, 4)) : todayDate.getFullYear();
  const initMonth = selected ? parseInt(selected.slice(5, 7)) - 1 : todayDate.getMonth();
  const [viewYear, setViewYear]   = useState(initYear);
  const [viewMonth, setViewMonth] = useState(initMonth);
  const [dayStatus, setDayStatus] = useState<Record<string, string>>({});
  const [calLoading, setCalLoading] = useState(false);
  const [pickingMonthYear, setPickingMonthYear] = useState(false);
  const [pickYear, setPickYear] = useState(initYear);

  useEffect(() => {
    if (!professionalId) { setDayStatus({}); return; }
    setCalLoading(true);
    (async () => {
      const token = await getToken();
      const res = await fetch(
        `${API_URL}/professionals/${professionalId}/month-availability?year=${viewYear}&month=${viewMonth + 1}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.ok) setDayStatus(await res.json());
      setCalLoading(false);
    })();
  }, [professionalId, viewYear, viewMonth]);

  const prevMonth = () => { if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); } else setViewMonth(m => m - 1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); } else setViewMonth(m => m + 1); };

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDow    = new Date(viewYear, viewMonth, 1).getDay();
  const startOffset = firstDow === 0 ? 6 : firstDow - 1;
  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  if (!professionalId) {
    return <Text style={{ fontSize: 13, color: '#c2b4b2', paddingVertical: 8 }}>Selecione um profissional primeiro.</Text>;
  }

  // ── Month/year picker overlay ──────────────────────────────────────────────
  const monthYearPicker = pickingMonthYear ? (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, backgroundColor: '#fdfcfc', borderRadius: 9 } as any}>
      {/* Year navigation */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, paddingVertical: 10, backgroundColor: '#f7f2f1' }}>
        <TouchableOpacity onPress={() => setPickYear(y => y - 1)} style={{ padding: 8 }} activeOpacity={0.7}>
          <Text style={{ fontSize: 18, color: '#8e7f7e' }}>‹</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 14, fontWeight: '700', color: '#635857' }}>{pickYear}</Text>
        <TouchableOpacity onPress={() => setPickYear(y => y + 1)} style={{ padding: 8 }} activeOpacity={0.7}>
          <Text style={{ fontSize: 18, color: '#8e7f7e' }}>›</Text>
        </TouchableOpacity>
      </View>
      {/* Month grid */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', padding: 8 }}>
        {MONTH_NAMES.map((name, idx) => {
          const isSelected = idx === viewMonth && pickYear === viewYear;
          return (
            <TouchableOpacity
              key={name}
              style={{ width: '33.33%' as any, paddingVertical: 10, alignItems: 'center' }}
              onPress={() => {
                setViewMonth(idx);
                setViewYear(pickYear);
                setPickingMonthYear(false);
              }}
              activeOpacity={0.7}
            >
              <View style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: isSelected ? '#8e7f7e' : 'transparent' }}>
                <Text style={{ fontSize: 13, fontWeight: isSelected ? '700' : '500', color: isSelected ? '#fff' : '#635857' }}>
                  {name.slice(0, 3)}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
      {/* Close */}
      <TouchableOpacity onPress={() => setPickingMonthYear(false)} style={{ alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#efeae8' }} activeOpacity={0.7}>
        <Text style={{ fontSize: 12, color: '#a08c8b' }}>Cancelar</Text>
      </TouchableOpacity>
    </View>
  ) : null;

  return (
    <View style={{ borderWidth: 1, borderColor: '#efeae8', borderRadius: 9, overflow: 'hidden', backgroundColor: '#fdfcfc', position: 'relative' } as any}>
      {monthYearPicker}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, paddingVertical: 8, backgroundColor: '#f7f2f1' }}>
        <TouchableOpacity onPress={prevMonth} style={{ padding: 8 }} activeOpacity={0.7}>
          <Text style={{ fontSize: 18, color: '#8e7f7e' }}>‹</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { setPickYear(viewYear); setPickingMonthYear(true); }} activeOpacity={0.8} style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#635857' }}>{MONTH_NAMES[viewMonth]} {viewYear} ▾</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={nextMonth} style={{ padding: 8 }} activeOpacity={0.7}>
          <Text style={{ fontSize: 18, color: '#8e7f7e' }}>›</Text>
        </TouchableOpacity>
      </View>
      <View style={{ flexDirection: 'row' }}>
        {DAY_NAMES.map(d => (
          <View key={d} style={{ flex: 1, alignItems: 'center', paddingVertical: 5 }}>
            <Text style={{ fontSize: 10, color: '#a08c8b', fontWeight: '600' }}>{d}</Text>
          </View>
        ))}
      </View>
      {calLoading ? (
        <View style={{ paddingVertical: 24, alignItems: 'center' }}><ActivityIndicator size="small" color="#8e7f7e" /></View>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {cells.map((day, i) => {
            if (!day) return <View key={`e${i}`} style={{ width: '14.285714%' as any, aspectRatio: 1 }} />;
            const dateStr  = `${viewYear}-${pad2(viewMonth + 1)}-${pad2(day)}`;
            const status   = dayStatus[dateStr] ?? 'unknown';
            const isSel    = selected === dateStr;
            const canClick = status === 'available';
            const dotBg    = isSel ? '#8e7f7e' : status === 'available' ? '#e8f5e9' : status === 'fully_booked' ? '#fce4e4' : status === 'day_off' ? '#fff3e0' : 'transparent';
            const txtColor = isSel ? '#fff' : status === 'available' ? '#2e7d32' : status === 'fully_booked' ? '#c0392b' : status === 'day_off' ? '#e65100' : '#c2b4b2';
            return (
              <TouchableOpacity
                key={dateStr}
                style={{ width: '14.285714%' as any, alignItems: 'center', justifyContent: 'center', paddingVertical: 3 }}
                onPress={() => canClick && onSelect(dateStr)}
                activeOpacity={canClick ? 0.7 : 1}
              >
                <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: dotBg, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 12, fontWeight: isSel ? '700' : '500', color: txtColor }}>{day}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
      <View style={{ flexDirection: 'row', gap: 14, padding: 10, borderTopWidth: 1, borderTopColor: '#efeae8', justifyContent: 'center' }}>
        {[{ color: '#4caf50', label: 'Disponível' }, { color: '#e53935', label: 'Lotado' }, { color: '#e65100', label: 'Folga' }].map(({ color, label }) => (
          <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
            <Text style={{ fontSize: 10, color: '#a08c8b' }}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function SlotPicker({ slots, loading, selected, onSelect, hasPro, hasDate }: {
  slots: string[]; loading: boolean; selected: string;
  onSelect: (s: string) => void; hasPro: boolean; hasDate: boolean;
}) {
  if (!hasPro || !hasDate) {
    return (
      <Text style={{ fontSize: 13, color: '#c2b4b2', paddingVertical: 8 }}>
        {!hasPro ? 'Selecione um profissional e uma data.' : 'Selecione uma data.'}
      </Text>
    );
  }
  if (loading) return <ActivityIndicator size="small" color="#8e7f7e" style={{ marginVertical: 8 }} />;
  if (slots.length === 0) {
    return <Text style={{ fontSize: 13, color: '#c2b4b2', paddingVertical: 8 }}>Sem horários disponíveis para esta data.</Text>;
  }
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {slots.map(slot => (
        <TouchableOpacity
          key={slot}
          onPress={() => onSelect(slot)}
          activeOpacity={0.7}
          style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, borderColor: selected === slot ? '#8e7f7e' : '#efeae8', backgroundColor: selected === slot ? '#8e7f7e' : '#ffffff' }}
        >
          <Text style={{ fontSize: 13, fontWeight: '600', color: selected === slot ? '#fff' : '#635857' }}>{slot}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={modalStyles.field}>
      <Text style={modalStyles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function TF({ label, value, onChangeText, placeholder, keyboardType = 'default', autoCapitalize = 'sentences' }: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; keyboardType?: any; autoCapitalize?: any;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <Field label={label}>
      <TextInput
        style={[modalStyles.input, focused && modalStyles.inputFocused]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#c2b4b2"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </Field>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function BookingModal({ visible, onClose, preselectedClient, preselectedProfessionalId, professionals, onSuccess }: BookingModalProps) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // File attachment
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadError, setUploadError] = useState('');

  // Available slots
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  // Client search (only when preselectedClient is not provided)
  const [clientSearch, setClientSearch] = useState('');
  const [clientResults, setClientResults] = useState<ClientResult[]>([]);
  const [clientLoading, setClientLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientResult | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Provisional client
  const [showProvForm, setShowProvForm] = useState(false);
  const [provForm, setProvForm] = useState({ name: '', phone: '', cpf: '', cep: '' });
  const [provSubmitting, setProvSubmitting] = useState(false);
  const [provError, setProvError] = useState('');
  const [provCpfError, setProvCpfError] = useState('');

  // Reset state whenever the modal opens
  useEffect(() => {
    if (!visible) return;
    const pro = preselectedProfessionalId
      ? professionals.find(p => p.id === preselectedProfessionalId)
      : undefined;
    setForm({
      ...EMPTY_FORM,
      professionalId: preselectedProfessionalId ?? '',
      duration: String(pro?.default_duration_minutes ?? 60),
    });
    setError('');
    setPendingFiles([]);
    setUploadError('');
    setAvailableSlots([]);
    setSlotsLoading(false);
    setClientSearch('');
    setClientResults([]);
    setSelectedClient(null);
    setShowProvForm(false);
    setProvForm({ name: '', phone: '', cpf: '', cep: '' });
    setProvError('');
    setProvCpfError('');
  }, [visible]);

  const fetchAvailableSlots = async (proId: string, dateStr: string) => {
    if (!proId || !dateStr) return;
    setSlotsLoading(true);
    setAvailableSlots([]);
    const token = await getToken();
    const res = await fetch(
      `${API_URL}/professionals/${proId}/available-slots?date=${dateStr}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (res.ok) setAvailableSlots(await res.json());
    setSlotsLoading(false);
  };

  // Client search (debounced)
  const handleClientSearch = (text: string) => {
    setClientSearch(text);
    setSelectedClient(null);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!text.trim()) { setClientResults([]); return; }
    searchTimeout.current = setTimeout(async () => {
      setClientLoading(true);
      const token = await getToken();
      const res = await fetch(`${API_URL}/clients/?search=${encodeURIComponent(text)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setClientResults(await res.json());
      setClientLoading(false);
    }, 350);
  };

  const selectClient = (c: ClientResult) => {
    setSelectedClient(c);
    setClientSearch('');
    setClientResults([]);
    setShowProvForm(false);
  };

  const clearClient = () => {
    setSelectedClient(null);
    setClientSearch('');
    setClientResults([]);
    setShowProvForm(false);
    setProvForm({ name: '', phone: '', cpf: '', cep: '' });
    setProvError('');
    setProvCpfError('');
  };

  const handleCreateProvisional = async () => {
    if (!provForm.name.trim()) { setProvError('Nome é obrigatório.'); return; }
    if (provForm.cpf && !validateCPF(provForm.cpf)) { setProvCpfError('CPF inválido.'); return; }
    setProvError('');
    setProvSubmitting(true);
    const token = await getToken();
    const res = await fetch(`${API_URL}/clients/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        name: provForm.name.trim(),
        phone: provForm.phone.trim() || undefined,
        cpf: provForm.cpf || undefined,
        cep: provForm.cep || undefined,
        is_provisional: true,
      }),
    });
    const data = await res.json();
    setProvSubmitting(false);
    if (!res.ok) { setProvError(data.detail || 'Erro ao cadastrar cliente.'); return; }
    selectClient({ id: data.id, name: data.name, cpf: data.cpf, phone: data.phone, is_minor: false });
    setProvForm({ name: '', phone: '', cpf: '', cep: '' });
  };

  const handleCreate = async () => {
    const activeClient: PreselectedClient | ClientResult | null = preselectedClient ?? selectedClient;
    if (!activeClient) { setError('Selecione um cliente.'); return; }
    if (!form.professionalId) { setError('Selecione um profissional.'); return; }
    if (!form.date) { setError('Informe a data.'); return; }
    if (!form.time) { setError('Informe o horário.'); return; }

    setError('');
    setSubmitting(true);
    const token = await getToken();

    const phone = activeClient.is_minor ? activeClient.guardian_phone : activeClient.phone;
    const email = activeClient.is_minor ? activeClient.guardian_email : activeClient.email;

    const payload: any = {
      professional_id: form.professionalId,
      client_id: activeClient.id,
      client_name: activeClient.name,
      starts_at: `${form.date}T${form.time}:00`,
      duration_minutes: parseInt(form.duration, 10),
    };
    if (phone)  payload.client_phone = phone;
    if (email)  payload.client_email = email;
    if (activeClient.cpf) payload.client_cpf = activeClient.cpf;
    if (form.notes) payload.notes = form.notes;

    const res = await fetch(`${API_URL}/appointments/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    setSubmitting(false);

    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.detail || 'Erro ao criar agendamento.');
      return;
    }

    const newAppt = await res.json();
    if (pendingFiles.length > 0) {
      const maxMB = 20;
      const tooBig = pendingFiles.find(f => f.size > maxMB * 1024 * 1024);
      if (tooBig) {
        setUploadError(`Arquivo "${tooBig.name}" muito grande. Máximo ${maxMB} MB.`);
      } else {
        const failed: string[] = [];
        for (const file of pendingFiles) {
          const fd = new FormData();
          fd.append('file', file);
          fd.append('appointment_id', newAppt.id);
          const upRes = await fetch(`${API_URL}/clients/${activeClient.id}/documents/upload`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: fd,
          });
          if (!upRes.ok) failed.push(file.name);
        }
        if (failed.length > 0) setUploadError(`Agendamento criado, mas falha ao enviar: ${failed.join(', ')}`);
      }
    }

    onClose();
    onSuccess?.();
  };

  const activeClient: PreselectedClient | ClientResult | null = preselectedClient ?? selectedClient;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View {...{ dataSet: { modal: 'true' } } as any} style={modalStyles.content}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>Novo Agendamento</Text>
            <TouchableOpacity style={modalStyles.closeButton} onPress={onClose}>
              <Text style={modalStyles.closeText}>×</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>

            {/* ── Cliente ── */}
            {preselectedClient ? (
              <View style={{ backgroundColor: '#f7f2f1', borderRadius: 9, padding: 12, marginBottom: 14 }}>
                <Text style={{ fontSize: 13, color: '#8e7f7e', fontWeight: '600' }}>Cliente</Text>
                <Text style={{ fontSize: 15, color: '#635857', fontWeight: '600', marginTop: 2 }}>{preselectedClient.name}</Text>
              </View>
            ) : (
              <View style={modalStyles.clientSearchWrapper}>
                <Text style={modalStyles.fieldLabel}>Cliente *</Text>
                {selectedClient ? (
                  <View style={modalStyles.clientChip}>
                    <View style={modalStyles.clientChipInfo}>
                      <Text style={modalStyles.clientChipName}>{selectedClient.name}</Text>
                      {(selectedClient.cpf || selectedClient.phone || selectedClient.guardian_phone) ? (
                        <Text style={modalStyles.clientChipSub}>
                          {selectedClient.cpf ? `CPF ${selectedClient.cpf}` : ''}
                          {selectedClient.cpf && (selectedClient.phone || selectedClient.guardian_phone) ? '  ·  ' : ''}
                          {selectedClient.is_minor ? selectedClient.guardian_phone : selectedClient.phone}
                        </Text>
                      ) : null}
                    </View>
                    <TouchableOpacity style={modalStyles.clientChipChange} onPress={clearClient}>
                      <Text style={modalStyles.clientChipChangeText}>Trocar</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <TextInput
                      style={modalStyles.input}
                      value={clientSearch}
                      onChangeText={handleClientSearch}
                      placeholder="Buscar por nome ou CPF..."
                      placeholderTextColor="#c2b4b2"
                    />
                    {clientLoading && (
                      <View style={{ alignItems: 'center', paddingVertical: 8 }}>
                        <ActivityIndicator size="small" color="#8e7f7e" />
                      </View>
                    )}
                    {clientResults.length > 0 && (
                      <ScrollView style={modalStyles.clientResults} nestedScrollEnabled>
                        {clientResults.map(c => (
                          <TouchableOpacity
                            key={c.id}
                            style={modalStyles.clientResultItem}
                            onPress={() => selectClient(c)}
                            activeOpacity={0.7}
                          >
                            <Text style={modalStyles.clientResultName}>{c.name}</Text>
                            {(c.cpf || c.phone) ? (
                              <Text style={modalStyles.clientResultSub}>
                                {[c.cpf, c.is_minor ? c.guardian_phone : c.phone].filter(Boolean).join('  ·  ')}
                              </Text>
                            ) : null}
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    )}
                    {!clientLoading && clientSearch.trim() && clientResults.length === 0 && (
                      showProvForm ? (
                        <View style={{ marginTop: 10, padding: 14, backgroundColor: '#f7f2f1', borderRadius: 9 }}>
                          <Text style={{ fontSize: 12, fontWeight: '600', color: '#635857', marginBottom: 12, letterSpacing: 0.5 }}>
                            CADASTRO PROVISÓRIO
                          </Text>
                          <TextInput
                            style={[modalStyles.input, { marginBottom: 8 }]}
                            value={provForm.name}
                            onChangeText={v => setProvForm(p => ({ ...p, name: v }))}
                            placeholder="Nome *"
                            placeholderTextColor="#c2b4b2"
                            autoCapitalize="words"
                          />
                          <TextInput
                            style={[modalStyles.input, { marginBottom: 8 }]}
                            value={provForm.phone}
                            onChangeText={v => setProvForm(p => ({ ...p, phone: maskPhone(v) }))}
                            placeholder="Telefone (00) 00000-0000"
                            placeholderTextColor="#c2b4b2"
                            keyboardType="phone-pad"
                          />
                          <TextInput
                            style={[modalStyles.input, { marginBottom: provCpfError ? 4 : 8 }]}
                            value={provForm.cpf}
                            onChangeText={v => { setProvCpfError(''); setProvForm(p => ({ ...p, cpf: maskCPF(v) })); }}
                            onBlur={() => { if (provForm.cpf && !validateCPF(provForm.cpf)) setProvCpfError('CPF inválido.'); }}
                            placeholder="CPF (000.000.000-00)"
                            placeholderTextColor="#c2b4b2"
                            keyboardType="numeric"
                          />
                          {provCpfError ? (
                            <Text style={{ color: '#e74c3c', fontSize: 12, marginBottom: 8 }}>{provCpfError}</Text>
                          ) : null}
                          <TextInput
                            style={[modalStyles.input, { marginBottom: 10 }]}
                            value={provForm.cep}
                            onChangeText={v => setProvForm(p => ({ ...p, cep: maskCEP(v) }))}
                            placeholder="CEP (00000-000)"
                            placeholderTextColor="#c2b4b2"
                            keyboardType="numeric"
                          />
                          {provError ? (
                            <Text style={{ color: '#e74c3c', fontSize: 12, marginBottom: 8 }}>{provError}</Text>
                          ) : null}
                          <View style={{ flexDirection: 'row', gap: 8 }}>
                            <TouchableOpacity
                              style={[modalStyles.btnCancel, { flex: 1, paddingVertical: 10 }]}
                              onPress={() => { setShowProvForm(false); setProvError(''); }}
                            >
                              <Text style={modalStyles.btnCancelText}>Voltar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[modalStyles.btnSave, { flex: 2, paddingVertical: 10 }]}
                              onPress={handleCreateProvisional}
                              disabled={provSubmitting}
                              activeOpacity={0.85}
                            >
                              {provSubmitting
                                ? <ActivityIndicator color="#fff" />
                                : <Text style={modalStyles.btnSaveText}>Cadastrar e selecionar</Text>}
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 }}>
                          <Text style={{ fontSize: 13, color: '#c2b4b2' }}>Nenhum cliente encontrado.</Text>
                          <TouchableOpacity
                            style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 7, backgroundColor: '#f7f2f1' }}
                            onPress={() => { setProvForm({ name: clientSearch, phone: '', cpf: '', cep: '' }); setShowProvForm(true); }}
                            activeOpacity={0.7}
                          >
                            <Text style={{ fontSize: 12, color: '#8e7f7e', fontWeight: '600' }}>+ Cadastrar</Text>
                          </TouchableOpacity>
                        </View>
                      )
                    )}
                  </>
                )}
              </View>
            )}

            {/* ── Profissional ── */}
            {!preselectedProfessionalId && (
              <Field label="Profissional *">
                <select
                  value={form.professionalId}
                  onChange={(e: any) => {
                    const v = e.target.value;
                    const pro = professionals.find(p => p.id === v);
                    setForm({ ...form, professionalId: v, duration: String(pro?.default_duration_minutes ?? 60), date: '', time: '' });
                    setAvailableSlots([]);
                  }}
                  style={{
                    border: '1px solid #efeae8', borderRadius: 9,
                    padding: '11px 13px', fontSize: 14,
                    color: form.professionalId ? '#635857' : '#c2b4b2',
                    backgroundColor: '#fdfcfc', outline: 'none',
                    width: '100%', fontFamily: 'inherit', cursor: 'pointer',
                  } as any}
                >
                  <option value="">Selecione um profissional</option>
                  {professionals.map(p => (
                    <option key={p.id} value={p.id}>{p.name}{p.specialty ? ` — ${p.specialty}` : ''}</option>
                  ))}
                </select>
              </Field>
            )}

            {/* ── Calendário ── */}
            <Field label="Data *">
              <CalendarDatePicker
                professionalId={form.professionalId}
                selected={form.date}
                onSelect={v => {
                  setForm({ ...form, date: v, time: '' });
                  setAvailableSlots([]);
                  if (v && form.professionalId) fetchAvailableSlots(form.professionalId, v);
                }}
              />
            </Field>

            {/* ── Horários ── */}
            <Field label="Horário *">
              <SlotPicker
                slots={availableSlots}
                loading={slotsLoading}
                selected={form.time}
                onSelect={v => setForm({ ...form, time: v })}
                hasPro={!!form.professionalId}
                hasDate={!!form.date}
              />
            </Field>

            {/* ── Duração ── */}
            <Field label="Duração (minutos)">
              <input
                type="number"
                value={form.duration}
                onChange={(e: any) => setForm({ ...form, duration: e.target.value.replace(/\D/g, '') })}
                style={{
                  border: '1px solid #efeae8', borderRadius: 9,
                  padding: '11px 13px', fontSize: 14, color: '#635857',
                  backgroundColor: '#fdfcfc', outline: 'none',
                  width: '100%', boxSizing: 'border-box' as any, fontFamily: 'inherit',
                }}
              />
            </Field>

            {/* ── Observações ── */}
            <TF
              label="Observações"
              value={form.notes}
              onChangeText={v => setForm({ ...form, notes: v })}
              placeholder="Informações adicionais..."
            />

            {/* ── Anexo ── */}
            {activeClient && (
              <View style={{ marginTop: 4, marginBottom: 12 }}>
                {pendingFiles.length > 0 && (
                  <View style={{ gap: 6, marginBottom: 8 }}>
                    {pendingFiles.map((f, i) => (
                      <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e0d8d7', backgroundColor: '#fdfcfc' }}>
                        <Text>{f.type.startsWith('image/') ? '🖼' : '📄'}</Text>
                        <Text style={{ flex: 1, fontSize: 13, color: '#635857' }} numberOfLines={1}>{f.name}</Text>
                        <TouchableOpacity activeOpacity={0.7} onPress={() => setPendingFiles(prev => prev.filter((_, j) => j !== i))}>
                          <Text style={{ fontSize: 18, color: '#b0a0a0', lineHeight: 20 }}>×</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, borderColor: '#e0d8d7', backgroundColor: '#fdfcfc', cursor: 'pointer', alignSelf: 'flex-start' } as any}
                  onPress={() => fileInputRef.current?.click()}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 13, color: '#8e7f7e' }}>📎 Anexar arquivo</Text>
                </TouchableOpacity>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  multiple
                  style={{ display: 'none' }}
                  onChange={(e: any) => {
                    const files = Array.from(e.target.files ?? []) as File[];
                    if (files.length) setPendingFiles(prev => [...prev, ...files]);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                />
              </View>
            )}
            {uploadError ? <Text style={modalStyles.errorText}>{uploadError}</Text> : null}

          </ScrollView>

          {error ? <Text style={modalStyles.errorText}>{error}</Text> : null}

          <View style={modalStyles.footer}>
            <TouchableOpacity style={modalStyles.btnCancel} onPress={onClose}>
              <Text style={modalStyles.btnCancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={modalStyles.btnSave} onPress={handleCreate} disabled={submitting} activeOpacity={0.85}>
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={modalStyles.btnSaveText}>Agendar</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}