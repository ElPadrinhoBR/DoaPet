/**
 * Tela de Configurações & Perfil do Usuário
 *
 * - Foto de perfil com câmera/galeria, compressão automática e upload
 * - Ajuste de raio de busca (5–30 km)
 * - Notificações push
 * - Informações da conta e logout
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
  Linking,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';

import { Button } from '@/components/Button';
import { useAuth } from '@/context/AuthContext';
import { uploadProfilePhoto } from '@/services/auth';
import { isSoundAlertEnabled, setSoundAlertEnabled } from '@/services/nearbyAlert';
import { listUserAlerts, deleteSosAlert } from '@/services/sos';
import { listPetsByOwner, markPetAsAdopted, cancelPetDonation } from '@/services/pets';
import { listAdoptionsByAdopter, cancelAdoption } from '@/services/adoptions';
import { undoPetMatch } from '@/services/chat';
import { openSupportWhatsApp } from '@/services/projectSupport';
import { clampRadiusKm } from '@/utils/geo';
import { ProjectSupportModal } from '@/components/ProjectSupportModal';
import { colors, radii, spacing } from '@/theme';
import type { SosAlert, Pet, AdoptionRecord } from '@/types';

export function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, profile, signOut, updateProfilePhoto } = useAuth();
  const [radiusKm, setRadiusKm] = useState(profile?.searchRadiusKm ?? 10);
  const [pushEnabled, setPushEnabled] = useState(profile?.pushNotificationsEnabled ?? true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [supportModalVisible, setSupportModalVisible] = useState(false);
  const [userAlerts, setUserAlerts] = useState<SosAlert[]>([]);
  const [userPets, setUserPets] = useState<Pet[]>([]);
  const [userAdoptions, setUserAdoptions] = useState<AdoptionRecord[]>([]);

  React.useEffect(() => {
    isSoundAlertEnabled().then(setSoundEnabled);
    if (user) {
      listUserAlerts(user.uid).then(setUserAlerts);
      listPetsByOwner(user.uid).then(setUserPets);
      listAdoptionsByAdopter(user.uid).then(setUserAdoptions);
    }
  }, [user]);

  function handleContactSupport() {
    const supportEmail = 'santigarudananda@gmail.com';
    const subject = encodeURIComponent('Suporte DoaPet Mobile');
    const body = encodeURIComponent(
      `Olá, equipe DoaPet!\n\nPreciso de suporte com o aplicativo.\n\nUsuário: ${profile?.name ?? 'Não identificado'}\nE-mail da conta: ${user?.email ?? 'Não informado'}\n\nDescreva sua dúvida ou problema abaixo:\n`,
    );
    const mailtoUrl = `mailto:${supportEmail}?subject=${subject}&body=${body}`;

    Linking.openURL(mailtoUrl).catch(() => {
      Alert.alert(
        '✉️ E-mail de Suporte',
        `Envie um e-mail diretamente para:\n\n${supportEmail}\n\nOu, se preferir, fale conosco pelo WhatsApp do projeto.`,
        [
          { text: 'OK', style: 'cancel' },
          { text: 'Falar no WhatsApp', onPress: openSupportWhatsApp },
        ],
      );
    });
  }

  function handleDeleteAlert(alertId: string) {
    if (!user) return;
    Alert.alert(
      'Excluir Alerta SOS?',
      'Este alerta de resgate será removido imediatamente do mapa e do banco de dados.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSosAlert(alertId, user.uid);
              setUserAlerts((prev) => prev.filter((a) => a.id !== alertId));
              Alert.alert('Alerta Excluído', 'O alerta foi removido do mapa e do banco com sucesso.');
            } catch {
              Alert.alert('Erro', 'Não foi possível excluir este alerta. Apenas quem o criou pode excluí-lo.');
            }
          },
        },
      ],
    );
  }

  async function handleMarkPetAdopted(petId: string, petName: string) {
    Alert.alert(
      'Marcar como Adotado? 🎉',
      `Confirmar que ${petName} foi adotado(a)? O pet sairá da vitrine pública de doações.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sim, Foi Adotado!',
          onPress: async () => {
            await markPetAsAdopted(petId);
            setUserPets((prev) =>
              prev.map((p) => (p.id === petId ? { ...p, status: 'adopted' } : p)),
            );
            Alert.alert('🎉 Parabéns!', `${petName} marcado(a) como adotado(a) com sucesso!`);
          },
        },
      ],
    );
  }

  async function handleCancelPetDonation(petId: string, petName: string) {
    Alert.alert(
      'Desistir da Doação?',
      `Deseja realmente cancelar a doação de ${petName}? O anúncio será removido da vitrine pública e do mapa.`,
      [
        { text: 'Voltar', style: 'cancel' },
        {
          text: 'Sim, Cancelar Doação',
          style: 'destructive',
          onPress: async () => {
            if (user) {
              await cancelPetDonation(petId, user.uid);
              setUserPets((prev) =>
                prev.map((p) => (p.id === petId ? { ...p, status: 'removed' } : p)),
              );
              Alert.alert('Doação Cancelada', `A doação de ${petName} foi cancelada com sucesso.`);
            }
          },
        },
      ],
    );
  }

  async function handleCancelUserAdoption(petId: string, petName: string) {
    Alert.alert(
      'Desistir da Adoção?',
      `Deseja desistir do processo e cancelar seu interesse na adoção de ${petName}? O tutor será avisado no chat da doação.`,
      [
        { text: 'Voltar', style: 'cancel' },
        {
          text: 'Sim, Desistir da Adoção',
          style: 'destructive',
          onPress: async () => {
            if (user) {
              await undoPetMatch(user.uid, petId, profile?.name);
              await cancelAdoption(petId, user.uid);
              setUserAdoptions((prev) =>
                prev.map((a) => (a.petId === petId ? { ...a, status: 'cancelled' } : a)),
              );
              Alert.alert('Adoção Cancelada', `Seu interesse na adoção de ${petName} foi cancelado e o tutor foi avisado no chat.`);
            }
          },
        },
      ],
    );
  }

  const isOng = profile?.role === 'ong';
  const currentAvatar = profile?.photoUrl || profile?.photoURL;

  function confirmLogout() {
    Alert.alert('Sair', 'Deseja realmente sair da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => signOut() },
    ]);
  }

  async function handlePickImage(source: 'camera' | 'library') {
    try {
      let result: ImagePicker.ImagePickerResult;

      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Permissão necessária', 'Precisamos de acesso à câmera para tirar sua foto.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.7,
        });
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Permissão necessária', 'Precisamos de acesso à sua galeria.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.7,
        });
      }

      if (!result.canceled && result.assets[0]?.uri) {
        setUploadingPhoto(true);
        const localUri = result.assets[0].uri;
        const newPhotoUrl = await uploadProfilePhoto(user?.uid ?? 'demo-user', localUri);
        updateProfilePhoto(newPhotoUrl);
        Alert.alert(
          '🎉 Foto Atualizada!',
          'Sua foto foi salva e otimizada (comprimida em alta qualidade para ocupar menos de 40KB no banco de dados).',
        );
      }
    } catch {
      Alert.alert('Aviso', 'Não foi possível carregar a imagem. Tente novamente.');
    } finally {
      setUploadingPhoto(false);
    }
  }

  function handlePhotoOptions() {
    Alert.alert(
      'Foto de Perfil',
      'Como você deseja escolher sua foto?',
      [
        { text: '📷 Tirar Foto com a Câmera', onPress: () => handlePickImage('camera') },
        { text: '🖼️ Escolher da Galeria', onPress: () => handlePickImage('library') },
        { text: 'Cancelar', style: 'cancel' },
      ],
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Card do Perfil */}
      <View style={styles.profileCard}>
        <TouchableOpacity
          style={styles.avatarTouchable}
          onPress={handlePhotoOptions}
          disabled={uploadingPhoto}
          activeOpacity={0.85}
        >
          <View style={styles.avatar}>
            {uploadingPhoto ? (
              <ActivityIndicator size="large" color={colors.primary} />
            ) : currentAvatar ? (
              <Image source={{ uri: currentAvatar }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarEmoji}>{isOng ? '🏢' : '👤'}</Text>
            )}
          </View>
          <View style={styles.cameraBadge}>
            <Text style={styles.cameraBadgeIcon}>📷</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity onPress={handlePhotoOptions} disabled={uploadingPhoto}>
          <Text style={styles.changePhotoText}>
            {uploadingPhoto ? 'Comprimindo e salvando...' : 'Toque para alterar a foto'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.name}>{profile?.name ?? 'Usuário DoaPet'}</Text>
        <Text style={styles.email}>{user?.email ?? profile?.email ?? 'Sem e-mail'}</Text>
        
        {isOng && (
          <View style={styles.ongBadge}>
            <Text style={styles.ongBadgeText}>
              ✔ {profile?.organizationName ? profile.organizationName : 'Perfil Institucional Verificado'}
            </Text>
          </View>
        )}

        <View style={styles.compressionHintBox}>
          <Text style={styles.compressionHintText}>
            ⚡ Fotos comprimidas automaticamente para economia de dados e espaço
          </Text>
        </View>
      </View>

      {/* Raio de busca */}
      <Text style={styles.sectionTitle}>Raio de busca</Text>
      <View style={styles.radiusRow}>
        <TouchableOpacity
          style={styles.radiusButton}
          onPress={() => setRadiusKm((r) => clampRadiusKm(r - 5))}
        >
          <Text style={styles.radiusButtonText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.radiusValue}>{radiusKm} km</Text>
        <TouchableOpacity
          style={styles.radiusButton}
          onPress={() => setRadiusKm((r) => clampRadiusKm(r + 5))}
        >
          <Text style={styles.radiusButtonText}>＋</Text>
        </TouchableOpacity>
      </View>

      {/* Notificações & Alertas */}
      <Text style={styles.sectionTitle}>Notificações & Alertas</Text>
      <View style={styles.settingRow}>
        <View style={styles.settingTextContainer}>
          <Text style={styles.settingLabel}>Avisos push de pets e SOS</Text>
          <Text style={styles.settingSubLabel}>Notificações visuais no aplicativo</Text>
        </View>
        <Switch
          value={pushEnabled}
          onValueChange={setPushEnabled}
          trackColor={{ true: colors.primary, false: colors.border }}
        />
      </View>

      <View style={[styles.settingRow, { marginTop: spacing.sm }]}>
        <View style={styles.settingTextContainer}>
          <Text style={styles.settingLabel}>🔊 Alerta sonoro de pet próximo</Text>
          <Text style={styles.settingSubLabel}>
            Toca um aviso rápido ao detectar animais disponíveis perto de você
          </Text>
        </View>
        <Switch
          value={soundEnabled}
          onValueChange={(val) => {
            setSoundEnabled(val);
            setSoundAlertEnabled(val);
          }}
          trackColor={{ true: colors.primary, false: colors.border }}
        />
      </View>

      {/* Apoio ao Projeto */}
      <Text style={styles.sectionTitle}>Apoie a Causa Animal</Text>
      <TouchableOpacity
        style={styles.supportCard}
        onPress={() => setSupportModalVisible(true)}
        activeOpacity={0.85}
      >
        <View style={styles.supportIconBox}>
          <Text style={styles.supportIcon}>💛</Text>
        </View>
        <View style={styles.supportTextBox}>
          <Text style={styles.supportTitle}>Apoiar / Contribuir com o Projeto</Text>
          <Text style={styles.supportSubtitle}>
            Nosso projeto é gratuito! Ajude a expandir o banco de dados por todo o Brasil.
          </Text>
        </View>
        <Text style={styles.supportArrow}>➔</Text>
      </TouchableOpacity>

      {/* Falar com o Suporte */}
      <Text style={styles.sectionTitle}>Atendimento & Suporte</Text>
      <TouchableOpacity
        style={styles.supportEmailCard}
        onPress={handleContactSupport}
        activeOpacity={0.85}
      >
        <View style={styles.supportEmailIconBox}>
          <Text style={styles.supportEmailIcon}>✉️</Text>
        </View>
        <View style={styles.supportEmailTextBox}>
          <Text style={styles.supportEmailTitle}>Falar com o Suporte</Text>
          <Text style={styles.supportEmailSubtitle}>
            santigarudananda@gmail.com • Toque para enviar um e-mail
          </Text>
        </View>
        <Text style={styles.supportArrow}>➔</Text>
      </TouchableOpacity>

      {/* Meus Pets Cadastrados para Doação */}
      <Text style={styles.sectionTitle}>
        🐾 Meus Pets para Doação ({userPets.length})
      </Text>
      {userPets.length === 0 ? (
        <View style={styles.emptyAlertsCard}>
          <Text style={styles.emptyAlertsText}>
            Você ainda não publicou animais para doação. Quando cadastrar, você poderá acompanhar aqui e marcar como adotado ou cancelar a doação.
          </Text>
        </View>
      ) : (
        userPets.map((pet) => (
          <View key={pet.id} style={styles.userPetCard}>
            <View style={styles.userPetRow}>
              {pet.photos?.[0] ? (
                <Image source={{ uri: pet.photos[0] }} style={styles.userPetThumb} />
              ) : (
                <View style={styles.userPetNoThumb}>
                  <Text style={{ fontSize: 24 }}>{pet.species === 'gato' ? '🐱' : '🐶'}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <View style={styles.userPetHeader}>
                  <Text style={styles.userPetName}>{pet.name}</Text>
                  <View
                    style={[
                      styles.userPetStatusBadge,
                      pet.status === 'adopted'
                        ? styles.statusAdopted
                        : pet.status === 'removed'
                        ? styles.statusRemoved
                        : styles.statusAvailable,
                    ]}
                  >
                    <Text
                      style={[
                        styles.userPetStatusText,
                        pet.status === 'adopted'
                          ? styles.statusAdoptedText
                          : pet.status === 'removed'
                          ? styles.statusRemovedText
                          : styles.statusAvailableText,
                      ]}
                    >
                      {pet.status === 'adopted'
                        ? '🎉 Adotado'
                        : pet.status === 'removed'
                        ? '❌ Cancelado'
                        : '🟢 Disponível'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.userPetSub}>
                  {pet.breed ?? pet.species} • {pet.gender === 'femea' ? 'Fêmea' : 'Macho'}
                </Text>
                {pet.locationHint ? (
                  <Text style={styles.userPetLocation}>📍 {pet.locationHint}</Text>
                ) : null}
              </View>
            </View>

            {pet.status === 'available' ? (
              <View style={styles.userPetActionsRow}>
                <TouchableOpacity
                  style={[styles.petAdoptedBtn, { backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#F59E0B' }]}
                  onPress={() => navigation.navigate('EditPet', { pet })}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.petAdoptedBtnText, { color: '#B45309' }]}>✏️ Editar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.petAdoptedBtn}
                  onPress={() => handleMarkPetAdopted(pet.id, pet.name)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.petAdoptedBtnText}>🎉 Adotado</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.petCancelDonationBtn}
                  onPress={() => handleCancelPetDonation(pet.id, pet.name)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.petCancelDonationBtnText}>❌ Desistir</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        ))
      )}

      {/* Meus Pedidos de Adoção */}
      <Text style={styles.sectionTitle}>
        📋 Meus Pedidos de Adoção ({userAdoptions.length})
      </Text>
      {userAdoptions.length === 0 ? (
        <View style={styles.emptyAlertsCard}>
          <Text style={styles.emptyAlertsText}>
            Você ainda não possui pedidos de adoção em andamento. Dê match com um pet para começar!
          </Text>
        </View>
      ) : (
        userAdoptions.map((adopt) => (
          <View key={adopt.id} style={styles.userPetCard}>
            <View style={styles.userPetRow}>
              {adopt.petPhoto ? (
                <Image source={{ uri: adopt.petPhoto }} style={styles.userPetThumb} />
              ) : (
                <View style={styles.userPetNoThumb}>
                  <Text style={{ fontSize: 24 }}>🐾</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <View style={styles.userPetHeader}>
                  <Text style={styles.userPetName}>{adopt.petName}</Text>
                  <View
                    style={[
                      styles.userPetStatusBadge,
                      adopt.status === 'cancelled' ? styles.statusRemoved : styles.statusAvailable,
                    ]}
                  >
                    <Text
                      style={[
                        styles.userPetStatusText,
                        adopt.status === 'cancelled'
                          ? styles.statusRemovedText
                          : styles.statusAvailableText,
                      ]}
                    >
                      {adopt.status === 'completed'
                        ? '🎉 Adoção Concluída'
                        : adopt.status === 'cancelled'
                        ? 'Desistência'
                        : 'Em Andamento'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.userPetSub}>Tutor/ONG: {adopt.ownerName}</Text>
              </View>
            </View>

            {adopt.status !== 'cancelled' && adopt.status !== 'completed' ? (
              <TouchableOpacity
                style={styles.cancelAdoptionUserBtn}
                onPress={() => handleCancelUserAdoption(adopt.petId, adopt.petName)}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelAdoptionUserBtnText}>
                  ❌ Desistir desta Adoção
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ))
      )}

      {/* Gerenciamento dos Meus Alertas SOS */}
      <Text style={styles.sectionTitle}>
        🚨 Meus Alertas SOS Publicados ({userAlerts.length})
      </Text>
      {userAlerts.length === 0 ? (
        <View style={styles.emptyAlertsCard}>
          <Text style={styles.emptyAlertsText}>
            Você não possui alertas SOS ativos no momento. Alertas expiram automaticamente em 7 dias.
          </Text>
        </View>
      ) : (
        userAlerts.map((alert) => (
          <View key={alert.id} style={styles.userAlertCard}>
            <View style={styles.userAlertHeader}>
              <Text style={styles.userAlertBadge}>🆘 SOS Ativo</Text>
              <TouchableOpacity
                style={styles.deleteAlertBtn}
                onPress={() => handleDeleteAlert(alert.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.deleteAlertBtnText}>🗑️ Excluir</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.userAlertDesc} numberOfLines={2}>
              {alert.description}
            </Text>
            {alert.addressHint ? (
              <Text style={styles.userAlertLocation}>📍 {alert.addressHint}</Text>
            ) : null}
            <Text style={styles.userAlertDate}>
              Publicado em {new Date(alert.createdAt).toLocaleDateString('pt-BR')} • Expira em 7 dias
            </Text>
          </View>
        ))
      )}

      {/* Termos e Informações */}
      <Text style={styles.sectionTitle}>Sobre o DoaPet</Text>
      <TouchableOpacity
        style={styles.linkRow}
        onPress={() =>
          Alert.alert(
            'Termos de Uso & Adoção Responsável',
            'O DoaPet é uma plataforma comunitária e filantrópica. Adote com responsabilidade: proteja, vacine e garanta amor e bem-estar ao seu novo companheiro.',
          )
        }
      >
        <Text style={styles.linkText}>📄 Termos de uso e Adoção Responsável</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.linkRow}
        onPress={() => Alert.alert('DoaPet Mobile', 'Versão 1.3.0 • Desenvolvido com carinho para os animais 🐾')}
      >
        <Text style={styles.linkText}>ℹ️ Versão do aplicativo (1.3.0)</Text>
      </TouchableOpacity>

      <Button title="Sair da conta" variant="danger" onPress={confirmLogout} style={styles.logout} />

      {/* Modal de Apoio e Doação */}
      <ProjectSupportModal
        visible={supportModalVisible}
        onClose={() => setSupportModalVisible(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    alignItems: 'center',
    padding: spacing.lg,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarTouchable: {
    position: 'relative',
    marginBottom: spacing.xs,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: colors.primary,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarEmoji: {
    fontSize: 44,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  cameraBadgeIcon: {
    fontSize: 15,
  },
  changePhotoText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginTop: spacing.xs,
  },
  email: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  ongBadge: {
    marginTop: spacing.sm,
    backgroundColor: colors.primaryLight,
    borderRadius: radii.round,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  ongBadgeText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '700',
  },
  compressionHintBox: {
    marginTop: spacing.md,
    backgroundColor: '#F0FDF4',
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  compressionHintText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#166534',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  radiusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  radiusButton: {
    width: 40,
    height: 40,
    borderRadius: radii.round,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radiusButtonText: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  radiusValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    minWidth: 70,
    textAlign: 'center',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  settingTextContainer: {
    flex: 1,
    marginRight: spacing.md,
  },
  settingLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  settingSubLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  linkRow: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  linkText: {
    color: colors.text,
  },
  logout: {
    marginTop: spacing.xl,
  },
  supportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: '#FCD34D',
    marginBottom: spacing.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  supportIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  supportIcon: {
    fontSize: 22,
  },
  supportTextBox: {
    flex: 1,
  },
  supportTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#92400E',
  },
  supportSubtitle: {
    fontSize: 12,
    color: '#B45309',
    marginTop: 2,
    lineHeight: 16,
  },
  supportArrow: {
    fontSize: 18,
    fontWeight: '800',
    color: '#D97706',
    marginLeft: spacing.sm,
  },
  supportEmailCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: '#93C5FD',
    marginBottom: spacing.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  supportEmailIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  supportEmailIcon: {
    fontSize: 22,
  },
  supportEmailTextBox: {
    flex: 1,
  },
  supportEmailTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E40AF',
  },
  supportEmailSubtitle: {
    fontSize: 12,
    color: '#1D4ED8',
    marginTop: 2,
    lineHeight: 16,
  },
  emptyAlertsCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  emptyAlertsText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  userAlertCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: spacing.sm,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  userAlertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  userAlertBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B91C1C',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  deleteAlertBtn: {
    backgroundColor: '#FEF2F2',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: '#F87171',
  },
  deleteAlertBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  userAlertDesc: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
    marginBottom: 4,
  },
  userAlertLocation: {
    fontSize: 12,
    color: colors.primaryDark,
    fontWeight: '600',
    marginBottom: 2,
  },
  userAlertDate: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  userPetCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  userPetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  userPetThumb: {
    width: 64,
    height: 64,
    borderRadius: radii.md,
  },
  userPetNoThumb: {
    width: 64,
    height: 64,
    borderRadius: radii.md,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userPetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userPetName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  userPetStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.sm,
  },
  statusAvailable: {
    backgroundColor: '#DCFCE7',
  },
  statusAdopted: {
    backgroundColor: '#E0E7FF',
  },
  statusRemoved: {
    backgroundColor: '#FEE2E2',
  },
  userPetStatusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  statusAvailableText: {
    color: '#15803D',
  },
  statusAdoptedText: {
    color: '#4338CA',
  },
  statusRemovedText: {
    color: '#B91C1C',
  },
  userPetSub: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  userPetLocation: {
    fontSize: 12,
    color: colors.primaryDark,
    fontWeight: '600',
    marginTop: 2,
  },
  userPetActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  petAdoptedBtn: {
    flex: 1,
    backgroundColor: '#16A34A',
    borderRadius: radii.md,
    paddingVertical: 8,
    alignItems: 'center',
  },
  petAdoptedBtnText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '800',
  },
  petCancelDonationBtn: {
    flex: 1,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: radii.md,
    paddingVertical: 8,
    alignItems: 'center',
  },
  petCancelDonationBtnText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '800',
  },
  cancelAdoptionUserBtn: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#F87171',
    borderRadius: radii.md,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  cancelAdoptionUserBtnText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '800',
  },
});