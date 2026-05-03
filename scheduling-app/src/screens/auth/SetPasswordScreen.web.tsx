import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getToken, signOut } from '../../lib/auth';
import { API_URL } from '../../lib/config';

interface Props {
  onDone: () => void;
  mode?: 'invite' | 'recovery';
}

export default function SetPasswordScreen({ onDone, mode = 'invite' }: Props) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const establishSession = async () => {
      // Check for invite token in query string (?type=invite&token=...)
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const inviteToken = params.get('token');
        if (inviteToken && !cancelled) {
          (window as any).__inviteToken = inviteToken;
          setSessionReady(true);
          return;
        }
        // Check URL hash (legacy)
        if (window.location.hash) {
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get('access_token');
          if (accessToken && !cancelled) {
            (window as any).__inviteToken = accessToken;
            setSessionReady(true);
            return;
          }
        }
      }
      // Fallback: check if we already have a token
      const token = await getToken();
      if (token && !cancelled) setSessionReady(true);
    };
    establishSession();
    return () => { cancelled = true; };
  }, []);

  const handleSubmit = async (e?: any) => {
    e?.preventDefault?.();
    setError('');
    if (!password || !confirmPassword) {
      setError('Preencha todos os campos.');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    if (!sessionReady) {
      setError('Sessão ainda não estabelecida. Aguarde um instante e tente novamente.');
      return;
    }
    setLoading(true);
    try {
      const inviteToken = (window as any).__inviteToken;

      if (mode === 'invite' && inviteToken) {
        // Aceitar convite: envia token + senha para o backend
        const res = await fetch(`${API_URL}/auth/accept-invite`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ token: inviteToken, password }),
        });
        setLoading(false);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.message || 'Erro ao definir senha. Token expirado ou inválido.');
          return;
        }
      } else if (mode === 'recovery') {
        // Reset de senha: usa email + token da URL
        const params = new URLSearchParams(window.location.search);
        const resetToken = params.get('token') || '';
        const email = params.get('email') || '';
        const res = await fetch(`${API_URL}/auth/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ token: resetToken, email, password, password_confirmation: password }),
        });
        setLoading(false);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.message || 'Erro ao redefinir senha. Token expirado ou inválido.');
          return;
        }
      } else {
        setLoading(false);
        setError('Token não encontrado. Solicite um novo convite.');
        return;
      }
    } catch {
      setLoading(false);
      setError('Erro ao definir senha. Tente novamente.');
      return;
    }

    // Clear the URL hash so the invite token is gone
    if (typeof window !== 'undefined') {
      delete (window as any).__setPasswordToken;
      window.history.replaceState(null, '', window.location.pathname);
    }
    setSuccess('Senha definida com sucesso! Redirecionando para o login...');
    await signOut();
    setTimeout(() => onDone(), 1500);
  };

  return (
    <View style={styles.page}>
      <View style={styles.card}>
        {/* Brand */}
        <View style={styles.brand}>
          <Text style={styles.brandName}>{''}</Text>
          <Text style={styles.brandSubtitle}>Sistema de Agendamentos</Text>
        </View>

        <Text style={styles.title}>{mode === 'recovery' ? 'Redefinir Senha' : 'Definir Senha'}</Text>
        <Text style={styles.subtitle}>
          {mode === 'recovery'
            ? 'Digite sua nova senha para continuar.'
            : 'Bem-vindo! Crie uma senha para acessar sua conta.'}
        </Text>

        {error ? (
          <View style={styles.feedbackBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
        {success ? (
          <View style={[styles.feedbackBox, styles.successBox]}>
            <Text style={styles.successText}>{success}</Text>
          </View>
        ) : null}

        <PasswordField
          label="NOVA SENHA"
          value={password}
          onChangeText={setPassword}
          placeholder="Mínimo 6 caracteres"
          showPassword={showPassword}
          onToggle={() => setShowPassword(!showPassword)}
        />
        <PasswordField
          label="CONFIRMAR SENHA"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Repita a senha"
          showPassword={showConfirm}
          onToggle={() => setShowConfirm(!showConfirm)}
          onSubmitEditing={handleSubmit}
        />

        <TouchableOpacity
          style={[styles.primaryButton, (!sessionReady || loading) && styles.primaryButtonDisabled]}
          onPress={handleSubmit}
          activeOpacity={0.85}
          disabled={!sessionReady || loading}
        >
          {!sessionReady || loading
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.primaryButtonText}>Confirmar Senha</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

function PasswordField({
  label, value, onChangeText, placeholder, showPassword, onToggle, onSubmitEditing,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  showPassword: boolean;
  onToggle: () => void;
  onSubmitEditing?: () => void;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.fieldWrapper}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.inputWrapper, focused && styles.inputWrapperFocused]}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#c2b4b2"
          secureTextEntry={!showPassword}
          autoComplete="new-password"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onSubmitEditing={onSubmitEditing}
          returnKeyType={onSubmitEditing ? 'done' : 'next'}
        />
        <TouchableOpacity onPress={onToggle} style={styles.eyeButton} activeOpacity={0.6}>
          <Ionicons
            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
            size={17}
            color="#a08c8b"
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#fcfaf9',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 60,
  },
  brand: {
    alignItems: 'center',
    marginBottom: 32,
  },
  brandName: {
    fontSize: 32,
    fontWeight: '300',
    color: '#635857',
    letterSpacing: 4,
  },
  brandSubtitle: {
    fontSize: 12,
    color: '#a08c8b',
    marginTop: 6,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 36,
    borderWidth: 1,
    borderColor: '#efeae8',
    width: '100%',
    maxWidth: 440,
    shadowColor: '#8e7f7e',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 30,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#635857',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: '#a08c8b',
    marginBottom: 24,
    lineHeight: 20,
  },
  feedbackBox: {
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  successBox: {
    backgroundColor: '#f0fdf4',
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 13,
    textAlign: 'center',
  },
  successText: {
    color: '#2e7d32',
    fontSize: 13,
    textAlign: 'center',
  },
  fieldWrapper: {
    marginBottom: 18,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#635857',
    letterSpacing: 1,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#efeae8',
    borderRadius: 10,
    backgroundColor: '#fdfcfc',
  } as any,
  inputWrapperFocused: {
    borderColor: '#c2b4b2',
    backgroundColor: '#ffffff',
  },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14,
    color: '#635857',
    outlineStyle: 'none',
  } as any,
  eyeButton: {
    paddingRight: 20,
    paddingVertical: 8,
    cursor: 'pointer',
  } as any,
  primaryButton: {
    backgroundColor: '#8e7f7e',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
    cursor: 'pointer',
  } as any,
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});