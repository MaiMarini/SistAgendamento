import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { API_URL } from '../../lib/config';
import { styles } from './LoginScreen.web.styles';

type Tab = 'login' | 'register';

// ── Máscaras ───────────────────────────────────────────────────────────────────

function maskCNPJ(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

function maskPhone(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

// ── Validações ─────────────────────────────────────────────────────────────────

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 11;
}

function isValidCNPJ(cnpj: string): boolean {
  const d = cnpj.replace(/\D/g, '');
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
  const calc = (s: string, weights: number[]) => {
    const sum = weights.reduce((acc, w, i) => acc + parseInt(s[i]) * w, 0);
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return (
    calc(d, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) === parseInt(d[12]) &&
    calc(d, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) === parseInt(d[13])
  );
}

export default function LoginScreen() {
  const { width } = useWindowDimensions();
  const isMobile = width < 520;

  const rootRef = React.useRef<any>(null);

  React.useEffect(() => {
    if (!isMobile || typeof document === 'undefined' || !rootRef.current) return;
    const changed: { el: HTMLElement; prevOverflow: string }[] = [];
    let el: HTMLElement | null = rootRef.current as HTMLElement;
    while (el && el !== document.documentElement) {
      const computed = window.getComputedStyle(el);
      if (computed.overflow === 'hidden' || computed.overflowY === 'hidden') {
        changed.push({ el, prevOverflow: el.style.overflow });
        el.style.overflow = 'visible';
      }
      el = el.parentElement;
    }
    document.documentElement.style.overflowY = 'auto';
    document.body.style.overflowY = 'auto';
    return () => {
      changed.forEach(({ el, prevOverflow }) => { el.style.overflow = prevOverflow; });
      document.documentElement.style.overflowY = '';
      document.body.style.overflowY = '';
    };
  }, [isMobile]);
  const [activeTab, setActiveTab] = useState<Tab>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({
    name: '', cnpj: '', phone: '', licenseCode: '',
    email: '', password: '', confirmPassword: '',
  });

  const handleLogin = async (e?: any) => {
    e?.preventDefault?.();
    if (!loginForm.email || !loginForm.password) {
      setError('Preencha todos os campos.');
      return;
    }
    setError(''); setSuccess('');
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: loginForm.email.trim(),
      password: loginForm.password,
    });
    setLoading(false);
    if (error) setError('E-mail ou senha incorretos.');
  };

  const handleRegister = async (e?: any) => {
    e?.preventDefault?.();
    const { name, cnpj, phone, licenseCode, email, password, confirmPassword } = registerForm;
    if (!name || !cnpj || !phone || !licenseCode || !email || !password || !confirmPassword) {
      setError('Preencha todos os campos.');
      return;
    }
    if (!isValidEmail(email)) {
      setError('E-mail inválido. Verifique o endereço informado.');
      return;
    }
    if (!isValidCNPJ(cnpj)) {
      setError('CNPJ inválido. Verifique os dígitos informados.');
      return;
    }
    if (!isValidPhone(phone)) {
      setError('Telefone inválido. Informe DDD + número (ex: (11) 99999-9999).');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    setError(''); setSuccess('');
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/companies/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          cnpj: cnpj.replace(/\D/g, ''),
          phone: phone.replace(/\D/g, ''),
          license_code: licenseCode,
          email: email.trim(),
          password,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.detail || 'Erro ao criar conta. Tente novamente.');
        setLoading(false);
        return;
      }
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(), password,
      });
      if (signInError) {
        setSuccess('Conta criada! Faça login para continuar.');
        setActiveTab('login');
      }
    } catch {
      setError('Erro de conexão. Verifique se o servidor está rodando.');
    }
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!loginForm.email) {
      setError('Digite seu e-mail acima antes de continuar.');
      return;
    }
    setError(''); setSuccess('');
    setLoading(true);
    try {
      await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginForm.email.trim() }),
      });
      setSuccess('E-mail enviado! Verifique sua caixa de entrada.');
    } catch {
      setError('Erro ao enviar e-mail de recuperação.');
    }
    setLoading(false);
  };

  return (
    <View
      ref={rootRef}
      style={isMobile ? { backgroundColor: '#fcfaf9' } : styles.page}
    >
      <View style={[styles.scrollContent, isMobile && { paddingVertical: 32, paddingHorizontal: 16, justifyContent: 'flex-start' }]}>
        {/* Brand */}
        <View style={styles.brand}>
          <Text style={styles.brandName}>{''}</Text>
          <Text style={styles.brandSubtitle}>Sistema de Agendamentos</Text>
        </View>

        {/* Card */}
        <View style={[styles.card, isMobile && { padding: 20, borderRadius: 14 }]}>
          {/* Tabs */}
          <View style={styles.tabs}>
            <TabButton
              label="Entrar"
              active={activeTab === 'login'}
              onPress={() => { setActiveTab('login'); setError(''); setSuccess(''); }}
            />
            <TabButton
              label="Criar Cadastro"
              active={activeTab === 'register'}
              onPress={() => { setActiveTab('register'); setError(''); setSuccess(''); }}
            />
          </View>

          {/* Feedback */}
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

          {/* Login */}
          {activeTab === 'login' && (
            <View>
              <Field
                label="E-MAIL"
                value={loginForm.email}
                onChangeText={(v) => setLoginForm({ ...loginForm, email: v })}
                placeholder="seu@email.com"
                autoComplete="email"
                onSubmitEditing={handleLogin}
              />
              <Field
                label="SENHA"
                value={loginForm.password}
                onChangeText={(v) => setLoginForm({ ...loginForm, password: v })}
                placeholder="••••••••"
                secure={!showPassword}
                autoComplete="current-password"
                showToggle
                showPassword={showPassword}
                onTogglePassword={() => setShowPassword(!showPassword)}
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotLink}>
                <Text style={styles.forgotText}>Esqueceu sua senha?</Text>
              </TouchableOpacity>
              <PrimaryButton label="Entrar" loading={loading} onPress={handleLogin} />
            </View>
          )}

          {/* Register */}
          {activeTab === 'register' && (
            <View>
              <View style={[styles.row, isMobile && { flexDirection: 'column', gap: 0 }]}>
                <View style={styles.rowItem}>
                  <Field
                    label="NOME DA EMPRESA"
                    value={registerForm.name}
                    onChangeText={(v) => setRegisterForm({ ...registerForm, name: v })}
                    placeholder="Nome da empresa"
                    autoComplete="organization"
                  />
                </View>
                <View style={styles.rowItem}>
                  <Field
                    label="CNPJ"
                    value={registerForm.cnpj}
                    onChangeText={(v) => setRegisterForm({ ...registerForm, cnpj: maskCNPJ(v) })}
                    placeholder="00.000.000/0000-00"
                  />
                </View>
              </View>
              <View style={[styles.row, isMobile && { flexDirection: 'column', gap: 0 }]}>
                <View style={styles.rowItem}>
                  <Field
                    label="TELEFONE"
                    value={registerForm.phone}
                    onChangeText={(v) => setRegisterForm({ ...registerForm, phone: maskPhone(v) })}
                    placeholder="(00) 00000-0000"
                    autoComplete="tel"
                  />
                </View>
                <View style={styles.rowItem}>
                  <Field
                    label="CÓDIGO DE LICENÇA"
                    value={registerForm.licenseCode}
                    onChangeText={(v) => setRegisterForm({ ...registerForm, licenseCode: v.toUpperCase() })}
                    placeholder="Código fornecido"
                  />
                </View>
              </View>
              <Field
                label="E-MAIL"
                value={registerForm.email}
                onChangeText={(v) => setRegisterForm({ ...registerForm, email: v })}
                placeholder="contato@empresa.com"
                autoComplete="email"
              />
              <View style={[styles.row, isMobile && { flexDirection: 'column', gap: 0 }]}>
                <View style={styles.rowItem}>
                  <Field
                    label="SENHA"
                    value={registerForm.password}
                    onChangeText={(v) => setRegisterForm({ ...registerForm, password: v })}
                    placeholder="Mínimo 6 caracteres"
                    secure={!showPassword}
                    autoComplete="new-password"
                    showToggle
                    showPassword={showPassword}
                    onTogglePassword={() => setShowPassword(!showPassword)}
                  />
                </View>
                <View style={styles.rowItem}>
                  <Field
                    label="CONFIRMAR SENHA"
                    value={registerForm.confirmPassword}
                    onChangeText={(v) => setRegisterForm({ ...registerForm, confirmPassword: v })}
                    placeholder="Repita a senha"
                    secure={!showConfirmPassword}
                    autoComplete="new-password"
                    showToggle
                    showPassword={showConfirmPassword}
                    onTogglePassword={() => setShowConfirmPassword(!showConfirmPassword)}
                    onSubmitEditing={handleRegister}
                  />
                </View>
              </View>
              <PrimaryButton label="Criar Conta" loading={loading} onPress={handleRegister} />
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

// ─── Componentes auxiliares ────────────────────────────────────────────────────

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.tab, active && styles.tabActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function PrimaryButton({ label, loading, onPress }: { label: string; loading: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
      onPress={onPress}
      activeOpacity={0.85}
      disabled={loading}
    >
      {loading
        ? <ActivityIndicator color="#fff" size="small" />
        : <Text style={styles.primaryButtonText}>{label}</Text>
      }
    </TouchableOpacity>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secure?: boolean;
  autoComplete?: any;
  showToggle?: boolean;
  showPassword?: boolean;
  onTogglePassword?: () => void;
  onSubmitEditing?: () => void;
}

function Field({
  label, value, onChangeText, placeholder,
  secure = false, autoComplete,
  showToggle, showPassword, onTogglePassword,
  onSubmitEditing,
}: FieldProps) {
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
          secureTextEntry={secure}
          autoComplete={autoComplete}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onSubmitEditing={onSubmitEditing}
          returnKeyType={onSubmitEditing ? 'done' : 'next'}
        />
        {showToggle && (
          <TouchableOpacity onPress={onTogglePassword} style={styles.eyeButton} activeOpacity={0.6}>
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={17}
              color="#a08c8b"
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

