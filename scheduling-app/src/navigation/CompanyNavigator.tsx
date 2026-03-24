import React from 'react';
import { Platform, useWindowDimensions } from 'react-native';
import { createDrawerNavigator } from '@react-navigation/drawer';

import HomeScreen from '../screens/app/HomeScreen';
import AppointmentsScreen from '../screens/app/AppointmentsScreen';
import ProfessionalsScreen from '../screens/app/ProfessionalsScreen';
import ClientsScreen from '../screens/app/ClientsScreen';
import SettingsScreen from '../screens/app/SettingsScreen';
import Sidebar from './Sidebar';

const Drawer = createDrawerNavigator();

export default function CompanyNavigator() {
  const { width } = useWindowDimensions();
  const isMobile = Platform.OS === 'web' && width < 768;

  return (
    <Drawer.Navigator
      drawerContent={(props) => <Sidebar {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: Platform.OS !== 'web' ? 'slide' : isMobile ? 'front' : 'permanent',
        drawerStyle: { width: 240, borderRightWidth: 0 },
        sceneContainerStyle: { backgroundColor: '#fcfaf9' },
        swipeEnabled: isMobile,
      }}
    >
      <Drawer.Screen name="Calendário"    component={HomeScreen} />
      <Drawer.Screen name="Agendamentos"  component={AppointmentsScreen} />
      <Drawer.Screen name="Profissionais" component={ProfessionalsScreen} />
      <Drawer.Screen name="Clientes"      component={ClientsScreen} />
      <Drawer.Screen name="Configurações" component={SettingsScreen} />
    </Drawer.Navigator>
  );
}
