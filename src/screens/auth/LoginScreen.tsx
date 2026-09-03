/**
 * Tela de Login — E-mail/Senha com opção alternativa do Google
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import {
  signInWithEmail,
  useGoogleAuthRequest,
  signInWithGoogleToken,
} from '@/services/auth';
import { useAuth } from '@/context/AuthContext';
import { isFirebaseConfigured } from '@/services/firebase';
import { colors, spacing, radii } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const { loginAsDemo } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Hook do Google OAuth (opcional)
  const [request, response, promptAsync] = useGoogleAuthRequest();

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      if (id_token) {
        setLoading(true);
        signInWithGoogleToken(id_token)
          .catch(() => Alert.alert('Erro', 'Falha ao autenticar com o Google.'))
          .finally(() => setLoading(false));
      }
    }
  }, [response]);

  async function handleEmailLogin() {
    if (!email.trim() || !password) {
      Alert.alert('Atenção', 'Informe seu e-mail e sua senha.');
      return;
    }

    setLoading(true);
    try {
      await signInWithEmail(email.trim(), password);
      // O AuthContext detectará a sessão automaticamente
    } catch (error: any) {
      const errorCode = error?.code || '';
      let msg = 'E-mail ou senha incorretos.';
      if (errorCode === 'auth/user-not-found') {
        msg = 'Usuário não encontrado. Crie uma nova conta.';
      } else if (errorCode === 'auth/wrong-password') {
        msg = 'Senha incorreta.';
      } else if (errorCode === 'auth/invalid-email') {
        msg = 'Formato de e-mail inválido.';
      } else if (errorCode === 'auth/network-request-failed') {
        msg = 'Falha de conexão com a internet.';
      }
      Alert.alert('Atenção', msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    if (!isFirebaseConfigured) {
      Alert.alert('Aviso', 'Firebase não configurado. Use o Modo Demonstração.');
      return;
    }
    setLoading(true);
    try {
      await promptAsync();
    } catch {
      Alert.alert('Aviso', 'Não foi possível iniciar o login do Google.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Cabeçalho com Logo */}
        <View style={styles.header}>
          <Text style={styles.logo}>🐾</Text>
          <Text style={styles.title}>DoaPet</Text>
          <Text style={styles.subtitle}>
            Conectando pets a lares cheios de amor
          </Text>
        </View>

        {/* Formulário de E-mail e Senha */}
        <View style={styles.form}>
          <Input
            label="E-mail"
            placeholder="seuemail@exemplo.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
          />

          <Input
            label="Senha"
            placeholder="Sua senha secreta"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={styles.input}
          />

          <TouchableOpacity
            style={styles.forgotPasswordButton}
            onPress={() => navigation.navigate('ForgotPassword')}
          >
            <Text style={styles.forgotPasswordText}>Esqueci minha senha</Text>
          </TouchableOpacity>

          <Button
            title="Entrar"
            onPress={handleEmailLogin}
            loading={loading}
            style={styles.loginButton}
          />

          <Button
            title="Criar Nova Conta"
            variant="secondary"
            onPress={() => navigation.navigate('Register')}
            style={styles.registerButton}
          />

          {/* Divisor */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OU</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Botão Alternativo do Google */}
          <TouchableOpacity
            style={[styles.googleButton, (!request || loading) && styles.buttonDisabled]}
            onPress={handleGoogleLogin}
            disabled={!request || loading}
            activeOpacity={0.85}
          >
            <View style={styles.googleIconContainer}>
              <Text style={styles.googleIconText}>G</Text>
            </View>
            <Text style={styles.googleButtonText}>Entrar com o Google</Text>
          </TouchableOpacity>

          {/* Atalho Modo Demonstração */}
          <TouchableOpacity
            style={styles.demoButton}
            onPress={() => loginAsDemo()}
            disabled={loading}
          >
            <Text style={styles.demoButtonText}>
              ⚡ Entrar no Modo Demonstração (Sem Login)
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: spacing.xl,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logo: {
    fontSize: 64,
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.primaryDark,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  form: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  input: {
    marginBottom: spacing.md,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: spacing.md,
  },
  forgotPasswordText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  loginButton: {
    marginTop: spacing.xs,
  },
  registerButton: {
    marginTop: spacing.sm,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    marginHorizontal: spacing.md,
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: radii.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    gap: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  googleIconContainer: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#4285F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIconText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
  },
  googleButtonText: {
    color: '#374151',
    fontWeight: '700',
    fontSize: 14,
  },
  demoButton: {
    marginTop: spacing.md,
    backgroundColor: colors.primaryLight,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  demoButtonText: {
    color: colors.primaryDark,
    fontWeight: '700',
    fontSize: 13,
  },
});