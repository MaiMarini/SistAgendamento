import React from 'react';
import { Platform, useWindowDimensions } from 'react-native';
import { createDrawerNavigator } from '@react-navigation/drawer';

import HomeScreen from '../screens/app/HomeScreen';
import AppointmentsScreen from '../screens/app/AppointmentsScreen';
import ClientsScreen from '../screens/app/ClientsScreen';
import MyProfileScreen from '../screens/app/MyProfileScreen.web';
import Sidebar from './Sidebar';

const Drawer = createDrawerNavigator();

const PRO_MENU = [
  { label: 'Calendário',   route: 'Calendário'   },
  { label: 'Agendamentos', route: 'Agendamentos'  },
  { label: 'Clientes',     route: 'Clientes'      },
  { label: 'Meu Perfil',   route: 'Meu Perfil'    },
];

export default function ProfessionalNavigator() {
  const { width } = useWindowDimensions();
  const isMobile = Platform.OS === 'web' && width < 768;

  return (
    <Drawer.Navigator
      drawerContent={(props) => <Sidebar {...props} menuItems={PRO_MENU} showLegend={false} />}
      screenOptions={{
        headerShown: false,
        drawerType: Platform.OS !== 'web' ? 'slide' : isMobile ? 'front' : 'permanent',
        drawerStyle: { width: 240, borderRightWidth: 0 },
        sceneStyle: { backgroundColor: '#fcfaf9' },
        swipeEnabled: isMobile,
      }}
    >
      <Drawer.Screen name="Calendário"   component={HomeScreen} />
      <Drawer.Screen name="Agendamentos" component={AppointmentsScreen} />
      <Drawer.Screen name="Clientes"     component={ClientsScreen} />
      <Drawer.Screen name="Meu Perfil"   component={MyProfileScreen} />
    </Drawer.Navigator>
  );
}