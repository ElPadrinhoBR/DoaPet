/**
 * Tela de Detalhes do Pet — perfil completo
 * Fotos, histórico médico, porte, personalidade e contato com o doador.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { WebView } from 'react-native-webview';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';


import { Button } from '@/components/Button';
import { useAuth } from '@/context/AuthContext';
import { getOrCreateChat, checkPetMatch, undoPetMatch } from '@/services/chat';
import { registerAdoptionInterest, cancelAdoption } from '@/services/adoptions';
import { markPetAsAdopted, cancelPetDonation } from '@/services/pets';
import { submitReport, REPORT_REASON_LABELS, type ReportReason } from '@/services/reports';
import { formatPetAge, formatDateTime } from '@/utils/format';
import { colors, radii, spacing } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'PetDetail'>;

export function PetDetailScreen({ route, navigation }: Props) {
  const { pet } = route.params;
  const { user, profile } = useAuth();
  const [contacting, setContacting] = useState(false);
  const [isMatched, setIsMatched] = useState(false);

  React.useEffect(() => {
    if (user && pet) {
      checkPetMatch(user.uid, pet.id).then((chatId) => {
        setIsMatched(!!chatId);
      });
    }
  }, [user, pet]);

  function handleUndoMatch() {
    Alert.alert(
      'Desistir da Adoção?',
      `Deseja desfazer o match com ${pet.name}? Um aviso será enviado no chat da doação informando ao tutor que você desistiu.`,
      [
        { text: 'Voltar', style: 'cancel' },
        {
          text: 'Sim, Desistir do Match',
          style: 'destructive',
          onPress: async () => {
            if (user) {
              await undoPetMatch(user.uid, pet.id, profile?.name);
              await cancelAdoption(pet.id, user.uid);
              setIsMatched(false);
              Alert.alert('Match Desfeito', `O match com ${pet.name} foi cancelado e o tutor foi avisado no chat.`);
            }
          },
        },
      ],
    );
  }

  async function handleContact() {
    if (!user) return;
    setContacting(true);
    try {
      const chatId = await getOrCreateChat(user.uid, pet.ownerId, pet.id);
      if (profile) {
        await registerAdoptionInterest(profile, pet);
      }
      setIsMatched(true);
      navigation.navigate('ChatRoom', { chatId, petId: pet.id });
    } catch {
      Alert.alert('Erro', 'Não foi possível iniciar o chat.');
    } finally {
      setContacting(false);
    }
  }

  function handleMarkAsAdopted() {
    Alert.alert(
      'Marcar como Adotado? 🎉',
      `Confirmar que ${pet.name} já encontrou um lar e foi adotado(a)? O animalzinho será retirado da vitrine pública de doações.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sim, Foi Adotado! 🎉',
          onPress: async () => {
            try {
              await markPetAsAdopted(pet.id);
              Alert.alert(
                '🎉 Parabéns pela Adoção!',
                `${pet.name} foi marcado(a) como adotado(a) com sucesso! Ficamos muito felizes por mais um final feliz! 🐾`,
                [{ text: 'Maravilha!', onPress: () => navigation.goBack() }],
              );
            } catch {
              Alert.alert('Erro', 'Não foi possível atualizar o status do pet.');
            }
          },
        },
      ],
    );
  }

  function handleCancelDonation() {
    Alert.alert(
      'Desistir da Doação?',
      `Deseja realmente cancelar a doação de ${pet.name}? O perfil do pet será removido da vitrine pública e do mapa.`,
      [
        { text: 'Voltar', style: 'cancel' },
        {
          text: 'Sim, Cancelar Doação',
          style: 'destructive',
          onPress: async () => {
            try {
              if (user) {
                await cancelPetDonation(pet.id, user.uid);
              }
              Alert.alert(
                'Doação Cancelada',
                `A doação de ${pet.name} foi cancelada e o animalzinho foi removido da vitrine.`,
                [{ text: 'OK', onPress: () => navigation.goBack() }],
              );
            } catch {
              Alert.alert('Erro', 'Não foi possível cancelar a doação.');
            }
          },
        },
      ],
    );
  }

  function handleReportPet() {
    if (!user) {
      Alert.alert('Login Necessário', 'Você precisa estar conectado para fazer uma denúncia.');
      return;
    }

    const reasons: Array<{ reason: ReportReason; label: string }> = [
      { reason: 'conteudo_ofensivo', label: REPORT_REASON_LABELS['conteudo_ofensivo'] },
      { reason: 'imagem_inapropriada', label: REPORT_REASON_LABELS['imagem_inapropriada'] },
      { reason: 'informacoes_falsas', label: REPORT_REASON_LABELS['informacoes_falsas'] },
      { reason: 'crueldade_animal', label: REPORT_REASON_LABELS['crueldade_animal'] },
      { reason: 'spam', label: REPORT_REASON_LABELS['spam'] },
      { reason: 'outro', label: REPORT_REASON_LABELS['outro'] },
    ];

    Alert.alert(
      '🚨 Denunciar Anúncio',
      `Selecione o motivo da denúncia para o anúncio de "${pet.name}". Ela será enviada diretamente para a equipe de moderação:`,
      [
        ...reasons.map((r) => ({
          text: r.label,
          onPress: async () => {
            try {
              await submitReport({
                targetId: pet.id,
                targetType: 'pet',
                targetTitle: pet.name,
                reporterId: user.uid,
                reporterName: profile?.name ?? user.displayName ?? 'Usuário DoaPet',
                reason: r.reason,
              });
              Alert.alert(
                '✅ Denúncia Enviada',
                'Obrigado por ajudar a manter o DoaPet seguro! O anúncio será revisado pela nossa equipe.',
              );
            } catch {
              Alert.alert('Erro', 'Não foi possível registrar a denúncia. Tente novamente.');
            }
          },
        })),
        { text: 'Cancelar', style: 'cancel' },
      ],
    );
  }

  const isOwner = user?.uid === pet.ownerId;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Galeria de fotos */}
      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
        {pet.photos.length > 0 ? (
          pet.photos.map((uri) => (
            <Image key={uri} source={{ uri }} style={styles.photo} />
          ))
        ) : (
          <View style={[styles.photo, styles.photoPlaceholder]}>
            <Text style={{ fontSize: 64 }}>🐾</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.section}>
        {isMatched && (
          <View style={styles.matchedBanner}>
            <View style={styles.matchedBannerLeft}>
              <Text style={styles.matchedBannerTitle}>💚 Deu Match!</Text>
              <Text style={styles.matchedBannerSub}>
                Você demonstrou interesse em adotar {pet.name}.
              </Text>
            </View>
            <TouchableOpacity style={styles.undoMatchTopBtn} onPress={handleUndoMatch} activeOpacity={0.8}>
              <Text style={styles.undoMatchTopBtnText}>Desfazer</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.headerRow}>
          <Text style={styles.name}>{pet.name}</Text>
          {pet.ownerRole === 'ong' && (
            <View style={styles.ongBadge}>
              <Text style={styles.ongBadgeText}>✔ ONG Verificada</Text>
            </View>
          )}
        </View>

        <Text style={styles.owner}>Publicado por {pet.ownerName}</Text>

        <View style={styles.infoGrid}>
          <InfoItem label="Espécie" value={pet.species} />
          <InfoItem label="Idade" value={formatPetAge(pet.ageMonths)} />
          <InfoItem label="Porte" value={pet.size} />
          <InfoItem label="Sexo" value={pet.gender === 'macho' ? 'Macho' : 'Fêmea'} />
          {pet.breed && <InfoItem label="Raça" value={pet.breed} />}
        </View>

        {/* Histórico médico */}
        <Text style={styles.sectionTitle}>Histórico médico</Text>
        <View style={styles.medicalRow}>
          <MedicalChip label="Vacinado" ok={pet.medical.vaccinated} />
          <MedicalChip label="Castrado" ok={pet.medical.neutered} />
          <MedicalChip label="Vermifugado" ok={pet.medical.dewormed} />
        </View>

        {/* Personalidade */}
        {pet.personality.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Personalidade</Text>
            <View style={styles.medicalRow}>
              {pet.personality.map((trait) => (
                <View key={trait} style={styles.traitChip}>
                  <Text style={styles.traitText}>{trait}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Descrição */}
        <Text style={styles.sectionTitle}>Sobre {pet.name}</Text>
        <Text style={styles.description}>{pet.description}</Text>

        {/* Localização aproximada */}
        <Text style={styles.sectionTitle}>Localização aproximada</Text>
        <Text style={styles.locationHint}>
          {pet.locationHint ? `📍 ${pet.locationHint} • ` : ''}Por segurança, exibimos o raio aproximado onde o pet está abrigado.
        </Text>
        <View style={styles.mapContainer}>
          <WebView
            style={styles.miniMap}
            originWhitelist={['*']}
            source={{
              html: `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no"/><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><style>*{margin:0;padding:0;}html,body,#map{width:100%;height:100%;background:#e8f4f8;}</style></head><body><div id="map"></div><script>var map=L.map('map',{zoomControl:false,dragging:false,touchZoom:false,scrollWheelZoom:false,doubleClickZoom:false}).setView([${pet.location.latitude},${pet.location.longitude}],14);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OSM'}).addTo(map);L.circle([${pet.location.latitude},${pet.location.longitude}],{radius:750,color:'#14B8A6',fillColor:'#14B8A6',fillOpacity:0.25}).addTo(map);L.marker([${pet.location.latitude},${pet.location.longitude}],{icon:L.divIcon({className:'',html:'<div style="background:#14B8A6;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:16px;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)">🐾</div>',iconSize:[32,32],iconAnchor:[16,16]})}).addTo(map);</script></body></html>`,
            }}
            scrollEnabled={false}
          />
        </View>

        {/* Canais Diretos de Contato com o Doador */}
        {(pet.whatsapp || pet.instagram) && (
          <View style={styles.directContactBox}>
            <Text style={styles.directContactTitle}>Contatos Diretos do Doador:</Text>
            <View style={styles.directContactButtonsRow}>
              {pet.whatsapp && (
                <TouchableOpacity
                  style={styles.whatsappBtn}
                  onPress={() => {
                    const cleanPhone = pet.whatsapp!.replace(/\D/g, '');
                    const url = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(`Olá! Vi o pet ${pet.name} no app DoaPet e gostaria de saber mais sobre a adoção!`)}`;
                    Linking.openURL(url).catch(() => Alert.alert('Atenção', 'Não foi possível abrir o WhatsApp.'));
                  }}
                >
                  <Text style={styles.whatsappBtnText}>💬 WhatsApp ({pet.whatsapp})</Text>
                </TouchableOpacity>
              )}

              {pet.instagram && (
                <TouchableOpacity
                  style={styles.instagramBtn}
                  onPress={() => {
                    const handle = pet.instagram!.replace('@', '').trim();
                    const url = `https://instagram.com/${handle}`;
                    Linking.openURL(url).catch(() => Alert.alert('Atenção', 'Não foi possível abrir o Instagram.'));
                  }}
                >
                  <Text style={styles.instagramBtnText}>📸 Instagram ({pet.instagram})</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        <Text style={styles.date}>Publicado em {formatDateTime(pet.createdAt)}</Text>

        {isOwner ? (
          <View style={styles.ownerControlCard}>
            <View style={styles.ownerControlHeader}>
              <Text style={styles.ownerControlEmoji}>👑</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.ownerControlTitle}>Você cadastrou este pet</Text>
                <Text style={styles.ownerControlSubtitle}>Gerencie o anúncio de {pet.name}:</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.editDonationBtn}
              onPress={() => navigation.navigate('EditPet', { pet })}
              activeOpacity={0.85}
            >
              <Text style={styles.editDonationBtnText}>✏️ Editar Dados da Doação</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.adoptedBtn}
              onPress={handleMarkAsAdopted}
              activeOpacity={0.85}
            >
              <Text style={styles.adoptedBtnText}>🎉 Marcar como Adotado</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelDonationBtn}
              onPress={handleCancelDonation}
              activeOpacity={0.85}
            >
              <Text style={styles.cancelDonationBtnText}>❌ Desistir / Cancelar Doação</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.dualActionsRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.messageBtn]}
              onPress={handleContact}
              disabled={contacting}
            >
              <Text style={styles.actionBtnText}>💬 Enviar Mensagem</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.visitBtn]}
              onPress={() => {
                Alert.alert(
                  'Agendar Visita',
                  `Deseja solicitar uma visita para conhecer ${pet.name}? O doador receberá sua solicitação pelo chat.`,
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                      text: 'Confirmar Solicitação',
                      onPress: async () => {
                        await handleContact();
                      },
                    },
                  ],
                );
              }}
            >
              <Text style={[styles.actionBtnText, styles.visitBtnText]}>
                📅 Agendar Visita
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {!isOwner && isMatched && (
          <TouchableOpacity
            style={styles.undoMatchFullBtn}
            onPress={handleUndoMatch}
            activeOpacity={0.8}
          >
            <Text style={styles.undoMatchFullBtnText}>💔 Desistir da Adoção / Desfazer Match</Text>
          </TouchableOpacity>
        )}

        {/* Botão de Denúncia de Anúncio para quem não é o dono */}
        {!isOwner && (
          <TouchableOpacity
            style={styles.reportPetBtn}
            onPress={handleReportPet}
            activeOpacity={0.8}
          >
            <Text style={styles.reportPetBtnText}>🚨 Denunciar Anúncio (Conteúdo Ofensivo ou Irregular)</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}


function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoItem}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function MedicalChip({ label, ok }: { label: string; ok: boolean }) {
  return (
    <View style={[styles.medicalChip, !ok && styles.medicalChipOff]}>
      <Text style={[styles.medicalText, !ok && styles.medicalTextOff]}>
        {ok ? '✓' : '✗'} {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: spacing.xl,
  },
  photo: {
    width: 400,
    height: 300,
    backgroundColor: colors.border,
  },
  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    padding: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
  },
  ongBadge: {
    backgroundColor: colors.primaryLight,
    borderRadius: radii.round,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  ongBadgeText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '700',
  },
  owner: {
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  infoItem: {
    minWidth: 100,
  },
  infoLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    textTransform: 'capitalize',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  medicalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  medicalChip: {
    backgroundColor: colors.primaryLight,
    borderRadius: radii.round,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  medicalChipOff: {
    backgroundColor: '#FFEBEE',
  },
  medicalText: {
    color: colors.primaryDark,
    fontWeight: '600',
    fontSize: 13,
  },
  medicalTextOff: {
    color: colors.error,
  },
  traitChip: {
    backgroundColor: '#FFF3E0',
    borderRadius: radii.round,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  traitText: {
    color: colors.accent,
    fontWeight: '600',
    fontSize: 13,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
  },
  date: {
    marginTop: spacing.md,
    fontSize: 12,
    color: colors.textSecondary,
  },
  locationHint: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  mapContainer: {
    height: 160,
    borderRadius: radii.md,
    overflow: 'hidden',
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  miniMap: {
    flex: 1,
  },
  dualActionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radii.round,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  messageBtn: {
    backgroundColor: colors.primary,
  },
  visitBtn: {
    backgroundColor: colors.accent,
  },
  actionBtnText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
  visitBtnText: {
    color: colors.white,
  },
  contactButton: {
    marginTop: spacing.lg,
  },
  directContactBox: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: '#F0FDF4',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  directContactTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#166534',
    marginBottom: spacing.xs,
  },
  directContactButtonsRow: {
    flexDirection: 'column',
    gap: spacing.xs,
  },
  whatsappBtn: {
    backgroundColor: '#25D366',
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  whatsappBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  instagramBtn: {
    backgroundColor: '#E1306C',
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
    shadowColor: '#E1306C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  instagramBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  matchedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ECFDF5',
    borderRadius: radii.md,
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: '#6EE7B7',
    marginBottom: spacing.md,
  },
  matchedBannerLeft: {
    flex: 1,
  },
  matchedBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#065F46',
  },
  matchedBannerSub: {
    fontSize: 11,
    color: '#047857',
    marginTop: 2,
  },
  undoMatchTopBtn: {
    backgroundColor: '#FEE2E2',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    marginLeft: spacing.sm,
  },
  undoMatchTopBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B91C1C',
  },
  undoMatchFullBtn: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#F87171',
    borderRadius: radii.md,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  undoMatchFullBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#DC2626',
  },
  ownerControlCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    borderRadius: radii.xl,
    padding: spacing.md,
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  ownerControlHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 4,
  },
  ownerControlEmoji: {
    fontSize: 26,
  },
  ownerControlTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#166534',
  },
  ownerControlSubtitle: {
    fontSize: 12,
    color: '#15803D',
    marginTop: 1,
  },
  adoptedBtn: {
    backgroundColor: '#16A34A',
    borderRadius: radii.lg,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  adoptedBtnText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '800',
  },
  cancelDonationBtn: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1.5,
    borderColor: '#F87171',
    borderRadius: radii.lg,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelDonationBtnText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '800',
  },
  editDonationBtn: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    borderRadius: radii.lg,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  editDonationBtnText: {
    color: '#B45309',
    fontSize: 14,
    fontWeight: '800',
  },
  reportPetBtn: {
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    borderRadius: radii.md,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  reportPetBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E11D48',
  },
});