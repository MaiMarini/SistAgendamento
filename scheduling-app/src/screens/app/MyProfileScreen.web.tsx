import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { API_URL } from '../../lib/config';
import { getToken, supabase } from '../../lib/supabase';
import { useCurrentUser } from '../../lib/UserContext';
import { getInitials, getAvatarColor } from '../../lib/avatar';
import { maskPhone, maskCPF } from '../../lib/masks';
import {
  DaySchedule, TimeBlockItem, BlockForm,
  DAYS_LABELS, EMPTY_SCHEDULE, EMPTY_BLOCK,
} from '../../lib/scheduleConstants';
import { styles } from './SettingsScreen.web.styles';
import { useDrawerNav } from '../../lib/useDrawerNav';
import { modalStyles, detailStyles } from './ClientsScreen.web.styles';

// ── Helpers ───────────────────────────────────────────────────────────────────

const SUPABASE_URL = 'https://curulmrchgqrufzvipoy.supabase.co';

async function uploadPhoto(file: File): Promise<string | null> {
  const token = await getToken();
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `${Date.now()}.${ext}`;
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/professionals/${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': file.type, 'x-upsert': 'true' },
    body: file,
  });
  if (!res.ok) return null;
  const { data } = supabase.storage.from('professionals').getPublicUrl(path);
  return data.publicUrl;
}

function fmtDt(dt: string): string {
  const d = new Date(dt);
  return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

// ── Aba 1: Perfil ─────────────────────────────────────────────────────────────

function TabPerfil({ userId }: { userId: string }) {
  const [pro, setPro] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [duration, setDuration] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    const token = await getToken();
    const res = await fetch(`${API_URL}/professionals/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setPro(data);
      setName(data.name ?? '');
      setCpf(data.cpf ? maskCPF(data.cpf) : '');
      setPhone(data.phone ? maskPhone(data.phone) : '');
      setDuration(String(data.default_duration_minutes ?? 60));
      setPhotoUrl(data.photo_url ?? '');
    }
    setLoading(false);
  }, [userId]);

  useFocusEffect(useCallback(() => { fetchProfile(); }, [fetchProfile]));

  const handlePickPhoto = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploading(true);
      const url = await uploadPhoto(file);
      setUploading(false);
      if (url) setPhotoUrl(url);
    };
    input.click();
  };

  const handleSave = async () => {
    if (!name.trim()) { setError('O nome é obrigatório.'); return; }
    setSaving(true);
    setError('');
    setSaved(false);
    const token = await getToken();
    const res = await fetch(`${API_URL}/professionals/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        name: name.trim(),
        cpf: cpf.replace(/\D/g, '') || null,
        phone: phone || null,
        default_duration_minutes: parseInt(duration, 10) || undefined,
        photo_url: photoUrl || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.detail || 'Erro ao salvar. Tente novamente.');
      return;
    }
    setSaved(true);
    fetchProfile();
    setTimeout(() => setSaved(false), 3000);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#8e7f7e" />
      </View>
    );
  }

  if (!pro) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#a08c8b', fontSize: 14 }}>Perfil não encontrado.</Text>
      </View>
    );
  }

  const initials = getInitials(pro.name);
  const bgColor = pro.color ?? getAvatarColor(pro.name);

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={detailStyles.tabContent}>

      {/* Foto */}
      <View style={{ alignItems: 'center', marginBottom: 8 }}>
        <TouchableOpacity onPress={handlePickPhoto} activeOpacity={0.8} style={{ position: 'relative' }}>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={{ width: 88, height: 88, borderRadius: 44 }} />
          ) : (
            <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: bgColor, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 28, fontWeight: '700', color: '#fff' }}>{initials}</Text>
            </View>
          )}
          <View style={{
            position: 'absolute', bottom: 0, right: 0,
            backgroundColor: '#8e7f7e', borderRadius: 12,
            paddingHorizontal: 7, paddingVertical: 3,
          }}>
            {uploading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={{ fontSize: 11, color: '#fff' }}>Foto</Text>}
          </View>
        </TouchableOpacity>
      </View>

      {/* Identificação */}
      <Text style={modalStyles.sectionHeader}>Identificação</Text>

      <Text style={modalStyles.fieldLabel}>Nome *</Text>
      <TextInput
        style={[modalStyles.input, { marginBottom: 14 }]}
        value={name}
        onChangeText={v => { setName(v); setError(''); }}
        placeholder="Nome completo"
        placeholderTextColor="#c2b4b2"
      />

      <Text style={modalStyles.fieldLabel}>CPF</Text>
      <TextInput
        style={[modalStyles.input, { marginBottom: 0 }]}
        value={cpf}
        onChangeText={v => setCpf(maskCPF(v))}
        placeholder="000.000.000-00"
        placeholderTextColor="#c2b4b2"
        keyboardType="numeric"
      />

      {/* Especialidades */}
      <Text style={modalStyles.sectionHeader}>Especialidades</Text>

      <TextInput
        style={[modalStyles.input, modalStyles.inputDisabled, { marginBottom: 0 }]}
        value={pro.specialties?.length > 0 ? pro.specialties.map((s: any) => s.name).join(', ') : 'Nenhuma'}
        editable={false}
      />

      {/* Contato */}
      <Text style={modalStyles.sectionHeader}>Contato</Text>

      <Text style={modalStyles.fieldLabel}>Telefone</Text>
      <TextInput
        style={[modalStyles.input, { marginBottom: 0 }]}
        value={phone}
        onChangeText={v => setPhone(maskPhone(v))}
        placeholder="(00) 00000-0000"
        placeholderTextColor="#c2b4b2"
        keyboardType="phone-pad"
      />

      {/* Atendimento */}
      <Text style={modalStyles.sectionHeader}>Atendimento</Text>

      <Text style={modalStyles.fieldLabel}>Duração padrão (minutos)</Text>
      <TextInput
        style={[modalStyles.input, { marginBottom: 14 }]}
        value={duration}
        onChangeText={v => setDuration(v.replace(/\D/g, ''))}
        placeholder="Ex: 60"
        placeholderTextColor="#c2b4b2"
        keyboardType="numeric"
      />

      {/* Acesso */}
      <Text style={modalStyles.sectionHeader}>Acesso</Text>

      <Text style={modalStyles.fieldLabel}>E-mail de login</Text>
      <TextInput
        style={[modalStyles.input, modalStyles.inputDisabled, { marginBottom: 0 }]}
        value={pro.email ?? ''}
        editable={false}
      />

      {error ? <Text style={[styles.errorText, { marginTop: 16 }]}>{error}</Text> : null}
      {saved ? <Text style={[detailStyles.savedText, { marginTop: 8 }]}>Alterações salvas com sucesso.</Text> : null}

      <View style={detailStyles.saveRow}>
        <TouchableOpacity
          style={detailStyles.btnSave}
          onPress={handleSave}
          disabled={saving || uploading}
          activeOpacity={0.85}
        >
          {saving
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={detailStyles.btnSaveText}>Salvar Alterações</Text>}
        </TouchableOpacity>
      </View>

    </ScrollView>
  );
}

