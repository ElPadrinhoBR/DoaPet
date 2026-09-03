/**
 * Tela de Feiras e Campanhas
 *
 * Agenda de eventos de adoção e mutirões organizados por ONGs/protetores.
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Linking,
  TouchableOpacity,
} from 'react-native';
import { listUpcomingEvents } from '@/services/events';
import { formatDateTime } from '@/utils/format';
import { colors, radii, spacing } from '@/theme';
import type { AdoptionEvent } from '@/types';
import type { MainTabScreenProps } from '@/navigation/types';

type Props = MainTabScreenProps<'Events'>;



export function EventsScreen(_props: Props) {

  const [events, setEvents] = useState<AdoptionEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listUpcomingEvents()
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, []);

  function openRoute(event: AdoptionEvent) {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${event.location.latitude},${event.location.longitude}`;
    Linking.openURL(url);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyEmoji}>📅</Text>
            <Text style={styles.emptyText}>Nenhum evento agendado por enquanto.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.organizer}>Organizado por {item.organizerName}</Text>
            <Text style={styles.date}>🗓️ {formatDateTime(item.startsAt)}</Text>
            <Text style={styles.address}>📍 {item.address}</Text>
            <Text style={styles.description} numberOfLines={3}>
              {item.description}
            </Text>

            <TouchableOpacity style={styles.routeButton} onPress={() => openRoute(item)}>
              <Text style={styles.routeButtonText}>🧭 Ver rota no mapa</Text>
            </TouchableOpacity>
          </View>
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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  emptyEmoji: {
    fontSize: 48,
  },
  emptyText: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  organizer: {
    fontSize: 13,
    color: colors.primaryDark,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  date: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  address: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
    marginTop: spacing.sm,
  },
  routeButton: {
    alignSelf: 'flex-start',
    marginTop: spacing.md,
    backgroundColor: colors.vet,
    borderRadius: radii.round,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  routeButtonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 13,
  },
});