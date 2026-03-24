import { StyleSheet } from 'react-native';
import { commonDefs as c } from './commonStyles';

export const styles = StyleSheet.create({
  container: c.container,
  topBar: c.topBarRow,
  topBarTitle: c.topBarTitle,
  btnNew: c.btnPrimary,
  btnNewText: c.btnPrimaryText,
  content: c.contentPad,
  emptyState: c.emptyState,
  emptyText: c.emptyText,
});

// ── Card de cliente
export const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#efeae8',
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#8e7f7e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    cursor: 'pointer',
  } as any,

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    flexShrink: 0,
  },
  avatarText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },

  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: '#635857', marginBottom: 3 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaText: { fontSize: 13, color: '#a08c8b' },
  separator: { width: 1, height: 11, backgroundColor: '#efeae8' },

  badges: { flexDirection: 'row', gap: 6, marginLeft: 12, flexShrink: 0 },
  badge: { paddingVertical: 3, paddingHorizontal: 9, borderRadius: 20 },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  } as any,
  badgeMinor: { backgroundColor: '#e3f2fd' },
  badgeMinorText: { color: '#1565c0' },
  badgeProvisional: { backgroundColor: '#fdecea' },
  badgeProvisionalText: { color: '#c62828' },
  badgeActive: { backgroundColor: '#e8f5e9' },
  badgeActiveText: { color: '#2e7d32' },
  badgeInactive: { backgroundColor: '#f5f5f5' },
  badgeInactiveText: { color: '#9e9e9e' },

  actions: { flexDirection: 'row', gap: 8, marginLeft: 12 },
  btnIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer',
  } as any,
  btnBook: { borderColor: '#c8e6c9', backgroundColor: '#f1f8e9' },
  btnEdit: { borderColor: '#efeae8' },
  btnDelete: { borderColor: '#fce4e4', backgroundColor: '#fff5f5' },
  btnIconText: { fontSize: 14 },
});

// ── Modal
export const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(99, 88, 87, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 30,
    width: 580,
    maxHeight: '90%' as any,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 18, fontWeight: '600', color: '#635857' },
  closeButton: { cursor: 'pointer' } as any,
  closeText: { fontSize: 26, color: '#a08c8b', lineHeight: 28 },

  // Cabeçalho de seção
  sectionHeader: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8e7f7e',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginTop: 16,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f7f2f1',
  } as any,

  // Campos
  field: { marginBottom: 14 },
  fieldRow: { flexDirection: 'row', gap: 10, marginBottom: 0 },
  fieldThird: { flex: 1 },
  fieldHalf: { flex: 1 },
  fieldTwo: { flex: 2 },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#635857',
    letterSpacing: 1,
    marginBottom: 6,
    textTransform: 'uppercase',
  } as any,
  input: {
    borderWidth: 1,
    borderColor: '#efeae8',
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#635857',
    backgroundColor: '#fdfcfc',
    outlineStyle: 'none',
  } as any,
  inputFocused: { borderColor: '#c2b4b2', backgroundColor: '#ffffff' },
  inputDisabled: { backgroundColor: '#f9f7f7', color: '#b0a0a0' },

  // Linha de telefone + toggle WhatsApp
  phoneRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  phoneField: { flex: 1 },
  wpToggle: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#efeae8',
    backgroundColor: '#fdfcfc',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    cursor: 'pointer',
    marginBottom: 0,
  } as any,
  wpToggleActive: {
    backgroundColor: '#e8f5e9',
    borderColor: '#c8e6c9',
  },
  wpToggleText: { fontSize: 12, fontWeight: '600', color: '#a08c8b' },
  wpToggleTextActive: { color: '#2e7d32' },

  // Seletor de canal de notificação
  channelRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  channelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#efeae8',
    alignItems: 'center',
    cursor: 'pointer',
  } as any,
  channelBtnActive: { backgroundColor: '#8e7f7e', borderColor: '#8e7f7e' },
  channelBtnText: { fontSize: 13, fontWeight: '600', color: '#a08c8b' },
  channelBtnTextActive: { color: '#ffffff' },

  // Toggle de notificações
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#efeae8',
    borderRadius: 9,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  notifLabel: { fontSize: 14, color: '#635857', fontWeight: '500' },
  toggle: {
    width: 40,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#e0d8d7',
    justifyContent: 'center',
    paddingHorizontal: 2,
    cursor: 'pointer',
  } as any,
  toggleOn: { backgroundColor: '#8e7f7e' },
  toggleThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ffffff',
  },
  toggleThumbOn: { alignSelf: 'flex-end' },

  // Aviso de menor de idade
  minorNote: {
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  minorNoteText: { fontSize: 12, color: '#1565c0', fontWeight: '500' },

  errorText: { color: '#e74c3c', fontSize: 13, marginBottom: 10, textAlign: 'center' },
  footer: { flexDirection: 'row', gap: 12, marginTop: 20 },
  btnCancel: {
    flex: 1, paddingVertical: 12, borderRadius: 9,
    borderWidth: 1, borderColor: '#efeae8', alignItems: 'center',
    cursor: 'pointer',
  } as any,
  btnCancelText: { fontSize: 14, color: '#a08c8b', fontWeight: '500' },
  btnSave: {
    flex: 2, paddingVertical: 12, borderRadius: 9,
    backgroundColor: '#8e7f7e', alignItems: 'center',
    cursor: 'pointer',
  } as any,
  btnSaveText: { fontSize: 14, color: '#ffffff', fontWeight: '600' },

  // Detalhe
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#f7f2f1',
  },
  detailLabel: {
    fontSize: 11, fontWeight: '600', color: '#a08c8b',
    textTransform: 'uppercase', letterSpacing: 0.5,
  } as any,
  detailValue: { fontSize: 14, color: '#635857', flexShrink: 1, textAlign: 'right', maxWidth: '65%' as any },
});

