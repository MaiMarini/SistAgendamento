import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
  Modal, ScrollView, TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getToken } from '../../lib/supabase';
import { API_URL } from '../../lib/config';

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface Professional {
  id: string; name: string; email?: string; cpf?: string; phone?: string;
  color?: string; active: boolean; status?: string; default_duration_minutes: number;
}
interface AddForm { name: string; email: string; cpf: string; phone: string; color: string; defaultDuration: string; }
interface EditForm { name: string; email: string; cpf: string; phone: string; color: string; active: boolean; defaultDuration: string; }

const COLORS = ['#8e7f7e','#c4a882','#7e9e8c','#8e7fa8','#a87e7e','#7e8ea8','#a8a07e','#a87e9e'];

const EMPTY_ADD: AddForm = { name: '', email: '', cpf: '', phone: '', color: '#8e7f7e', defaultDuration: '60' };

// ── Máscaras ──────────────────────────────────────────────────────────────────

function maskPhone(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 7) return `(${d.slice(0,2)}) ${d.slice(2)}`;
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
}
function maskCPF(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0,3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`;
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
}

// ── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status?: string }) {
  const map: Record<string, { label: string; bg: string; text: string }> = {
    pending:  { label: 'Convidado', bg: '#fff8e1', text: '#f9a825' },
    active:   { label: 'Ativo',     bg: '#edf6ee', text: '#388e3c' },
    inactive: { label: 'Inativo',   bg: '#fdecea', text: '#e53935' },
    deleted:  { label: 'Deletado',  bg: '#f5f0ef', text: '#8e7f7e' },
  };
  const c = map[status ?? 'active'] ?? map.active;
  return (
    <View style={[pr.badge, { backgroundColor: c.bg }]}>
      <Text style={[pr.badgeText, { color: c.text }]}>{c.label}</Text>
    </View>
  );
}

// ── Color picker ──────────────────────────────────────────────────────────────

function ColorPicker({ selected, onSelect }: { selected: string; onSelect: (c: string) => void }) {
  return (
    <View style={pr.colorRow}>
      {COLORS.map(c => (
        <TouchableOpacity key={c} style={[pr.colorDot, { backgroundColor: c }, selected === c && pr.colorDotSelected]} onPress={() => onSelect(c)} activeOpacity={0.8} />
      ))}
    </View>
  );
}

// ── Field helper ──────────────────────────────────────────────────────────────

function Field({ label, value, onChangeText, placeholder, keyboardType, autoCapitalize, multiline }: any) {
  return (
    <View style={pr.fieldWrap}>
      <Text style={pr.fieldLabel}>{label}</Text>
      <TextInput style={pr.fieldInput} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#c2b4b2" keyboardType={keyboardType} autoCapitalize={autoCapitalize ?? 'sentences'} multiline={multiline} />
    </View>
  );
}

// ── Card profissional ─────────────────────────────────────────────────────────

function ProCard({ pro, onPress, onLongPress }: { pro: Professional; onPress: () => void; onLongPress: () => void }) {
  const color = pro.color ?? '#8e7f7e';
  return (
    <TouchableOpacity style={pr.card} onPress={onPress} onLongPress={onLongPress} activeOpacity={0.75}>
      <View style={[pr.colorStrip, { backgroundColor: color }]} />
      <View style={pr.cardBody}>
        <View style={pr.cardRow}>
          <Text style={pr.cardName}>{pro.name}</Text>
          <StatusBadge status={pro.status} />
        </View>
        {pro.email ? <Text style={pr.cardSub}>{pro.email}</Text> : null}
        {pro.phone ? <Text style={pr.cardSub}>{pro.phone}</Text> : null}
        <Text style={pr.cardDuration}>{pro.default_duration_minutes} min por atendimento</Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Tela principal ────────────────────────────────────────────────────────────

export default function ProfessionalsScreen() {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [selectedPro, setSelectedPro] = useState<Professional | null>(null);
  const [addForm, setAddForm] = useState<AddForm>(EMPTY_ADD);
  const [editForm, setEditForm] = useState<EditForm>({ name:'', email:'', cpf:'', phone:'', color:'#8e7f7e', active:true, defaultDuration:'60' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchPros = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    setLoading(true);
    const res = await fetch(`${API_URL}/professionals/`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setProfessionals(await res.json());
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { fetchPros(); }, [fetchPros]));

  // ── Add ───────────────────────────────────────────────────────────────────

  const handleAdd = async () => {
    if (!addForm.name.trim() || !addForm.email.trim()) { setError('Nome e e-mail são obrigatórios.'); return; }
    setError(''); setSubmitting(true);
    const token = await getToken();
    const res = await fetch(`${API_URL}/professionals/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        name: addForm.name.trim(), email: addForm.email.trim(),
        cpf: addForm.cpf || undefined, phone: addForm.phone || undefined,
        color: addForm.color, default_duration_minutes: parseInt(addForm.defaultDuration, 10) || 60,
      }),
    });
    setSubmitting(false);
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.detail || 'Erro ao cadastrar.'); return; }
    setShowAdd(false); setAddForm(EMPTY_ADD); fetchPros();
  };

  // ── Edit ──────────────────────────────────────────────────────────────────

  const openEdit = (pro: Professional) => {
    setSelectedPro(pro);
    setEditForm({ name: pro.name, email: pro.email ?? '', cpf: pro.cpf ?? '', phone: pro.phone ?? '', color: pro.color ?? '#8e7f7e', active: pro.active, defaultDuration: String(pro.default_duration_minutes) });
    setError('');
    setShowEdit(true);
  };

  const handleEdit = async () => {
    if (!selectedPro || !editForm.name.trim()) { setError('Nome é obrigatório.'); return; }
    setError(''); setSubmitting(true);
    const token = await getToken();
    const body: any = {
      name: editForm.name.trim(), email: editForm.email || undefined,
      cpf: editForm.cpf || undefined, phone: editForm.phone || undefined,
      color: editForm.color, default_duration_minutes: parseInt(editForm.defaultDuration, 10) || 60,
    };
    if (selectedPro.status !== 'pending') body.active = editForm.active;
    const res = await fetch(`${API_URL}/professionals/${selectedPro.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    setSubmitting(false);
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.detail || 'Erro ao atualizar.'); return; }
    setShowEdit(false); setSelectedPro(null); fetchPros();
  };

  const handleActivate = async () => {
    if (!selectedPro) return;
    setError(''); setSubmitting(true);
    const token = await getToken();
    const res = await fetch(`${API_URL}/professionals/${selectedPro.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ active: true }),
    });
    setSubmitting(false);
    if (!res.ok) { setError('Erro ao ativar profissional.'); return; }
    setShowEdit(false); setSelectedPro(null); fetchPros();
  };

  const handleResendInvite = async () => {
    if (!selectedPro) return;
    const token = await getToken();
    const res = await fetch(`${API_URL}/professionals/${selectedPro.id}/resend-invite`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) Alert.alert('Convite reenviado', `Um novo convite foi enviado para ${selectedPro.email}.`);
    else Alert.alert('Erro', 'Não foi possível reenviar o convite.');
  };

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = (pro: Professional) => {
    Alert.alert('Excluir profissional', `Deseja excluir "${pro.name}"? Esta ação não pode ser desfeita.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
        const token = await getToken();
        await fetch(`${API_URL}/professionals/${pro.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
        fetchPros();
      }},
    ]);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={pr.container}>
      <View style={pr.topBar}>
        <Text style={pr.topBarTitle}>Profissionais</Text>
        <TouchableOpacity style={pr.btnAdd} onPress={() => { setAddForm(EMPTY_ADD); setError(''); setShowAdd(true); }} activeOpacity={0.8}>
          <Text style={pr.btnAddText}>＋ Novo</Text>
        </TouchableOpacity>
      </View>

      {loading ? <ActivityIndicator style={{ marginTop: 40 }} color="#8e7f7e" /> : (
        <FlatList
          data={professionals}
          keyExtractor={p => p.id}
          contentContainerStyle={pr.listContent}
          ListEmptyComponent={<Text style={pr.emptyText}>Nenhum profissional cadastrado.</Text>}
          renderItem={({ item }) => (
            <ProCard pro={item} onPress={() => openEdit(item)} onLongPress={() => handleDelete(item)} />
          )}
        />
      )}

      {/* Modal: Adicionar */}
      <Modal visible={showAdd} animationType="slide" onRequestClose={() => setShowAdd(false)}>
        <View style={pr.modalContainer}>
          <View style={pr.modalHeader}>
            <Text style={pr.modalTitle}>Novo Profissional</Text>
            <TouchableOpacity onPress={() => setShowAdd(false)}><Text style={pr.modalClose}>✕</Text></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={pr.modalBody}>
            <Field label="Nome *" value={addForm.name} onChangeText={(v: string) => setAddForm(f => ({ ...f, name: v }))} placeholder="Nome completo" />
            <Field label="E-mail *" value={addForm.email} onChangeText={(v: string) => setAddForm(f => ({ ...f, email: v.trim() }))} placeholder="email@exemplo.com" keyboardType="email-address" autoCapitalize="none" />
            <Field label="CPF" value={addForm.cpf} onChangeText={(v: string) => setAddForm(f => ({ ...f, cpf: maskCPF(v) }))} placeholder="000.000.000-00" keyboardType="numeric" />
            <Field label="Telefone" value={addForm.phone} onChangeText={(v: string) => setAddForm(f => ({ ...f, phone: maskPhone(v) }))} placeholder="(00) 00000-0000" keyboardType="phone-pad" />
            <Field label="Duração padrão (min)" value={addForm.defaultDuration} onChangeText={(v: string) => setAddForm(f => ({ ...f, defaultDuration: v.replace(/\D/g, '') }))} placeholder="60" keyboardType="numeric" />
            <Text style={pr.fieldLabel}>Cor no calendário</Text>
            <ColorPicker selected={addForm.color} onSelect={c => setAddForm(f => ({ ...f, color: c }))} />
            {error ? <Text style={pr.errorText}>{error}</Text> : null}
            <TouchableOpacity style={pr.btnSave} onPress={handleAdd} disabled={submitting} activeOpacity={0.85}>
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={pr.btnSaveText}>Enviar Convite</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Modal: Editar */}
      <Modal visible={showEdit} animationType="slide" onRequestClose={() => setShowEdit(false)}>
        <View style={pr.modalContainer}>
          <View style={pr.modalHeader}>
            <Text style={pr.modalTitle}>Editar Profissional</Text>
            <TouchableOpacity onPress={() => setShowEdit(false)}><Text style={pr.modalClose}>✕</Text></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={pr.modalBody}>
            <Field label="Nome *" value={editForm.name} onChangeText={(v: string) => setEditForm(f => ({ ...f, name: v }))} placeholder="Nome completo" />
            <Field label="E-mail" value={editForm.email} onChangeText={(v: string) => setEditForm(f => ({ ...f, email: v.trim() }))} placeholder="email@exemplo.com" keyboardType="email-address" autoCapitalize="none" />
            <Field label="CPF" value={editForm.cpf} onChangeText={(v: string) => setEditForm(f => ({ ...f, cpf: maskCPF(v) }))} placeholder="000.000.000-00" keyboardType="numeric" />
            <Field label="Telefone" value={editForm.phone} onChangeText={(v: string) => setEditForm(f => ({ ...f, phone: maskPhone(v) }))} placeholder="(00) 00000-0000" keyboardType="phone-pad" />
            <Field label="Duração padrão (min)" value={editForm.defaultDuration} onChangeText={(v: string) => setEditForm(f => ({ ...f, defaultDuration: v.replace(/\D/g, '') }))} placeholder="60" keyboardType="numeric" />
            <Text style={pr.fieldLabel}>Cor no calendário</Text>
            <ColorPicker selected={editForm.color} onSelect={c => setEditForm(f => ({ ...f, color: c }))} />

            {selectedPro?.status === 'pending' ? (
              <>
                <TouchableOpacity style={[pr.btnSave, { backgroundColor: '#388e3c', marginTop: 16 }]} onPress={handleActivate} disabled={submitting} activeOpacity={0.85}>
                  {submitting ? <ActivityIndicator color="#fff" /> : <Text style={pr.btnSaveText}>Ativar conta</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={pr.btnSecondary} onPress={handleResendInvite} activeOpacity={0.8}>
                  <Text style={pr.btnSecondaryText}>Reenviar convite</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={pr.toggleRow}>
                <Text style={pr.fieldLabel}>Status</Text>
                <TouchableOpacity
                  style={[pr.toggleBtn, editForm.active && pr.toggleBtnOn]}
                  onPress={() => setEditForm(f => ({ ...f, active: !f.active }))}
                  activeOpacity={0.8}
                >
                  <Text style={[pr.toggleText, editForm.active && pr.toggleTextOn]}>
                    {editForm.active ? 'Ativo' : 'Inativo'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {error ? <Text style={pr.errorText}>{error}</Text> : null}
            <TouchableOpacity style={[pr.btnSave, { marginTop: 8 }]} onPress={handleEdit} disabled={submitting} activeOpacity={0.85}>
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={pr.btnSaveText}>Salvar</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const pr = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fcfaf9' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#efeae8' },
  topBarTitle: { fontSize: 20, fontWeight: '700', color: '#635857' },
  btnAdd: { backgroundColor: '#8e7f7e', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  btnAddText: { color: '#ffffff', fontSize: 13, fontWeight: '600' },

  listContent: { padding: 16, gap: 10 },
  emptyText: { textAlign: 'center', color: '#a08c8b', marginTop: 40, fontSize: 14 },

  card: { backgroundColor: '#ffffff', borderRadius: 12, flexDirection: 'row', overflow: 'hidden', shadowColor: '#8e7f7e', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  colorStrip: { width: 5 },
  cardBody: { flex: 1, padding: 14 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardName: { fontSize: 15, fontWeight: '700', color: '#3d2f2e', flex: 1, marginRight: 8 },
  cardSub: { fontSize: 12, color: '#a08c8b', marginTop: 2 },
  cardDuration: { fontSize: 11, color: '#c2b4b2', marginTop: 4 },

  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '600' },

  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  colorDot: { width: 30, height: 30, borderRadius: 15 },
  colorDotSelected: { borderWidth: 3, borderColor: '#ffffff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.3, shadowRadius: 3, elevation: 3 },

  modalContainer: { flex: 1, backgroundColor: '#fcfaf9' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#efeae8' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#635857' },
  modalClose: { fontSize: 18, color: '#a08c8b', padding: 4 },
  modalBody: { padding: 20, gap: 4 },

  fieldWrap: { marginBottom: 14 },
  fieldLabel: { fontSize: 11, fontWeight: '600', color: '#635857', letterSpacing: 0.5, marginBottom: 6, textTransform: 'uppercase' },
  fieldInput: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#efeae8', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: '#635857' },

  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  toggleBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f7f2f1' },
  toggleBtnOn: { backgroundColor: '#edf6ee' },
  toggleText: { fontSize: 13, color: '#a08c8b', fontWeight: '600' },
  toggleTextOn: { color: '#388e3c' },

  errorText: { color: '#e53935', fontSize: 13, marginBottom: 8, textAlign: 'center' },
  btnSave: { backgroundColor: '#8e7f7e', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  btnSaveText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  btnSecondary: { borderWidth: 1, borderColor: '#8e7f7e', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 10 },
  btnSecondaryText: { color: '#8e7f7e', fontSize: 14, fontWeight: '600' },
});