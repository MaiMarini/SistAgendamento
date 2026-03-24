import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
  Modal, ScrollView, TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getToken } from '../../lib/supabase';
import { API_URL } from '../../lib/config';

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface Client {
  id: string; name: string; email?: string; phone?: string;
  cpf?: string; birth_date?: string; is_minor?: boolean;
  observations?: string; active: boolean;
}
interface Observation { id: string; content: string; source: string; source_label?: string; created_at: string; }

// ── Helpers ───────────────────────────────────────────────────────────────────

const AVATAR_COLORS = ['#8e7f7e','#c4a882','#7e9e8c','#8e7fa8','#a87e7e','#7e8ea8','#a8a07e','#a87e9e'];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
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
function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
function fmtObs(iso: string): string {
  const dt = new Date(iso);
  return dt.toLocaleDateString('pt-BR') + ' ' + dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// ── Subcomponentes ────────────────────────────────────────────────────────────

function Field({ label, value, onChangeText, placeholder, keyboardType, autoCapitalize, multiline }: any) {
  return (
    <View style={cl.fieldWrap}>
      <Text style={cl.fieldLabel}>{label}</Text>
      <TextInput style={[cl.fieldInput, multiline && { height: 80, textAlignVertical: 'top' }]} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#c2b4b2" keyboardType={keyboardType} autoCapitalize={autoCapitalize ?? 'sentences'} multiline={multiline} />
    </View>
  );
}

function Avatar({ name }: { name: string }) {
  const bg = getAvatarColor(name);
  return (
    <View style={[cl.avatar, { backgroundColor: bg }]}>
      <Text style={cl.avatarText}>{getInitials(name)}</Text>
    </View>
  );
}

function ClientCard({ client, onPress }: { client: Client; onPress: () => void }) {
  return (
    <TouchableOpacity style={cl.card} onPress={onPress} activeOpacity={0.75}>
      <Avatar name={client.name} />
      <View style={cl.cardBody}>
        <View style={cl.cardRow}>
          <Text style={cl.cardName} numberOfLines={1}>{client.name}</Text>
          {client.is_minor && <View style={cl.minorBadge}><Text style={cl.minorBadgeText}>Menor</Text></View>}
        </View>
        {client.phone ? <Text style={cl.cardSub}>{client.phone}</Text> : null}
        {client.email ? <Text style={cl.cardSub}>{client.email}</Text> : null}
      </View>
    </TouchableOpacity>
  );
}

// ── Tela principal ────────────────────────────────────────────────────────────

export default function ClientsScreen() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [newObs, setNewObs] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [addForm, setAddForm] = useState({ name:'', phone:'', email:'', cpf:'', birth_date:'', observations:'' });
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchClients = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    setLoading(true);
    const params = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
    const res = await fetch(`${API_URL}/clients/${params}`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setClients(await res.json());
    setLoading(false);
  }, [search]);

  useFocusEffect(useCallback(() => { fetchClients(); }, [fetchClients]));

  const openDetail = async (client: Client) => {
    setSelectedClient(client);
    setNewObs('');
    setShowDetail(true);
    setLoadingDetail(true);
    const token = await getToken();
    if (!token) { setLoadingDetail(false); return; }
    const res = await fetch(`${API_URL}/clients/${client.id}/observations`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setObservations(await res.json());
    setLoadingDetail(false);
  };

  const handleAddObs = async () => {
    if (!newObs.trim() || !selectedClient) return;
    const token = await getToken();
    const res = await fetch(`${API_URL}/clients/${selectedClient.id}/observations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ content: newObs.trim() }),
    });
    if (res.ok) {
      setNewObs('');
      const obsRes = await fetch(`${API_URL}/clients/${selectedClient.id}/observations`, { headers: { Authorization: `Bearer ${token}` } });
      if (obsRes.ok) setObservations(await obsRes.json());
    }
  };

  const handleDeactivate = (client: Client) => {
    Alert.alert('Desativar cliente', `Deseja desativar "${client.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Desativar', style: 'destructive', onPress: async () => {
        const token = await getToken();
        await fetch(`${API_URL}/clients/${client.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
        setShowDetail(false);
        fetchClients();
      }},
    ]);
  };

  const handleAdd = async () => {
    if (!addForm.name.trim()) { setError('Nome é obrigatório.'); return; }
    setError(''); setSubmitting(true);
    const token = await getToken();
    const body: any = { name: addForm.name.trim() };
    if (addForm.phone) body.phone = addForm.phone;
    if (addForm.email) body.email = addForm.email;
    if (addForm.cpf) body.cpf = addForm.cpf.replace(/\D/g, '');
    if (addForm.birth_date) body.birth_date = addForm.birth_date;
    if (addForm.observations) body.observations = addForm.observations;
    const res = await fetch(`${API_URL}/clients/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    setSubmitting(false);
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.detail || 'Erro ao cadastrar.'); return; }
    setShowAdd(false);
    setAddForm({ name:'', phone:'', email:'', cpf:'', birth_date:'', observations:'' });
    fetchClients();
  };

  const filtered = clients.filter(c => !search.trim() || c.name.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <View style={cl.container}>
      <View style={cl.topBar}>
        <Text style={cl.topBarTitle}>Clientes</Text>
        <TouchableOpacity style={cl.btnAdd} onPress={() => { setError(''); setShowAdd(true); }} activeOpacity={0.8}>
          <Text style={cl.btnAddText}>＋ Novo</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={cl.searchRow}>
        <TextInput style={cl.searchInput} placeholder="Buscar cliente..." placeholderTextColor="#c2b4b2" value={search} onChangeText={v => { setSearch(v); fetchClients(); }} />
      </View>

      {loading ? <ActivityIndicator style={{ marginTop: 40 }} color="#8e7f7e" /> : (
        <FlatList
          data={filtered}
          keyExtractor={c => c.id}
          contentContainerStyle={cl.listContent}
          ListEmptyComponent={<Text style={cl.emptyText}>Nenhum cliente encontrado.</Text>}
          renderItem={({ item }) => <ClientCard client={item} onPress={() => openDetail(item)} />}
        />
      )}

      {/* Modal: Detalhe */}
      <Modal visible={showDetail} animationType="slide" onRequestClose={() => setShowDetail(false)}>
        <View style={cl.modalContainer}>
          <View style={cl.modalHeader}>
            <Text style={cl.modalTitle} numberOfLines={1}>{selectedClient?.name}</Text>
            <TouchableOpacity onPress={() => setShowDetail(false)}><Text style={cl.modalClose}>✕</Text></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={cl.modalBody}>
            {selectedClient && (
              <>
                <View style={cl.detailAvatarRow}>
                  <Avatar name={selectedClient.name} />
                  <View style={{ flex: 1, marginLeft: 16 }}>
                    <Text style={cl.detailName}>{selectedClient.name}</Text>
                    {selectedClient.is_minor && <View style={cl.minorBadge}><Text style={cl.minorBadgeText}>Menor de idade</Text></View>}
                  </View>
                </View>
                <View style={cl.divider} />
                {selectedClient.phone && <View style={cl.detailRow}><Text style={cl.detailLabel}>Telefone</Text><Text style={cl.detailValue}>{selectedClient.phone}</Text></View>}
                {selectedClient.email && <View style={cl.detailRow}><Text style={cl.detailLabel}>E-mail</Text><Text style={cl.detailValue}>{selectedClient.email}</Text></View>}
                {selectedClient.cpf && <View style={cl.detailRow}><Text style={cl.detailLabel}>CPF</Text><Text style={cl.detailValue}>{maskCPF(selectedClient.cpf)}</Text></View>}
                {selectedClient.birth_date && <View style={cl.detailRow}><Text style={cl.detailLabel}>Nascimento</Text><Text style={cl.detailValue}>{fmtDate(selectedClient.birth_date)}</Text></View>}
                {selectedClient.observations && <View style={cl.detailRow}><Text style={cl.detailLabel}>Obs.</Text><Text style={cl.detailValue}>{selectedClient.observations}</Text></View>}

                <View style={cl.divider} />
                <Text style={cl.sectionTitle}>Observações</Text>
                {loadingDetail ? <ActivityIndicator color="#8e7f7e" /> : (
                  observations.length === 0
                    ? <Text style={cl.emptyText}>Nenhuma observação.</Text>
                    : observations.map(o => (
                      <View key={o.id} style={cl.obsCard}>
                        <Text style={cl.obsContent}>{o.content}</Text>
                        <Text style={cl.obsMeta}>{o.source === 'appointment' ? `📋 ${o.source_label ?? 'Agendamento'}` : '✏️ Manual'} · {fmtObs(o.created_at)}</Text>
                      </View>
                    ))
                )}
                <View style={cl.obsInputRow}>
                  <TextInput style={cl.obsInput} placeholder="Nova observação..." placeholderTextColor="#c2b4b2" value={newObs} onChangeText={setNewObs} multiline />
                  <TouchableOpacity style={cl.obsBtn} onPress={handleAddObs} disabled={!newObs.trim()} activeOpacity={0.8}>
                    <Text style={cl.obsBtnText}>Adicionar</Text>
                  </TouchableOpacity>
                </View>

                <View style={cl.divider} />
                <TouchableOpacity style={cl.btnDanger} onPress={() => handleDeactivate(selectedClient)} activeOpacity={0.85}>
                  <Text style={cl.btnDangerText}>Desativar cliente</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Modal: Adicionar */}
      <Modal visible={showAdd} animationType="slide" onRequestClose={() => setShowAdd(false)}>
        <View style={cl.modalContainer}>
          <View style={cl.modalHeader}>
            <Text style={cl.modalTitle}>Novo Cliente</Text>
            <TouchableOpacity onPress={() => setShowAdd(false)}><Text style={cl.modalClose}>✕</Text></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={cl.modalBody}>
            <Field label="Nome *" value={addForm.name} onChangeText={(v: string) => setAddForm(f => ({ ...f, name: v }))} placeholder="Nome completo" />
            <Field label="Telefone" value={addForm.phone} onChangeText={(v: string) => setAddForm(f => ({ ...f, phone: maskPhone(v) }))} placeholder="(00) 00000-0000" keyboardType="phone-pad" />
            <Field label="E-mail" value={addForm.email} onChangeText={(v: string) => setAddForm(f => ({ ...f, email: v.trim() }))} placeholder="email@exemplo.com" keyboardType="email-address" autoCapitalize="none" />
            <Field label="CPF" value={addForm.cpf} onChangeText={(v: string) => setAddForm(f => ({ ...f, cpf: maskCPF(v) }))} placeholder="000.000.000-00" keyboardType="numeric" />
            <Field label="Data de nascimento (AAAA-MM-DD)" value={addForm.birth_date} onChangeText={(v: string) => setAddForm(f => ({ ...f, birth_date: v }))} placeholder="1990-01-15" keyboardType="numeric" />
            <Field label="Observações" value={addForm.observations} onChangeText={(v: string) => setAddForm(f => ({ ...f, observations: v }))} placeholder="Observações gerais..." multiline />
            {error ? <Text style={cl.errorText}>{error}</Text> : null}
            <TouchableOpacity style={cl.btnSave} onPress={handleAdd} disabled={submitting} activeOpacity={0.85}>
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={cl.btnSaveText}>Cadastrar</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const cl = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fcfaf9' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#efeae8' },
  topBarTitle: { fontSize: 20, fontWeight: '700', color: '#635857' },
  btnAdd: { backgroundColor: '#8e7f7e', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  btnAddText: { color: '#ffffff', fontSize: 13, fontWeight: '600' },

  searchRow: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#efeae8' },
  searchInput: { backgroundColor: '#f7f2f1', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9, fontSize: 14, color: '#635857' },

  listContent: { padding: 16, gap: 10 },
  emptyText: { textAlign: 'center', color: '#a08c8b', marginTop: 24, fontSize: 14 },

  card: { backgroundColor: '#ffffff', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', shadowColor: '#8e7f7e', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardBody: { flex: 1, marginLeft: 12 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardName: { fontSize: 15, fontWeight: '700', color: '#3d2f2e', flex: 1 },
  cardSub: { fontSize: 12, color: '#a08c8b', marginTop: 2 },

  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },

  minorBadge: { backgroundColor: '#e3f0fd', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  minorBadgeText: { fontSize: 10, color: '#1976d2', fontWeight: '600' },

  modalContainer: { flex: 1, backgroundColor: '#fcfaf9' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#efeae8' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#635857', flex: 1, marginRight: 12 },
  modalClose: { fontSize: 18, color: '#a08c8b', padding: 4 },
  modalBody: { padding: 20, gap: 4 },

  detailAvatarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  detailName: { fontSize: 18, fontWeight: '700', color: '#3d2f2e', marginBottom: 6 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  detailLabel: { fontSize: 13, color: '#a08c8b' },
  detailValue: { fontSize: 13, color: '#635857', fontWeight: '600', flex: 1, textAlign: 'right' },

  divider: { height: 1, backgroundColor: '#efeae8', marginVertical: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#635857', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },

  obsCard: { backgroundColor: '#ffffff', borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#efeae8' },
  obsContent: { fontSize: 14, color: '#3d2f2e', lineHeight: 20 },
  obsMeta: { fontSize: 11, color: '#a08c8b', marginTop: 6 },
  obsInputRow: { gap: 8, marginTop: 8 },
  obsInput: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#efeae8', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#635857', minHeight: 60, textAlignVertical: 'top' },
  obsBtn: { backgroundColor: '#8e7f7e', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  obsBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '600' },

  fieldWrap: { marginBottom: 14 },
  fieldLabel: { fontSize: 11, fontWeight: '600', color: '#635857', letterSpacing: 0.5, marginBottom: 6, textTransform: 'uppercase' },
  fieldInput: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#efeae8', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: '#635857' },

  errorText: { color: '#e53935', fontSize: 13, marginBottom: 8, textAlign: 'center' },
  btnSave: { backgroundColor: '#8e7f7e', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  btnSaveText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  btnDanger: { borderWidth: 1, borderColor: '#e53935', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  btnDangerText: { color: '#e53935', fontSize: 14, fontWeight: '600' },
});