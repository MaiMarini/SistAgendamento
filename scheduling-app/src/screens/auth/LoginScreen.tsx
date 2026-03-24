import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { API_URL } from '../../lib/config';
import { styles } from './LoginScreen.styles';

type Tab = 'login' | 'register';

interface LoginForm {
  email: string;
  password: string;
}

interface RegisterForm {
  name: string;
  cnpj: string;
  phone: string;
  licenseCode: string;
  email: string;
  password: string;
}

export default function LoginScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loginForm, setLoginForm] = useState<LoginForm>({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState<RegisterForm>({
    name: '',
    cnpj: '',
    phone: '',
    licenseCode: '',
    email: '',
    password: '',
  });

  const handleLogin = async () => {
    if (!loginForm.email || !loginForm.password) {
      setError('Preencha todos os campos.');
      return;
    }
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: loginForm.email.trim(),
      password: loginForm.password,
    });
    setLoading(false);
    if (error) setError('E-mail ou senha incorretos.');
  };

  const handleRegister = async () => {
    const { name, cnpj, phone, licenseCode, email, password } = registerForm;
    if (!name || !cnpj || !phone || !licenseCode || !email || !password) {
      setError('Preencha todos os campos.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/companies/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          cnpj,
          phone,
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
      // Faz login após registro bem-sucedido
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) setError('Conta criada! Faça login para continuar.');
    } catch {
      setError('Erro de conexão. Verifique sua internet.');
    }
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!loginForm.email) {
      Alert.alert('Esqueceu a senha?', 'Digite seu e-mail no campo acima e tente novamente.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(loginForm.email.trim());
    setLoading(false);
    if (error) {
      setError('Erro ao enviar e-mail de recuperação.');
    } else {
      Alert.alert('E-mail enviado', 'Verifique sua caixa de entrada para redefinir a senha.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Brand */}
          <View style={styles.brand}>
            <Text style={styles.brandName}>Flor de Liz</Text>
            <Text style={styles.brandSubtitle}>Sistema de Agendamentos</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            {/* Tabs */}
            <View style={styles.tabs}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'login' && styles.tabActive]}
                onPress={() => { setActiveTab('login'); setError(''); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, activeTab === 'login' && styles.tabTextActive]}>
                  Entrar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'register' && styles.tabActive]}
                onPress={() => { setActiveTab('register'); setError(''); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, activeTab === 'register' && styles.tabTextActive]}>
                  Criar Cadastro
                </Text>
              </TouchableOpacity>
            </View>

            {/* Error */}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {/* Login Form */}
            {activeTab === 'login' && (
              <View>
                <Field
                  label="E-MAIL"
                  value={loginForm.email}
                  onChangeText={(v) => setLoginForm({ ...loginForm, email: v })}
                  placeholder="seu@email.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <Field
                  label="SENHA"
                  value={loginForm.password}
                  onChangeText={(v) => setLoginForm({ ...loginForm, password: v })}
                  placeholder="••••••••"
                  secureTextEntry={!showPassword}
                  showToggle
                  showPassword={showPassword}
                  onTogglePassword={() => setShowPassword(!showPassword)}
                />
                <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotLink}>
                  <Text style={styles.forgotText}>Esqueceu sua senha?</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleLogin}
                  activeOpacity={0.85}
                  disabled={loading}
                >
                  {loading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.primaryButtonText}>Entrar</Text>
                  }
                </TouchableOpacity>
              </View>
            )}

            {/* Register Form */}
            {activeTab === 'register' && (
              <View>
                <Field
                  label="NOME DA EMPRESA"
                  value={registerForm.name}
                  onChangeText={(v) => setRegisterForm({ ...registerForm, name: v })}
                  placeholder="Nome da sua empresa"
                />
                <Field
                  label="CNPJ"
                  value={registerForm.cnpj}
                  onChangeText={(v) => setRegisterForm({ ...registerForm, cnpj: v })}
                  placeholder="00.000.000/0000-00"
                  keyboardType="numeric"
                />
                <Field
                  label="TELEFONE"
                  value={registerForm.phone}
                  onChangeText={(v) => setRegisterForm({ ...registerForm, phone: v })}
                  placeholder="(00) 00000-0000"
                  keyboardType="phone-pad"
                />
                <Field
                  label="CÓDIGO DE LICENÇA"
                  value={registerForm.licenseCode}
                  onChangeText={(v) => setRegisterForm({ ...registerForm, licenseCode: v })}
                  placeholder="Código fornecido"
                  autoCapitalize="characters"
                />
                <Field
                  label="E-MAIL"
                  value={registerForm.email}
                  onChangeText={(v) => setRegisterForm({ ...registerForm, email: v })}
                  placeholder="seu@email.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <Field
                  label="SENHA"
                  value={registerForm.password}
                  onChangeText={(v) => setRegisterForm({ ...registerForm, password: v })}
                  placeholder="Mínimo 6 caracteres"
                  secureTextEntry={!showPassword}
                  showToggle
                  showPassword={showPassword}
                  onTogglePassword={() => setShowPassword(!showPassword)}
                />
                <TouchableOpacity
                  style={[styles.primaryButton, { marginTop: 8 }]}
                  onPress={handleRegister}
                  activeOpacity={0.85}
                  disabled={loading}
                >
                  {loading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.primaryButtonText}>Criar Conta</Text>
                  }
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Componente de campo reutilizável
interface FieldProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  showToggle?: boolean;
  showPassword?: boolean;
  onTogglePassword?: () => void;
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  showToggle,
  showPassword,
  onTogglePassword,
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
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {showToggle && (
          <TouchableOpacity onPress={onTogglePassword} style={styles.eyeButton}>
            <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

