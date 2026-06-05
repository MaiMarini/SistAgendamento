/**
 * auth.ts
 * -------
 * Módulo de autenticação para o backend Laravel/Sanctum.
 *
 * O token Sanctum é armazenado em AsyncStorage e mantido em memória
 * para acesso rápido.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from './config';

const AUTH_TOKEN_KEY = '@auth_token';
const AUTH_USER_KEY = '@auth_user';

export interface AuthUser {
  id: string;
  email: string;
  user_type: 'company' | 'professional';
  company_id: string;
}

type AuthChangeCallback = (event: string, user: AuthUser | null) => void;

let _currentToken = '';
let _currentUser: AuthUser | null = null;
let _listeners: AuthChangeCallback[] = [];

function notifyListeners(event: string) {
  _listeners.forEach((cb) => cb(event, _currentUser));
}

export function setCurrentToken(token: string) {
  _currentToken = token;
}

export async function getToken(): Promise<string> {
  if (_currentToken) return _currentToken;
  const stored = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
  if (stored) {
    _currentToken = stored;
    return stored;
  }
  return '';
}

export function onAuthStateChange(callback: AuthChangeCallback): () => void {
  _listeners.push(callback);
  return () => {
    _listeners = _listeners.filter((cb) => cb !== callback);
  };
}

/**
 * Restaura sessão persistida (chamado no boot do app).
 */
export async function restoreSession(): Promise<AuthUser | null> {
  const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
  const userJson = await AsyncStorage.getItem(AUTH_USER_KEY);
  if (token && userJson) {
    _currentToken = token;
    _currentUser = JSON.parse(userJson);
    notifyListeners('RESTORED');
    return _currentUser;
  }
  return null;
}

/**
 * Login: email + senha → token Sanctum.
 */
export async function signIn(email: string, password: string): Promise<{ user: AuthUser | null; error: string | null }> {
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (!response.ok) {
      return { user: null, error: data.message || 'Credenciais inválidas.' };
    }
    const user: AuthUser = {
      id: data.user_id,
      email: data.email,
      user_type: data.user_type,
      company_id: data.company_id,
    };
    _currentToken = data.token;
    _currentUser = user;
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, data.token);
    await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    notifyListeners('SIGNED_IN');
    return { user, error: null };
  } catch {
    return { user: null, error: 'Erro de conexão.' };
  }
}

/**
 * Registro de empresa: cria conta + retorna token.
 */
export async function registerCompany(payload: {
  name: string;
  cnpj: string;
  phone: string;
  license_code: string;
  email: string;
  password: string;
}): Promise<{ user: AuthUser | null; error: string | null }> {
  try {
    const response = await fetch(`${API_URL}/companies/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      return { user: null, error: data.message || 'Erro ao criar conta.' };
    }
    const user: AuthUser = {
      id: data.user_id,
      email: payload.email,
      user_type: 'company',
      company_id: data.company_id,
    };
    _currentToken = data.token;
    _currentUser = user;
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, data.token);
    await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    notifyListeners('SIGNED_IN');
    return { user, error: null };
  } catch {
    return { user: null, error: 'Erro de conexão.' };
  }
}

/**
 * Logout: revoga token no servidor e limpa local.
 */
export async function signOut(): Promise<void> {
  try {
    if (_currentToken) {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${_currentToken}`, 'Accept': 'application/json' },
      });
    }
  } catch {
    // ignore
  }
  _currentToken = '';
  _currentUser = null;
  await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
  await AsyncStorage.removeItem(AUTH_USER_KEY);
  notifyListeners('SIGNED_OUT');
}

/**
 * Forgot password.
 */
export async function forgotPassword(email: string): Promise<{ error: string | null }> {
  try {
    await fetch(`${API_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return { error: null };
  } catch {
    return { error: 'Erro ao enviar e-mail de recuperação.' };
  }
}
