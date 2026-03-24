import { StyleSheet } from 'react-native';
import { commonDefs as c } from './commonStyles';

export const styles = StyleSheet.create({
  container: c.container,
  topBar: c.topBarSimple,
  topBarTitle: c.topBarTitle,

  // ── Tab bar ──────────────────────────────────────────────────────────────
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 28,
    paddingBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#efeae8',
    gap: 4,
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    cursor: 'pointer',
  } as any,
  tabActive: {
    borderBottomColor: '#8e7f7e',
  },
  tabText: { fontSize: 14, fontWeight: '500', color: '#a08c8b' },
  tabTextActive: { color: '#635857' },

  // ── Detail content (aba Empresa — estilo ClientsScreen) ──────────────────
  detailContent: {
    paddingHorizontal: 28,
    paddingTop: 20,
    paddingBottom: 40,
    maxWidth: 560,
  },
  sectionDivider: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8e7f7e',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginTop: 20,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f7f2f1',
  } as any,
  saveRow: {
    marginTop: 8,
    alignItems: 'flex-end',
  },

  // ── Content area ─────────────────────────────────────────────────────────
  content: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 40,
    maxWidth: 680,
  },

  // Layout de duas colunas (aba Expediente)
  contentWide: {
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 40,
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 20,
    alignItems: 'flex-start',
  },
  colLeft: {
    flex: 1,
    minWidth: 0,
  },
  colRight: {
    flex: 1,
    minWidth: 0,
  },

  // ── Section ──────────────────────────────────────────────────────────────
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#efeae8',
    padding: 24,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#635857',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#a08c8b',
    marginTop: 2,
  },

  // ── Info rows (read mode) ─────────────────────────────────────────────────
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f7f2f1',
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#a08c8b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    width: 100,
  } as any,
  infoValue: { fontSize: 14, color: '#635857', flex: 1 },
  infoValueMuted: { fontSize: 14, color: '#c2b4b2', flex: 1 },

  // ── Edit form ─────────────────────────────────────────────────────────────
  fieldLabel: {
    fontSize: 11,
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
    paddingHorizontal: 13,
    paddingVertical: 11,
    fontSize: 14,
    color: '#635857',
    backgroundColor: '#fdfcfc',
    marginBottom: 14,
    outlineStyle: 'none',
  } as any,
  inputDisabled: {
    backgroundColor: '#f7f2f1',
    color: '#a08c8b',
  },

  // ── Buttons ───────────────────────────────────────────────────────────────
  btnEdit: {
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#efeae8',
    cursor: 'pointer',
  } as any,
  btnEditText: { fontSize: 13, color: '#635857', fontWeight: '500' },

  btnRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  btnCancel: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#efeae8',
    alignItems: 'center',
    cursor: 'pointer',
  } as any,
  btnCancelText: { fontSize: 14, color: '#a08c8b', fontWeight: '500' },

  saveBtn: {
    marginTop: 4,
    paddingVertical: 11,
    borderRadius: 9,
    backgroundColor: '#8e7f7e',
    alignItems: 'center',
    cursor: 'pointer',
  } as any,
  saveBtnText: { fontSize: 14, color: '#fff', fontWeight: '600' },

  inputError: { borderColor: '#e53935' },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#a08c8b',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 4,
  } as any,
  btnSave: {
    flex: 2,
    paddingVertical: 11,
    borderRadius: 9,
    backgroundColor: '#8e7f7e',
    alignItems: 'center',
    cursor: 'pointer',
  } as any,
  btnSaveText: { fontSize: 14, color: '#ffffff', fontWeight: '600' },

  // ── Schedule / availability ───────────────────────────────────────────────
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f7f2f1',
  },
  dayToggle: {
    width: 36,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#e8ddd9',
    justifyContent: 'center',
    paddingHorizontal: 2,
    cursor: 'pointer',
  } as any,
  dayToggleOn: { backgroundColor: '#8e7f7e' },
  dayToggleThumb: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    alignSelf: 'flex-start',
  },
  dayToggleThumbOn: { alignSelf: 'flex-end' },
  dayLabel: { width: 36, fontSize: 13, fontWeight: '600', color: '#635857' },
  dayLabelDisabled: { color: '#c2b4b2' },
  dayTimeSep: { fontSize: 13, color: '#a08c8b' },

  // ── Block items ───────────────────────────────────────────────────────────
  blockItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f7f2f1',
  },
  blockInfo: { flex: 1, marginRight: 12 },
  blockRange: { fontSize: 13, color: '#635857', fontWeight: '500' },
  blockReason: { fontSize: 12, color: '#a08c8b', marginTop: 2 },
  btnDeleteBlock: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#ffcdd2',
    cursor: 'pointer',
  } as any,
  btnDeleteBlockText: { fontSize: 12, color: '#c0392b', fontWeight: '500' },

  btnAddBlock: {
    marginTop: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#efeae8',
    alignItems: 'center',
    cursor: 'pointer',
  } as any,
  btnAddBlockText: { fontSize: 13, color: '#635857', fontWeight: '500' },

  blockForm: {
    marginTop: 16,
    padding: 16,
    borderRadius: 10,
    backgroundColor: '#f7f2f1',
  },
  blockFormRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },

  // ── Schedule save button ──────────────────────────────────────────────────
  scheduleFooter: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },

  // ── Reminder selector ─────────────────────────────────────────────────────
  reminderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  reminderChip: {
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#efeae8',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
  } as any,
  reminderChipActive: {
    backgroundColor: '#8e7f7e',
    borderColor: '#8e7f7e',
  },
  reminderChipText: { fontSize: 13, color: '#a08c8b', fontWeight: '500' },
  reminderChipTextActive: { color: '#ffffff' },
  reminderNote: { fontSize: 12, color: '#a08c8b', marginTop: 10, lineHeight: 18 },

  errorText: { color: '#e74c3c', fontSize: 13, marginTop: 8, textAlign: 'center' },
  successText: { color: '#2e7d32', fontSize: 13, marginTop: 8, textAlign: 'center' },
});

export const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 28,
    width: '100%',
    maxWidth: 480,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 16, fontWeight: '600', color: '#635857' },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f7f2f1',
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer',
  } as any,
  closeText: { fontSize: 18, color: '#a08c8b', lineHeight: 22 },
  field: { marginBottom: 16 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#635857',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  } as any,
  input: {
    borderWidth: 1,
    borderColor: '#efeae8',
    borderRadius: 9,
    paddingHorizontal: 13,
    paddingVertical: 11,
    fontSize: 14,
    color: '#635857',
    backgroundColor: '#fdfcfc',
    outlineStyle: 'none',
  } as any,
  errorText: { color: '#e74c3c', fontSize: 13, marginBottom: 8 },
  footer: { flexDirection: 'row', gap: 10, marginTop: 20 },
  btnCancel: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#efeae8',
    alignItems: 'center',
    cursor: 'pointer',
  } as any,
  btnCancelText: { fontSize: 14, color: '#a08c8b', fontWeight: '500' },
  btnSave: {
    flex: 2,
    paddingVertical: 11,
    borderRadius: 9,
    backgroundColor: '#8e7f7e',
    alignItems: 'center',
    cursor: 'pointer',
  } as any,
  btnSaveText: { fontSize: 14, color: '#ffffff', fontWeight: '600' },
});