import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Image,
} from 'react-native';
import { API_URL } from '../../lib/config';
import { useFocusEffect } from '@react-navigation/native';
import { styles, cardStyles, modalStyles } from './ProfessionalsScreen.web.styles';
import { useResponsiveWeb } from '../../lib/useResponsiveWeb';
import { useDrawerNav } from '../../lib/useDrawerNav';
import { useConfirm } from '../../hooks/useConfirm';
import { getToken, supabase } from '../../lib/supabase';
import { maskPhone, maskCPF } from '../../lib/masks';
import { getInitials, getAvatarColor } from '../../lib/avatar';
import { DaySchedule, TimeBlockItem, BlockForm, DAYS_LABELS, DEFAULT_DAY, EMPTY_SCHEDULE, EMPTY_BLOCK } from '../../lib/scheduleConstants';

// ── Tipos ────────────────────────────────────────────────────────────────────

interface Professional {
  id: string;
  name: string;
  email?: string;
  cpf?: string;
  phone?: string;
  specialties?: { id: string; name: string }[];
  photo_url?: string;
  color?: string;
  active: boolean;
  status?: string;
  default_duration_minutes: number;
  created_at: string;
}

interface AddForm {
  name: string;
  email: string;
  cpf: string;
  phone: string;
  specialty_ids: string[];
  photo_url: string;
  color: string;
  defaultDuration: string;
}

interface EditForm {
  name: string;
  email: string;
  cpf: string;
  phone: string;
  specialty_ids: string[];
  photo_url: string;
  color: string;
  defaultDuration: string;
  active: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

// ── Validações ────────────────────────────────────────────────────────────────

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 11;
}

function isValidCPF(cpf: string): boolean {
  const d = cpf.replace(/\D/g, '');
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  const calc = (s: string, len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += parseInt(s[i]) * (len + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(d, 9) === parseInt(d[9]) && calc(d, 10) === parseInt(d[10]);
}

const SUPABASE_URL = 'https://curulmrchgqrufzvipoy.supabase.co';

async function uploadPhoto(file: File): Promise<string | null> {
  const token = await getToken();
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `${Date.now()}.${ext}`;

  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/professionals/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': file.type,
      'x-upsert': 'true',
    },
    body: file,
  });

  if (!res.ok) {
    console.error('Upload failed:', await res.text());
    return null;
  }

  const { data } = supabase.storage.from('professionals').getPublicUrl(path);
  return data.publicUrl;
}

// ── Componente Card ──────────────────────────────────────────────────────────

interface CardProps {
  professional: Professional;
  onView: (p: Professional) => void;
  onEdit: (p: Professional) => void;
  onDelete: (id: string) => void;
  onSchedule: (p: Professional) => void;
  onResendInvite: (id: string) => void;
}

function ProfCard({ professional, onView, onEdit, onDelete, onSchedule, onResendInvite }: CardProps) {
  const initials = getInitials(professional.name);
  const bgColor = professional.color ?? getAvatarColor(professional.name);

  return (
    <View {...{ dataSet: { proCard: 'true' } } as any} style={cardStyles.card}>
      <TouchableOpacity onPress={() => onView(professional)} activeOpacity={0.75} style={cardStyles.cardBody}>
        {professional.photo_url ? (
          <Image source={{ uri: professional.photo_url }} style={cardStyles.avatarImage} />
        ) : (
          <View style={[cardStyles.avatar, { backgroundColor: bgColor }]}>
            <Text style={cardStyles.avatarText}>{initials}</Text>
          </View>
        )}

        <Text style={cardStyles.name}>{professional.name}</Text>
        {professional.color ? (
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: professional.color, alignSelf: 'center', marginBottom: 4 }} />
        ) : null}
        {(professional.specialties && professional.specialties.length > 0) ? (
          <Text style={cardStyles.specialty}>{professional.specialties.map(s => s.name).join(', ')}</Text>
        ) : null}
        {professional.phone ? (
          <Text style={cardStyles.phone}>{professional.phone}</Text>
        ) : null}

        <View style={[
          cardStyles.badge,
          professional.status === 'active' ? cardStyles.badgeActive
            : professional.status === 'inactive' ? cardStyles.badgeInactive
            : cardStyles.badgePending,
        ]}>
          <Text style={[
            cardStyles.badgeText,
            professional.status === 'active' ? cardStyles.badgeActiveText
              : professional.status === 'inactive' ? cardStyles.badgeInactiveText
              : cardStyles.badgePendingText,
          ]}>
            {professional.status === 'active' ? 'Ativo'
              : professional.status === 'inactive' ? 'Inativo'
              : 'Convidado'}
          </Text>
        </View>
      </TouchableOpacity>

      {professional.status === 'pending' && (
        <TouchableOpacity style={cardStyles.btnResend} onPress={() => onResendInvite(professional.id)} activeOpacity={0.7}>
          <Text style={cardStyles.btnResendText}>Reenviar convite</Text>
        </TouchableOpacity>
      )}

      <View style={cardStyles.actions}>
        <TouchableOpacity style={cardStyles.btnSchedule} onPress={() => onSchedule(professional)} activeOpacity={0.7}>
          <Text style={cardStyles.btnScheduleText}>Agenda</Text>
        </TouchableOpacity>
        <TouchableOpacity style={cardStyles.btnEdit} onPress={() => onEdit(professional)} activeOpacity={0.7}>
          <Text style={cardStyles.btnEditText}>Editar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={cardStyles.btnDelete} onPress={() => onDelete(professional.id)} activeOpacity={0.7}>
          <Text style={cardStyles.btnDeleteText}>Excluir</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Avatar picker (clicável no modal) ────────────────────────────────────────