// ── Detail view (tela de perfil do cliente)
export const detailStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#efeae8',
    backgroundColor: '#ffffff',
    gap: 16,
  },
  backBtn: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#efeae8',
    cursor: 'pointer',
  } as any,
  backBtnText: { fontSize: 13, color: '#8e7f7e', fontWeight: '500' },

  headerClient: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  headerAvatar: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
  },
  headerAvatarText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  headerName: { fontSize: 17, fontWeight: '600', color: '#635857' },
  headerMeta: { fontSize: 13, color: '#a08c8b', marginTop: 1 },

  headerActions: { flexDirection: 'row', gap: 8 },
  btnHeaderBook: {
    paddingVertical: 8, paddingHorizontal: 14,
    borderRadius: 8, backgroundColor: '#6aab70',
    cursor: 'pointer',
  } as any,
  btnHeaderBookText: { color: '#ffffff', fontSize: 13, fontWeight: '600' },
  btnHeaderDelete: {
    paddingVertical: 8, paddingHorizontal: 14,
    borderRadius: 8, borderWidth: 1, borderColor: '#fce4e4',
    backgroundColor: '#fff5f5', cursor: 'pointer',
  } as any,
  btnHeaderDeleteText: { color: '#c0392b', fontSize: 13, fontWeight: '500' },

  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 28,
    paddingTop: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#efeae8',
    backgroundColor: '#ffffff',
  },
  tab: {
    paddingVertical: 14,
    paddingHorizontal: 4,
    marginRight: 24,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    cursor: 'pointer',
  } as any,
  tabActive: { borderBottomColor: '#8e7f7e' },
  tabText: { fontSize: 14, color: '#a08c8b', fontWeight: '500' },
  tabTextActive: { color: '#635857', fontWeight: '600' },

  tabBody: { flex: 1, overflow: 'hidden' as any },
  tabContent: { paddingHorizontal: 28, paddingTop: 20, paddingBottom: 40 },

  saveRow: { marginTop: 8, alignItems: 'flex-end' },
  btnSave: {
    paddingVertical: 11, paddingHorizontal: 24,
    borderRadius: 9, backgroundColor: '#8e7f7e',
    cursor: 'pointer',
  } as any,
  btnSaveText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  savedText: { fontSize: 13, color: '#2e7d32', marginBottom: 8, textAlign: 'right' as any },

  // Notes tab
  notesLabel: { fontSize: 13, fontWeight: '600', color: '#8e7f7e', marginBottom: 6 },
  emptyHint: { fontSize: 13, color: '#c2b4b2', paddingVertical: 10 },

  // Document upload area
  uploadRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  uploadHint: { fontSize: 12, color: '#a08c8b' },
  uploadError: { fontSize: 13, color: '#c0392b', marginBottom: 8 },

  // Document list
  docCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#ffffff', borderRadius: 10,
    borderWidth: 1, borderColor: '#efeae8',
    padding: 12, marginBottom: 8, gap: 10,
  },
  docIcon: { fontSize: 22, flexShrink: 0 },
  docInfo: { flex: 1, minWidth: 0 },
  docName: { fontSize: 14, fontWeight: '600', color: '#635857' },
  docMeta: { fontSize: 12, color: '#a08c8b', marginTop: 2 },
  docBtn: {
    paddingVertical: 5, paddingHorizontal: 12,
    borderRadius: 7, borderWidth: 1, borderColor: '#efeae8',
    cursor: 'pointer',
  } as any,
  docBtnText: { fontSize: 13, color: '#635857', fontWeight: '500' },
  docBtnDelete: { borderColor: '#fce4e4', backgroundColor: '#fff5f5' },
  docBtnDeleteText: { fontSize: 14, color: '#c0392b', fontWeight: '600' },

  // Observation history entries
  obsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#efeae8',
    padding: 14,
    marginBottom: 8,
  },
  obsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  obsBadge: {
    paddingVertical: 2, paddingHorizontal: 8,
    borderRadius: 20, borderWidth: 1,
  },
  obsBadgeManual: { backgroundColor: '#f7f2f1', borderColor: '#e0d8d7' },
  obsBadgeAppt: { backgroundColor: '#e3f2fd', borderColor: '#bbdefb' },
  obsBadgeText: { fontSize: 10, fontWeight: '700' } as any,
  obsBadgeManualText: { color: '#8e7f7e' },
  obsBadgeApptText: { color: '#1565c0' },
  obsDate: { fontSize: 12, color: '#a08c8b', flex: 1 },
  obsEditBtn: { padding: 4, cursor: 'pointer' } as any,
  obsEditText: { fontSize: 15, color: '#8e7f7e', lineHeight: 18 },
  obsDeleteBtn: {
    padding: 4,
    cursor: 'pointer',
  } as any,
  obsDeleteText: { fontSize: 16, color: '#c0392b', lineHeight: 18 },
  obsContent: { fontSize: 14, color: '#635857', lineHeight: 21 },

  // Inline doc row inside observation card
  obsDocRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 8, marginTop: 10,
    paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f0ebe9',
  },
  obsDocName: { flex: 1, fontSize: 13, color: '#635857', minWidth: 0 },
  obsDocOpen: { fontSize: 12, color: '#9b6fa0', fontWeight: '600' as any },

  // Attach file to new observation
  attachRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  attachBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 6, paddingHorizontal: 14,
    borderRadius: 8, borderWidth: 1, borderColor: '#e0d8d7',
    backgroundColor: '#fdfcfc', cursor: 'pointer',
  } as any,
  attachBtnText: { fontSize: 13, color: '#8e7f7e' },
  pendingFile: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    gap: 8, paddingVertical: 6, paddingHorizontal: 12,
    borderRadius: 8, borderWidth: 1, borderColor: '#e0d8d7',
    backgroundColor: '#fdfcfc',
  },
  pendingFileName: { flex: 1, fontSize: 13, color: '#635857', minWidth: 0 },
  pendingFileRemove: { fontSize: 16, color: '#c0392b', paddingHorizontal: 4 },

  // Appointments tab
  sectionDivider: {
    fontSize: 10, fontWeight: '700', color: '#a08c8b',
    textTransform: 'uppercase', letterSpacing: 1.5,
    marginTop: 16, marginBottom: 10,
    paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#f7f2f1',
  } as any,
  apptCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#ffffff', borderRadius: 10,
    borderWidth: 1, borderColor: '#efeae8',
    padding: 14, marginBottom: 8, gap: 12,
  },
  apptProDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  apptInfo: { flex: 1 },
  apptDate: { fontSize: 14, fontWeight: '600', color: '#635857' },
  apptPro: { fontSize: 13, color: '#a08c8b', marginTop: 2 },
  apptNotes: { fontSize: 12, color: '#b0a0a0', marginTop: 3, fontStyle: 'italic' as any },
  apptBadge: { paddingVertical: 3, paddingHorizontal: 9, borderRadius: 20 },
  apptBadgeText: { fontSize: 11, fontWeight: '700' } as any,

  provisionalBanner: {
    marginTop: 6,
    paddingVertical: 6, paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#fdecea',
    borderWidth: 1, borderColor: '#f5c6c6',
  },
  provisionalBannerText: { fontSize: 12, color: '#c62828', fontWeight: '600' as any },
});
