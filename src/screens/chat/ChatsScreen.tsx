/**
 * Tela de Chats — lista de conversas ativas em tempo real
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { subscribeToUserChats } from '@/services/chat';
import { colors, radii, spacing } from '@/theme';
import type { Chat } from '@/types';
import type { MainTabScreenProps } from '@/navigation/types';

type Props = MainTabScreenProps<'Chats'>;


export function ChatsScreen({ navigation }: Props) {

  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);

  useEffect(() => {
    if (!user) return;
    // Assinatura em tempo real da lista de conversas
    const unsubscribe = subscribeToUserChats(user.uid, setChats);
    return unsubscribe;
  }, [user]);

  if (!user) return null;

  return (
    <View style={styles.container}>
      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyEmoji}>💬</Text>
            <Text style={styles.emptyTitle}>Nenhuma conversa ainda</Text>
            <Text style={styles.emptySubtitle}>
              Curta um pet no modo Adoção para iniciar uma conversa com o doador.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.chatItem}
            onPress={() => navigation.navigate('ChatRoom', { chatId: item.id, petId: item.petId })}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarEmoji}>🐾</Text>
            </View>
            <View style={styles.chatInfo}>
              <Text style={styles.preview} numberOfLines={1}>
                {item.lastMessagePreview || 'Nova conversa'}
              </Text>
              <Text style={styles.time}>
                {new Date(item.lastMessageAt).toLocaleDateString('pt-BR')}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
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
  center: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
    paddingHorizontal: spacing.lg,
  },
  emptyEmoji: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.md,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radii.round,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarEmoji: {
    fontSize: 22,
  },
  chatInfo: {
    flex: 1,
  },
  preview: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '500',
  },
  time: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});