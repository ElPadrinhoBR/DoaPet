/**
 * Tela de Recuperação de Senha por E-mail
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { resetPassword } from '@/services/auth';
import { colors, spacing, radii } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPassword'>;

export function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleReset() {
    if (!email.trim()) {
      Alert.alert('Atenção', 'Informe seu e-mail cadastrado.');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email.trim());
      Alert.alert(
        'E-mail Enviado! ✉️',
        'Enviamos um link de redefinição de senha para sua caixa de entrada. Verifique também a pasta de spam.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (error: any) {
      const code = error?.code || '';
      let msg = 'Não foi possível enviar o e-mail de recuperação.';
      if (code === 'auth/user-not-found') {
        msg = 'Nenhuma conta encontrada com este e-mail.';
      } else if (code === 'auth/invalid-email') {
        msg = 'Formato de e-mail inválido.';
      }
      Alert.alert('Aviso', msg);
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
        <View style={styles.header}>
          <Text style={styles.logo}>🔑</Text>
          <Text style={styles.title}>Recuperar Senha</Text>
          <Text style={styles.subtitle}>
            Digite seu e-mail e enviaremos as instruções para você redefinir sua senha.
          </Text>
        </View>

        <View style={styles.form}>
          <Input
            label="E-mail Cadastrado"
            placeholder="seuemail@exemplo.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
          />

          <Button
            title="Enviar Link de Recuperação"
            onPress={handleReset}
            loading={loading}
            style={styles.submitButton}
          />

          <Button
            title="Voltar ao Login"
            variant="secondary"
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          />
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
    paddingTop: Platform.OS === 'ios' ? 70 : 40,
    justifyContent: 'center',
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
    lineHeight: 18,
    paddingHorizontal: spacing.md,
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
  submitButton: {
    marginTop: spacing.xs,
  },
  backButton: {
    marginTop: spacing.sm,
  },
});