// ── Definições de estilo compartilhadas entre todas as telas ──────────────
// Uso: import { commonDefs } from './commonStyles';
// Depois: StyleSheet.create({ ...commonDefs.screen, estilosEspecificos... })

export const commonDefs = {
  // Aplicados em TODAS as telas
  container: { flex: 1, backgroundColor: '#fcfaf9' },

  topBarRow: {
    paddingHorizontal: 28,
    paddingVertical: 22,
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  topBarSimple: {
    paddingHorizontal: 28,
    paddingVertical: 22,
  },
  topBarTitle: { fontSize: 22, fontWeight: '300' as const, color: '#635857', letterSpacing: 0.3 },

  btnPrimary: {
    backgroundColor: '#8e7f7e',
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: 8,
    cursor: 'pointer',
  } as any,
  btnPrimaryText: { color: '#ffffff', fontSize: 13, fontWeight: '600' as const },

  contentPad: { paddingHorizontal: 28, paddingBottom: 32 },

  emptyState: { justifyContent: 'center' as const, alignItems: 'center' as const, paddingVertical: 60 },
  emptyText: { fontSize: 14, color: '#c2b4b2' },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#a08c8b',
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
    marginBottom: 10,
    marginTop: 4,
  },
};