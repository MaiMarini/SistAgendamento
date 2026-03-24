import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  // ── Página
  container: {
    flex: 1,
    backgroundColor: '#fcfaf9',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },

  // ── Marca
  brand: {
    alignItems: 'center',
    marginBottom: 32,
  },
  brandName: {
    fontSize: 30,
    fontWeight: '300',
    color: '#635857',
    letterSpacing: 3,
  },
  brandSubtitle: {
    fontSize: 13,
    color: '#a08c8b',
    marginTop: 4,
    letterSpacing: 0.5,
  },

  // ── Card
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 28,
    borderWidth: 1,
    borderColor: '#efeae8',
    shadowColor: '#8e7f7e',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  },

  // ── Tabs
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#efeae8',
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
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

  // ── Feedback de erro
  errorText: {
    backgroundColor: '#fef2f2',
    color: '#e74c3c',
    fontSize: 13,
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
    textAlign: 'center',
  },

  // ── Campo de formulário
  fieldWrapper: {
    marginBottom: 16,
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
  },
  inputWrapperFocused: {
    borderColor: '#c2b4b2',
    backgroundColor: '#ffffff',
  },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: '#635857',
  },

  // ── Botão olho (mostrar/esconder senha)
  eyeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  eyeIcon: {
    fontSize: 16,
  },

  // ── Link "Esqueceu sua senha?"
  forgotLink: {
    alignSelf: 'flex-end',
    marginBottom: 20,
    marginTop: -4,
  },
  forgotText: {
    fontSize: 13,
    color: '#8e7f7e',
  },

  // ── Botão primário
  primaryButton: {
    backgroundColor: '#8e7f7e',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: '#8e7f7e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
