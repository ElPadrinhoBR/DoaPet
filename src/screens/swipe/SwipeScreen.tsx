/**
 * Modo Swipe (Tinder de Adoção de Pets)
 *
 * Cards arrastáveis com gestos reais (PanResponder), carimbos visuais
 * de "ADOTAR 💚" / "PASSAR ✕", celebração "Deu Match! 🐾" e abertura
 * de chat com a Ficha do Adotante enviada automaticamente.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  PanResponder,
  Dimensions,
  Image,
  Modal,
} from 'react-native';

import { PetCard } from '@/components/PetCard';
import { Button } from '@/components/Button';
import { useLocation } from '@/hooks/useLocation';
import { useAuth } from '@/context/AuthContext';
import { listAvailablePets } from '@/services/pets';
import { connectAndStartAdoptionChat } from '@/services/chat';
import { registerAdoptionInterest } from '@/services/adoptions';
import { MOCK_USER } from '@/services/mockData';
import { haversineDistanceKm, clampRadiusKm, MIN_RADIUS_KM, MAX_RADIUS_KM } from '@/utils/geo';
import { colors, radii, spacing } from '@/theme';
import type { Pet } from '@/types';
import type { MainTabScreenProps } from '@/navigation/types';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = 0.25 * SCREEN_WIDTH;

type Props = MainTabScreenProps<'Swipe'>;
type PetWithDistance = Pet & { distanceKm?: number };

export function SwipeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const { location } = useLocation();
  const [pets, setPets] = useState<Pet[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [radiusKm, setRadiusKm] = useState(15);

  // Estado do modal "Deu Match!"
  const [matchModalVisible, setMatchModalVisible] = useState(false);
  const [matchedPet, setMatchedPet] = useState<Pet | null>(null);
  const [matchedChatId, setMatchedChatId] = useState<string>('');

  const position = useRef(new Animated.ValueXY()).current;

  // Recarrega pets do banco sempre que entrar na aba de Adoção
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      listAvailablePets()
        .then((data) => {
          setPets(data);
          setIndex(0);
        })
        .finally(() => setLoading(false));
    }, []),
  );

  /** Pets dentro do raio selecionado, ordenados pela distância */
  const filteredPets: PetWithDistance[] = useMemo(() => {
    if (!location) {
      return pets.map((p) => ({ ...p, distanceKm: undefined }));
    }
    const withDistance = pets
      .map((pet) => ({
        ...pet,
        distanceKm: haversineDistanceKm(location, pet.location),
      }))
      .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));

    const inRadius = withDistance.filter(({ distanceKm }) => (distanceKm ?? 0) <= radiusKm);

    // Se houver pets cadastrados mas nenhum no raio restrito, exibe todos para garantir adoção
    return inRadius.length > 0 ? inRadius : withDistance;
  }, [pets, location, radiusKm]);

  const current = filteredPets[index];

  const resetPosition = useCallback(() => {
    position.setValue({ x: 0, y: 0 });
  }, [position]);

  const onSwipeComplete = useCallback(
    async (direction: 'right' | 'left') => {
      const petToAct = current;
      resetPosition();
      setIndex((prev) => prev + 1);

      if (direction === 'right' && petToAct) {
        const activeProfile = profile ?? MOCK_USER;
        try {
          const chatId = await connectAndStartAdoptionChat(activeProfile, petToAct);
          // Registra o interesse no Banco de Dados oficial de Adoções
          await registerAdoptionInterest(activeProfile, petToAct);
          setMatchedChatId(chatId);
          setMatchedPet(petToAct);
          setMatchModalVisible(true);
        } catch {
          // Continua mesmo em caso de falha
        }
      }
    },
    [current, profile, resetPosition],
  );

  const forceSwipe = useCallback(
    (direction: 'right' | 'left') => {
      const x = direction === 'right' ? SCREEN_WIDTH + 100 : -SCREEN_WIDTH - 100;
      Animated.timing(position, {
        toValue: { x, y: 0 },
        duration: 250,
        useNativeDriver: false,
      }).start(() => onSwipeComplete(direction));
    },
    [position, onSwipeComplete],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderMove: (_evt, gestureState) => {
          position.setValue({ x: gestureState.dx, y: gestureState.dy });
        },
        onPanResponderRelease: (_evt, gestureState) => {
          if (gestureState.dx > SWIPE_THRESHOLD) {
            forceSwipe('right');
          } else if (gestureState.dx < -SWIPE_THRESHOLD) {
            forceSwipe('left');
          } else {
            Animated.spring(position, {
              toValue: { x: 0, y: 0 },
              friction: 5,
              useNativeDriver: false,
            }).start();
          }
        },
      }),
    [position, forceSwipe],
  );

  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH * 1.5, 0, SCREEN_WIDTH * 1.5],
    outputRange: ['-18deg', '0deg', '18deg'],
  });

  const likeStampOpacity = position.x.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const passStampOpacity = position.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Buscando pets disponíveis...</Text>
      </View>
    );
  }

  if (!current) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyEmoji}>🐕</Text>
        <Text style={styles.emptyTitle}>Sem mais pets por aqui</Text>
        <Text style={styles.emptySubtitle}>
          Você já viu todos os pets no raio de {radiusKm} km. Aumente o raio ou volte mais tarde!
        </Text>
        <Button
          title="Ver novamente do início"
          variant="secondary"
          onPress={() => {
            setIndex(0);
            resetPosition();
            setLoading(true);
            listAvailablePets().then(setPets).finally(() => setLoading(false));
          }}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}>
      {/* Barra de controle do raio e atalho para Doar */}
      <View style={styles.header}>
        <View style={styles.topControlRow}>
          <View style={styles.radiusRow}>
            <TouchableOpacity
              style={styles.radiusButton}
              onPress={() => setRadiusKm((r) => clampRadiusKm(r - 5))}
            >
              <Text style={styles.radiusButtonText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.radiusLabel}>Raio: {radiusKm} km</Text>
            <TouchableOpacity
              style={styles.radiusButton}
              onPress={() => setRadiusKm((r) => clampRadiusKm(r + 5))}
            >
              <Text style={styles.radiusButtonText}>＋</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.donateHeaderBtn}
            onPress={() => navigation.navigate('CreatePet')}
            activeOpacity={0.85}
          >
            <Text style={styles.donateHeaderBtnText}>🎁 Quero Doar</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.radiusHint}>Arraste o card: Direita (Adotar 💚) • Esquerda (Passar ✕)</Text>
      </View>

      {/* Área do Card estilo Tinder com PanResponder */}
      <View style={styles.cardArea}>
        <Animated.View
          style={[
            styles.animatedCard,
            {
              transform: [
                { translateX: position.x },
                { translateY: position.y },
                { rotate },
              ],
            },
          ]}
          {...panResponder.panHandlers}
        >
          {/* Carimbo ADOTAR (Direita) */}
          <Animated.View style={[styles.stamp, styles.stampLike, { opacity: likeStampOpacity }]}>
            <Text style={styles.stampLikeText}>QUERO ADOTAR 💚</Text>
          </Animated.View>

          {/* Carimbo PASSAR (Esquerda) */}
          <Animated.View style={[styles.stamp, styles.stampPass, { opacity: passStampOpacity }]}>
            <Text style={styles.stampPassText}>PASSAR ✕</Text>
          </Animated.View>

          <TouchableOpacity
            activeOpacity={0.95}
            onPress={() => navigation.navigate('PetDetail', { pet: current })}
          >
            <PetCard pet={current} distanceKm={current.distanceKm} />
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Botões de Ação Inferiores estilo Tinder */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.passButton]}
          onPress={() => forceSwipe('left')}
        >
          <Text style={styles.actionEmoji}>✖️</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.detailButton]}
          onPress={() => navigation.navigate('PetDetail', { pet: current })}
        >
          <Text style={styles.actionEmoji}>ℹ️</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.likeButton]}
          onPress={() => forceSwipe('right')}
        >
          <Text style={styles.actionEmoji}>💚</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.counter}>
        {index + 1} de {filteredPets.length} pets no seu raio
      </Text>

      {/* MODAL DE MATCH CELEBRATIVO */}
      <Modal
        visible={matchModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMatchModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTag}>🐾 MATCH REALIZADO!</Text>
            <Text style={styles.modalTitle}>Deu Match!</Text>

            {/* Avatares conectados com coração central */}
            <View style={styles.matchAvatarsRow}>
              <Image
                source={{
                  uri:
                    profile?.photoURL ??
                    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
                }}
                style={styles.avatarCircle}
              />
              <View style={styles.heartBubble}>
                <Text style={{ fontSize: 24 }}>💚</Text>
              </View>
              {matchedPet?.photos[0] && (
                <Image
                  source={{ uri: matchedPet.photos[0] }}
                  style={[styles.avatarCircle, styles.petAvatarCircle]}
                />
              )}
            </View>

            <Text style={styles.modalDescription}>
              Você e a <Text style={styles.boldText}>{matchedPet?.name}</Text> se conectaram!
            </Text>
            <Text style={styles.modalSubDescription}>
              Sua <Text style={styles.boldText}>Ficha do Adotante</Text> já foi enviada para{' '}
              <Text style={styles.boldText}>{matchedPet?.ownerName}</Text> para agilizar o processo
              de adoção responsável.
            </Text>

            <TouchableOpacity
              style={styles.modalPrimaryBtn}
              onPress={() => {
                setMatchModalVisible(false);
                if (matchedPet) {
                  navigation.navigate('ChatRoom', {
                    chatId: matchedChatId,
                    petId: matchedPet.id,
                    pet: matchedPet,
                  });
                }
              }}
            >
              <Text style={styles.modalPrimaryBtnText}>💬 Conversar com o Doador Agora</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalSecondaryBtn}
              onPress={() => setMatchModalVisible(false)}
            >
              <Text style={styles.modalSecondaryBtnText}>Continuar Olhando Pets 🐶</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.textSecondary,
    fontSize: 14,
  },
  topControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: spacing.xs,
  },
  donateHeaderBtn: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.round,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  donateHeaderBtnText: {
    color: '#B45309',
    fontWeight: '800',
    fontSize: 12,
  },
  radiusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  radiusButton: {
    width: 34,
    height: 34,
    borderRadius: radii.round,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radiusButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  radiusLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  radiusHint: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  cardArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  animatedCard: {
    width: '100%',
    maxWidth: 360,
  },
  stamp: {
    position: 'absolute',
    top: 30,
    zIndex: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 3,
    borderRadius: radii.md,
  },
  stampLike: {
    right: 20,
    borderColor: '#10B981',
    transform: [{ rotate: '15deg' }],
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  stampLikeText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#10B981',
    letterSpacing: 1,
  },
  stampPass: {
    left: 20,
    borderColor: '#EF4444',
    transform: [{ rotate: '-15deg' }],
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  stampPassText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#EF4444',
    letterSpacing: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  actionButton: {
    borderRadius: radii.round,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  passButton: {
    width: 64,
    height: 64,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: '#FCA5A5',
  },
  detailButton: {
    width: 48,
    height: 48,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  likeButton: {
    width: 64,
    height: 64,
    backgroundColor: colors.primaryLight,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  actionEmoji: {
    fontSize: 26,
  },
  counter: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 12,
    paddingBottom: spacing.xs,
  },
  emptyEmoji: {
    fontSize: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.md,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },

  // Modal Deu Match
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  modalTag: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.text,
    marginBottom: spacing.lg,
  },
  matchAvatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: colors.primary,
  },
  petAvatarCircle: {
    borderColor: colors.accent,
  },
  heartBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: -12,
    zIndex: 5,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    borderWidth: 2,
    borderColor: colors.border,
  },
  modalDescription: {
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  modalSubDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.lg,
  },
  boldText: {
    fontWeight: '700',
    color: colors.primaryDark,
  },
  modalPrimaryBtn: {
    width: '100%',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radii.round,
    alignItems: 'center',
    marginBottom: spacing.sm,
    elevation: 2,
  },
  modalPrimaryBtnText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 15,
  },
  modalSecondaryBtn: {
    paddingVertical: spacing.sm,
  },
  modalSecondaryBtnText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 13,
  },
});