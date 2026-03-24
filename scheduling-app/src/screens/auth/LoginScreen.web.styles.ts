import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  // ── Página ─────────────────────────────────────────────────────────
  page: {
    flex: 1,
    backgroundColor: '#fcfaf9',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 60,
  },

  // ── Marca ──────────────────────────────────────────────────────────
  brand: {
    alignItems: 'center',
    marginBottom: 36,
  },
  brandName: {
    fontSize: 32,
    fontWeight: '300',
    color: '#635857',
    letterSpacing: 4,
  },
  brandSubtitle: {
    fontSize: 12,
    color: '#a08c8b',
    marginTop: 6,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  // ── Card ───────────────────────────────────────────────────────────
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 36,
    borderWidth: 1,
    borderColor: '#efeae8',
    width: '100%',
    maxWidth: 520,
    shadowColor: '#8e7f7e',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 30,
  },

  // ── Tabs ───────────────────────────────────────────────────────────
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#efeae8',
    marginBottom: 28,
  },
  tab: {
    flex: 1,
    paddingVertical: 13,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginBottom: -1,
  },
  tabActive: {
    borderBottomColor: '#8e7f7e',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#a08c8b',
  },
  tabTextActive: {
    color: '#635857',
    fontWeight: '600',
  },

  // ── Feedback (erro / sucesso) ───────────────────────────────────────
  feedbackBox: {
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  successBox: {
    backgroundColor: '#f0fdf4',
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 13,
    textAlign: 'center',
  },
  successText: {
    color: '#2e7d32',
    fontSize: 13,
    textAlign: 'center',
  },

  // ── Layout de linha (dois campos lado a lado) ──────────────────────
  row: {
    flexDirection: 'row',
    gap: 16,
  },
  rowItem: {
    flex: 1,
  },

  // ── Campo de formulário ────────────────────────────────────────────
  fieldWrapper: {
    marginBottom: 18,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#635857',
    letterSpacing: 1,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#efeae8',
    borderRadius: 10,
    backgroundColor: '#fdfcfc',
  } as any,
  inputWrapperFocused: {
    borderColor: '#c2b4b2',
    backgroundColor: '#ffffff',
  },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14,
    color: '#635857',
    outlineStyle: 'none',
  } as any,

  // ── Botão olho (mostrar/esconder senha) ───────────────────────────
  eyeButton: {
    // paddingLeft: 6,
    paddingRight: 20,
    paddingVertical: 8,
    cursor: 'pointer',
  } as any,

  // ── Link "Esqueceu sua senha?" ─────────────────────────────────────
  forgotLink: {
    alignSelf: 'flex-end',
    marginBottom: 22,
    marginTop: -6,
    cursor: 'pointer',
  } as any,
  forgotText: {
    fontSize: 13,
    color: '#8e7f7e',
  },

  // ── Botão primário ─────────────────────────────────────────────────
  primaryButton: {
    backgroundColor: '#8e7f7e',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
    cursor: 'pointer',
  } as any,
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
