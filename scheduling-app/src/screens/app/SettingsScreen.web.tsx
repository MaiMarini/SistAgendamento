import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase, getToken } from '../../lib/supabase';
import { maskPhone, maskCEP, maskCNPJ } from '../../lib/masks';
import { DaySchedule, TimeBlockItem, BlockForm, DAYS_LABELS, DEFAULT_DAY, EMPTY_SCHEDULE, EMPTY_BLOCK, REMINDER_OPTIONS } from '../../lib/scheduleConstants';
import { useResponsiveWeb } from '../../lib/useResponsiveWeb';
import { useDrawerNav } from '../../lib/useDrawerNav';
import { API_URL } from '../../lib/config';
import { styles } from './SettingsScreen.web.styles';
import { modalStyles, detailStyles } from './ClientsScreen.web.styles';

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

// ── Aba 1: Informações da empresa ─────────────────────────────────────────────

function TabEmpresa({ company, onRefresh }: { company: Company; onRefresh: () => void }) {
  const [name, setName] = useState(company.name);
  // endereço
  const [cep, setCep] = useState(company.cep ? maskCEP(company.cep) : '');
  const [street, setStreet] = useState(company.street ?? '');
  const [addressNumber, setAddressNumber] = useState(company.address_number ?? '');
  const [complement, setComplement] = useState(company.complement ?? '');
  const [neighborhood, setNeighborhood] = useState(company.neighborhood ?? '');
  const [city, setCity] = useState(company.city ?? '');
  const [state, setState] = useState(company.state ?? '');
  // contato
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
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={detailStyles.tabContent}>

      {/* Identificação */}
      <Text style={modalStyles.sectionHeader}>Identificação</Text>

      <Text style={modalStyles.fieldLabel}>Nome da empresa *</Text>
      <TextInput
        style={[modalStyles.input, { marginBottom: 14 }]}
        value={name}
        onChangeText={v => { setName(v); setError(''); }}
        placeholder="Nome da empresa"
        placeholderTextColor="#c2b4b2"
      />

      <Text style={modalStyles.fieldLabel}>CNPJ</Text>
      <TextInput
        style={[modalStyles.input, modalStyles.inputDisabled, { marginBottom: 0 }]}
        value={maskCNPJ(company.cnpj)}
        editable={false}
      />

      {/* Endereço */}
      <Text style={modalStyles.sectionHeader}>Endereço</Text>

      <View style={[modalStyles.fieldRow, { marginBottom: 14 }]}>
        <View style={{ width: 140 }}>
          <Text style={modalStyles.fieldLabel}>CEP {cepLoading ? '...' : ''}</Text>
          <TextInput
            style={modalStyles.input}
            value={cep}
            onChangeText={v => setCep(maskCEP(v))}
            placeholder="00000-000"
            placeholderTextColor="#c2b4b2"
            keyboardType="numeric"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={modalStyles.fieldLabel}>Bairro</Text>
          <TextInput
            style={modalStyles.input}
            value={neighborhood}
            onChangeText={setNeighborhood}
            placeholder="Bairro"
            placeholderTextColor="#c2b4b2"
          />
        </View>
      </View>

      <Text style={modalStyles.fieldLabel}>Logradouro</Text>
      <TextInput
        style={[modalStyles.input, { marginBottom: 14 }]}
        value={street}
        onChangeText={setStreet}
        placeholder="Rua, Avenida..."
        placeholderTextColor="#c2b4b2"
      />

      <View style={[modalStyles.fieldRow, { marginBottom: 14 }]}>
        <View style={{ width: 100 }}>
          <Text style={modalStyles.fieldLabel}>Número</Text>
          <TextInput
            style={modalStyles.input}
            value={addressNumber}
            onChangeText={setAddressNumber}
            placeholder="Nº"
            placeholderTextColor="#c2b4b2"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={modalStyles.fieldLabel}>Complemento</Text>
          <TextInput
            style={modalStyles.input}
            value={complement}
            onChangeText={setComplement}
            placeholder="Sala, andar..."
            placeholderTextColor="#c2b4b2"
          />
        </View>
      </View>

      <View style={[modalStyles.fieldRow, { marginBottom: 0 }]}>
        <View style={{ flex: 1 }}>
          <Text style={modalStyles.fieldLabel}>Cidade</Text>
          <TextInput
            style={modalStyles.input}
            value={city}
            onChangeText={setCity}
            placeholder="Cidade"
            placeholderTextColor="#c2b4b2"
          />
        </View>
        <View style={{ width: 80 }}>
          <Text style={modalStyles.fieldLabel}>Estado</Text>
          <TextInput
            style={modalStyles.input}
            value={state}
            onChangeText={v => setState(v.toUpperCase().slice(0, 2))}
            placeholder="UF"
            placeholderTextColor="#c2b4b2"
            autoCapitalize="characters"
          />
        </View>
      </View>

      {/* Contato */}
      <Text style={modalStyles.sectionHeader}>Contato</Text>

      <Text style={modalStyles.fieldLabel}>E-mail (notificações)</Text>
      <TextInput
        style={[modalStyles.input, { marginBottom: 14 }]}
        value={contactEmail}
        onChangeText={setContactEmail}
        placeholder="email@empresa.com"
        placeholderTextColor="#c2b4b2"
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Text style={modalStyles.fieldLabel}>Telefone</Text>
      <TextInput
        style={[modalStyles.input, { marginBottom: 0 }]}
        value={phone}
        onChangeText={v => setPhone(maskPhone(v))}
        placeholder="(00) 00000-0000"
        placeholderTextColor="#c2b4b2"
        keyboardType="phone-pad"
      />

      {/* Acesso */}
      <Text style={modalStyles.sectionHeader}>Acesso</Text>

      <Text style={modalStyles.fieldLabel}>E-mail de login</Text>
      <TextInput
        style={[modalStyles.input, modalStyles.inputDisabled, { marginBottom: 0 }]}
        value={company.email ?? ''}
        editable={false}
      />

      {error ? <Text style={[styles.errorText, { marginTop: 16 }]}>{error}</Text> : null}
      {saved ? <Text style={[detailStyles.savedText, { marginTop: 8 }]}>Alterações salvas com sucesso.</Text> : null}

      <View style={detailStyles.saveRow}>
        <TouchableOpacity style={detailStyles.btnSave} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
          {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={detailStyles.btnSaveText}>Salvar Alterações</Text>}
        </TouchableOpacity>
      </View>

    </ScrollView>
  );
}

