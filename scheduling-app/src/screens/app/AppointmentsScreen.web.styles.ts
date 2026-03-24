import { StyleSheet } from 'react-native';
import { commonDefs as c } from './commonStyles';

export const styles = StyleSheet.create({
  container: c.container,
  topBar: c.topBarRow,
  topBarTitle: c.topBarTitle,
  btnNew: c.btnPrimary,
  btnNewText: c.btnPrimaryText,

  // ── Filtros de data
  filterRow: {
    paddingHorizontal: 28,
    paddingBottom: 20,
    flexDirection: 'row',
    gap: 8,
  },
  filterTab: {
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#efeae8',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
  } as any,
  filterTabActive: {
    backgroundColor: '#8e7f7e',
    borderColor: '#8e7f7e',
  },
  filterTabText: { fontSize: 13, color: '#a08c8b', fontWeight: '500' },
  filterTabTextActive: { color: '#ffffff' },

  // ── Conteúdo
  content: { paddingHorizontal: 28, paddingBottom: 32 },
  emptyState: { justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 14, color: '#c2b4b2' },
});

// ── Card de agendamento
export const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#efeae8',
    shadowColor: '#8e7f7e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    cursor: 'pointer',
  } as any,

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  dateTime: { fontSize: 13, color: '#a08c8b', fontWeight: '500' },

  clientName: { fontSize: 16, fontWeight: '600', color: '#635857', marginBottom: 4 },

  meta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  metaText: { fontSize: 13, color: '#a08c8b' },
  separator: { width: 1, height: 12, backgroundColor: '#efeae8' },

  // Status badges
  badge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20 },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  } as any,

  badgeScheduled: { backgroundColor: '#e3f2fd' },
  badgeScheduledText: { color: '#1565c0' },
  badgeConfirmed: { backgroundColor: '#e8f5e9' },
  badgeConfirmedText: { color: '#2e7d32' },
  badgeCompleted: { backgroundColor: '#f5f5f5' },
  badgeCompletedText: { color: '#757575' },
  badgeCancelled: { backgroundColor: '#fce4e4' },
  badgeCancelledText: { color: '#c0392b' },
  badgeNoShow: { backgroundColor: '#fff3e0' },
  badgeNoShowText: { color: '#e65100' },
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
    width: 520,
    maxHeight: '85%' as any,
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
  title: { fontSize: 18, fontWeight: '600', color: '#635857' },
  closeButton: { cursor: 'pointer' } as any,
  closeText: { fontSize: 26, color: '#a08c8b', lineHeight: 28 },

  // Campos de formulário
  field: { marginBottom: 16 },
  fieldRow: { flexDirection: 'row', gap: 12, marginBottom: 0 },
  fieldHalf: { flex: 1 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#635857',
    letterSpacing: 1,
    marginBottom: 7,
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
    outlineStyle: 'none',
  } as any,
  inputFocused: { borderColor: '#c2b4b2', backgroundColor: '#ffffff' },

  errorText: { color: '#e74c3c', fontSize: 13, marginBottom: 12, textAlign: 'center' },

  // ── Busca de cliente
  clientSearchWrapper: { marginBottom: 16 },
  clientResults: {
    borderWidth: 1,
    borderColor: '#efeae8',
    borderRadius: 9,
    backgroundColor: '#ffffff',
    marginTop: 4,
    maxHeight: 200,
    overflow: 'hidden' as any,
  },
  clientResultItem: {
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#f7f2f1',
    cursor: 'pointer',
  } as any,
  clientResultName: { fontSize: 14, color: '#635857', fontWeight: '500' },
  clientResultSub: { fontSize: 12, color: '#a08c8b', marginTop: 2 },
  clientChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f7f2f1',
    borderRadius: 9,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  clientChipInfo: { flex: 1 },
  clientChipName: { fontSize: 14, color: '#635857', fontWeight: '600' },
  clientChipSub: { fontSize: 12, color: '#a08c8b', marginTop: 2 },
  clientChipChange: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#efeae8',
    cursor: 'pointer',
  } as any,
  clientChipChangeText: { fontSize: 12, color: '#8e7f7e', fontWeight: '500' },

  footer: { flexDirection: 'row', gap: 12, marginTop: 24 },
  btnCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#efeae8',
    alignItems: 'center',
    cursor: 'pointer',
  } as any,
  btnCancelText: { fontSize: 14, color: '#a08c8b', fontWeight: '500' },
  btnSave: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 9,
    backgroundColor: '#8e7f7e',
    alignItems: 'center',
    cursor: 'pointer',
  } as any,
  btnSaveText: { fontSize: 14, color: '#ffffff', fontWeight: '600' },

  // Linhas de detalhe
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
  detailValue: { fontSize: 14, color: '#635857', flexShrink: 1, textAlign: 'right' },

  // Botões de ação no detalhe
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 20 },
  btnAction: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    cursor: 'pointer',
  } as any,
  btnActionText: { fontSize: 13, fontWeight: '600' },
  btnConfirm: { backgroundColor: '#e8f5e9', borderColor: '#c8e6c9' },
  btnConfirmText: { color: '#2e7d32' },
  btnComplete: { backgroundColor: '#f5f5f5', borderColor: '#e0e0e0' },
  btnCompleteText: { color: '#616161' },
  btnCancelAppt: { backgroundColor: '#fce4e4', borderColor: '#ffcdd2' },
  btnCancelApptText: { color: '#c0392b' },
  btnNoShow: { backgroundColor: '#fff8e1', borderColor: '#ffe082' },
  btnNoShowText: { color: '#f57f17' },

  btnReschedule: {
    marginTop: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#efeae8',
    alignItems: 'center',
    cursor: 'pointer',
  } as any,
  btnRescheduleText: { fontSize: 13, color: '#635857', fontWeight: '500' },
});
