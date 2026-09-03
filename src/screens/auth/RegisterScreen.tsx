/**
 * Tela de Cadastro de Nova Conta
 */
import React, { useState } from 'react';
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
import { signUpWithEmail } from '@/services/auth';
import { colors, spacing, radii } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

export function RegisterScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'user' | 'ong'>('user');
  const [organizationName, setOrganizationName] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!name.trim()) {
      Alert.alert('Atenção', 'Informe seu nome completo.');
      return;
    }
    if (!email.trim()) {
      Alert.alert('Atenção', 'Informe seu e-mail.');
      return;
    }
    if (!password || password.length < 6) {
      Alert.alert('Atenção', 'A senha deve conter no mínimo 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Atenção', 'As senhas digitadas não coincidem.');
      return;
    }
    if (role === 'ong' && !organizationName.trim()) {
      Alert.alert('Atenção', 'Informe o nome da sua ONG ou Abrigo.');
      return;
    }

    setLoading(true);
    try {
      await signUpWithEmail(
        email.trim(),
        password,
        name.trim(),
        role,
        role === 'ong' ? organizationName.trim() : undefined,
      );
      Alert.alert('🎉 Bem-vindo!', 'Conta criada com sucesso no DoaPet!');
    } catch (error: any) {
      const code = error?.code || '';
      let msg = 'Não foi possível concluir o cadastro.';
      if (code === 'auth/email-already-in-use') {
        msg = 'Este e-mail já está cadastrado. Faça login.';
      } else if (code === 'auth/invalid-email') {
        msg = 'Formato de e-mail inválido.';
      } else if (code === 'auth/weak-password') {
        msg = 'A senha é muito fraca. Use letras e números.';
      }
      Alert.alert('Atenção', msg);
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
        {/* Cabeçalho */}
        <View style={styles.header}>
          <Text style={styles.logo}>🐾</Text>
          <Text style={styles.title}>Criar Nova Conta</Text>
          <Text style={styles.subtitle}>
            Junte-se à maior comunidade de proteção animal
          </Text>
        </View>

        {/* Formulário */}
        <View style={styles.form}>
          <Input
            label="Nome Completo *"
            placeholder="Seu nome"
            value={name}
            onChangeText={setName}
            style={styles.input}
          />

          <Input
            label="E-mail *"
            placeholder="seuemail@exemplo.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
          />

          <Input
            label="Senha (mínimo 6 caracteres) *"
            placeholder="Crie uma senha segura"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={styles.input}
          />

          <Input
            label="Confirmar Senha *"
            placeholder="Repita sua senha"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            style={styles.input}
          />

          {/* Tipo de Perfil */}
          <Text style={styles.roleLabel}>Você é:</Text>
          <View style={styles.roleRow}>
            <TouchableOpacity
              style={[styles.roleChip, role === 'user' && styles.roleChipActive]}
              onPress={() => setRole('user')}
            >
              <Text style={[styles.roleChipText, role === 'user' && styles.roleChipTextActive]}>
                👤 Pessoa Física
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.roleChip, role === 'ong' && styles.roleChipActive]}
              onPress={() => setRole('ong')}
            >
              <Text style={[styles.roleChipText, role === 'ong' && styles.roleChipTextActive]}>
                🏢 ONG / Protetor
              </Text>
            </TouchableOpacity>
          </View>

          {role === 'ong' && (
            <Input
              label="Nome da ONG ou Abrigo *"
              placeholder="Ex: Associação Patas Amigas"
              value={organizationName}
              onChangeText={setOrganizationName}
              style={styles.input}
            />
          )}

          <Button
            title="Criar Conta e Entrar"
            onPress={handleRegister}
            loading={loading}
            style={styles.registerButton}
          />

          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginLinkText}>
              Já possui uma conta? <Text style={styles.loginLinkHighlight}>Fazer Login</Text>
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
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logo: {
    fontSize: 54,
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  subtitle: {
    fontSize: 13,
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
  roleLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  roleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  roleChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  roleChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  roleChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  roleChipTextActive: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  registerButton: {
    marginTop: spacing.sm,
  },
  loginLink: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  loginLinkText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  loginLinkHighlight: {
    color: colors.primary,
    fontWeight: '700',
  },
});