// ── Aba 2: Especialidades ────────────────────────────────────────────────────

function TabEspecialidades() {
  const [name, setName] = useState('');
  const [info, setInfo] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [specialties, setSpecialties] = useState<{ id: string; name: string; info?: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSpecialties = async () => {
    const token = await getToken();
    const res = await fetch(`${API_URL}/specialties/`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setSpecialties(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchSpecialties(); }, []);

  const handleSave = async () => {
    if (!name.trim()) { setError('Especialidade é obrigatória.'); return; }
    setSaving(true); setError('');
    const token = await getToken();
    const res = await fetch(`${API_URL}/specialties/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: name.trim(), info: info.trim() || null }),
    });
    if (res.ok) {
      setName(''); setInfo('');
      fetchSpecialties();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.detail ?? 'Erro ao salvar.');
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const token = await getToken();
    await fetch(`${API_URL}/specialties/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchSpecialties();
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.contentWide}>

      {/* ── Card: Nova especialidade ── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Nova Especialidade</Text>
            <Text style={styles.sectionSubtitle}>Cadastre as especialidades oferecidas</Text>
          </View>
        </View>

        <Text style={styles.fieldLabel}>Especialidade *</Text>
        <TextInput
          style={[styles.input, !name.trim() && error ? styles.inputError : null]}
          value={name}
          onChangeText={t => { setName(t); setError(''); }}
          placeholder="Ex: Fisioterapia, Nutrição..."
          placeholderTextColor="#c2b4b2"
        />

        <Text style={styles.fieldLabel}>Informações</Text>
        <TextInput
          style={[styles.input, { minHeight: 72, textAlignVertical: 'top' }]}
          value={info}
          onChangeText={setInfo}
          placeholder="Descrição opcional..."
          placeholderTextColor="#c2b4b2"
          multiline
        />

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity
          style={[styles.btnSave, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          activeOpacity={0.85}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.btnSaveText}>Salvar</Text>}
        </TouchableOpacity>
      </View>

      {/* ── Card: Lista ── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Especialidades Cadastradas</Text>
            <Text style={styles.sectionSubtitle}>{loading ? '...' : `${specialties.length} especialidade${specialties.length !== 1 ? 's' : ''}`}</Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color="#8e7f7e" />
        ) : specialties.length === 0 ? (
          <Text style={{ fontSize: 13, color: '#c2b4b2' }}>Nenhuma especialidade cadastrada.</Text>
        ) : (
          specialties.map((s, idx) => (
            <View key={s.id} style={{
              flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
              paddingVertical: 12,
              borderTopWidth: idx === 0 ? 0 : 1, borderTopColor: '#efeae8',
            }}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#635857' }}>{s.name}</Text>
                {!!s.info && <Text style={{ fontSize: 12, color: '#a08c8b', marginTop: 2 }}>{s.info}</Text>}
              </View>
              <TouchableOpacity onPress={() => handleDelete(s.id)} activeOpacity={0.7} style={{ padding: 4 }}>
                <Text style={{ fontSize: 18, color: '#c2b4b2', lineHeight: 20 }}>×</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

    </ScrollView>
  );
}


// ── Aba 3: Expediente ─────────────────────────────────────────────────────────

function TabExpediente({ company, onRefresh }: { company: Company; onRefresh: () => void }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
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
        next[r.day_of_week] = {
          enabled: true,
          start: r.start_time.slice(0, 5),
          end: r.end_time.slice(0, 5),
        };
      }
      setSchedule(next);
    }
    if (blocksRes.ok) {
      setTimeBlocks(await blocksRes.json());
    }
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

  const handleDeleteBlock = async (id: string) => {
    const token = await getToken();
    await fetch(`${API_URL}/companies/me/time-blocks/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    loadData();
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

  const timeInputStyle = {
    border: '1px solid #efeae8', borderRadius: 8,
    padding: '6px 10px', fontSize: 13, color: '#635857',
    backgroundColor: '#fdfcfc', outline: 'none', fontFamily: 'inherit',
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.contentWide}>
      <View {...{ dataSet: { twoCol: 'true' } } as any} style={styles.twoColRow}>

        {/* ── Coluna esquerda: Horário de funcionamento ── */}
        <View style={styles.colLeft}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Horário de funcionamento</Text>
                <Text style={styles.sectionSubtitle}>Dias e horários em que a empresa atende</Text>
              </View>
            </View>

            {DAYS_LABELS.map((label, i) => {
              const day = schedule[i];
              return (
                <View key={i} style={[styles.dayRow, isMobile && day.enabled && { flexDirection: 'column', alignItems: 'flex-start' }]}>
                  {/* Toggle + label */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <TouchableOpacity
                      style={[styles.dayToggle, day.enabled && styles.dayToggleOn]}
                      onPress={() => {
                        const next = [...schedule];
                        next[i] = { ...day, enabled: !day.enabled };
                        setSchedule(next);
                        setScheduleSuccess('');
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.dayToggleThumb, day.enabled && styles.dayToggleThumbOn]} />
                    </TouchableOpacity>

                    <Text style={[styles.dayLabel, !day.enabled && styles.dayLabelDisabled]}>
                      {label}
                    </Text>

                    {!day.enabled && (
                      <Text style={{ fontSize: 13, color: '#c2b4b2' }}>Fechado</Text>
                    )}
                  </View>

                  {/* Inputs de horário */}
                  {day.enabled && (
                    <View style={[
                      { flexDirection: 'row', alignItems: 'center', gap: 8 },
                      isMobile && { width: '100%' as any, marginTop: 6 },
                    ]}>
                      <input
                        type="time"
                        value={day.start}
                        onChange={(e: any) => {
                          const next = [...schedule];
                          next[i] = { ...day, start: e.target.value };
                          setSchedule(next);
                          setScheduleSuccess('');
                        }}
                        style={isMobile ? { ...timeInputStyle, flex: 1 } : timeInputStyle}
                      />
                      <Text style={styles.dayTimeSep}>até</Text>
                      <input
                        type="time"
                        value={day.end}
                        onChange={(e: any) => {
                          const next = [...schedule];
                          next[i] = { ...day, end: e.target.value };
                          setSchedule(next);
                          setScheduleSuccess('');
                        }}
                        style={isMobile ? { ...timeInputStyle, flex: 1 } : timeInputStyle}
                      />
                    </View>
                  )}
                </View>
              );
            })}

            {scheduleError ? <Text style={styles.errorText}>{scheduleError}</Text> : null}
            {scheduleSuccess ? <Text style={styles.successText}>{scheduleSuccess}</Text> : null}

            <View style={styles.scheduleFooter}>
              <TouchableOpacity
                style={[styles.btnSave, { flex: 1 }]}
                onPress={handleSaveSchedule}
                disabled={scheduleSaving}
                activeOpacity={0.85}
              >
                {scheduleSaving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.btnSaveText}>Salvar horários</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── Coluna direita: Bloqueios + Lembretes ── */}
        <View style={styles.colRight}>

          {/* Fechamentos e bloqueios */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Fechamentos e bloqueios</Text>
                <Text style={styles.sectionSubtitle}>Períodos em que a empresa não atende</Text>
              </View>
            </View>

            {timeBlocks.length === 0 && !showBlockForm && (
              <Text style={{ fontSize: 13, color: '#c2b4b2', marginBottom: 8 }}>
                Nenhum bloqueio cadastrado.
              </Text>
            )}

            {timeBlocks.map(b => {
              const rangeText = b.is_recurring
                ? `Todo dia: ${b.recurring_start_time?.slice(0, 5)} – ${b.recurring_end_time?.slice(0, 5)}`
                : `${fmtDt(b.starts_at!)} → ${fmtDt(b.ends_at!)}`;
              return (
                <View key={b.id} style={styles.blockItem}>
                  <View style={styles.blockInfo}>
                    <Text style={styles.blockRange}>{rangeText}</Text>
                    {b.reason ? <Text style={styles.blockReason}>{b.reason}</Text> : null}
                  </View>
                  <TouchableOpacity
                    style={styles.btnDeleteBlock}
                    onPress={() => handleDeleteBlock(b.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.btnDeleteBlockText}>Remover</Text>
                  </TouchableOpacity>
                </View>
              );
            })}

            {!showBlockForm && (
              <TouchableOpacity
                style={styles.btnAddBlock}
                onPress={() => { setShowBlockForm(true); setBlockError(''); }}
                activeOpacity={0.8}
              >
                <Text style={styles.btnAddBlockText}>+ Adicionar bloqueio</Text>
              </TouchableOpacity>
            )}

            {showBlockForm && (
              <View style={styles.blockForm}>
                <Text style={[styles.sectionTitle, { marginBottom: 14 }]}>Novo bloqueio</Text>

                {/* Toggle recorrente */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 10 }}>
                  <TouchableOpacity
                    style={[styles.dayToggle, blockForm.isRecurring && styles.dayToggleOn]}
                    onPress={() => setBlockForm({ ...EMPTY_BLOCK, isRecurring: !blockForm.isRecurring })}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.dayToggleThumb, blockForm.isRecurring && styles.dayToggleThumbOn]} />
                  </TouchableOpacity>
                  <Text style={{ fontSize: 13, color: '#635857' }}>Bloqueio recorrente (todo dia)</Text>
                </View>

                {blockForm.isRecurring ? (
                  <View style={styles.blockFormRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fieldLabel}>Início — hora</Text>
                      <input type="time" value={blockForm.recurringStart}
                        onChange={(e: any) => setBlockForm({ ...blockForm, recurringStart: e.target.value })}
                        style={{ border: '1px solid #efeae8', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: '#635857', backgroundColor: '#fff', outline: 'none', width: '100%', boxSizing: 'border-box' as any, fontFamily: 'inherit' }}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fieldLabel}>Fim — hora</Text>
                      <input type="time" value={blockForm.recurringEnd}
                        onChange={(e: any) => setBlockForm({ ...blockForm, recurringEnd: e.target.value })}
                        style={{ border: '1px solid #efeae8', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: '#635857', backgroundColor: '#fff', outline: 'none', width: '100%', boxSizing: 'border-box' as any, fontFamily: 'inherit' }}
                      />
                    </View>
                  </View>
                ) : (
                  <>
                    <View style={styles.blockFormRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.fieldLabel}>Início — data</Text>
                        <input type="date" value={blockForm.startDate}
                          onChange={(e: any) => setBlockForm({ ...blockForm, startDate: e.target.value })}
                          style={{ border: '1px solid #efeae8', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: '#635857', backgroundColor: '#fff', outline: 'none', width: '100%', boxSizing: 'border-box' as any, fontFamily: 'inherit' }}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.fieldLabel}>Início — hora</Text>
                        <input type="time" value={blockForm.startTime}
                          onChange={(e: any) => setBlockForm({ ...blockForm, startTime: e.target.value })}
                          style={{ border: '1px solid #efeae8', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: '#635857', backgroundColor: '#fff', outline: 'none', width: '100%', boxSizing: 'border-box' as any, fontFamily: 'inherit' }}
                        />
                      </View>
                    </View>
                    <View style={styles.blockFormRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.fieldLabel}>Fim — data</Text>
                        <input type="date" value={blockForm.endDate}
                          onChange={(e: any) => setBlockForm({ ...blockForm, endDate: e.target.value })}
                          style={{ border: '1px solid #efeae8', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: '#635857', backgroundColor: '#fff', outline: 'none', width: '100%', boxSizing: 'border-box' as any, fontFamily: 'inherit' }}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.fieldLabel}>Fim — hora</Text>
                        <input type="time" value={blockForm.endTime}
                          onChange={(e: any) => setBlockForm({ ...blockForm, endTime: e.target.value })}
                          style={{ border: '1px solid #efeae8', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: '#635857', backgroundColor: '#fff', outline: 'none', width: '100%', boxSizing: 'border-box' as any, fontFamily: 'inherit' }}
                        />
                      </View>
                    </View>
                  </>
                )}

                <View style={{ marginBottom: 12 }}>
                  <Text style={styles.fieldLabel}>Motivo (opcional)</Text>
                  <TextInput
                    style={styles.input}
                    value={blockForm.reason}
                    onChangeText={v => setBlockForm({ ...blockForm, reason: v })}
                    placeholder="Ex: Feriado, recesso..."
                    placeholderTextColor="#c2b4b2"
                  />
                </View>

                {blockError ? <Text style={styles.errorText}>{blockError}</Text> : null}

                <View style={styles.btnRow}>
                  <TouchableOpacity
                    style={styles.btnCancel}
                    onPress={() => { setShowBlockForm(false); setBlockForm({ ...EMPTY_BLOCK }); setBlockError(''); }}
                  >
                    <Text style={styles.btnCancelText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.btnSave}
                    onPress={handleAddBlock}
                    disabled={blockSaving}
                    activeOpacity={0.85}
                  >
                    {blockSaving
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={styles.btnSaveText}>Salvar bloqueio</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* Lembretes por e-mail */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Lembretes por e-mail</Text>
                <Text style={styles.sectionSubtitle}>Aviso automático antes do agendamento</Text>
              </View>
              {reminderSaving && <ActivityIndicator color="#8e7f7e" size="small" />}
            </View>

            <View style={styles.reminderRow}>
              {REMINDER_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.reminderChip, reminderValue === opt.value && styles.reminderChipActive]}
                  onPress={() => handleSaveReminder(opt.value)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.reminderChipText, reminderValue === opt.value && styles.reminderChipTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.reminderNote}>
              O lembrete é enviado por e-mail para clientes que têm notificações ativadas.
            </Text>
          </View>

        </View>
      </View>
    </ScrollView>
  );
}

