import { StyleSheet } from 'react-native';
import { commonDefs as c } from './commonStyles';

export const styles = StyleSheet.create({
  container: c.container,
  topBar: c.topBarSimple,
  topBarTitle: c.topBarTitle,

  // ── Área de conteúdo
  content: {
    paddingHorizontal: 28,
    paddingBottom: 32,
  },

  // ── Header actions (descrição + botão)
  headerActions: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 28,
  },
  description: {
    fontSize: 14,
    color: '#a08c8b',
  },
  btnAdd: {
    backgroundColor: '#8e7f7e',
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: 8,
    cursor: 'pointer',
  } as any,
  btnAddText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },

  // ── Grid de cards
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
  },

  // ── Estado vazio / loading
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 14,
    color: '#c2b4b2',
  },
});

// ── Card do profissional
export const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 25,
    width: 280,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#efeae8',
    shadowColor: '#8e7f7e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
  },
  cardBody: {
    alignItems: 'center',
    width: '100%',
  } as any,

  // Avatar circular com iniciais
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 3,
    borderColor: '#f7f2f1',
  },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginBottom: 14,
    borderWidth: 3,
    borderColor: '#f7f2f1',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '600',
  },

  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#635857',
    marginBottom: 4,
    textAlign: 'center',
  },
  specialty: {
    fontSize: 13,
    color: '#a08c8b',
    marginBottom: 4,
    textAlign: 'center',
  },
  phone: {
    fontSize: 12,
    color: '#c2b4b2',
    marginBottom: 14,
  },

  // Status badge
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginBottom: 18,
  },
  badgeActive: {
    backgroundColor: '#e8f5e9',
  },
  badgeInactive: {
    backgroundColor: '#f5f5f5',
  },
  badgePending: {
    backgroundColor: '#fff3e0',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  badgeActiveText: {
    color: '#2e7d32',
  },
  badgeInactiveText: {
    color: '#9e9e9e',
  },
  badgePendingText: {
    color: '#e65100',
  },

  // Botões de ação
  actions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  btnSchedule: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c8e6c9',
    backgroundColor: '#f1f8e9',
    alignItems: 'center',
    cursor: 'pointer',
  } as any,
  btnScheduleText: {
    fontSize: 13,
    color: '#2e7d32',
    fontWeight: '500',
  },
  btnEdit: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#efeae8',
    alignItems: 'center',
    cursor: 'pointer',
  } as any,
  btnEditText: {
    fontSize: 13,
    color: '#635857',
    fontWeight: '500',
  },
  btnDelete: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fce4e4',
    backgroundColor: '#fff5f5',
    alignItems: 'center',
    cursor: 'pointer',
  } as any,
  btnDeleteText: {
    fontSize: 13,
    color: '#c0392b',
    fontWeight: '500',
  },
  btnResend: {
    width: '100%',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fff3e0',
    backgroundColor: '#fff8f0',
    alignItems: 'center',
    marginBottom: 10,
    cursor: 'pointer',
  } as any,
  btnResendText: {
    fontSize: 12,
    color: '#e65100',
    fontWeight: '500',
  },
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
    width: 540,
    maxHeight: '95%' as any,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#635857',
  },
  closeButton: {
    cursor: 'pointer',
  } as any,
  closeText: {
    fontSize: 26,
    color: '#a08c8b',
    lineHeight: 28,
  },

  // Campo de formulário
  field: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#635857',
    letterSpacing: 1,
    marginBottom: 7,
    textTransform: 'uppercase',
  },
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
  inputFocused: {
    borderColor: '#c2b4b2',
    backgroundColor: '#ffffff',
  },

  // ── Avatar picker (no modal)
  avatarPickerWrapper: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarPickerButton: {
    position: 'relative',
    cursor: 'pointer',
  } as any,
  avatarPickerImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#f7f2f1',
  },
  avatarPickerPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#f7f2f1',
  },
  avatarPickerInitials: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '600',
  },
  avatarPickerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 28,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPickerOverlayText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  avatarPickerHint: {
    marginTop: 8,
    fontSize: 11,
    color: '#c2b4b2',
  },

  errorText: {
    color: '#e74c3c',
    fontSize: 13,
    marginBottom: 12,
    textAlign: 'center',
  },

  footer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  btnCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#efeae8',
    alignItems: 'center',
    cursor: 'pointer',
  } as any,
  btnCancelText: {
    fontSize: 14,
    color: '#a08c8b',
    fontWeight: '500',
  },
  btnSave: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 9,
    backgroundColor: '#8e7f7e',
    alignItems: 'center',
    cursor: 'pointer',
  } as any,
  btnSaveText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },

  // ── Modal de agenda (mais largo)
  scheduleContent: {
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 30,
    width: 620,
    maxHeight: '90%' as any,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
  },

  // ── Linha de dia da semana
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f7f2f1',
    gap: 12,
  },
  dayToggle: {
    width: 38,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#e0d8d7',
    justifyContent: 'center',
    paddingHorizontal: 2,
    cursor: 'pointer',
  } as any,
  dayToggleOn: { backgroundColor: '#8e7f7e' },
  dayToggleThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ffffff',
  },
  dayToggleThumbOn: { alignSelf: 'flex-end' },
  dayLabel: {
    width: 36,
    fontSize: 13,
    fontWeight: '600',
    color: '#635857',
  },
  dayLabelDisabled: { color: '#c2b4b2' },
  dayTimeSep: { fontSize: 13, color: '#a08c8b', marginHorizontal: 2 },

  // ── Seção header
  sectionHeader: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8e7f7e',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginTop: 20,
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f7f2f1',
  } as any,

  // ── Item de bloqueio
  blockItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f7f2f1',
  },
  blockInfo: { flex: 1 },
  blockRange: { fontSize: 13, color: '#635857', fontWeight: '500' },
  blockReason: { fontSize: 12, color: '#a08c8b', marginTop: 2 },
  btnDeleteBlock: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#fce4e4',
    backgroundColor: '#fff5f5',
    cursor: 'pointer',
  } as any,
  btnDeleteBlockText: { fontSize: 12, color: '#c0392b', fontWeight: '500' },

  // ── Formulário de bloqueio (inline)
  blockForm: {
    backgroundColor: '#f7f2f1',
    borderRadius: 10,
    padding: 14,
    marginTop: 12,
  },
  blockFormRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  btnAddBlock: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#efeae8',
    alignSelf: 'flex-start',
    cursor: 'pointer',
  } as any,
  btnAddBlockText: { fontSize: 13, color: '#635857', fontWeight: '500' },

  // ── Linhas de detalhe (modal de visualização)
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f7f2f1',
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#a08c8b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  } as any,
  detailValue: {
    fontSize: 14,
    color: '#635857',
    flexShrink: 1,
    textAlign: 'right',
  },
  detailBadge: {
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  detailBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  } as any,
});
