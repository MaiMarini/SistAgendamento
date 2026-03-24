import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://curulmrchgqrufzvipoy.supabase.co';
const supabaseAnonKey = 'sb_publishable_2wHOWG-Zt5qEvIGjYEWrXw_MJG8xB9e';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Token em memória — atualizado pelo UserContext via setCurrentToken.
// Nunca depende de getSession() async, evitando race condition pós-login.
let _currentToken = '';

export function setCurrentToken(token: string) {
  _currentToken = token;
}

export async function getToken(): Promise<string> {
  if (_currentToken) return _currentToken;

  // Fallback: lê diretamente (usado antes do UserContext montar)
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    _currentToken = session.access_token;
    return _currentToken;
  }
  return '';
}