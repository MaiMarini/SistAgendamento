import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Session } from '@supabase/supabase-js';

import { supabase } from '../lib/supabase';
import { UserProvider } from '../lib/UserContext';
import LoginScreen from '../screens/auth/LoginScreen';
import SetPasswordScreen from '../screens/auth/SetPasswordScreen';
import CompanyNavigator from './CompanyNavigator';
import ProfessionalNavigator from './ProfessionalNavigator';

const Stack = createStackNavigator();

function getPasswordSetupType(): 'invite' | 'recovery' | null {
  if (typeof window === 'undefined') return null;
  const combined = window.location.hash + '&' + window.location.search;
  if (combined.includes('type=invite')) return 'invite';
  if (combined.includes('type=recovery')) return 'recovery';
  return null;
}

export default function Navigation() {
  const [session, setSession] = useState<Session | null>(null);
  const [userType, setUserType] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [passwordSetupType, setPasswordSetupType] = useState<'invite' | 'recovery' | null>(getPasswordSetupType);

  const loadSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setSession(session);
    setUserType(session?.user?.user_metadata?.user_type ?? 'company');
    setLoading(false);
  };

  useEffect(() => {
    loadSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUserType(session?.user?.user_metadata?.user_type ?? 'company');
      const type = getPasswordSetupType();
      if (type) {
        setPasswordSetupType(type);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fcfaf9' }}>
        <ActivityIndicator color="#8e7f7e" size="large" />
      </View>
    );
  }

  // Invite/recovery flow: user must set their password before accessing the app
  if (passwordSetupType) {
    return <SetPasswordScreen mode={passwordSetupType} onDone={() => setPasswordSetupType(null)} />;
  }

  return (
    <UserProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {session ? (
            userType === 'professional' ? (
              <Stack.Screen name="App" component={ProfessionalNavigator} />
            ) : (
              <Stack.Screen name="App" component={CompanyNavigator} />
            )
          ) : (
            <Stack.Screen name="Login" component={LoginScreen} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </UserProvider>
  );
}