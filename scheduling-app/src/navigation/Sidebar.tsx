import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { DrawerContentComponentProps } from '@react-navigation/drawer';
import { supabase, getToken } from '../lib/supabase';
import { useCurrentUser } from '../lib/UserContext';
import { API_URL } from '../lib/config';
import { styles } from './Sidebar.styles';

interface Professional { id: string; name: string; color?: string; }

interface MenuItem { label: string; route: string; }

const DEFAULT_MENU: MenuItem[] = [
  { label: 'Calendário',    route: 'Calendário'    },
  { label: 'Agendamentos',  route: 'Agendamentos'  },
  { label: 'Profissionais', route: 'Profissionais' },
  { label: 'Clientes',      route: 'Clientes'      },
  { label: 'Configurações', route: 'Configurações' },
];

interface SidebarProps extends DrawerContentComponentProps {
  menuItems?: MenuItem[];
  showLegend?: boolean;
}

export default function Sidebar({ navigation, state, menuItems, showLegend = true }: SidebarProps) {
  const MENU_ITEMS = menuItems ?? DEFAULT_MENU;
  const activeRoute = state.routes[state.index].name;
  const { userType, userId } = useCurrentUser();
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [displayName, setDisplayName] = useState('');

  // Busca o nome de exibição (empresa ou profissional)
  useEffect(() => {
    if (!userType) return;
    const fetchName = async () => {
      const token = await getToken();
      if (!token) return;
      if (userType === 'professional' && userId) {
        const res = await fetch(`${API_URL}/professionals/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setDisplayName(data.name ?? '');
        }
      } else if (userType === 'company') {
        const res = await fetch(`${API_URL}/companies/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setDisplayName(data.name ?? '');
        }
      }
    };
    fetchName();
  }, [userType, userId]);

  useEffect(() => {
    const fetchProfessionals = async (token: string) => {
      const res = await fetch(`${API_URL}/professionals/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setProfessionals(await res.json());
    };

    // Busca imediata se já existe sessão
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) fetchProfessionals(session.access_token);
    });

    // Atualiza quando a sessão mudar (login, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) {
        fetchProfessionals(session.access_token);
      } else {
        setProfessionals([]);
        setDisplayName('');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <View style={styles.container}>
      <View style={styles.brand}>
        <Text style={styles.brandName}>{displayName || 'Flor de Liz'}</Text>
      </View>

      <View style={styles.nav}>
        {MENU_ITEMS.map((item) => {
          const isActive = activeRoute === item.route;
          return (
            <TouchableOpacity
              key={item.route}
              style={[styles.item, isActive && styles.itemActive]}
              onPress={() => navigation.navigate(item.route)}
              activeOpacity={0.7}
            >
              <Text style={[styles.itemText, isActive && styles.itemTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {showLegend && professionals.length > 0 && (
        <View style={styles.legend}>
          <Text style={styles.legendTitle}>Profissionais</Text>
          {professionals.map(pro => {
            const color = pro.color ?? '#8e7f7e';
            return (
              <View key={pro.id} style={[styles.legendItem, { backgroundColor: color + '18' }]}>
                <View style={[styles.legendDot, { backgroundColor: color }]} />
                <Text style={[styles.legendName, { color }]} numberOfLines={1}>{pro.name}</Text>
              </View>
            );
          })}
        </View>
      )}

      <View style={styles.logoutArea}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.7}>
          <Text style={styles.logoutText}>Sair</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}