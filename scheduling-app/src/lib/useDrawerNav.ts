import { useWindowDimensions } from 'react-native';
import { useNavigation, DrawerActions } from '@react-navigation/native';

/**
 * Hook para telas web que precisam de um botão hamburger no mobile.
 *
 * isMobile: true quando a largura da janela for < 768px
 * openDrawer: abre o drawer de navegação lateral
 */
export function useDrawerNav() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const navigation = useNavigation<any>();

  const openDrawer = () => navigation.dispatch(DrawerActions.openDrawer());

  return { isMobile, openDrawer };
}