// ── Tela principal ────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  useResponsiveWeb();
  const { isMobile, openDrawer } = useDrawerNav();
  const [activeTab, setActiveTab] = useState<'empresa' | 'informacoes'>('empresa');
  const [activeInfoTab, setActiveInfoTab] = useState<'especialidades' | 'expediente'>('especialidades');
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCompany = useCallback(async () => {
    const token = await getToken();
    const res = await fetch(`${API_URL}/companies/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setCompany(await res.json());
    }
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { fetchCompany(); }, [fetchCompany]));

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {isMobile && (
            <TouchableOpacity onPress={openDrawer} style={{ marginRight: 14, padding: 4 }}>
              <Text style={{ fontSize: 22, color: '#8e7f7e', lineHeight: 22 }}>☰</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.topBarTitle}>Configurações</Text>
        </View>
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {(['empresa', 'informacoes'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'empresa' ? 'Empresa' : 'Informações'}
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
      ) : isMobile ? (
        <View style={{ flex: 1 }}>
          {/* Sub-tab bar — apenas mobile */}
          <View style={[styles.tabBar, { paddingHorizontal: 28, paddingTop: 8 }]}>
            {(['especialidades', 'expediente'] as const).map(tab => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, activeInfoTab === tab && styles.tabActive]}
                onPress={() => setActiveInfoTab(tab)}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, activeInfoTab === tab && styles.tabTextActive]}>
                  {tab === 'especialidades' ? 'Especialidades' : 'Expediente'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {activeInfoTab === 'especialidades' ? (
            <TabEspecialidades />
          ) : (
            <TabExpediente company={company} onRefresh={fetchCompany} />
          )}
        </View>
      ) : (
        /* Desktop: duas colunas lado a lado */
        <View {...{ dataSet: { twoCol: 'true' } } as any} style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#635857', paddingHorizontal: 28, paddingTop: 20, paddingBottom: 4 }}>Especialidades</Text>
            <TabEspecialidades />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#635857', paddingHorizontal: 28, paddingTop: 20, paddingBottom: 4 }}>Expediente</Text>
            <TabExpediente company={company} onRefresh={fetchCompany} />
          </View>
        </View>
      )}
    </View>
  );
}