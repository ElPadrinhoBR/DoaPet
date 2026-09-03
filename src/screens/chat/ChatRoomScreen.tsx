/**
 * Tela de Mensagens — conversa em tempo real entre doador e adotante
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAuth } from '@/context/AuthContext';
import { subscribeToMessages, sendMessage } from '@/services/chat';
import { MOCK_PETS } from '@/services/mockData';
import { containsOffensiveContent, getOffensiveContentMessage } from '@/utils/contentFilter';
import { colors, radii, spacing } from '@/theme';
import type { ChatMessage, Pet } from '@/types';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ChatRoom'>;

export function ChatRoomScreen({ route, navigation }: Props) {
  const { chatId, petId, pet: routePet } = route.params;
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const listRef = useRef<FlatList<ChatMessage>>(null);

  // Recupera as informações do pet vinculado à conversa
  const pet: Pet | undefined =
    routePet ?? MOCK_PETS.find((p) => p.id === petId) ?? MOCK_PETS[0];

  useEffect(() => {
    // Assinatura em tempo real das mensagens do chat
    const unsubscribe = subscribeToMessages(chatId, setMessages);
    return unsubscribe;
  }, [chatId]);

  if (!user) return null;

  async function handleSend() {
    const text = draft.trim();
    if (!text) return;

    // Filtro de conteúdo ofensivo
    if (containsOffensiveContent(text)) {
      Alert.alert('Mensagem Bloqueada 🚫', getOffensiveContentMessage());
      return;
    }

    setDraft('');
    await sendMessage(chatId, user!.uid, user!.displayName ?? 'Usuário', text);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Banner de contexto do Pet no topo do Chat */}
      {pet && (
        <TouchableOpacity
          style={styles.petHeaderBanner}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('PetDetail', { pet })}
        >
          {pet.photos[0] ? (
            <Image source={{ uri: pet.photos[0] }} style={styles.petThumb} />
          ) : (
            <View style={[styles.petThumb, styles.petThumbPlaceholder]}>
              <Text style={{ fontSize: 18 }}>🐾</Text>
            </View>
          )}
          <View style={styles.petHeaderInfo}>
            <View style={styles.petHeaderRow}>
              <Text style={styles.petHeaderName}>{pet.name}</Text>
              <View style={styles.petStatusBadge}>
                <Text style={styles.petStatusBadgeText}>Interesse em Adoção</Text>
              </View>
            </View>
            <Text style={styles.petHeaderOwner}>Doador: {pet.ownerName}</Text>
          </View>
          <Text style={styles.petHeaderAction}>Ver Perfil ➔</Text>
        </TouchableOpacity>
      )}

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🐾</Text>
            <Text style={styles.empty}>Início da conversa para adoção</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isMine = item.senderId === user.uid;
          const isAdoptionCard = item.text.startsWith('📋 FICHA');
          const isSystemNotice = item.senderId === 'system' || item.text.startsWith('⚠️');

          // Renderização especial de aviso de desistência do match
          if (isSystemNotice) {
            return (
              <View style={styles.systemNoticeCard}>
                <View style={styles.systemNoticeHeader}>
                  <Text style={styles.systemNoticeBadge}>⚠️ AVISO DO SISTEMA</Text>
                </View>
                <Text style={styles.systemNoticeText}>{item.text}</Text>
                <Text style={styles.systemNoticeFooter}>
                  O match foi desfeito. O animal permanece disponível para outros adotantes.
                </Text>
              </View>
            );
          }

          // Renderização especial de alta visibilidade para a Ficha do Adotante
          if (isAdoptionCard) {
            return (
              <View style={styles.cardContainer}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardBadge}>🐾 FICHA DO ADOTANTE CONECTADO</Text>
                </View>
                <Text style={styles.cardText}>{item.text}</Text>
                <View style={styles.cardFooter}>
                  <Text style={styles.cardFooterHint}>
                    ✔ Conexão gerada automaticamente pelo Match de Adoção
                  </Text>
                </View>
              </View>
            );
          }

          return (
            <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
              {!isMine && <Text style={styles.senderName}>{item.senderName}</Text>}
              <Text style={isMine ? styles.textMine : styles.textOther}>{item.text}</Text>
            </View>
          );
        }}
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="Escreva uma mensagem..."
          placeholderTextColor={colors.textSecondary}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendButton, !draft.trim() && styles.sendDisabled]}
          onPress={handleSend}
          disabled={!draft.trim()}
        >
          <Text style={styles.sendEmoji}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    padding: spacing.md,
  },
  empty: {
    textAlign: 'center',
    color: colors.textSecondary,
    marginTop: spacing.xl,
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  bubbleMine: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
    borderBottomRightRadius: radii.sm,
  },
  bubbleOther: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderBottomLeftRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  senderName: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryDark,
    marginBottom: 2,
  },
  textMine: {
    color: colors.white,
    fontSize: 15,
  },
  textOther: {
    color: colors.text,
    fontSize: 15,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.sm,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 110,
    borderRadius: radii.round,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'ios' ? 12 : 10,
    paddingBottom: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 15,
    backgroundColor: colors.background,
    color: colors.text,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: radii.round,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: {
    opacity: 0.4,
  },
  sendEmoji: {
    color: colors.white,
    fontSize: 18,
  },
  petHeaderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  petThumb: {
    width: 44,
    height: 44,
    borderRadius: radii.sm,
    backgroundColor: colors.border,
  },
  petThumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  petHeaderInfo: {
    flex: 1,
  },
  petHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  petHeaderName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  petStatusBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radii.round,
  },
  petStatusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  petHeaderOwner: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  petHeaderAction: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: spacing.xs,
  },
  cardContainer: {
    backgroundColor: '#F0FDFA',
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: colors.primary,
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    marginBottom: spacing.xs,
  },
  cardBadge: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primaryDark,
    letterSpacing: 0.5,
  },
  cardText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
    marginVertical: spacing.xs,
  },
  cardFooter: {
    marginTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: '#CCFBF1',
    paddingTop: spacing.xs,
  },
  cardFooterHint: {
    fontSize: 11,
    color: colors.primaryDark,
    fontWeight: '600',
  },
  systemNoticeCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#F87171',
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#EF4444',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  systemNoticeHeader: {
    marginBottom: spacing.xs,
  },
  systemNoticeBadge: {
    fontSize: 12,
    fontWeight: '900',
    color: '#DC2626',
    letterSpacing: 0.5,
  },
  systemNoticeText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
    marginVertical: spacing.xs,
    fontWeight: '600',
  },
  systemNoticeFooter: {
    marginTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: '#FCA5A5',
    paddingTop: spacing.xs,
    fontSize: 11,
    color: '#B91C1C',
    fontWeight: '500',
  },
});