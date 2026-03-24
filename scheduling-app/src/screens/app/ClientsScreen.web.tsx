import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Modal, TextInput, ActivityIndicator, useWindowDimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { API_URL } from '../../lib/config';
import { styles, cardStyles, modalStyles, detailStyles } from './ClientsScreen.web.styles';
import { useResponsiveWeb } from '../../lib/useResponsiveWeb';
import { useDrawerNav } from '../../lib/useDrawerNav';
import BookingModal from './BookingModal.web';
import AppointmentDetailModal from './AppointmentDetailModal.web';
import { patchAppointmentStatus, parseNaive } from '../../lib/appointmentUtils';
import { getToken } from '../../lib/supabase';
import { maskPhone, maskCPF, maskCEP } from '../../lib/masks';
import { getInitials, getAvatarColor } from '../../lib/avatar';
import { useConfirm } from '../../hooks/useConfirm';
import { useBookingModal } from '../../hooks/useBookingModal';
import { useAppointmentDetailModal } from '../../hooks/useAppointmentDetailModal';

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface Client {
  id: string;
  company_id: string;
  name: string;
  birth_date: string;
  is_minor: boolean;
  observations?: string;
  cpf?: string;
  cep?: string;
  street?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  address_number?: string;
  complement?: string;
  phone?: string;
  phone_is_whatsapp: boolean;
  email?: string;
  guardian_name?: string;
  guardian_birth_date?: string;
  guardian_cpf?: string;
  guardian_cep?: string;
  guardian_street?: string;
  guardian_neighborhood?: string;
  guardian_city?: string;
  guardian_state?: string;
  guardian_number?: string;
  guardian_complement?: string;
  guardian_phone?: string;
  guardian_phone_is_whatsapp: boolean;
  guardian_email?: string;
  notifications_enabled: boolean;
  notification_channel?: string;
  is_provisional: boolean;
  active: boolean;
  created_at: string;
}

interface ClientForm {
  name: string;
  birthDate: string;
  observations: string;
  cpf: string;
  cep: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  addressNumber: string;
  complement: string;
  phone: string;
  phoneIsWhatsapp: boolean;
  email: string;
  guardianName: string;
  guardianBirthDate: string;
  guardianCpf: string;
  guardianCep: string;
  guardianStreet: string;
  guardianNeighborhood: string;
  guardianCity: string;
  guardianState: string;
  guardianNumber: string;
  guardianComplement: string;
  guardianPhone: string;
  guardianPhoneIsWhatsapp: boolean;
  guardianEmail: string;
  notificationsEnabled: boolean;
  notificationChannel: string;
}

interface ProfessionalOption {
  id: string;
  name: string;
  specialty?: string;
  color?: string;
  default_duration_minutes?: number;
}


interface AppointmentRecord {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  notes?: string;
  client_name: string;
  professional?: { id: string; name: string; color?: string };
}

interface ObservationRecord {
  id: string;
  content: string;
  source: 'manual' | 'appointment';
  source_label?: string;
  created_at: string;
  documents?: DocumentRecord[];
}

interface DocumentRecord {
  id: string;
  file_name: string;
  file_type: string;
  storage_path: string;
  file_size_bytes?: number;
  created_at: string;
}

type DetailTab = 'details' | 'notes' | 'appointments';


// ── Helpers ───────────────────────────────────────────────────────────────────

function isMinorAge(birthDate: string): boolean {
  if (!birthDate) return false;
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age < 18;
}

