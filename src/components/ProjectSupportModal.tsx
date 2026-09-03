/**
 * Modal de Apoio e Contribuição ao Projeto DoaPet
 *
 * Apresenta a mensagem oficial do projeto com botão direto para WhatsApp.
 */
import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { colors, radii, spacing } from '@/theme';
import {
  SUPPORT_MESSAGE_TEXT,
  SUPPORT_PHONE_FORMATTED,
  openSupportWhatsApp,
} from '@/services/projectSupport';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const { width } = Dimensions.get('window');

export function ProjectSupportModal({ visible, onClose }: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.iconCircle}>
            <Text style={styles.icon}>💛🐾</Text>
          </View>

          <Text style={styles.title}>Apoie o Projeto DoaPet</Text>

          <View style={styles.messageBox}>
            <Text style={styles.messageText}>{SUPPORT_MESSAGE_TEXT}</Text>
          </View>

          <TouchableOpacity
            style={styles.whatsAppButton}
            onPress={() => {
              openSupportWhatsApp();
              onClose();
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.whatsAppButtonText}>
              💬 Falar no WhatsApp {SUPPORT_PHONE_FORMATTED}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={styles.closeButtonText}>Agora não, continuar no app</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  container: {
    width: Math.min(width * 0.9, 420),
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.xl,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  icon: {
    fontSize: 34,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  messageBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#92400E',
    textAlign: 'center',
    fontWeight: '600',
  },
  whatsAppButton: {
    width: '100%',
    backgroundColor: '#25D366',
    paddingVertical: 14,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  whatsAppButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '800',
  },
  closeButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  closeButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
});
