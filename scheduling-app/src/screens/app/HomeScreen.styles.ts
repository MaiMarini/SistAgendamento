import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  // ── Layout geral
  container: {
    flex: 1,
    backgroundColor: '#fcfaf9',
  },

  // ── Cabeçalho
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#efeae8',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#635857',
    letterSpacing: 0.5,
  },
  logoutButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#efeae8',
    borderRadius: 20,
  },
  logoutText: {
    fontSize: 12,
    color: '#a08c8b',
    fontWeight: '500',
  },

  // ── Conteúdo
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    fontSize: 14,
    color: '#c2b4b2',
  },
});