interface AvatarPickerProps {
  photoUrl: string;
  name: string;
  onPick: (url: string) => void;
  uploading: boolean;
  onUploading: (v: boolean) => void;
}

function AvatarPicker({ photoUrl, name, onPick, uploading, onUploading }: AvatarPickerProps) {
  const initials = name ? getInitials(name) : '?';
  const bgColor = name ? getAvatarColor(name) : '#c2b4b2';

  const handlePress = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      onUploading(true);
      const url = await uploadPhoto(file);
      onUploading(false);
      if (url) onPick(url);
    };
    input.click();
  };

  return (
    <View style={modalStyles.avatarPickerWrapper}>
      <TouchableOpacity onPress={handlePress} style={modalStyles.avatarPickerButton} activeOpacity={0.8}>
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={modalStyles.avatarPickerImage} />
        ) : (
          <View style={[modalStyles.avatarPickerPlaceholder, { backgroundColor: bgColor }]}>
            <Text style={modalStyles.avatarPickerInitials}>{initials}</Text>
          </View>
        )}
        <View style={modalStyles.avatarPickerOverlay}>
          {uploading
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={modalStyles.avatarPickerOverlayText}>Alterar foto</Text>
          }
        </View>
      </TouchableOpacity>
      <Text style={modalStyles.avatarPickerHint}>Clique para selecionar uma foto</Text>
    </View>
  );
}

// ── Color picker ─────────────────────────────────────────────────────────────

const PRO_COLORS = [
  '#5B8DB8', '#6AAB6A', '#C4804A', '#9B6DB5', '#C45A5A',
  '#4AABAB', '#D4B44A', '#C46A8E', '#8A7A6A', '#5A8A6A',
];

function ColorPicker({ selected, onSelect }: { selected: string; onSelect: (c: string) => void }) {
  return (
    <View style={modalStyles.field}>
      <Text style={modalStyles.fieldLabel}>Cor de identificação</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 }}>
        {PRO_COLORS.map(c => (
          <TouchableOpacity
            key={c}
            onPress={() => onSelect(selected === c ? '' : c)}
            activeOpacity={0.8}
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: c,
              borderWidth: selected === c ? 3 : 1.5,
              borderColor: selected === c ? '#3a3a3a' : 'rgba(0,0,0,0.15)',
            }}
          />
        ))}
      </View>
    </View>
  );
}

// ── Campo de formulário ───────────────────────────────────────────────────────

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words';
}

function ModalField({ label, value, onChangeText, placeholder, keyboardType = 'default', autoCapitalize = 'words' }: FieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={modalStyles.field}>
      <Text style={modalStyles.fieldLabel}>{label}</Text>
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
    </View>
  );
}

