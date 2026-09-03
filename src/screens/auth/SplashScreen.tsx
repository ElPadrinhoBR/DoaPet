/**
 * Splash Screen — carregamento inicial com cache local de sessão
 */
import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { colors } from '@/theme';

export function SplashScreen() {
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <Text style={styles.logo}>🐾</Text>
      <Text style={styles.title}>DoaPet</Text>
      <ActivityIndicator size="large" color={colors.primary} style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    fontSize: 72,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.primaryDark,
    marginTop: 12,
  },
  spinner: {
    marginTop: 32,
  },
});