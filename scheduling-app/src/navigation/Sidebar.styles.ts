import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRightWidth: 1,
    borderRightColor: '#efeae8',
    paddingTop: 30,
    paddingBottom: 24,
  },

  brand: {
    paddingLeft: 20,
    marginBottom: 35,
  },
  brandName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#a08c8b',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  nav: {
    flex: 1,
  },
  item: {
    marginBottom: 4,
    marginRight: 12,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
  },
  itemActive: {
    backgroundColor: '#f7f2f1',
  },
  itemText: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    fontSize: 14,
    color: '#8e7f7e',
  },
  itemTextActive: {
    color: '#635857',
    fontWeight: '600',
  },

  logoutArea: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  logoutButton: {
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#efeae8',
    alignSelf: 'flex-start',
    cursor: 'pointer',
  } as any,
  logoutText: {
    fontSize: 13,
    color: '#a08c8b',
    fontWeight: '500',
  },

  legend: {
    paddingHorizontal: 12,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#efeae8',
    marginBottom: 8,
  },
  legendTitle: {
    fontSize: 10,
    fontWeight: '600',
    color: '#a08c8b',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingHorizontal: 8,
  } as any,
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 2,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendName: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
});