function SpecialtyMultiSelect({ value, onChange, specialties }: {
  value: string[];
  onChange: (ids: string[]) => void;
  specialties: { id: string; name: string }[];
}) {
  const toggle = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter(v => v !== id));
    } else {
      onChange([...value, id]);
    }
  };
  return (
    <View style={modalStyles.field}>
      <Text style={modalStyles.fieldLabel}>Especialidades</Text>
      {specialties.length === 0 ? (
        <Text style={{ fontSize: 13, color: '#c2b4b2', marginTop: 4 }}>Nenhuma especialidade cadastrada.</Text>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
          {specialties.map(s => {
            const selected = value.includes(s.id);
            return (
              <TouchableOpacity
                key={s.id}
                onPress={() => toggle(s.id)}
                activeOpacity={0.7}
                style={{
                  paddingHorizontal: 12, paddingVertical: 6,
                  borderRadius: 20, borderWidth: 1,
                  borderColor: selected ? '#8e7f7e' : '#efeae8',
                  backgroundColor: selected ? '#8e7f7e' : '#fdfcfc',
                }}
              >
                <Text style={{ fontSize: 13, color: selected ? '#fff' : '#a08c8b' }}>{s.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

// ── Tela principal ────────────────────────────────────────────────────────────

const EMPTY_ADD: AddForm = { name: '', email: '', cpf: '', phone: '', specialty_ids: [], photo_url: '', color: '', defaultDuration: '60' };
const EMPTY_EDIT: EditForm = { name: '', email: '', cpf: '', phone: '', specialty_ids: [], photo_url: '', color: '', defaultDuration: '60', active: true };

export default function ProfessionalsScreen() {
  useResponsiveWeb();
  const { isMobile, openDrawer } = useDrawerNav();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);

  const [specialties, setSpecialties] = useState<{ id: string; name: string }[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedPro, setSelectedPro] = useState<Professional | null>(null);

  const [addForm, setAddForm] = useState<AddForm>(EMPTY_ADD);
  const [editForm, setEditForm] = useState<EditForm>(EMPTY_EDIT);

  const [submitting, setSubmitting] = useState(false);
  const [uploadingAdd, setUploadingAdd] = useState(false);
  const [uploadingEdit, setUploadingEdit] = useState(false);
  const [error, setError] = useState('');

  // ── Detalhe ─────────────────────────────────────────────────────────────────
  const [detailWorkDays, setDetailWorkDays] = useState<number[]>([]);

  // ── Agenda ─────────────────────────────────────────────────────────────────
  const [showSchedule, setShowSchedule] = useState(false);
  const [schedulePro, setSchedulePro] = useState<Professional | null>(null);
  const [schedule, setSchedule] = useState<DaySchedule[]>(EMPTY_SCHEDULE);
  const [timeBlocks, setTimeBlocks] = useState<TimeBlockItem[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleError, setScheduleError] = useState('');
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [blockForm, setBlockForm] = useState<BlockForm>(EMPTY_BLOCK);
  const [blockSaving, setBlockSaving] = useState(false);

  // ── Buscar profissionais ──────────────────────────────────────────────────

  const fetchProfessionals = useCallback(async () => {
    setLoading(true);
    const token = await getToken();
    const res = await fetch(`${API_URL}/professionals/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setProfessionals(await res.json());
    setLoading(false);
  }, []);

  const fetchSpecialties = useCallback(async () => {
    const token = await getToken();
    const res = await fetch(`${API_URL}/specialties/`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setSpecialties(await res.json());
  }, []);

  useFocusEffect(useCallback(() => { fetchProfessionals(); fetchSpecialties(); }, [fetchProfessionals, fetchSpecialties]));

  // ── Realtime: atualiza status do profissional ao vivo ─��───────────────────
  useEffect(() => {
    const channel = supabase
      .channel('professional-status-watch')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'professional' }, (payload: any) => {
        setProfessionals(prev =>
          prev.map(p => p.id === payload.new.id ? { ...p, active: payload.new.active, status: payload.new.status } : p)
        );
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Abrir modal de edição ─────────────────────────────────────────────────

  const openDetail = async (pro: Professional) => {
    setSelectedPro(pro);
    setDetailWorkDays([]);
    setShowDetail(true);
    const token = await getToken();
    const res = await fetch(`${API_URL}/professionals/${pro.id}/availability`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const slots: { day_of_week: number }[] = await res.json();
      setDetailWorkDays(slots.map(s => s.day_of_week).sort((a, b) => a - b));
    }
  };

  const openEdit = (pro: Professional) => {
    setSelectedPro(pro);
    setEditForm({ name: pro.name, email: pro.email ?? '', cpf: pro.cpf ?? '', phone: pro.phone ?? '', specialty_ids: pro.specialties?.map(s => s.id) ?? [], photo_url: pro.photo_url ?? '', color: pro.color ?? '', defaultDuration: String(pro.default_duration_minutes ?? 60), active: pro.active });
    setError('');
    setShowEdit(true);
  };

  // ── Agenda ────────────────────────────────────────────────────────────────

  const openSchedule = async (pro: Professional) => {
    setSchedulePro(pro);
    setScheduleError('');
    setShowBlockForm(false);
    setBlockForm(EMPTY_BLOCK);
    setShowSchedule(true);
    setScheduleLoading(true);

    const token = await getToken();
    const [avRes, tbRes] = await Promise.all([
      fetch(`${API_URL}/professionals/${pro.id}/availability`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_URL}/professionals/${pro.id}/time-blocks`, { headers: { Authorization: `Bearer ${token}` } }),
    ]);

    const newSchedule = EMPTY_SCHEDULE.map(d => ({ ...d }));
    if (avRes.ok) {
      const slots: { day_of_week: number; start_time: string; end_time: string }[] = await avRes.json();
      slots.forEach(s => {
        newSchedule[s.day_of_week] = {
          enabled: true,
          start: s.start_time.slice(0, 5),
          end: s.end_time.slice(0, 5),
        };
      });
    }
    setSchedule(newSchedule);
    if (tbRes.ok) setTimeBlocks(await tbRes.json());
    setScheduleLoading(false);
  };

  const handleSaveSchedule = async () => {
    if (!schedulePro) return;
    setScheduleSaving(true);
    setScheduleError('');
    const token = await getToken();
    const slots = schedule
      .map((d, i) => d.enabled ? { day_of_week: i, start_time: d.start, end_time: d.end } : null)
      .filter(Boolean);

    const res = await fetch(`${API_URL}/professionals/${schedulePro.id}/availability`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ slots }),
    });
    setScheduleSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setScheduleError(d.detail || 'Erro ao salvar agenda.');
    } else {
      setShowSchedule(false);
    }
  };

  const handleAddBlock = async () => {
    if (!schedulePro) return;
    if (blockForm.isRecurring) {
      if (!blockForm.recurringStart || !blockForm.recurringEnd) {
        setScheduleError('Preencha o horário de início e fim do bloqueio recorrente.');
        return;
      }
    } else {
      if (!blockForm.startDate || !blockForm.startTime || !blockForm.endDate || !blockForm.endTime) {
        setScheduleError('Preencha data e horário de início e fim da pausa.');
        return;
      }
    }
    setBlockSaving(true);
    setScheduleError('');
    const token = await getToken();
    const body = blockForm.isRecurring
      ? { is_recurring: true, recurring_start_time: blockForm.recurringStart, recurring_end_time: blockForm.recurringEnd, reason: blockForm.reason || null }
      : { is_recurring: false, starts_at: `${blockForm.startDate}T${blockForm.startTime}:00`, ends_at: `${blockForm.endDate}T${blockForm.endTime}:00`, reason: blockForm.reason || null };
    const res = await fetch(`${API_URL}/professionals/${schedulePro.id}/time-blocks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    setBlockSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setScheduleError(d.detail || 'Erro ao criar bloqueio.');
      return;
    }
    setBlockForm(EMPTY_BLOCK);
    setShowBlockForm(false);
    const tbRes = await fetch(`${API_URL}/professionals/${schedulePro.id}/time-blocks`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (tbRes.ok) setTimeBlocks(await tbRes.json());
  };

  const handleDeleteBlock = async (blockId: string) => {
    if (!schedulePro) return;
    const token = await getToken();
    await fetch(`${API_URL}/professionals/${schedulePro.id}/time-blocks/${blockId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    setTimeBlocks(prev => prev.filter(b => b.id !== blockId));
  };

  // ── Cadastrar profissional ────────────────────────────────────────────────

  const handleAdd = async () => {
    if (!addForm.name || !addForm.email) {
      setError('Nome e e-mail são obrigatórios.');
      return;
    }
    if (!isValidEmail(addForm.email)) {
      setError('E-mail inválido. Verifique o endereço informado.');
      return;
    }
    if (addForm.cpf && !isValidCPF(addForm.cpf)) {
      setError('CPF inválido. Verifique os dígitos informados.');
      return;
    }
    if (addForm.phone && !isValidPhone(addForm.phone)) {
      setError('Telefone inválido. Informe DDD + número (ex: (11) 99999-9999).');
      return;
    }
    setError('');
    setSubmitting(true);
    const token = await getToken();
    const res = await fetch(`${API_URL}/professionals/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        name: addForm.name,
        email: addForm.email.trim(),
        cpf: addForm.cpf || undefined,
        phone: addForm.phone || undefined,
        specialty_ids: addForm.specialty_ids,
        photo_url: addForm.photo_url || undefined,
        color: addForm.color || undefined,
        default_duration_minutes: parseInt(addForm.defaultDuration, 10) || 60,
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(data.detail || 'Erro ao cadastrar profissional.'); return; }
    setShowAdd(false);
    setAddForm(EMPTY_ADD);
    fetchProfessionals();
  };

  // ── Editar profissional ───────────────────────────────────────────────────

  const handleEdit = async () => {
    if (!selectedPro || !editForm.name) {
      setError('Nome é obrigatório.');
      return;
    }
    if (editForm.email && !isValidEmail(editForm.email)) {
      setError('E-mail inválido. Verifique o endereço informado.');
      return;
    }
    setError('');
    setSubmitting(true);
    const token = await getToken();
    const res = await fetch(`${API_URL}/professionals/${selectedPro.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        name: editForm.name,
        email: editForm.email || undefined,
        cpf: editForm.cpf || undefined,
        phone: editForm.phone || undefined,
        specialty_ids: editForm.specialty_ids,
        photo_url: editForm.photo_url || undefined,
        color: editForm.color || undefined,
        default_duration_minutes: parseInt(editForm.defaultDuration, 10) || undefined,
        // Não envia active para profissionais pendentes — preserva o status 'pending'
        ...(selectedPro.status !== 'pending' && { active: editForm.active }),
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(data.detail || 'Erro ao atualizar profissional.'); return; }
    setShowEdit(false);
    setSelectedPro(null);
    fetchProfessionals();
  };

  // ── Ativar profissional pendente ──────────────────────────────────────────

  const handleActivatePro = async () => {
    if (!selectedPro) return;
    setError('');
    setSubmitting(true);
    const token = await getToken();
    const res = await fetch(`${API_URL}/professionals/${selectedPro.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ active: true }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.detail || 'Erro ao ativar profissional.');
      return;
    }
    setShowEdit(false);
    setSelectedPro(null);
    fetchProfessionals();
  };

  // ── Excluir profissional ──────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    const ok = await confirm({ title: 'Excluir profissional', message: 'Tem certeza que deseja excluir este profissional?', confirmLabel: 'Excluir', danger: true });
    if (!ok) return;
    const token = await getToken();
    const res = await fetch(`${API_URL}/professionals/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      await confirm({ title: 'Erro', message: data.detail || 'Não foi possível excluir o profissional.', confirmLabel: 'OK', danger: false });
      return;
    }
    fetchProfessionals();
  };

  // ── Reenviar convite ──────────────────────────────────────────────────────

  const handleResendInvite = async (id: string) => {
    const token = await getToken();
    const res = await fetch(`${API_URL}/professionals/${id}/resend-invite`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      await confirm({ title: 'Convite reenviado', message: 'O e-mail de convite foi reenviado com sucesso.', confirmLabel: 'OK', danger: false });
    } else {
      const data = await res.json().catch(() => ({}));
      await confirm({ title: 'Erro', message: data.detail || 'Não foi possível reenviar o convite.', confirmLabel: 'OK', danger: false });
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
    {confirmDialog}
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {isMobile && (
            <TouchableOpacity onPress={openDrawer} style={{ marginRight: 14, padding: 4 }}>
              <Text style={{ fontSize: 22, color: '#8e7f7e', lineHeight: 22 }}>☰</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.topBarTitle}>Gestão da Equipe</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerActions}>
          <Text style={styles.description}>Gerencie os profissionais e suas informações.</Text>
          <TouchableOpacity style={styles.btnAdd} onPress={() => { setAddForm(EMPTY_ADD); setError(''); setShowAdd(true); }} activeOpacity={0.8}>
            <Text style={styles.btnAddText}>+ Cadastrar Profissional</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.emptyState}><ActivityIndicator color="#8e7f7e" /></View>
        ) : professionals.length === 0 ? (
          <View style={styles.emptyState}><Text style={styles.emptyText}>Nenhum profissional cadastrado ainda.</Text></View>
        ) : (
          <View {...{ dataSet: { proGrid: 'true' } } as any} style={styles.grid}>
            {professionals.map((pro) => (
              <ProfCard key={pro.id} professional={pro} onView={openDetail} onEdit={openEdit} onDelete={handleDelete} onSchedule={openSchedule} onResendInvite={handleResendInvite} />
            ))}
          </View>
        )}
      </ScrollView>

      {/* ── Modal: Agenda do Profissional ── */}
      <Modal visible={showSchedule} transparent animationType="fade" onRequestClose={() => setShowSchedule(false)}>
        <View style={modalStyles.overlay}>
          <View {...{ dataSet: { modal: 'true' } } as any} style={modalStyles.scheduleContent}>
            <View style={modalStyles.header}>
              <Text style={modalStyles.title}>
                Agenda{schedulePro ? ` — ${schedulePro.name}` : ''}
              </Text>
              <TouchableOpacity style={modalStyles.closeButton} onPress={() => setShowSchedule(false)}>
                <Text style={modalStyles.closeText}>×</Text>
              </TouchableOpacity>
            </View>

            {scheduleLoading ? (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <ActivityIndicator color="#8e7f7e" />
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* ── Dias de trabalho ── */}
                <Text style={modalStyles.sectionHeader}>Dias e horários de trabalho</Text>

                {DAYS_LABELS.map((label, i) => {
                  const day = schedule[i];
                  return (
                    <View key={i} style={modalStyles.dayRow}>
                      <TouchableOpacity
                        style={[modalStyles.dayToggle, day.enabled && modalStyles.dayToggleOn]}
                        onPress={() => {
                          const next = [...schedule];
                          next[i] = { ...day, enabled: !day.enabled };
                          setSchedule(next);
                        }}
                        activeOpacity={0.8}
                      >
                        <View style={[modalStyles.dayToggleThumb, day.enabled && modalStyles.dayToggleThumbOn]} />
                      </TouchableOpacity>

                      <Text style={[modalStyles.dayLabel, !day.enabled && modalStyles.dayLabelDisabled]}>
                        {label}
                      </Text>

                      {day.enabled ? (
                        <>
                          <input
                            type="time"
                            value={day.start}
                            onChange={(e: any) => {
                              const next = [...schedule];
                              next[i] = { ...day, start: e.target.value };
                              setSchedule(next);
                            }}
                            style={{
                              border: '1px solid #efeae8', borderRadius: 8,
                              padding: '6px 10px', fontSize: 13, color: '#635857',
                              backgroundColor: '#fdfcfc', outline: 'none', fontFamily: 'inherit',
                            }}
                          />
                          <Text style={modalStyles.dayTimeSep}>até</Text>
                          <input
                            type="time"
                            value={day.end}
                            onChange={(e: any) => {
                              const next = [...schedule];
                              next[i] = { ...day, end: e.target.value };
                              setSchedule(next);
                            }}
                            style={{
                              border: '1px solid #efeae8', borderRadius: 8,
                              padding: '6px 10px', fontSize: 13, color: '#635857',
                              backgroundColor: '#fdfcfc', outline: 'none', fontFamily: 'inherit',
                            }}
                          />
                        </>
                      ) : (
                        <Text style={{ fontSize: 13, color: '#c2b4b2' }}>Não trabalha</Text>
                      )}
                    </View>
                  );
                })}

                {/* ── Bloqueios / Pausas ── */}
                <Text style={modalStyles.sectionHeader}>Bloqueios e pausas</Text>

                {timeBlocks.length === 0 && !showBlockForm && (
                  <Text style={{ fontSize: 13, color: '#c2b4b2', marginBottom: 8 }}>
                    Nenhum bloqueio cadastrado.
                  </Text>
                )}

                {timeBlocks.map(b => {
                  const fmtDt = (dt: string) => {
                    const d = new Date(dt);
                    return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
                  };
                  const rangeText = b.is_recurring
                    ? `Todo dia: ${b.recurring_start_time?.slice(0, 5)} – ${b.recurring_end_time?.slice(0, 5)}`
                    : `${fmtDt(b.starts_at!)} → ${fmtDt(b.ends_at!)}`;
                  return (
                    <View key={b.id} style={modalStyles.blockItem}>
                      <View style={modalStyles.blockInfo}>
                        <Text style={modalStyles.blockRange}>{rangeText}</Text>
                        {b.reason ? <Text style={modalStyles.blockReason}>{b.reason}</Text> : null}
                      </View>
                      <TouchableOpacity
                        style={modalStyles.btnDeleteBlock}
                        onPress={() => handleDeleteBlock(b.id)}
                        activeOpacity={0.7}
                      >
                        <Text style={modalStyles.btnDeleteBlockText}>Remover</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}

                {!showBlockForm && (
                  <TouchableOpacity
                    style={modalStyles.btnAddBlock}
                    onPress={() => { setShowBlockForm(true); setScheduleError(''); }}
                    activeOpacity={0.8}
                  >
                    <Text style={modalStyles.btnAddBlockText}>+ Adicionar bloqueio</Text>
                  </TouchableOpacity>
                )}

                {showBlockForm && (
                  <View style={modalStyles.blockForm}>
                    <Text style={[modalStyles.sectionHeader, { marginTop: 0 }]}>Novo bloqueio</Text>

                    {/* ── Toggle recorrente ── */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 10 }}>
                      <TouchableOpacity
                        style={[modalStyles.dayToggle, blockForm.isRecurring && modalStyles.dayToggleOn]}
                        onPress={() => setBlockForm({ ...EMPTY_BLOCK, isRecurring: !blockForm.isRecurring })}
                        activeOpacity={0.8}
                      >
                        <View style={[modalStyles.dayToggleThumb, blockForm.isRecurring && modalStyles.dayToggleThumbOn]} />
                      </TouchableOpacity>
                      <Text style={{ fontSize: 13, color: '#635857' }}>Bloqueio recorrente (todo dia)</Text>
                    </View>

                    {blockForm.isRecurring ? (
                      /* ── Campos apenas de hora (recorrente) ── */
                      <View style={modalStyles.blockFormRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={modalStyles.fieldLabel}>Início — hora</Text>
                          <input type="time" value={blockForm.recurringStart}
                            onChange={(e: any) => setBlockForm({ ...blockForm, recurringStart: e.target.value })}
                            style={{ border: '1px solid #efeae8', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: '#635857', backgroundColor: '#fff', outline: 'none', width: '100%', boxSizing: 'border-box' as any, fontFamily: 'inherit' }}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={modalStyles.fieldLabel}>Fim — hora</Text>
                          <input type="time" value={blockForm.recurringEnd}
                            onChange={(e: any) => setBlockForm({ ...blockForm, recurringEnd: e.target.value })}
                            style={{ border: '1px solid #efeae8', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: '#635857', backgroundColor: '#fff', outline: 'none', width: '100%', boxSizing: 'border-box' as any, fontFamily: 'inherit' }}
                          />
                        </View>
                      </View>
                    ) : (
                      /* ── Campos de data + hora (único) ── */
                      <>
                        <View style={modalStyles.blockFormRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={modalStyles.fieldLabel}>Início — data</Text>
                            <input type="date" value={blockForm.startDate}
                              onChange={(e: any) => setBlockForm({ ...blockForm, startDate: e.target.value })}
                              style={{ border: '1px solid #efeae8', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: '#635857', backgroundColor: '#fff', outline: 'none', width: '100%', boxSizing: 'border-box' as any, fontFamily: 'inherit' }}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={modalStyles.fieldLabel}>Início — hora</Text>
                            <input type="time" value={blockForm.startTime}
                              onChange={(e: any) => setBlockForm({ ...blockForm, startTime: e.target.value })}
                              style={{ border: '1px solid #efeae8', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: '#635857', backgroundColor: '#fff', outline: 'none', width: '100%', boxSizing: 'border-box' as any, fontFamily: 'inherit' }}
                            />
                          </View>
                        </View>

                        <View style={modalStyles.blockFormRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={modalStyles.fieldLabel}>Fim — data</Text>
                            <input type="date" value={blockForm.endDate}
                              onChange={(e: any) => setBlockForm({ ...blockForm, endDate: e.target.value })}
                              style={{ border: '1px solid #efeae8', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: '#635857', backgroundColor: '#fff', outline: 'none', width: '100%', boxSizing: 'border-box' as any, fontFamily: 'inherit' }}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={modalStyles.fieldLabel}>Fim — hora</Text>
                            <input type="time" value={blockForm.endTime}
                              onChange={(e: any) => setBlockForm({ ...blockForm, endTime: e.target.value })}
                              style={{ border: '1px solid #efeae8', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: '#635857', backgroundColor: '#fff', outline: 'none', width: '100%', boxSizing: 'border-box' as any, fontFamily: 'inherit' }}
                            />
                          </View>
                        </View>
                      </>
                    )}

                    <View style={{ marginBottom: 10 }}>
                      <Text style={modalStyles.fieldLabel}>Motivo (opcional)</Text>
                      <TextInput
                        style={modalStyles.input}
                        value={blockForm.reason}
                        onChangeText={v => setBlockForm({ ...blockForm, reason: v })}
                        placeholder="Ex: Almoço, consulta médica..."
                        placeholderTextColor="#c2b4b2"
                      />
                    </View>

                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <TouchableOpacity
                        style={[modalStyles.btnCancel, { flex: 1 }]}
                        onPress={() => { setShowBlockForm(false); setBlockForm(EMPTY_BLOCK); }}
                      >
                        <Text style={modalStyles.btnCancelText}>Cancelar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[modalStyles.btnSave, { flex: 2 }]}
                        onPress={handleAddBlock}
                        disabled={blockSaving}
                        activeOpacity={0.85}
                      >
                        {blockSaving
                          ? <ActivityIndicator color="#fff" />
                          : <Text style={modalStyles.btnSaveText}>Salvar bloqueio</Text>}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </ScrollView>
            )}

            {scheduleError ? <Text style={modalStyles.errorText}>{scheduleError}</Text> : null}

            {!scheduleLoading && (
              <View style={modalStyles.footer}>
                <TouchableOpacity style={modalStyles.btnCancel} onPress={() => setShowSchedule(false)}>
                  <Text style={modalStyles.btnCancelText}>Fechar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={modalStyles.btnSave}
                  onPress={handleSaveSchedule}
                  disabled={scheduleSaving}
                  activeOpacity={0.85}
                >
                  {scheduleSaving
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={modalStyles.btnSaveText}>Salvar agenda</Text>}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Modal: Novo Profissional ── */}
      <Modal visible={showAdd} transparent animationType="fade" onRequestClose={() => setShowAdd(false)}>
        <View style={modalStyles.overlay}>
          <View {...{ dataSet: { modal: 'true' } } as any} style={modalStyles.content}>
            <View style={modalStyles.header}>
              <Text style={modalStyles.title}>Novo Profissional</Text>
              <TouchableOpacity style={modalStyles.closeButton} onPress={() => setShowAdd(false)}>
                <Text style={modalStyles.closeText}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <AvatarPicker
                photoUrl={addForm.photo_url}
                name={addForm.name}
                onPick={(url) => setAddForm({ ...addForm, photo_url: url })}
                uploading={uploadingAdd}
                onUploading={setUploadingAdd}
              />
              <ColorPicker selected={addForm.color} onSelect={c => setAddForm({ ...addForm, color: c })} />
              <ModalField label="Nome Completo *" value={addForm.name} onChangeText={(v) => setAddForm({ ...addForm, name: v })} placeholder="Nome do profissional" />
              <ModalField label="E-mail (Login) *" value={addForm.email} onChangeText={(v) => setAddForm({ ...addForm, email: v.trim() })} placeholder="email@exemplo.com" keyboardType="email-address" autoCapitalize="none" />
              <ModalField label="Telefone" value={addForm.phone} onChangeText={(v) => setAddForm({ ...addForm, phone: maskPhone(v) })} placeholder="(00) 00000-0000" keyboardType="phone-pad" />
              <ModalField label="CPF" value={addForm.cpf} onChangeText={(v) => setAddForm({ ...addForm, cpf: maskCPF(v) })} placeholder="000.000.000-00" />
              <SpecialtyMultiSelect value={addForm.specialty_ids} onChange={(ids) => setAddForm({ ...addForm, specialty_ids: ids })} specialties={specialties} />
              <ModalField label="Duração padrão (minutos)" value={addForm.defaultDuration} onChangeText={v => setAddForm({ ...addForm, defaultDuration: v.replace(/\D/g, '') })} placeholder="Ex: 60" keyboardType="phone-pad" autoCapitalize="none" />
            </ScrollView>

            {error ? <Text style={modalStyles.errorText}>{error}</Text> : null}

            <View style={modalStyles.footer}>
              <TouchableOpacity style={modalStyles.btnCancel} onPress={() => setShowAdd(false)}>
                <Text style={modalStyles.btnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={modalStyles.btnSave} onPress={handleAdd} disabled={submitting || uploadingAdd} activeOpacity={0.85}>
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={modalStyles.btnSaveText}>Salvar e Enviar Convite</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Modal: Detalhes do Profissional ── */}
      <Modal visible={showDetail} transparent animationType="fade" onRequestClose={() => setShowDetail(false)}>
        <View style={modalStyles.overlay}>
          <View {...{ dataSet: { modal: 'true' } } as any} style={modalStyles.content}>
            <View style={modalStyles.header}>
              <Text style={modalStyles.title}>Detalhes do Profissional</Text>
              <TouchableOpacity style={modalStyles.closeButton} onPress={() => setShowDetail(false)}>
                <Text style={modalStyles.closeText}>×</Text>
              </TouchableOpacity>
            </View>

            {selectedPro && (() => {
              const pro = selectedPro;
              const initials = getInitials(pro.name);
              const bgColor = getAvatarColor(pro.name);
              return (
                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={modalStyles.avatarPickerWrapper}>
                    {pro.photo_url ? (
                      <Image source={{ uri: pro.photo_url }} style={modalStyles.avatarPickerImage} />
                    ) : (
                      <View style={[modalStyles.avatarPickerPlaceholder, { backgroundColor: bgColor }]}>
                        <Text style={modalStyles.avatarPickerInitials}>{initials}</Text>
                      </View>
                    )}
                  </View>

                  <View style={modalStyles.detailRow}>
                    <Text style={modalStyles.detailLabel}>Nome</Text>
                    <Text style={modalStyles.detailValue}>{pro.name}</Text>
                  </View>
                  {pro.email ? (
                    <View style={modalStyles.detailRow}>
                      <Text style={modalStyles.detailLabel}>E-mail</Text>
                      <Text style={modalStyles.detailValue}>{pro.email}</Text>
                    </View>
                  ) : null}
                  {(pro.specialties && pro.specialties.length > 0) ? (
                    <View style={modalStyles.detailRow}>
                      <Text style={modalStyles.detailLabel}>Especialidades</Text>
                      <Text style={modalStyles.detailValue}>{pro.specialties.map(s => s.name).join(', ')}</Text>
                    </View>
                  ) : null}
                  {pro.phone ? (
                    <View style={modalStyles.detailRow}>
                      <Text style={modalStyles.detailLabel}>Telefone</Text>
                      <Text style={modalStyles.detailValue}>{pro.phone}</Text>
                    </View>
                  ) : null}
                  {pro.cpf ? (
                    <View style={modalStyles.detailRow}>
                      <Text style={modalStyles.detailLabel}>CPF</Text>
                      <Text style={modalStyles.detailValue}>{pro.cpf}</Text>
                    </View>
                  ) : null}
                  <View style={modalStyles.detailRow}>
                    <Text style={modalStyles.detailLabel}>Atendimento</Text>
                    <Text style={modalStyles.detailValue}>
                      {pro.default_duration_minutes >= 60 && pro.default_duration_minutes % 60 === 0
                        ? `${pro.default_duration_minutes / 60}h`
                        : pro.default_duration_minutes >= 60
                        ? `${Math.floor(pro.default_duration_minutes / 60)}h ${pro.default_duration_minutes % 60}min`
                        : `${pro.default_duration_minutes} min`}
                    </Text>
                  </View>
                  <View style={modalStyles.detailRow}>
                    <Text style={modalStyles.detailLabel}>Dias de trabalho</Text>
                    <Text style={modalStyles.detailValue}>
                      {detailWorkDays.length === 0
                        ? '—'
                        : detailWorkDays.map(d => DAYS_LABELS[d]).join(', ')}
                    </Text>
                  </View>
                  <View style={modalStyles.detailRow}>
                    <Text style={modalStyles.detailLabel}>Status</Text>
                    <View style={[
                      modalStyles.detailBadge,
                      pro.status === 'active' ? { backgroundColor: '#e8f5e9' }
                        : pro.status === 'inactive' ? { backgroundColor: '#f5f5f5' }
                        : { backgroundColor: '#fff3e0' },
                    ]}>
                      <Text style={[
                        modalStyles.detailBadgeText,
                        pro.status === 'active' ? { color: '#2e7d32' }
                          : pro.status === 'inactive' ? { color: '#9e9e9e' }
                          : { color: '#e65100' },
                      ]}>
                        {pro.status === 'active' ? 'Ativo' : pro.status === 'inactive' ? 'Inativo' : 'Convidado'}
                      </Text>
                    </View>
                  </View>
                  <View style={modalStyles.detailRow}>
                    <Text style={modalStyles.detailLabel}>Cadastrado em</Text>
                    <Text style={modalStyles.detailValue}>
                      {new Date(pro.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </Text>
                  </View>
                </ScrollView>
              );
            })()}

            <View style={modalStyles.footer}>
              <TouchableOpacity style={modalStyles.btnCancel} onPress={() => setShowDetail(false)}>
                <Text style={modalStyles.btnCancelText}>Fechar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={modalStyles.btnSave} onPress={() => { setShowDetail(false); if (selectedPro) openEdit(selectedPro); }} activeOpacity={0.85}>
                <Text style={modalStyles.btnSaveText}>Editar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Modal: Editar Profissional ── */}
      <Modal visible={showEdit} transparent animationType="fade" onRequestClose={() => setShowEdit(false)}>
        <View style={modalStyles.overlay}>
          <View {...{ dataSet: { modal: 'true' } } as any} style={modalStyles.content}>
            <View style={modalStyles.header}>
              <Text style={modalStyles.title}>Editar Profissional</Text>
              <TouchableOpacity style={modalStyles.closeButton} onPress={() => setShowEdit(false)}>
                <Text style={modalStyles.closeText}>×</Text>
              </TouchableOpacity>
            </View>

            <AvatarPicker
              photoUrl={editForm.photo_url}
              name={editForm.name}
              onPick={(url) => setEditForm({ ...editForm, photo_url: url })}
              uploading={uploadingEdit}
              onUploading={setUploadingEdit}
            />
            <ColorPicker selected={editForm.color} onSelect={c => setEditForm({ ...editForm, color: c })} />
            <ModalField label="Nome Completo *" value={editForm.name} onChangeText={(v) => setEditForm({ ...editForm, name: v })} placeholder="Nome do profissional" />
            <ModalField label="E-mail *" value={editForm.email} onChangeText={(v) => setEditForm({ ...editForm, email: v.trim() })} placeholder="email@exemplo.com" keyboardType="email-address" autoCapitalize="none" />
            <ModalField label="CPF" value={editForm.cpf} onChangeText={(v) => setEditForm({ ...editForm, cpf: maskCPF(v) })} placeholder="000.000.000-00" />
            <ModalField label="Telefone" value={editForm.phone} onChangeText={(v) => setEditForm({ ...editForm, phone: maskPhone(v) })} placeholder="(00) 00000-0000" keyboardType="phone-pad" />
            <SpecialtyMultiSelect value={editForm.specialty_ids} onChange={(ids) => setEditForm({ ...editForm, specialty_ids: ids })} specialties={specialties} />
            <ModalField label="Duração padrão (minutos)" value={editForm.defaultDuration} onChangeText={v => setEditForm({ ...editForm, defaultDuration: v.replace(/\D/g, '') })} placeholder="Ex: 60" keyboardType="phone-pad" autoCapitalize="none" />

            {selectedPro?.status === 'pending' ? (
              <TouchableOpacity
                style={[modalStyles.btnSave, { marginBottom: 16, alignSelf: 'flex-start', paddingHorizontal: 18 }]}
                onPress={handleActivatePro}
                disabled={submitting}
                activeOpacity={0.85}
              >
                {submitting
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={modalStyles.btnSaveText}>Ativar conta</Text>
                }
              </TouchableOpacity>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <TouchableOpacity
                  style={[modalStyles.dayToggle, editForm.active && modalStyles.dayToggleOn]}
                  onPress={() => setEditForm({ ...editForm, active: !editForm.active })}
                  activeOpacity={0.8}
                >
                  <View style={[modalStyles.dayToggleThumb, editForm.active && modalStyles.dayToggleThumbOn]} />
                </TouchableOpacity>
                <Text style={{ fontSize: 14, color: '#635857' }}>
                  {editForm.active ? 'Profissional ativo' : 'Profissional inativo'}
                </Text>
              </View>
            )}

            {error ? <Text style={modalStyles.errorText}>{error}</Text> : null}

            <View style={modalStyles.footer}>
              <TouchableOpacity style={modalStyles.btnCancel} onPress={() => setShowEdit(false)}>
                <Text style={modalStyles.btnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={modalStyles.btnSave} onPress={handleEdit} disabled={submitting || uploadingEdit} activeOpacity={0.85}>
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={modalStyles.btnSaveText}>Salvar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
    </>
  );
}