function calcAge(birthDate: string): number {
  if (!birthDate) return 0;
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function validateCPF(cpf: string): boolean {
  const d = cpf.replace(/\D/g, '');
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  let s = 0;
  for (let i = 0; i < 9; i++) s += +d[i] * (10 - i);
  let r = (s * 10) % 11;
  if (r >= 10) r = 0;
  if (r !== +d[9]) return false;
  s = 0;
  for (let i = 0; i < 10; i++) s += +d[i] * (11 - i);
  r = (s * 10) % 11;
  if (r >= 10) r = 0;
  return r === +d[10];
}

async function fetchCep(cep: string): Promise<{ logradouro: string; bairro: string; localidade: string; uf: string } | null> {
  const cleaned = cep.replace(/\D/g, '');
  if (cleaned.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`);
    const data = await res.json();
    if (data.erro) return null;
    return data;
  } catch { return null; }
}

const STATUS_LABEL: Record<string, string> = {
  scheduled: 'Agendado',
  confirmed: 'Confirmado',
  completed: 'Concluído',
  cancelled: 'Cancelado',
  no_show: 'Não compareceu',
};

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  scheduled:  { bg: '#e3f2fd', text: '#1565c0' },
  confirmed:  { bg: '#e8f5e9', text: '#2e7d32' },
  completed:  { bg: '#f3e5f5', text: '#6a1b9a' },
  cancelled:  { bg: '#fce4e4', text: '#c0392b' },
  no_show:    { bg: '#fff3e0', text: '#e65100' },
};

function formatDateTimePt(iso: string): string {
  const d = parseNaive(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} às ${hh}:${min}`;
}

// ── Componentes auxiliares ────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return <Text style={modalStyles.sectionHeader}>{title}</Text>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={modalStyles.field}>
      <Text style={modalStyles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function TF({ label, value, onChange, placeholder, mask, disabled, keyboardType = 'default', autoCapitalize = 'sentences' }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; mask?: (v: string) => string; disabled?: boolean;
  keyboardType?: any; autoCapitalize?: any;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <Field label={label}>
      <TextInput
        style={[modalStyles.input, focused && modalStyles.inputFocused, disabled && modalStyles.inputDisabled]}
        value={value}
        onChangeText={v => onChange(mask ? mask(v) : v)}
        placeholder={placeholder}
        placeholderTextColor="#c2b4b2"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        editable={!disabled}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </Field>
  );
}

function NativeTimeInput({ label, value, onChange }: {
  label: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <input
        type="time"
        value={value}
        onChange={(e: any) => onChange(e.target.value)}
        style={{
          border: '1px solid #efeae8', borderRadius: 9,
          padding: '10px 12px', fontSize: 14, color: value ? '#635857' : '#c2b4b2',
          backgroundColor: '#fdfcfc', outline: 'none',
          width: '100%', boxSizing: 'border-box' as any, fontFamily: 'inherit',
        }}
      />
    </Field>
  );
}

function NativeSelect({ label, value, onChange, children }: {
  label: string; value: string; onChange: (v: string) => void; children: React.ReactNode;
}) {
  return (
    <Field label={label}>
      <select
        value={value}
        onChange={(e: any) => onChange(e.target.value)}
        style={{
          border: '1px solid #efeae8', borderRadius: 9,
          padding: '10px 12px', fontSize: 14, color: '#635857',
          backgroundColor: '#fdfcfc', outline: 'none',
          width: '100%', boxSizing: 'border-box' as any, fontFamily: 'inherit',
          appearance: 'auto',
        }}
      >
        {children}
      </select>
    </Field>
  );
}

function NativeDateInput({ label, value, onChange, max }: {
  label: string; value: string; onChange: (v: string) => void; max?: string;
}) {
  return (
    <Field label={label}>
      <input
        type="date"
        value={value ?? ''}
        onChange={(e: any) => onChange(e.target.value)}
        max={max}
        style={{
          border: '1px solid #efeae8', borderRadius: 9,
          padding: '10px 12px', fontSize: 14, color: value ? '#635857' : '#c2b4b2',
          backgroundColor: '#fdfcfc', outline: 'none',
          width: '100%', boxSizing: 'border-box' as any, fontFamily: 'inherit',
        }}
      />
    </Field>
  );
}

function PhoneField({ label, value, onChange, isWhatsapp, onToggleWhatsapp }: {
  label: string; value: string; onChange: (v: string) => void;
  isWhatsapp: boolean; onToggleWhatsapp: () => void;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <Field label={label}>
      <View style={modalStyles.phoneRow}>
        <View style={modalStyles.phoneField}>
          <TextInput
            style={[modalStyles.input, focused && modalStyles.inputFocused]}
            value={value}
            onChangeText={v => onChange(maskPhone(v))}
            placeholder="(00) 00000-0000"
            placeholderTextColor="#c2b4b2"
            keyboardType="phone-pad"
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
        </View>
        <TouchableOpacity
          style={[modalStyles.wpToggle, isWhatsapp && modalStyles.wpToggleActive]}
          onPress={onToggleWhatsapp}
          activeOpacity={0.8}
        >
          <Text style={[modalStyles.wpToggleText, isWhatsapp && modalStyles.wpToggleTextActive]}>
            {isWhatsapp ? '✓ WhatsApp' : 'WhatsApp'}
          </Text>
        </TouchableOpacity>
      </View>
    </Field>
  );
}

interface CepFieldsProps {
  cep: string; street: string; neighborhood: string;
  city: string; state: string; number: string; complement: string;
  onCepChange: (v: string) => void;
  onNumberChange: (v: string) => void;
  onComplementChange: (v: string) => void;
  loading: boolean;
}

function AddressFields({ cep, street, neighborhood, city, state, number, complement,
  onCepChange, onNumberChange, onComplementChange, loading }: CepFieldsProps) {
  return (
    <>
      <View style={modalStyles.fieldRow}>
        <View style={modalStyles.fieldThird}>
          <Field label={loading ? 'CEP (buscando...)' : 'CEP'}>
            <TextInput
              style={modalStyles.input}
              value={cep}
              onChangeText={v => onCepChange(maskCEP(v))}
              placeholder="00000-000"
              placeholderTextColor="#c2b4b2"
              keyboardType="number-pad"
            />
          </Field>
        </View>
        <View style={[modalStyles.fieldTwo, { paddingTop: 0 }]}>
          <TF label="Logradouro" value={street} onChange={() => {}} disabled placeholder="Preenchido automaticamente" />
        </View>
      </View>

      <View style={modalStyles.fieldRow}>
        <View style={modalStyles.fieldHalf}>
          <TF label="Bairro" value={neighborhood} onChange={() => {}} disabled placeholder="Preenchido automaticamente" />
        </View>
        <View style={[{ flex: 1.2 }]}>
          <TF label="Cidade" value={city} onChange={() => {}} disabled placeholder="Preenchido automaticamente" />
        </View>
        <View style={[{ flex: 0.5 }]}>
          <TF label="UF" value={state} onChange={() => {}} disabled placeholder="–" />
        </View>
      </View>

      <View style={modalStyles.fieldRow}>
        <View style={[{ flex: 0.8 }]}>
          <TF label="Número *" value={number} onChange={onNumberChange} placeholder="Nº" />
        </View>
        <View style={[{ flex: 2 }]}>
          <TF label="Complemento" value={complement} onChange={onComplementChange} placeholder="Apto, bloco..." />
        </View>
      </View>
    </>
  );
}

// ── Card de cliente ───────────────────────────────────────────────────────────

function ClientCard({ client, onView, onEdit, onDelete, onBook }: {
  client: Client;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onBook: () => void;
}) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const initials = client.name ? getInitials(client.name) : '?';
  const bgColor = getAvatarColor(client.name);
  const displayPhone = client.is_minor ? client.guardian_phone : client.phone;

  return (
    <TouchableOpacity style={cardStyles.card} onPress={onView} activeOpacity={0.75}>
      <View style={[cardStyles.avatar, { backgroundColor: bgColor }]}>
        <Text style={cardStyles.avatarText}>{initials}</Text>
      </View>

      <View style={cardStyles.info}>
        <Text style={cardStyles.name} numberOfLines={1}>{client.name}</Text>
        <View style={cardStyles.meta}>
          {displayPhone ? (
            <>
              <Text style={cardStyles.metaText} numberOfLines={1}>{displayPhone}</Text>
              {!isMobile && <View style={cardStyles.separator} />}
            </>
          ) : null}
          {(!isMobile || !displayPhone) && (
            <Text style={cardStyles.metaText}>{calcAge(client.birth_date)} anos</Text>
          )}
        </View>
      </View>

      {!isMobile && (
        <View style={cardStyles.badges}>
          {client.is_provisional && (
            <View style={[cardStyles.badge, cardStyles.badgeProvisional]}>
              <Text style={[cardStyles.badgeText, cardStyles.badgeProvisionalText]}>Provisório</Text>
            </View>
          )}
          {client.is_minor && (
            <View style={[cardStyles.badge, cardStyles.badgeMinor]}>
              <Text style={[cardStyles.badgeText, cardStyles.badgeMinorText]}>Menor</Text>
            </View>
          )}
          <View style={[cardStyles.badge, client.active ? cardStyles.badgeActive : cardStyles.badgeInactive]}>
            <Text style={[cardStyles.badgeText, client.active ? cardStyles.badgeActiveText : cardStyles.badgeInactiveText]}>
              {client.active ? 'Ativo' : 'Inativo'}
            </Text>
          </View>
        </View>
      )}

      <View style={cardStyles.actions}>
        <TouchableOpacity style={[cardStyles.btnIcon, cardStyles.btnBook]} onPress={onBook} activeOpacity={0.7}>
          <Text style={cardStyles.btnIconText}>📅</Text>
        </TouchableOpacity>
        {!isMobile && (
          <TouchableOpacity style={[cardStyles.btnIcon, cardStyles.btnEdit]} onPress={onEdit} activeOpacity={0.7}>
            <Text style={cardStyles.btnIconText}>✎</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[cardStyles.btnIcon, cardStyles.btnDelete]} onPress={onDelete} activeOpacity={0.7}>
          <Text style={cardStyles.btnIconText}>✕</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ── Formulário ────────────────────────────────────────────────────────────────

const EMPTY_FORM: ClientForm = {
  name: '', birthDate: '', observations: '',
  cpf: '', cep: '', street: '', neighborhood: '', city: '', state: '',
  addressNumber: '', complement: '', phone: '', phoneIsWhatsapp: false, email: '',
  guardianName: '', guardianBirthDate: '',
  guardianCpf: '', guardianCep: '', guardianStreet: '', guardianNeighborhood: '',
  guardianCity: '', guardianState: '', guardianNumber: '', guardianComplement: '',
  guardianPhone: '', guardianPhoneIsWhatsapp: false, guardianEmail: '',
  notificationsEnabled: true, notificationChannel: 'whatsapp',
};

function clientToForm(c: Client): ClientForm {
  return {
    name: c.name, birthDate: c.birth_date, observations: c.observations ?? '',
    cpf: c.cpf ?? '', cep: c.cep ?? '', street: c.street ?? '',
    neighborhood: c.neighborhood ?? '', city: c.city ?? '', state: c.state ?? '',
    addressNumber: c.address_number ?? '', complement: c.complement ?? '',
    phone: c.phone ?? '', phoneIsWhatsapp: c.phone_is_whatsapp, email: c.email ?? '',
    guardianName: c.guardian_name ?? '', guardianBirthDate: c.guardian_birth_date ?? '',
    guardianCpf: c.guardian_cpf ?? '', guardianCep: c.guardian_cep ?? '',
    guardianStreet: c.guardian_street ?? '', guardianNeighborhood: c.guardian_neighborhood ?? '',
    guardianCity: c.guardian_city ?? '', guardianState: c.guardian_state ?? '',
    guardianNumber: c.guardian_number ?? '', guardianComplement: c.guardian_complement ?? '',
    guardianPhone: c.guardian_phone ?? '', guardianPhoneIsWhatsapp: c.guardian_phone_is_whatsapp,
    guardianEmail: c.guardian_email ?? '',
    notificationsEnabled: c.notifications_enabled,
    notificationChannel: c.notification_channel ?? 'whatsapp',
  };
}

// ── Aba Detalhes (formulário inline) ─────────────────────────────────────────

function TabDetails({ client, onSaved }: { client: Client; onSaved: (updated: Client) => void }) {
  const [form, setForm] = useState<ClientForm>(() => clientToForm(client));
  const [loadingCep, setLoadingCep] = useState(false);
  const [loadingGuardianCep, setLoadingGuardianCep] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cpfError, setCpfError] = useState('');
  const [guardianCpfError, setGuardianCpfError] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const today = new Date().toISOString().split('T')[0];
  const isMinor = isMinorAge(form.birthDate);

  useEffect(() => { setForm(clientToForm(client)); }, [client.id]);

  useEffect(() => {
    const cleaned = form.cep.replace(/\D/g, '');
    if (cleaned.length !== 8) return;
    setLoadingCep(true);
    fetchCep(cleaned).then(data => {
      setLoadingCep(false);
      if (data) setForm(f => ({ ...f, street: data.logradouro, neighborhood: data.bairro, city: data.localidade, state: data.uf }));
    });
  }, [form.cep]);

  useEffect(() => {
    const cleaned = form.guardianCep.replace(/\D/g, '');
    if (cleaned.length !== 8) return;
    setLoadingGuardianCep(true);
    fetchCep(cleaned).then(data => {
      setLoadingGuardianCep(false);
      if (data) setForm(f => ({ ...f, guardianStreet: data.logradouro, guardianNeighborhood: data.bairro, guardianCity: data.localidade, guardianState: data.uf }));
    });
  }, [form.guardianCep]);

  const validate = (): boolean => {
    if (!form.name.trim()) { setError('Nome é obrigatório.'); return false; }

    if (client.is_provisional) {
      // Requisitos para completar o cadastro provisório
      if (!form.birthDate) { setError('Data de nascimento é obrigatória.'); return false; }
      if (!isMinor) {
        if (!form.cpf) { setCpfError('CPF é obrigatório.'); return false; }
        if (!validateCPF(form.cpf)) { setCpfError('CPF inválido.'); return false; }
        if (!form.phone.trim()) { setError('Telefone é obrigatório.'); return false; }
        if (!form.cep.trim() || !form.street.trim() || !form.city.trim() || !form.state.trim()) {
          setError('Endereço completo é obrigatório (CEP, logradouro, cidade e estado).'); return false;
        }
      } else {
        if (!form.guardianName.trim()) { setError('Nome do responsável é obrigatório.'); return false; }
        if (!form.guardianCpf) { setGuardianCpfError('CPF do responsável é obrigatório.'); return false; }
        if (!validateCPF(form.guardianCpf)) { setGuardianCpfError('CPF do responsável inválido.'); return false; }
        if (!form.guardianPhone.trim()) { setError('Telefone do responsável é obrigatório.'); return false; }
        if (!form.guardianCep.trim() || !form.guardianStreet.trim() || !form.guardianCity.trim() || !form.guardianState.trim()) {
          setError('Endereço completo do responsável é obrigatório (CEP, logradouro, cidade e estado).'); return false;
        }
      }
    } else {
      // Validações normais para clientes já ativos
      if (!isMinor) {
        if (form.cpf && !validateCPF(form.cpf)) { setCpfError('CPF inválido.'); return false; }
      } else {
        if (!form.guardianName.trim()) { setError('Nome do responsável é obrigatório.'); return false; }
        if (form.guardianCpf && !validateCPF(form.guardianCpf)) { setGuardianCpfError('CPF do responsável inválido.'); return false; }
      }
    }
    return true;
  };

  const handleSave = async () => {
    setCpfError(''); setGuardianCpfError(''); setError(''); setSaved(false);
    if (!validate()) return;
    setSubmitting(true);
    const token = await getToken();
    const payload: any = {
      name: form.name.trim(),
      birth_date: form.birthDate || null,
      notifications_enabled: form.notificationsEnabled,
      notification_channel: form.notificationsEnabled ? form.notificationChannel : null,
      observations: form.observations || null,
      is_provisional: false,
    };
    if (!isMinor) {
      if (form.cpf)           payload.cpf = form.cpf;
      if (form.cep)           payload.cep = form.cep;
      if (form.street)        payload.street = form.street;
      if (form.neighborhood)  payload.neighborhood = form.neighborhood;
      if (form.city)          payload.city = form.city;
      if (form.state)         payload.state = form.state;
      if (form.addressNumber) payload.address_number = form.addressNumber;
      if (form.complement)    payload.complement = form.complement;
      if (form.phone)         payload.phone = form.phone;
      payload.phone_is_whatsapp = form.phoneIsWhatsapp;
      if (form.email)         payload.email = form.email;
    } else {
      if (form.guardianName)         payload.guardian_name = form.guardianName.trim();
      if (form.guardianBirthDate)    payload.guardian_birth_date = form.guardianBirthDate;
      if (form.guardianCpf)          payload.guardian_cpf = form.guardianCpf;
      if (form.guardianCep)          payload.guardian_cep = form.guardianCep;
      if (form.guardianStreet)       payload.guardian_street = form.guardianStreet;
      if (form.guardianNeighborhood) payload.guardian_neighborhood = form.guardianNeighborhood;
      if (form.guardianCity)         payload.guardian_city = form.guardianCity;
      if (form.guardianState)        payload.guardian_state = form.guardianState;
      if (form.guardianNumber)       payload.guardian_number = form.guardianNumber;
      if (form.guardianComplement)   payload.guardian_complement = form.guardianComplement;
      if (form.guardianPhone)        payload.guardian_phone = form.guardianPhone;
      payload.guardian_phone_is_whatsapp = form.guardianPhoneIsWhatsapp;
      if (form.guardianEmail)        payload.guardian_email = form.guardianEmail;
    }
    const res = await fetch(`${API_URL}/clients/${client.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(data.detail || 'Erro ao salvar.'); return; }
    setSaved(true);
    onSaved(data);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} style={detailStyles.tabContent}>
      <SectionHeader title="Dados do Cliente" />
      <View style={modalStyles.fieldRow}>
        <View style={[{ flex: 2 }]}>
          <TF label="Nome Completo *" value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="Nome do cliente" />
        </View>
        <View style={[{ flex: 1 }]}>
          <NativeDateInput
            label="Data de Nascimento *"
            value={form.birthDate}
            onChange={v => setForm({ ...form, birthDate: v })}
            max={today}
          />
        </View>
      </View>

      {form.birthDate && (
        <View style={[modalStyles.minorNote, { backgroundColor: isMinor ? '#e3f2fd' : '#e8f5e9' }]}>
          <Text style={[modalStyles.minorNoteText, { color: isMinor ? '#1565c0' : '#2e7d32' }]}>
            {isMinor
              ? `Menor de idade (${calcAge(form.birthDate)} anos) — preencha os dados do responsável`
              : `Maior de idade (${calcAge(form.birthDate)} anos)`}
          </Text>
        </View>
      )}

      {!isMinor && (
        <>
          <SectionHeader title="Identificação" />
          <View style={modalStyles.fieldRow}>
            <View style={modalStyles.fieldHalf}>
              <TF
                label={`CPF${cpfError ? ` — ${cpfError}` : ''}`}
                value={form.cpf}
                onChange={v => { setForm({ ...form, cpf: maskCPF(v) }); setCpfError(''); }}
                placeholder="000.000.000-00"
                keyboardType="number-pad"
                autoCapitalize="none"
              />
            </View>
          </View>

          <SectionHeader title="Endereço" />
          <AddressFields
            cep={form.cep} street={form.street} neighborhood={form.neighborhood}
            city={form.city} state={form.state} number={form.addressNumber} complement={form.complement}
            onCepChange={v => setForm({ ...form, cep: v })}
            onNumberChange={v => setForm({ ...form, addressNumber: v })}
            onComplementChange={v => setForm({ ...form, complement: v })}
            loading={loadingCep}
          />

          <SectionHeader title="Contato" />
          <PhoneField
            label="Telefone"
            value={form.phone}
            onChange={v => setForm({ ...form, phone: v })}
            isWhatsapp={form.phoneIsWhatsapp}
            onToggleWhatsapp={() => setForm({ ...form, phoneIsWhatsapp: !form.phoneIsWhatsapp })}
          />
          <TF
            label="E-mail (opcional)"
            value={form.email}
            onChange={v => setForm({ ...form, email: v })}
            placeholder="email@exemplo.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </>
      )}

      {isMinor && (
        <>
          <SectionHeader title="Dados do Responsável" />
          <View style={modalStyles.fieldRow}>
            <View style={[{ flex: 2 }]}>
              <TF label="Nome do Responsável *" value={form.guardianName} onChange={v => setForm({ ...form, guardianName: v })} placeholder="Nome completo" />
            </View>
            <View style={[{ flex: 1 }]}>
              <NativeDateInput
                label="Data de Nascimento"
                value={form.guardianBirthDate}
                onChange={v => setForm({ ...form, guardianBirthDate: v })}
                max={today}
              />
            </View>
          </View>

          <View style={modalStyles.fieldRow}>
            <View style={modalStyles.fieldHalf}>
              <TF
                label={`CPF${guardianCpfError ? ` — ${guardianCpfError}` : ''}`}
                value={form.guardianCpf}
                onChange={v => { setForm({ ...form, guardianCpf: maskCPF(v) }); setGuardianCpfError(''); }}
                placeholder="000.000.000-00"
                keyboardType="number-pad"
                autoCapitalize="none"
              />
            </View>
          </View>

          <SectionHeader title="Endereço do Responsável" />
          <AddressFields
            cep={form.guardianCep} street={form.guardianStreet} neighborhood={form.guardianNeighborhood}
            city={form.guardianCity} state={form.guardianState} number={form.guardianNumber} complement={form.guardianComplement}
            onCepChange={v => setForm({ ...form, guardianCep: v })}
            onNumberChange={v => setForm({ ...form, guardianNumber: v })}
            onComplementChange={v => setForm({ ...form, guardianComplement: v })}
            loading={loadingGuardianCep}
          />

          <SectionHeader title="Contato do Responsável" />
          <PhoneField
            label="Telefone"
            value={form.guardianPhone}
            onChange={v => setForm({ ...form, guardianPhone: v })}
            isWhatsapp={form.guardianPhoneIsWhatsapp}
            onToggleWhatsapp={() => setForm({ ...form, guardianPhoneIsWhatsapp: !form.guardianPhoneIsWhatsapp })}
          />
          <TF
            label="E-mail (opcional)"
            value={form.guardianEmail}
            onChange={v => setForm({ ...form, guardianEmail: v })}
            placeholder="email@exemplo.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </>
      )}

      <SectionHeader title="Notificações de Agendamento" />
      <TouchableOpacity
        style={modalStyles.notifRow}
        onPress={() => setForm({ ...form, notificationsEnabled: !form.notificationsEnabled })}
        activeOpacity={0.8}
      >
        <Text style={modalStyles.notifLabel}>Desejo receber notificações</Text>
        <View style={[modalStyles.toggle, form.notificationsEnabled && modalStyles.toggleOn]}>
          <View style={[modalStyles.toggleThumb, form.notificationsEnabled && modalStyles.toggleThumbOn]} />
        </View>
      </TouchableOpacity>

      {/* Seleção de canal comentada — por enquanto notificações são sempre por e-mail
      {form.notificationsEnabled && (
        <View style={modalStyles.channelRow}>
          <TouchableOpacity
            style={[modalStyles.channelBtn, form.notificationChannel === 'email' && modalStyles.channelBtnActive]}
            onPress={() => setForm({ ...form, notificationChannel: 'email' })}
            activeOpacity={0.8}
          >
            <Text style={[modalStyles.channelBtnText, form.notificationChannel === 'email' && modalStyles.channelBtnTextActive]}>
              E-mail
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[modalStyles.channelBtn, form.notificationChannel === 'whatsapp' && modalStyles.channelBtnActive]}
            onPress={() => setForm({ ...form, notificationChannel: 'whatsapp' })}
            activeOpacity={0.8}
          >
            <Text style={[modalStyles.channelBtnText, form.notificationChannel === 'whatsapp' && modalStyles.channelBtnTextActive]}>
              WhatsApp
            </Text>
          </TouchableOpacity>
        </View>
      )}
      */}

      {error ? <Text style={modalStyles.errorText}>{error}</Text> : null}
      {saved ? <Text style={detailStyles.savedText}>Alterações salvas com sucesso.</Text> : null}

      <View style={detailStyles.saveRow}>
        <TouchableOpacity style={detailStyles.btnSave} onPress={handleSave} disabled={submitting} activeOpacity={0.85}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={detailStyles.btnSaveText}>Salvar Alterações</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ── Aba Observações ───────────────────────────────────────────────────────────


function TabNotes({ client }: { client: Client }) {
  // ── Observações ──
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [observations, setObservations] = useState<ObservationRecord[]>([]);
  const [loadingObs, setLoadingObs] = useState(true);
  const [newText, setNewText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingObsId, setDeletingObsId] = useState<string | null>(null);
  const [editingObsId, setEditingObsId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [savingEditId, setSavingEditId] = useState<string | null>(null);
  const [pendingObsFiles, setPendingObsFiles] = useState<File[]>([]);
  const obsFileRef = useRef<HTMLInputElement>(null);


  const fetchObservations = useCallback(async () => {
    setLoadingObs(true);
    const token = await getToken();
    const res = await fetch(`${API_URL}/clients/${client.id}/observations`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setObservations(await res.json());
    setLoadingObs(false);
  }, [client.id]);

  useEffect(() => { fetchObservations(); }, [fetchObservations]);

  // ── Handlers observações ──

  const handleAdd = async () => {
    const hasContent = newText.trim() || pendingObsFiles.length > 0;
    if (!hasContent) return;
    setSubmitting(true);
    const token = await getToken();
    const res = await fetch(`${API_URL}/clients/${client.id}/observations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ content: newText.trim() }),
    });
    if (!res.ok) { setSubmitting(false); return; }
    const obs = await res.json();
    if (pendingObsFiles.length > 0) {
      for (const file of pendingObsFiles) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('observation_id', obs.id);
        await fetch(`${API_URL}/clients/${client.id}/documents/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
      }
      setPendingObsFiles([]);
      if (obsFileRef.current) obsFileRef.current.value = '';
    }
    setSubmitting(false);
    setNewText('');
    fetchObservations();
  };

  const handleDeleteObs = async (obs: ObservationRecord) => {
    if (!await confirm({ title: 'Excluir observação', message: 'Tem certeza que deseja excluir esta observação? Esta ação não pode ser desfeita.', confirmLabel: 'Excluir', danger: true })) return;
    setDeletingObsId(obs.id);
    const token = await getToken();
    if (obs.source === 'appointment') {
      await fetch(`${API_URL}/appointments/${obs.id}/notes`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    } else {
      await fetch(`${API_URL}/clients/${client.id}/observations/${obs.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    }
    setDeletingObsId(null);
    fetchObservations();
  };

  const handleSaveEdit = async (obs: ObservationRecord) => {
    if (!editText.trim()) return;
    setSavingEditId(obs.id);
    const token = await getToken();
    if (obs.source === 'appointment') {
      await fetch(`${API_URL}/appointments/${obs.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ notes: editText.trim() }),
      });
    } else {
      await fetch(`${API_URL}/clients/${client.id}/observations/${obs.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: editText.trim() }),
      });
    }
    setSavingEditId(null);
    setEditingObsId(null);
    fetchObservations();
  };


  return (
    <>
    {confirmDialog}
    <ScrollView showsVerticalScrollIndicator={false} style={detailStyles.tabContent}>

      {/* ── Seção: Observações ── */}
      <Text style={detailStyles.sectionDivider}>Observações</Text>

      {/* Nova observação */}
      <Text style={detailStyles.notesLabel}>Nova observação</Text>
      <textarea
        value={newText}
        onChange={(e: any) => setNewText(e.target.value)}
        placeholder="Registre alergias, procedimentos realizados, orientações passadas, observações gerais..."
        style={{
          width: '100%', boxSizing: 'border-box' as any,
          minHeight: 100, padding: '12px 14px',
          fontSize: 14, color: '#635857', lineHeight: '1.6',
          border: '1px solid #efeae8', borderRadius: 10,
          backgroundColor: '#fdfcfc', outline: 'none',
          fontFamily: 'inherit', resize: 'vertical' as any,
          marginBottom: 10,
        }}
      />
      {/* Anexar arquivo à observação */}
      <View style={detailStyles.attachRow}>
        <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 } as any}>
          <View style={detailStyles.attachBtn}>
            <Text style={detailStyles.attachBtnText}>📎 Anexar arquivo</Text>
          </View>
          <input
            ref={obsFileRef as any}
            type="file"
            accept="image/*,.pdf"
            multiple
            style={{ display: 'none' }}
            onChange={(e: any) => {
              const files = Array.from(e.target.files ?? []) as File[];
              if (files.length) setPendingObsFiles(prev => [...prev, ...files]);
              if (obsFileRef.current) obsFileRef.current.value = '';
            }}
          />
        </label>
      </View>
      {pendingObsFiles.length > 0 && (
        <View style={{ gap: 6, marginBottom: 8 }}>
          {pendingObsFiles.map((f, i) => (
            <View key={i} style={detailStyles.pendingFile}>
              <Text style={detailStyles.pendingFileName} numberOfLines={1}>{f.name}</Text>
              <TouchableOpacity onPress={() => setPendingObsFiles(prev => prev.filter((_, j) => j !== i))} activeOpacity={0.7}>
                <Text style={detailStyles.pendingFileRemove}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
      <View style={detailStyles.saveRow}>
        <TouchableOpacity
          style={[detailStyles.btnSave, (!newText.trim() && pendingObsFiles.length === 0) && { opacity: 0.45 }]}
          onPress={handleAdd}
          disabled={submitting || (!newText.trim() && pendingObsFiles.length === 0)}
          activeOpacity={0.85}
        >
          {submitting
            ? <ActivityIndicator color="#fff" />
            : <Text style={detailStyles.btnSaveText}>+ Adicionar</Text>}
        </TouchableOpacity>
      </View>

      {/* Histórico de observações */}
      {loadingObs ? (
        <View style={{ paddingTop: 20, alignItems: 'center' }}>
          <ActivityIndicator color="#8e7f7e" />
        </View>
      ) : observations.length === 0 ? (
        <Text style={detailStyles.emptyHint}>Nenhuma observação registrada ainda.</Text>
      ) : (
        observations.map(obs => {
          const isAppt = obs.source === 'appointment';
          return (
            <View key={obs.id + obs.source} style={detailStyles.obsCard}>
              <View style={detailStyles.obsHeader}>
                <View style={[detailStyles.obsBadge, isAppt ? detailStyles.obsBadgeAppt : detailStyles.obsBadgeManual]}>
                  <Text style={[detailStyles.obsBadgeText, isAppt ? detailStyles.obsBadgeApptText : detailStyles.obsBadgeManualText]}>
                    {isAppt ? `Agendamento${obs.source_label ? ` · ${obs.source_label}` : ''}` : 'Manual'}
                  </Text>
                </View>
                <Text style={detailStyles.obsDate}>{formatDateTimePt(obs.created_at)}</Text>
                <View style={{ flexDirection: 'row', gap: 4, marginLeft: 'auto' } as any}>
                    {editingObsId !== obs.id && (
                      <TouchableOpacity
                        onPress={() => { setEditingObsId(obs.id); setEditText(obs.content); }}
                        activeOpacity={0.7}
                        style={detailStyles.obsEditBtn}
                      >
                        <Text style={detailStyles.obsEditText}>✎</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      onPress={() => handleDeleteObs(obs)}
                      disabled={deletingObsId === obs.id}
                      activeOpacity={0.7}
                      style={detailStyles.obsDeleteBtn}
                    >
                      <Text style={detailStyles.obsDeleteText}>{deletingObsId === obs.id ? '...' : '×'}</Text>
                    </TouchableOpacity>
                  </View>
              </View>
              {editingObsId === obs.id ? (
                <>
                  <textarea
                    value={editText}
                    onChange={(e: any) => setEditText(e.target.value)}
                    style={{
                      width: '100%', boxSizing: 'border-box' as any,
                      minHeight: 80, padding: '10px 12px', marginTop: 8,
                      fontSize: 14, color: '#635857', lineHeight: '1.6',
                      border: '1px solid #c9b8b7', borderRadius: 8,
                      backgroundColor: '#fdfcfc', outline: 'none',
                      fontFamily: 'inherit', resize: 'vertical' as any,
                    }}
                    autoFocus
                  />
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                    <TouchableOpacity
                      style={[detailStyles.btnSave, { paddingVertical: 6, paddingHorizontal: 16 } as any, savingEditId === obs.id && { opacity: 0.6 }]}
                      onPress={() => handleSaveEdit(obs)}
                      disabled={savingEditId === obs.id}
                      activeOpacity={0.85}
                    >
                      <Text style={detailStyles.btnSaveText}>{savingEditId === obs.id ? '...' : 'Salvar'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[detailStyles.btnSave, { paddingVertical: 6, paddingHorizontal: 16, backgroundColor: '#f0ebe9' } as any]}
                      onPress={() => setEditingObsId(null)}
                      activeOpacity={0.85}
                    >
                      <Text style={[detailStyles.btnSaveText, { color: '#8e7f7e' }]}>Cancelar</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <Text style={detailStyles.obsContent}>{obs.content}</Text>
              )}
              {obs.documents && obs.documents.length > 0 && (
                <View style={{ marginTop: 4 }}>
                  {obs.documents.map(doc => (
                    <TouchableOpacity
                      key={doc.id}
                      style={detailStyles.obsDocRow}
                      activeOpacity={0.7}
                      onPress={async () => {
                        const token = await getToken();
                        const res = await fetch(`${API_URL}/clients/${client.id}/documents/${doc.id}/url`, {
                          headers: { Authorization: `Bearer ${token}` },
                        });
                        if (res.ok) {
                          const { signed_url } = await res.json();
                          (window as any).open(signed_url, '_blank');
                        }
                      }}
                    >
                      <Text>
                        {doc.file_type?.startsWith('image/') ? '🖼️' : doc.file_type === 'application/pdf' ? '📄' : '📎'}
                      </Text>
                      <Text style={detailStyles.obsDocName} numberOfLines={1}>{doc.file_name}</Text>
                      <Text style={detailStyles.obsDocOpen}>Abrir</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          );
        })
      )}
    </ScrollView>
    </>
  );
}

// ── Aba Agendamentos ──────────────────────────────────────────────────────────

function TabAppointments({
  client,
  refreshKey,
  onSelect,
}: {
  client: Client;
  refreshKey: number;
  onSelect: (a: AppointmentRecord) => void;
}) {
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const token = await getToken();
      const res = await fetch(`${API_URL}/clients/${client.id}/appointments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setAppointments(await res.json());
      setLoading(false);
    })();
  }, [client.id, refreshKey]);

  if (loading) {
    return (
      <View style={[detailStyles.tabContent, { justifyContent: 'center', alignItems: 'center', paddingTop: 60 }]}>
        <ActivityIndicator color="#8e7f7e" />
      </View>
    );
  }

  const now = new Date();
  const upcoming = appointments.filter(a => new Date(a.starts_at) >= now && ['scheduled', 'confirmed'].includes(a.status));
  const past = appointments.filter(a => !upcoming.includes(a));

  const renderAppt = (a: AppointmentRecord) => {
    const sc = STATUS_COLOR[a.status] ?? { bg: '#f5f5f5', text: '#9e9e9e' };
    const proColor = a.professional?.color ?? '#8e7f7e';
    return (
      <TouchableOpacity key={a.id} style={detailStyles.apptCard} onPress={() => onSelect(a)} activeOpacity={0.8}>
        <View style={[detailStyles.apptProDot, { backgroundColor: proColor }]} />
        <View style={detailStyles.apptInfo}>
          <Text style={detailStyles.apptDate}>{formatDateTimePt(a.starts_at)}</Text>
          {a.professional && <Text style={detailStyles.apptPro}>{a.professional.name}</Text>}
          {a.notes ? <Text style={detailStyles.apptNotes}>{a.notes}</Text> : null}
        </View>
        <View style={[detailStyles.apptBadge, { backgroundColor: sc.bg }]}>
          <Text style={[detailStyles.apptBadgeText, { color: sc.text }]}>{STATUS_LABEL[a.status] ?? a.status}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} style={detailStyles.tabContent}>
      {appointments.length === 0 ? (
        <View style={{ paddingTop: 60, alignItems: 'center' }}>
          <Text style={{ fontSize: 14, color: '#c2b4b2' }}>Nenhum agendamento encontrado para este cliente.</Text>
        </View>
      ) : (
        <>
          {upcoming.length > 0 && (
            <>
              <Text style={detailStyles.sectionDivider}>Próximos</Text>
              {upcoming.map(renderAppt)}
            </>
          )}
          {past.length > 0 && (
            <>
              <Text style={detailStyles.sectionDivider}>Histórico</Text>
              {past.map(renderAppt)}
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

// ── Tela principal ────────────────────────────────────────────────────────────

export default function ClientsScreen() {
  useResponsiveWeb();
  const { isMobile, openDrawer } = useDrawerNav();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  // Detail view state
  const [viewingClient, setViewingClient] = useState<Client | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>('details');

  // New client form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ClientForm>(EMPTY_FORM);
  const [loadingCep, setLoadingCep] = useState(false);
  const [loadingGuardianCep, setLoadingGuardianCep] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cpfError, setCpfError] = useState('');
  const [guardianCpfError, setGuardianCpfError] = useState('');
  const [error, setError] = useState('');

  // Booking modal
  const [professionals, setProfessionals] = useState<ProfessionalOption[]>([]);
  const booking = useBookingModal();

  // Appointment detail modal (from client tab)
  const apptDetail = useAppointmentDetailModal<AppointmentRecord>();
  const [apptRefreshKey, setApptRefreshKey] = useState(0);

  const isMinor = isMinorAge(form.birthDate);

  // ── CEP auto-complete ──────────────────────────────────────────────────────

  useEffect(() => {
    const cleaned = form.cep.replace(/\D/g, '');
    if (cleaned.length !== 8) return;
    setLoadingCep(true);
    fetchCep(cleaned).then(data => {
      setLoadingCep(false);
      if (data) setForm(f => ({ ...f, street: data.logradouro, neighborhood: data.bairro, city: data.localidade, state: data.uf }));
    });
  }, [form.cep]);

  useEffect(() => {
    const cleaned = form.guardianCep.replace(/\D/g, '');
    if (cleaned.length !== 8) return;
    setLoadingGuardianCep(true);
    fetchCep(cleaned).then(data => {
      setLoadingGuardianCep(false);
      if (data) setForm(f => ({ ...f, guardianStreet: data.logradouro, guardianNeighborhood: data.bairro, guardianCity: data.localidade, guardianState: data.uf }));
    });
  }, [form.guardianCep]);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchClients = useCallback(async () => {
    setLoading(true);
    const token = await getToken();
    const res = await fetch(`${API_URL}/clients/`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setClients(await res.json());
    setLoading(false);
  }, []);

  const fetchProfessionals = useCallback(async () => {
    const token = await getToken();
    const res = await fetch(`${API_URL}/professionals/`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setProfessionals(await res.json());
  }, []);

  useFocusEffect(useCallback(() => {
    setViewingClient(null);
    fetchClients();
    fetchProfessionals();
  }, [fetchClients, fetchProfessionals]));

  const openBooking = (client: any) => booking.open(client);

  // ── Novo cliente ───────────────────────────────────────────────────────────

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setCpfError(''); setGuardianCpfError(''); setError('');
    setShowForm(true);
  };

  const validate = (): boolean => {
    if (!form.name.trim()) { setError('Nome é obrigatório.'); return false; }
    if (!form.birthDate) { setError('Data de nascimento é obrigatória.'); return false; }
    if (!isMinor) {
      if (form.cpf && !validateCPF(form.cpf)) { setCpfError('CPF inválido.'); return false; }
    } else {
      if (!form.guardianName.trim()) { setError('Nome do responsável é obrigatório.'); return false; }
      if (form.guardianCpf && !validateCPF(form.guardianCpf)) { setGuardianCpfError('CPF do responsável inválido.'); return false; }
    }
    return true;
  };

  const handleSave = async () => {
    setCpfError(''); setGuardianCpfError(''); setError('');
    if (!validate()) return;
    setSubmitting(true);
    const token = await getToken();
    const payload: any = {
      name: form.name.trim(),
      birth_date: form.birthDate,
      is_minor: isMinor,
      notifications_enabled: form.notificationsEnabled,
      notification_channel: form.notificationsEnabled ? form.notificationChannel : null,
    };
    if (!isMinor) {
      if (form.cpf)           payload.cpf = form.cpf;
      if (form.cep)           payload.cep = form.cep;
      if (form.street)        payload.street = form.street;
      if (form.neighborhood)  payload.neighborhood = form.neighborhood;
      if (form.city)          payload.city = form.city;
      if (form.state)         payload.state = form.state;
      if (form.addressNumber) payload.address_number = form.addressNumber;
      if (form.complement)    payload.complement = form.complement;
      if (form.phone)         payload.phone = form.phone;
      payload.phone_is_whatsapp = form.phoneIsWhatsapp;
      if (form.email)         payload.email = form.email;
    } else {
      if (form.guardianName)         payload.guardian_name = form.guardianName.trim();
      if (form.guardianBirthDate)    payload.guardian_birth_date = form.guardianBirthDate;
      if (form.guardianCpf)          payload.guardian_cpf = form.guardianCpf;
      if (form.guardianCep)          payload.guardian_cep = form.guardianCep;
      if (form.guardianStreet)       payload.guardian_street = form.guardianStreet;
      if (form.guardianNeighborhood) payload.guardian_neighborhood = form.guardianNeighborhood;
      if (form.guardianCity)         payload.guardian_city = form.guardianCity;
      if (form.guardianState)        payload.guardian_state = form.guardianState;
      if (form.guardianNumber)       payload.guardian_number = form.guardianNumber;
      if (form.guardianComplement)   payload.guardian_complement = form.guardianComplement;
      if (form.guardianPhone)        payload.guardian_phone = form.guardianPhone;
      payload.guardian_phone_is_whatsapp = form.guardianPhoneIsWhatsapp;
      if (form.guardianEmail)        payload.guardian_email = form.guardianEmail;
    }
    const res = await fetch(`${API_URL}/clients/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(data.detail || 'Erro ao salvar cliente.'); return; }
    setShowForm(false);
    fetchClients();
  };

  const handleDelete = async (id: string) => {
    if (!await confirm({ title: 'Excluir cliente', message: 'Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.', confirmLabel: 'Excluir', danger: true })) return;
    const token = await getToken();
    await fetch(`${API_URL}/clients/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (viewingClient?.id === id) setViewingClient(null);
    fetchClients();
  };

  const today = new Date().toISOString().split('T')[0];

  // ── Detail page ────────────────────────────────────────────────────────────

  if (viewingClient) {
    const c = viewingClient;
    const bgColor = getAvatarColor(c.name);
    const initials = getInitials(c.name);

    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={detailStyles.header}>
          <TouchableOpacity style={detailStyles.backBtn} onPress={() => setViewingClient(null)} activeOpacity={0.7}>
            <Text style={detailStyles.backBtnText}>← Clientes</Text>
          </TouchableOpacity>

          <View style={detailStyles.headerClient}>
            <View style={[detailStyles.headerAvatar, { backgroundColor: bgColor }]}>
              <Text style={detailStyles.headerAvatarText}>{initials}</Text>
            </View>
            <View>
              <Text style={detailStyles.headerName}>{c.name}</Text>
              <Text style={detailStyles.headerMeta}>
                {calcAge(c.birth_date)} anos{c.is_minor ? ' · Menor de idade' : ''}
              </Text>
              {c.is_provisional && (
                <View style={detailStyles.provisionalBanner}>
                  <Text style={detailStyles.provisionalBannerText}>⚠️ Cadastro provisório — complete os dados do cliente</Text>
                </View>
              )}
            </View>
          </View>

          <View style={detailStyles.headerActions}>
            <TouchableOpacity
              style={detailStyles.btnHeaderBook}
              onPress={() => openBooking(c)}
              activeOpacity={0.8}
            >
              <Text style={detailStyles.btnHeaderBookText}>📅 Agendar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={detailStyles.btnHeaderDelete}
              onPress={() => handleDelete(c.id)}
              activeOpacity={0.8}
            >
              <Text style={detailStyles.btnHeaderDeleteText}>Excluir</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tabs */}
        <View style={detailStyles.tabs}>
          {(['details', 'notes', 'appointments'] as DetailTab[]).map(tab => {
            const labels: Record<DetailTab, string> = {
              details: 'Detalhes',
              notes: 'Observações',
              appointments: 'Agendamentos',
            };
            return (
              <TouchableOpacity
                key={tab}
                style={[detailStyles.tab, activeTab === tab && detailStyles.tabActive]}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.7}
              >
                <Text style={[detailStyles.tabText, activeTab === tab && detailStyles.tabTextActive]}>
                  {labels[tab]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Tab content */}
        <View style={detailStyles.tabBody}>
          {activeTab === 'details' && (
            <TabDetails
              client={c}
              onSaved={updated => {
                setViewingClient(updated);
                setClients(prev => prev.map(x => x.id === updated.id ? updated : x));
              }}
            />
          )}
          {activeTab === 'notes' && (
            <TabNotes client={c} />
          )}
          {activeTab === 'appointments' && (
            <TabAppointments
              client={c}
              refreshKey={apptRefreshKey}
              onSelect={(a) => apptDetail.open(a)}
            />
          )}
        </View>

        <BookingModal
          visible={booking.visible}
          onClose={booking.close}
          preselectedClient={booking.preselectedClient}
          professionals={professionals}
        />

        <AppointmentDetailModal
          visible={apptDetail.visible}
          onClose={apptDetail.close}
          appointment={apptDetail.appointment}
          onUpdateStatus={async (id, newStatus) => {
            await patchAppointmentStatus(id, newStatus);
            apptDetail.close();
            setApptRefreshKey(k => k + 1);
          }}
          onUpdate={(updated) => {
            apptDetail.open(updated);
            setApptRefreshKey(k => k + 1);
          }}
        />

        {confirmDialog}

      </View>
    );
  }

  // ── Lista ──────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {isMobile && (
            <TouchableOpacity onPress={openDrawer} style={{ marginRight: 14, padding: 4 }}>
              <Text style={{ fontSize: 22, color: '#8e7f7e', lineHeight: 22 }}>☰</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.topBarTitle}>Clientes</Text>
        </View>
        <TouchableOpacity style={styles.btnNew} onPress={openCreate} activeOpacity={0.8}>
          <Text style={styles.btnNewText}>+ Novo Cliente</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <View style={styles.emptyState}><ActivityIndicator color="#8e7f7e" /></View>
        ) : clients.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Nenhum cliente cadastrado ainda.</Text>
          </View>
        ) : (
          clients.map(c => (
            <ClientCard
              key={c.id}
              client={c}
              onView={() => { setViewingClient(c); setActiveTab('details'); }}
              onEdit={() => { setViewingClient(c); setActiveTab('details'); }}
              onDelete={() => handleDelete(c.id)}
              onBook={() => openBooking(c)}
            />
          ))
        )}
      </ScrollView>

      {/* ── Modal: Novo cliente ── */}
      <Modal visible={showForm} transparent animationType="fade" onRequestClose={() => setShowForm(false)}>
        <View style={modalStyles.overlay}>
          <View {...{ dataSet: { modal: 'true' } } as any} style={modalStyles.content}>
            <View style={modalStyles.header}>
              <Text style={modalStyles.title}>Novo Cliente</Text>
              <TouchableOpacity style={modalStyles.closeButton} onPress={() => setShowForm(false)}>
                <Text style={modalStyles.closeText}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <SectionHeader title="Dados do Cliente" />
              <View style={modalStyles.fieldRow}>
                <View style={[{ flex: 2 }]}>
                  <TF label="Nome Completo *" value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="Nome do cliente" />
                </View>
                <View style={[{ flex: 1 }]}>
                  <NativeDateInput label="Data de Nascimento *" value={form.birthDate} onChange={v => setForm({ ...form, birthDate: v })} max={today} />
                </View>
              </View>

              {form.birthDate && (
                <View style={[modalStyles.minorNote, { backgroundColor: isMinor ? '#e3f2fd' : '#e8f5e9' }]}>
                  <Text style={[modalStyles.minorNoteText, { color: isMinor ? '#1565c0' : '#2e7d32' }]}>
                    {isMinor
                      ? `Menor de idade (${calcAge(form.birthDate)} anos) — preencha os dados do responsável`
                      : `Maior de idade (${calcAge(form.birthDate)} anos)`}
                  </Text>
                </View>
              )}

              {!isMinor && (
                <>
                  <SectionHeader title="Identificação" />
                  <View style={modalStyles.fieldRow}>
                    <View style={modalStyles.fieldHalf}>
                      <TF
                        label={`CPF${cpfError ? ` — ${cpfError}` : ''}`}
                        value={form.cpf}
                        onChange={v => { setForm({ ...form, cpf: maskCPF(v) }); setCpfError(''); }}
                        placeholder="000.000.000-00"
                        keyboardType="number-pad"
                        autoCapitalize="none"
                      />
                    </View>
                  </View>
                  <SectionHeader title="Endereço" />
                  <AddressFields
                    cep={form.cep} street={form.street} neighborhood={form.neighborhood}
                    city={form.city} state={form.state} number={form.addressNumber} complement={form.complement}
                    onCepChange={v => setForm({ ...form, cep: v })}
                    onNumberChange={v => setForm({ ...form, addressNumber: v })}
                    onComplementChange={v => setForm({ ...form, complement: v })}
                    loading={loadingCep}
                  />
                  <SectionHeader title="Contato" />
                  <PhoneField label="Telefone" value={form.phone} onChange={v => setForm({ ...form, phone: v })} isWhatsapp={form.phoneIsWhatsapp} onToggleWhatsapp={() => setForm({ ...form, phoneIsWhatsapp: !form.phoneIsWhatsapp })} />
                  <TF label="E-mail (opcional)" value={form.email} onChange={v => setForm({ ...form, email: v })} placeholder="email@exemplo.com" keyboardType="email-address" autoCapitalize="none" />
                </>
              )}

              {isMinor && (
                <>
                  <SectionHeader title="Dados do Responsável" />
                  <View style={modalStyles.fieldRow}>
                    <View style={[{ flex: 2 }]}>
                      <TF label="Nome do Responsável *" value={form.guardianName} onChange={v => setForm({ ...form, guardianName: v })} placeholder="Nome completo" />
                    </View>
                    <View style={[{ flex: 1 }]}>
                      <NativeDateInput label="Data de Nascimento" value={form.guardianBirthDate} onChange={v => setForm({ ...form, guardianBirthDate: v })} max={today} />
                    </View>
                  </View>
                  <View style={modalStyles.fieldRow}>
                    <View style={modalStyles.fieldHalf}>
                      <TF
                        label={`CPF${guardianCpfError ? ` — ${guardianCpfError}` : ''}`}
                        value={form.guardianCpf}
                        onChange={v => { setForm({ ...form, guardianCpf: maskCPF(v) }); setGuardianCpfError(''); }}
                        placeholder="000.000.000-00"
                        keyboardType="number-pad"
                        autoCapitalize="none"
                      />
                    </View>
                  </View>
                  <SectionHeader title="Endereço do Responsável" />
                  <AddressFields
                    cep={form.guardianCep} street={form.guardianStreet} neighborhood={form.guardianNeighborhood}
                    city={form.guardianCity} state={form.guardianState} number={form.guardianNumber} complement={form.guardianComplement}
                    onCepChange={v => setForm({ ...form, guardianCep: v })}
                    onNumberChange={v => setForm({ ...form, guardianNumber: v })}
                    onComplementChange={v => setForm({ ...form, guardianComplement: v })}
                    loading={loadingGuardianCep}
                  />
                  <SectionHeader title="Contato do Responsável" />
                  <PhoneField label="Telefone" value={form.guardianPhone} onChange={v => setForm({ ...form, guardianPhone: v })} isWhatsapp={form.guardianPhoneIsWhatsapp} onToggleWhatsapp={() => setForm({ ...form, guardianPhoneIsWhatsapp: !form.guardianPhoneIsWhatsapp })} />
                  <TF label="E-mail (opcional)" value={form.guardianEmail} onChange={v => setForm({ ...form, guardianEmail: v })} placeholder="email@exemplo.com" keyboardType="email-address" autoCapitalize="none" />
                </>
              )}

              <SectionHeader title="Notificações de Agendamento" />
              <TouchableOpacity style={modalStyles.notifRow} onPress={() => setForm({ ...form, notificationsEnabled: !form.notificationsEnabled })} activeOpacity={0.8}>
                <Text style={modalStyles.notifLabel}>Desejo receber notificações</Text>
                <View style={[modalStyles.toggle, form.notificationsEnabled && modalStyles.toggleOn]}>
                  <View style={[modalStyles.toggleThumb, form.notificationsEnabled && modalStyles.toggleThumbOn]} />
                </View>
              </TouchableOpacity>
              {/* Seleção de canal comentada — por enquanto notificações são sempre por e-mail
              {form.notificationsEnabled && (
                <View style={modalStyles.channelRow}>
                  <TouchableOpacity style={[modalStyles.channelBtn, form.notificationChannel === 'email' && modalStyles.channelBtnActive]} onPress={() => setForm({ ...form, notificationChannel: 'email' })} activeOpacity={0.8}>
                    <Text style={[modalStyles.channelBtnText, form.notificationChannel === 'email' && modalStyles.channelBtnTextActive]}>E-mail</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[modalStyles.channelBtn, form.notificationChannel === 'whatsapp' && modalStyles.channelBtnActive]} onPress={() => setForm({ ...form, notificationChannel: 'whatsapp' })} activeOpacity={0.8}>
                    <Text style={[modalStyles.channelBtnText, form.notificationChannel === 'whatsapp' && modalStyles.channelBtnTextActive]}>WhatsApp</Text>
                  </TouchableOpacity>
                </View>
              )}
              */}
            </ScrollView>

            {error ? <Text style={modalStyles.errorText}>{error}</Text> : null}

            <View style={modalStyles.footer}>
              <TouchableOpacity style={modalStyles.btnCancel} onPress={() => setShowForm(false)}>
                <Text style={modalStyles.btnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={modalStyles.btnSave} onPress={handleSave} disabled={submitting} activeOpacity={0.85}>
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={modalStyles.btnSaveText}>Salvar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <BookingModal
        visible={booking.visible}
        onClose={booking.close}
        preselectedClient={booking.preselectedClient}
        professionals={professionals}
      />

      <AppointmentDetailModal
        visible={apptDetail.visible}
        onClose={apptDetail.close}
        appointment={apptDetail.appointment}
        onUpdateStatus={async (id, newStatus) => {
          await patchAppointmentStatus(id, newStatus);
          apptDetail.close();
          setApptRefreshKey(k => k + 1);
        }}
        onUpdate={(updated) => {
          apptDetail.open(updated);
          setApptRefreshKey(k => k + 1);
        }}
      />

      {confirmDialog}
    </View>
  );
}
