import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Switch,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getToken } from '../../lib/supabase';
import { maskPhone, maskCEP, maskCNPJ } from '../../lib/masks';
import {
  DaySchedule,
  TimeBlockItem,
  BlockForm,
  DAYS_LABELS,
  EMPTY_SCHEDULE,
  EMPTY_BLOCK,
  REMINDER_OPTIONS,
} from '../../lib/scheduleConstants';
import { API_URL } from '../../lib/config';

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface Company {
  id: string;
  name: string;
  cnpj: string;
  phone: string | null;
  contact_email: string | null;
  email: string | null;
  cep: string | null;
  street: string | null;
  address_number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  reminder_hours_before: number | null;
  active: boolean;
  created_at: string;
}

function fmtDt(dt: string): string {
  const d = new Date(dt);
  return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

// ── Aba 1: Empresa ────────────────────────────────────────────────────────────

function TabEmpresa({ company, onRefresh }: { company: Company; onRefresh: () => void }) {
  const [name, setName] = useState(company.name);
  const [cep, setCep] = useState(company.cep ? maskCEP(company.cep) : '');
  const [street, setStreet] = useState(company.street ?? '');
  const [addressNumber, setAddressNumber] = useState(company.address_number ?? '');
  const [complement, setComplement] = useState(company.complement ?? '');
  const [neighborhood, setNeighborhood] = useState(company.neighborhood ?? '');
  const [city, setCity] = useState(company.city ?? '');
  const [state, setState] = useState(company.state ?? '');
  const [contactEmail, setContactEmail] = useState(company.contact_email ?? '');
  const [phone, setPhone] = useState(company.phone ? maskPhone(company.phone) : '');

  const [cepLoading, setCepLoading] = useState(false);
  const cepRef = useRef('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const digits = cep.replace(/\D/g, '');
    if (digits.length !== 8 || digits === cepRef.current) return;
    cepRef.current = digits;
    setCepLoading(true);
    fetch(`https://viacep.com.br/ws/${digits}/json/`)
      .then(r => r.json())
      .then((data: any) => {
        if (data.erro) return;
        setStreet(data.logradouro ?? '');
        setNeighborhood(data.bairro ?? '');
        setCity(data.localidade ?? '');
        setState(data.uf ?? '');
      })
      .catch(() => {})
      .finally(() => setCepLoading(false));
  }, [cep]);

  const handleSave = async () => {
    if (!name.trim()) { setError('O nome da empresa é obrigatório.'); return; }
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/companies/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: name.trim(),
          cep: cep.replace(/\D/g, '') || null,
          street: street.trim() || null,
          address_number: addressNumber.trim() || null,
          complement: complement.trim() || null,
          neighborhood: neighborhood.trim() || null,
          city: city.trim() || null,
          state: state.trim() || null,
          contact_email: contactEmail.trim() || null,
          phone: phone || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.detail || 'Erro ao salvar. Tente novamente.');
        return;
      }
      setSaved(true);
      onRefresh();
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Erro ao salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>

      <Text style={s.sectionHeader}>Identificação</Text>

      <Text style={s.label}>Nome da empresa *</Text>
      <TextInput
        style={s.input}
        value={name}
        onChangeText={v => { setName(v); setError(''); }}
        placeholder="Nome da empresa"
        placeholderTextColor="#c2b4b2"
      />

      <Text style={s.label}>CNPJ</Text>
      <TextInput style={[s.input, s.inputDisabled]} value={maskCNPJ(company.cnpj)} editable={false} />

      <Text style={s.sectionHeader}>Endereço</Text>

      <View style={s.row}>
        <View style={{ width: 130 }}>
          <Text style={s.label}>CEP {cepLoading ? '...' : ''}</Text>
          <TextInput
            style={s.input}
            value={cep}
            onChangeText={v => setCep(maskCEP(v))}
            placeholder="00000-000"
            placeholderTextColor="#c2b4b2"
            keyboardType="numeric"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.label}>Bairro</Text>
          <TextInput
            style={s.input}
            value={neighborhood}
            onChangeText={setNeighborhood}
            placeholder="Bairro"
            placeholderTextColor="#c2b4b2"
          />
        </View>
      </View>

      <Text style={s.label}>Logradouro</Text>
      <TextInput
        style={s.input}
        value={street}
        onChangeText={setStreet}
        placeholder="Rua, Avenida..."
        placeholderTextColor="#c2b4b2"
      />

      <View style={s.row}>
        <View style={{ width: 90 }}>
          <Text style={s.label}>Número</Text>
          <TextInput
            style={s.input}
            value={addressNumber}
            onChangeText={setAddressNumber}
            placeholder="Nº"
            placeholderTextColor="#c2b4b2"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.label}>Complemento</Text>
          <TextInput
            style={s.input}
            value={complement}
            onChangeText={setComplement}
            placeholder="Sala, andar..."
            placeholderTextColor="#c2b4b2"
          />
        </View>
      </View>

      <View style={s.row}>
        <View style={{ flex: 1 }}>
          <Text style={s.label}>Cidade</Text>
          <TextInput
            style={s.input}
            value={city}
            onChangeText={setCity}
            placeholder="Cidade"
            placeholderTextColor="#c2b4b2"
          />
        </View>
        <View style={{ width: 70 }}>
          <Text style={s.label}>UF</Text>
          <TextInput
            style={s.input}
            value={state}
            onChangeText={v => setState(v.toUpperCase().slice(0, 2))}
            placeholder="UF"
            placeholderTextColor="#c2b4b2"
            autoCapitalize="characters"
            maxLength={2}
          />
        </View>
      </View>

      <Text style={s.sectionHeader}>Contato</Text>

      <Text style={s.label}>E-mail (notificações)</Text>
      <TextInput
        style={s.input}
        value={contactEmail}
        onChangeText={setContactEmail}
        placeholder="email@empresa.com"
        placeholderTextColor="#c2b4b2"
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Text style={s.label}>Telefone</Text>
      <TextInput
        style={s.input}
        value={phone}
        onChangeText={v => setPhone(maskPhone(v))}
        placeholder="(00) 00000-0000"
        placeholderTextColor="#c2b4b2"
        keyboardType="phone-pad"
      />

      <Text style={s.sectionHeader}>Acesso</Text>

      <Text style={s.label}>E-mail de login</Text>
      <TextInput style={[s.input, s.inputDisabled]} value={company.email ?? ''} editable={false} />

      {!!error && <Text style={s.errorText}>{error}</Text>}
      {saved && <Text style={s.successText}>Alterações salvas com sucesso.</Text>}

      <TouchableOpacity style={[s.btnPrimary, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
        {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.btnPrimaryText}>Salvar Alterações</Text>}
      </TouchableOpacity>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

// ── Aba 2: Especialidades ─────────────────────────────────────────────────────

function TabEspecialidades() {
  const [specialties, setSpecialties] = useState<{ id: string; name: string; info?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [info, setInfo] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchSpecialties = async () => {
    const token = await getToken();
    const res = await fetch(`${API_URL}/specialties/`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setSpecialties(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchSpecialties(); }, []);

  const handleSave = async () => {
    if (!name.trim()) { setError('Especialidade é obrigatória.'); return; }
    setSaving(true);
    setError('');
    const token = await getToken();
    const res = await fetch(`${API_URL}/specialties/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: name.trim(), info: info.trim() || null }),
    });
    if (res.ok) {
      setName('');
      setInfo('');
      fetchSpecialties();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.detail ?? 'Erro ao salvar.');
    }
    setSaving(false);
  };

  const handleDelete = (id: string, specName: string) => {
    Alert.alert('Remover especialidade', `Remover "${specName}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover', style: 'destructive', onPress: async () => {
          const token = await getToken();
          await fetch(`${API_URL}/specialties/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
          fetchSpecialties();
        },
      },
    ]);
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>

      <Text style={s.sectionHeader}>Nova Especialidade</Text>

      <Text style={s.label}>Especialidade *</Text>
      <TextInput
        style={s.input}
        value={name}
        onChangeText={v => { setName(v); setError(''); }}
        placeholder="Ex: Fisioterapia, Nutrição..."
        placeholderTextColor="#c2b4b2"
      />

      <Text style={s.label}>Informações</Text>
      <TextInput
        style={[s.input, { minHeight: 72, textAlignVertical: 'top' }]}
        value={info}
        onChangeText={setInfo}
        placeholder="Descrição opcional..."
        placeholderTextColor="#c2b4b2"
        multiline
      />

      {!!error && <Text style={s.errorText}>{error}</Text>}

      <TouchableOpacity style={[s.btnPrimary, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
        {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.btnPrimaryText}>Adicionar</Text>}
      </TouchableOpacity>

      <Text style={s.sectionHeader}>
        Especialidades Cadastradas{!loading ? ` (${specialties.length})` : ''}
      </Text>

      {loading ? (
        <ActivityIndicator color="#8e7f7e" style={{ marginTop: 12 }} />
      ) : specialties.length === 0 ? (
        <Text style={s.emptyText}>Nenhuma especialidade cadastrada.</Text>
      ) : (
        specialties.map((sp, idx) => (
          <View key={sp.id} style={[s.listItem, idx === 0 && { borderTopWidth: 0 }]}>
            <View style={{ flex: 1 }}>
              <Text style={s.listItemTitle}>{sp.name}</Text>
              {!!sp.info && <Text style={s.listItemSub}>{sp.info}</Text>}
            </View>
            <TouchableOpacity onPress={() => handleDelete(sp.id, sp.name)} activeOpacity={0.7} style={{ padding: 8 }}>
              <Text style={{ fontSize: 20, color: '#c2b4b2', lineHeight: 22 }}>×</Text>
            </TouchableOpacity>
          </View>
        ))
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

// ── Aba 3: Expediente ─────────────────────────────────────────────────────────

function TabExpediente({ company, onRefresh }: { company: Company; onRefresh: () => void }) {
  const [schedule, setSchedule] = useState<DaySchedule[]>(EMPTY_SCHEDULE.map(d => ({ ...d })));
  const [timeBlocks, setTimeBlocks] = useState<TimeBlockItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleError, setScheduleError] = useState('');
  const [scheduleSuccess, setScheduleSuccess] = useState('');

  const [showBlockForm, setShowBlockForm] = useState(false);
  const [blockForm, setBlockForm] = useState<BlockForm>({ ...EMPTY_BLOCK });
  const [blockSaving, setBlockSaving] = useState(false);
  const [blockError, setBlockError] = useState('');

  const [reminderValue, setReminderValue] = useState<number>(company.reminder_hours_before ?? 0);
  const [reminderSaving, setReminderSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const token = await getToken();
    const [availRes, blocksRes] = await Promise.all([
      fetch(`${API_URL}/companies/me/availability`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_URL}/companies/me/time-blocks`, { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    if (availRes.ok) {
      const rows: { day_of_week: number; start_time: string; end_time: string }[] = await availRes.json();
      const next = EMPTY_SCHEDULE.map(d => ({ ...d }));
      for (const r of rows) {
        next[r.day_of_week] = { enabled: true, start: r.start_time.slice(0, 5), end: r.end_time.slice(0, 5) };
      }
      setSchedule(next);
    }
    if (blocksRes.ok) setTimeBlocks(await blocksRes.json());
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleSaveSchedule = async () => {
    setScheduleSaving(true);
    setScheduleError('');
    setScheduleSuccess('');
    const token = await getToken();
    const slots = schedule
      .map((d, i) => d.enabled ? { day_of_week: i, start_time: d.start, end_time: d.end } : null)
      .filter(Boolean);
    const res = await fetch(`${API_URL}/companies/me/availability`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ slots }),
    });
    setScheduleSaving(false);
    if (res.ok) {
      setScheduleSuccess('Horários salvos com sucesso.');
    } else {
      const data = await res.json().catch(() => ({}));
      setScheduleError(data.detail || 'Erro ao salvar.');
    }
  };

  const handleAddBlock = async () => {
    setBlockError('');
    let body: any;
    if (blockForm.isRecurring) {
      if (!blockForm.recurringStart || !blockForm.recurringEnd) {
        setBlockError('Informe o horário de início e fim.');
        return;
      }
      body = {
        is_recurring: true,
        recurring_start_time: blockForm.recurringStart,
        recurring_end_time: blockForm.recurringEnd,
        reason: blockForm.reason || null,
      };
    } else {
      if (!blockForm.startDate || !blockForm.startTime || !blockForm.endDate || !blockForm.endTime) {
        setBlockError('Preencha todos os campos de data e hora.');
        return;
      }
      body = {
        is_recurring: false,
        starts_at: `${blockForm.startDate}T${blockForm.startTime}:00`,
        ends_at: `${blockForm.endDate}T${blockForm.endTime}:00`,
        reason: blockForm.reason || null,
      };
    }
    setBlockSaving(true);
    const token = await getToken();
    const res = await fetch(`${API_URL}/companies/me/time-blocks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    setBlockSaving(false);
    if (res.ok) {
      setShowBlockForm(false);
      setBlockForm({ ...EMPTY_BLOCK });
      loadData();
    } else {
      const data = await res.json().catch(() => ({}));
      setBlockError(data.detail || 'Erro ao salvar bloqueio.');
    }
  };

  const handleDeleteBlock = (id: string) => {
    Alert.alert('Remover bloqueio', 'Deseja remover este bloqueio?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover', style: 'destructive', onPress: async () => {
          const token = await getToken();
          await fetch(`${API_URL}/companies/me/time-blocks/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
          loadData();
        },
      },
    ]);
  };

  const handleSaveReminder = async (value: number) => {
    setReminderValue(value);
    setReminderSaving(true);
    const token = await getToken();
    await fetch(`${API_URL}/companies/me`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ reminder_hours_before: value }),
    });
    setReminderSaving(false);
    onRefresh();
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 }}>
        <ActivityIndicator color="#8e7f7e" />
      </View>
    );
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>

      {/* Horários de funcionamento */}
      <Text style={s.sectionHeader}>Horário de funcionamento</Text>

      {DAYS_LABELS.map((label, i) => {
        const day = schedule[i];
        return (
          <View key={i} style={s.dayRow}>
            <Switch
              value={day.enabled}
              onValueChange={v => {
                const next = [...schedule];
                next[i] = { ...day, enabled: v };
                setSchedule(next);
                setScheduleSuccess('');
              }}
              trackColor={{ false: '#efeae8', true: '#c2a29e' }}
              thumbColor={day.enabled ? '#8e7f7e' : '#f4f3f4'}
            />
            <Text style={[s.dayLabel, !day.enabled && s.dayLabelOff]}>{label}</Text>
            {day.enabled ? (
              <>
                <TextInput
                  style={s.timeInput}
                  value={day.start}
                  onChangeText={v => {
                    const next = [...schedule];
                    next[i] = { ...day, start: v };
                    setSchedule(next);
                    setScheduleSuccess('');
                  }}
                  placeholder="08:00"
                  placeholderTextColor="#c2b4b2"
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                />
                <Text style={s.timeSep}>–</Text>
                <TextInput
                  style={s.timeInput}
                  value={day.end}
                  onChangeText={v => {
                    const next = [...schedule];
                    next[i] = { ...day, end: v };
                    setSchedule(next);
                    setScheduleSuccess('');
                  }}
                  placeholder="18:00"
                  placeholderTextColor="#c2b4b2"
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                />
              </>
            ) : (
              <Text style={s.dayClosedText}>Fechado</Text>
            )}
          </View>
        );
      })}

      {!!scheduleError && <Text style={s.errorText}>{scheduleError}</Text>}
      {!!scheduleSuccess && <Text style={s.successText}>{scheduleSuccess}</Text>}

      <TouchableOpacity style={[s.btnPrimary, scheduleSaving && { opacity: 0.6 }]} onPress={handleSaveSchedule} disabled={scheduleSaving} activeOpacity={0.85}>
        {scheduleSaving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.btnPrimaryText}>Salvar horários</Text>}
      </TouchableOpacity>

      {/* Bloqueios */}
      <Text style={s.sectionHeader}>Fechamentos e bloqueios</Text>

      {timeBlocks.length === 0 && !showBlockForm && (
        <Text style={s.emptyText}>Nenhum bloqueio cadastrado.</Text>
      )}

      {timeBlocks.map(b => {
        const rangeText = b.is_recurring
          ? `Todo dia: ${b.recurring_start_time?.slice(0, 5)} – ${b.recurring_end_time?.slice(0, 5)}`
          : `${fmtDt(b.starts_at!)} → ${fmtDt(b.ends_at!)}`;
        return (
          <View key={b.id} style={s.blockItem}>
            <View style={{ flex: 1 }}>
              <Text style={s.blockRange}>{rangeText}</Text>
              {!!b.reason && <Text style={s.blockReason}>{b.reason}</Text>}
            </View>
            <TouchableOpacity onPress={() => handleDeleteBlock(b.id)} style={s.btnRemove} activeOpacity={0.7}>
              <Text style={s.btnRemoveText}>Remover</Text>
            </TouchableOpacity>
          </View>
        );
      })}

      {!showBlockForm && (
        <TouchableOpacity style={s.btnOutline} onPress={() => { setShowBlockForm(true); setBlockError(''); }} activeOpacity={0.8}>
          <Text style={s.btnOutlineText}>+ Adicionar bloqueio</Text>
        </TouchableOpacity>
      )}

      {showBlockForm && (
        <View style={s.blockForm}>
          <Text style={[s.sectionTitle, { marginBottom: 14 }]}>Novo bloqueio</Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
            <Switch
              value={blockForm.isRecurring}
              onValueChange={v => setBlockForm({ ...EMPTY_BLOCK, isRecurring: v })}
              trackColor={{ false: '#efeae8', true: '#c2a29e' }}
              thumbColor={blockForm.isRecurring ? '#8e7f7e' : '#f4f3f4'}
            />
            <Text style={[s.label, { marginBottom: 0, marginLeft: 10 }]}>Bloqueio recorrente (todo dia)</Text>
          </View>

          {blockForm.isRecurring ? (
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Início (HH:MM)</Text>
                <TextInput
                  style={s.input}
                  value={blockForm.recurringStart}
                  onChangeText={v => setBlockForm({ ...blockForm, recurringStart: v })}
                  placeholder="08:00"
                  placeholderTextColor="#c2b4b2"
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Fim (HH:MM)</Text>
                <TextInput
                  style={s.input}
                  value={blockForm.recurringEnd}
                  onChangeText={v => setBlockForm({ ...blockForm, recurringEnd: v })}
                  placeholder="12:00"
                  placeholderTextColor="#c2b4b2"
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                />
              </View>
            </View>
          ) : (
            <>
              <View style={s.row}>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Início — data (AAAA-MM-DD)</Text>
                  <TextInput
                    style={s.input}
                    value={blockForm.startDate}
                    onChangeText={v => setBlockForm({ ...blockForm, startDate: v })}
                    placeholder="2025-12-25"
                    placeholderTextColor="#c2b4b2"
                    keyboardType="numbers-and-punctuation"
                    maxLength={10}
                  />
                </View>
                <View style={{ width: 90 }}>
                  <Text style={s.label}>Hora</Text>
                  <TextInput
                    style={s.input}
                    value={blockForm.startTime}
                    onChangeText={v => setBlockForm({ ...blockForm, startTime: v })}
                    placeholder="08:00"
                    placeholderTextColor="#c2b4b2"
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                  />
                </View>
              </View>
              <View style={s.row}>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Fim — data (AAAA-MM-DD)</Text>
                  <TextInput
                    style={s.input}
                    value={blockForm.endDate}
                    onChangeText={v => setBlockForm({ ...blockForm, endDate: v })}
                    placeholder="2025-12-26"
                    placeholderTextColor="#c2b4b2"
                    keyboardType="numbers-and-punctuation"
                    maxLength={10}
                  />
                </View>
                <View style={{ width: 90 }}>
                  <Text style={s.label}>Hora</Text>
                  <TextInput
                    style={s.input}
                    value={blockForm.endTime}
                    onChangeText={v => setBlockForm({ ...blockForm, endTime: v })}
                    placeholder="18:00"
                    placeholderTextColor="#c2b4b2"
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                  />
                </View>
              </View>
            </>
          )}

          <Text style={s.label}>Motivo (opcional)</Text>
          <TextInput
            style={s.input}
            value={blockForm.reason}
            onChangeText={v => setBlockForm({ ...blockForm, reason: v })}
            placeholder="Ex: Feriado, recesso..."
            placeholderTextColor="#c2b4b2"
          />

          {!!blockError && <Text style={s.errorText}>{blockError}</Text>}

          <View style={s.btnRow}>
            <TouchableOpacity
              style={s.btnCancel}
              onPress={() => { setShowBlockForm(false); setBlockForm({ ...EMPTY_BLOCK }); setBlockError(''); }}
              activeOpacity={0.8}
            >
              <Text style={s.btnCancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btnPrimary, { flex: 1 }, blockSaving && { opacity: 0.6 }]} onPress={handleAddBlock} disabled={blockSaving} activeOpacity={0.85}>
              {blockSaving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.btnPrimaryText}>Salvar bloqueio</Text>}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Lembretes */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 28, marginBottom: 4 }}>
        <Text style={[s.sectionHeader, { marginTop: 0, flex: 1 }]}>Lembretes por e-mail</Text>
        {reminderSaving && <ActivityIndicator color="#8e7f7e" size="small" />}
      </View>
      <Text style={s.emptyText}>Aviso automático antes do agendamento</Text>

      <View style={s.reminderRow}>
        {REMINDER_OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt.value}
            style={[s.chip, reminderValue === opt.value && s.chipActive]}
            onPress={() => handleSaveReminder(opt.value)}
            activeOpacity={0.8}
          >
            <Text style={[s.chipText, reminderValue === opt.value && s.chipTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

// ── Tela principal ────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const [activeTab, setActiveTab] = useState<'empresa' | 'especialidades' | 'expediente'>('empresa');
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCompany = useCallback(async () => {
    const token = await getToken();
    const res = await fetch(`${API_URL}/companies/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setCompany(await res.json());
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { fetchCompany(); }, [fetchCompany]));

  const tabs: { key: 'empresa' | 'especialidades' | 'expediente'; label: string }[] = [
    { key: 'empresa', label: 'Empresa' },
    { key: 'especialidades', label: 'Especialidades' },
    { key: 'expediente', label: 'Expediente' },
  ];

  return (
    <View style={s.container}>
      <View style={s.topBar}>
        <Text style={s.topBarTitle}>Configurações</Text>
      </View>

      <View style={s.tabBar}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[s.tab, activeTab === tab.key && s.tabActive]}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.8}
          >
            <Text style={[s.tabText, activeTab === tab.key && s.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading || !company ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color="#8e7f7e" />
        </View>
      ) : activeTab === 'empresa' ? (
        <TabEmpresa company={company} onRefresh={fetchCompany} />
      ) : activeTab === 'especialidades' ? (
        <TabEspecialidades />
      ) : (
        <TabExpediente company={company} onRefresh={fetchCompany} />
      )}
    </View>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fcfaf9' },
  topBar: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  topBarTitle: { fontSize: 22, fontWeight: '300', color: '#635857', letterSpacing: 0.3 },

  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#efeae8', backgroundColor: '#fcfaf9' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#8e7f7e' },
  tabText: { fontSize: 13, color: '#a08c8b' },
  tabTextActive: { color: '#635857', fontWeight: '600' },

  scrollContent: { paddingHorizontal: 20, paddingTop: 16 },

  sectionHeader: { fontSize: 13, fontWeight: '600', color: '#a08c8b', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 20, marginBottom: 10 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#635857' },

  label: { fontSize: 12, color: '#a08c8b', marginBottom: 5 },
  input: {
    borderWidth: 1, borderColor: '#efeae8', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: '#635857', backgroundColor: '#fff', marginBottom: 12,
  },
  inputDisabled: { backgroundColor: '#faf7f6', color: '#c2b4b2' },

  row: { flexDirection: 'row', gap: 10 },

  errorText: { fontSize: 12, color: '#c0392b', marginBottom: 8 },
  successText: { fontSize: 12, color: '#27ae60', marginBottom: 8 },
  emptyText: { fontSize: 13, color: '#c2b4b2', marginBottom: 8 },

  btnPrimary: {
    backgroundColor: '#8e7f7e', borderRadius: 10,
    paddingVertical: 13, alignItems: 'center', marginTop: 4, marginBottom: 8,
  },
  btnPrimaryText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  btnOutline: {
    borderWidth: 1, borderColor: '#c2b4b2', borderRadius: 10,
    paddingVertical: 10, alignItems: 'center', marginTop: 8,
  },
  btnOutlineText: { color: '#8e7f7e', fontSize: 13, fontWeight: '500' },

  btnRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  btnCancel: {
    flex: 1, borderWidth: 1, borderColor: '#efeae8', borderRadius: 10,
    paddingVertical: 13, alignItems: 'center',
  },
  btnCancelText: { color: '#a08c8b', fontSize: 14 },

  listItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: '#efeae8',
  },
  listItemTitle: { fontSize: 14, fontWeight: '600', color: '#635857' },
  listItemSub: { fontSize: 12, color: '#a08c8b', marginTop: 2 },

  dayRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  dayLabel: { width: 34, fontSize: 13, fontWeight: '500', color: '#635857' },
  dayLabelOff: { color: '#c2b4b2' },
  dayClosedText: { fontSize: 13, color: '#c2b4b2' },
  timeInput: {
    borderWidth: 1, borderColor: '#efeae8', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 6,
    fontSize: 13, color: '#635857', backgroundColor: '#fff', width: 58,
    textAlign: 'center',
  },
  timeSep: { fontSize: 13, color: '#c2b4b2' },

  blockItem: {
    flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: '#efeae8',
  },
  blockRange: { fontSize: 13, color: '#635857', fontWeight: '500' },
  blockReason: { fontSize: 12, color: '#a08c8b', marginTop: 2 },
  btnRemove: { paddingLeft: 10 },
  btnRemoveText: { fontSize: 12, color: '#c2b4b2' },

  blockForm: {
    backgroundColor: '#faf7f6', borderRadius: 12, padding: 16, marginTop: 12,
  },

  reminderRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: {
    borderWidth: 1, borderColor: '#efeae8', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  chipActive: { backgroundColor: '#8e7f7e', borderColor: '#8e7f7e' },
  chipText: { fontSize: 12, color: '#635857' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
});