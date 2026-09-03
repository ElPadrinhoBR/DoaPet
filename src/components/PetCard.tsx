/**
 * Card de Pet — usado no feed/mapa e no modo swipe
 */
import React from 'react';
import { View, Text, Image, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radii, spacing } from '@/theme';
import type { Pet } from '@/types';
import { formatPetAge } from '@/utils/format';

interface PetCardProps {
  pet: Pet;
  distanceKm?: number;
  style?: StyleProp<ViewStyle>;
}

export function PetCard({ pet, distanceKm, style }: PetCardProps) {
  const photo = pet.photos[0];

  return (
    <View style={[styles.card, style]}>
      {photo ? (
        <Image source={{ uri: photo }} style={styles.photo} />
      ) : (
        <View style={[styles.photo, styles.photoPlaceholder]}>
          <Text style={styles.placeholderEmoji}>🐾</Text>
        </View>
      )}

      <View style={styles.info}>
        <View style={styles.titleRow}>
          <Text style={styles.name} numberOfLines={1}>
            {pet.name}
          </Text>
          {typeof distanceKm === 'number' && (
            <Text style={styles.distance}>{distanceKm.toFixed(1)} km</Text>
          )}
        </View>

        <Text style={styles.subtitle} numberOfLines={1}>
          {pet.species} • {formatPetAge(pet.ageMonths)} • {pet.size}
        </Text>

        <View style={styles.badgesRow}>
          {pet.medical.vaccinated && <Badge label="Vacinado" />}
          {pet.medical.neutered && <Badge label="Castrado" />}
          {pet.medical.dewormed && <Badge label="Vermifugado" />}
        </View>
      </View>
    </View>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  photo: {
    width: '100%',
    height: 320,
    backgroundColor: colors.border,
  },
  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderEmoji: {
    fontSize: 64,
  },
  info: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  distance: {
    fontSize: 14,
    color: colors.primaryDark,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  badge: {
    backgroundColor: colors.primaryLight,
    borderRadius: radii.round,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 12,
    color: colors.primaryDark,
    fontWeight: '600',
  },
});