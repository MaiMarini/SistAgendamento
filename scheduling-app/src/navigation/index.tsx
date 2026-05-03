import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import { restoreSession, onAuthStateChange, type AuthUser } from '../lib/auth';
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
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [passwordSetupType, setPasswordSetupType] = useState<'invite' | 'recovery' | null>(getPasswordSetupType);

  useEffect(() => {
    restoreSession().then((restored) => {
      setUser(restored);
      setLoading(false);
    });

    const unsubscribe = onAuthStateChange((_event, authUser) => {
      setUser(authUser);
      const type = getPasswordSetupType();
      if (type) {
        setPasswordSetupType(type);
      }
    });

    return () => unsubscribe();
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
          {user ? (
            user.user_type === 'professional' ? (
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