// ── Aba 2: Expediente ─────────────────────────────────────────────────────────

function TabExpediente() {
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

  const loadData = useCallback(async () => {
    setLoading(true);
    const token = await getToken();
    const [availRes, blocksRes] = await Promise.all([
      fetch(`${API_URL}/professionals/me/availability`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_URL}/professionals/me/time-blocks`, { headers: { Authorization: `Bearer ${token}` } }),
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
    const res = await fetch(`${API_URL}/professionals/me/availability`, {
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
    const res = await fetch(`${API_URL}/professionals/me/time-blocks`, {
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
    await fetch(`${API_URL}/professionals/me/time-blocks/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    loadData();
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
      <View style={styles.twoColRow}>

        {/* ── Coluna esquerda: Horário de atendimento ── */}
        <View style={styles.colLeft}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Horário de atendimento</Text>
                <Text style={styles.sectionSubtitle}>Dias e horários em que você atende</Text>
              </View>
            </View>

            {DAYS_LABELS.map((label, i) => {
              const day = schedule[i];
              return (
                <View key={i} style={styles.dayRow}>
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

                  <Text style={[styles.dayLabel, !day.enabled && styles.dayLabelDisabled]}>{label}</Text>

                  {day.enabled ? (
                    <>
                      <input
                        type="time"
                        value={day.start}
                        onChange={(e: any) => {
                          const next = [...schedule];
                          next[i] = { ...day, start: e.target.value };
                          setSchedule(next);
                          setScheduleSuccess('');
                        }}
                        style={timeInputStyle}
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
                        style={timeInputStyle}
                      />
                    </>
                  ) : (
                    <Text style={{ fontSize: 13, color: '#c2b4b2' }}>Fechado</Text>
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

        {/* ── Coluna direita: Bloqueios ── */}
        <View style={styles.colRight}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Fechamentos e bloqueios</Text>
                <Text style={styles.sectionSubtitle}>Períodos em que você não atende</Text>
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
                    activeOpacity={0.8}
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
        </View>

      </View>
    </ScrollView>
  );
}

// ── Tela principal ────────────────────────────────────────────────────────────

export default function MyProfileScreen() {
  const { userId } = useCurrentUser();
  const [activeTab, setActiveTab] = useState<'perfil' | 'expediente'>('perfil');
  const { isMobile, openDrawer } = useDrawerNav();

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {isMobile && (
            <TouchableOpacity onPress={openDrawer} style={{ marginRight: 14, padding: 4 }}>
              <Text style={{ fontSize: 22, color: '#8e7f7e', lineHeight: 22 }}>☰</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.topBarTitle}>Meu Perfil</Text>
        </View>
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {(['perfil', 'expediente'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'perfil' ? 'Perfil' : 'Expediente'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'perfil'
        ? <TabPerfil userId={userId ?? ''} />
        : <TabExpediente />}
    </View>
  );
}