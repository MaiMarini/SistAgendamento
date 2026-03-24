import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  // ── Layout geral
  container: {
    flex: 1,
    backgroundColor: '#fcfaf9',
  },

  // ── Cabeçalho
  header: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#efeae8',
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#635857',
    letterSpacing: 0.5,
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
