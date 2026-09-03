/**
 * Tela de Alerta "SOS Rua"
 *
 * Formulário para reportar animais abandonados/perdidos,
 * com foto, marcação da localização atual exata (GPS + Reverso + CEP)
 * para exibição no mapa e persistência no banco de dados.
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { useAuth } from '@/context/AuthContext';
import { useLocation } from '@/hooks/useLocation';
import { createSosAlert, attachSosPhoto } from '@/services/sos';
import { petImageToBase64 } from '@/utils/image';
import { formatCep, fetchAddressByCep } from '@/services/cep';
import { containsOffensiveContent, getOffensiveContentMessage } from '@/utils/contentFilter';
import { colors, radii, spacing } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';
import type { GeoPointLiteral } from '@/types';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateSosAlert'>;

export function CreateSosAlertScreen({ navigation }: Props) {
  const { user, profile } = useAuth();
  const { location: initialLocation } = useLocation();

  const [description, setDescription] = useState('');
  const [addressHint, setAddressHint] = useState('');
  const [cep, setCep] = useState('');
  const [loadingCep, setLoadingCep] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Localização ativa do alerta
  const [currentCoords, setCurrentCoords] = useState<GeoPointLiteral | null>(null);
  const [capturingGps, setCapturingGps] = useState(false);
  const [locationSuccessMsg, setLocationSuccessMsg] = useState('');

  useEffect(() => {
    if (initialLocation && !currentCoords) {
      setCurrentCoords(initialLocation);
    }
  }, [initialLocation, currentCoords]);

  /** Captura a localização GPS de alta precisão e obtém o endereço reverso */
  async function handleCaptureExactLocation() {
    setCapturingGps(true);
    setLocationSuccessMsg('');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permissão de GPS',
          'Precisamos da permissão de localização para marcar o ponto exato onde o animal foi visto.',
        );
        return;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const coords: GeoPointLiteral = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      };
      setCurrentCoords(coords);

      // Busca endereço reverso aproximado (rua/bairro)
      try {
        const reverse = await Location.reverseGeocodeAsync(coords);
        if (reverse && reverse[0]) {
          const info = reverse[0];
          const parts = [
            info.street,
            info.district || info.subregion,
            info.city || info.region,
          ].filter(Boolean);
          if (parts.length > 0) {
            const detectedAddress = parts.join(', ');
            setAddressHint(detectedAddress);
            setLocationSuccessMsg(`Localizado: ${detectedAddress}`);
          }
        }
      } catch {
        setLocationSuccessMsg(
          `GPS capturado: ${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`,
        );
      }

      Alert.alert(
        '📍 Ponto Marcado!',
        'Sua localização atual foi registrada e será marcada com o ícone 🆘 no mapa e salva no banco de dados.',
      );
    } catch {
      Alert.alert(
        'GPS Indisponível',
        'Não foi possível obter o GPS no momento. Você pode digitar o CEP ou ponto de referência abaixo.',
      );
    } finally {
      setCapturingGps(false);
    }
  }

  /** Busca endereço automático por CEP */
  async function handleCepChange(text: string) {
    const formatted = formatCep(text);
    setCep(formatted);

    const clean = formatted.replace(/\D/g, '');
    if (clean.length === 8) {
      setLoadingCep(true);
      try {
        const result = await fetchAddressByCep(clean);
        if (result && !result.erro) {
          setAddressHint(result.formattedAddress);
          // Tenta geocodificar o CEP para obter coordenadas aproximadas
          try {
            const geo = await Location.geocodeAsync(result.formattedAddress);
            if (geo && geo[0]) {
              setCurrentCoords({
                latitude: geo[0].latitude,
                longitude: geo[0].longitude,
              });
              setLocationSuccessMsg(`Localizado via CEP: ${result.formattedAddress}`);
            }
          } catch {
            // Mantém coordenadas anteriores
          }
        }
      } finally {
        setLoadingCep(false);
      }
    }
  }

  async function pickPhotoOption(source: 'camera' | 'library') {
    try {
      let result: ImagePicker.ImagePickerResult;
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Permissão necessária', 'Precisamos de acesso à câmera para fotografar o animal.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          quality: 0.7,
        });
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Permissão necessária', 'Precisamos de acesso à sua galeria.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.7,
        });
      }

      if (!result.canceled && result.assets[0]?.uri) {
        // Converte imediatamente para Base64 ao selecionar
        const b64 = await petImageToBase64(result.assets[0].uri);
        setPhotoUri(b64);
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar a imagem.');
    }
  }

  function pickPhoto() {
    Alert.alert(
      'Foto do Animal em Risco',
      'Como deseja registrar a foto do alerta?',
      [
        { text: '📷 Tirar Foto com a Câmera', onPress: () => pickPhotoOption('camera') },
        { text: '🖼️ Escolher da Galeria', onPress: () => pickPhotoOption('library') },
        { text: 'Cancelar', style: 'cancel' },
      ],
    );
  }

  async function handleSave() {
    if (!user) return;
    if (!description.trim()) {
      Alert.alert('Atenção', 'Descreva a situação do animal para que outros possam ajudar.');
      return;
    }

    // Filtro de conteúdo ofensivo e termos impróprios
    const offensiveField =
      containsOffensiveContent(description.trim()) ? 'Descrição da Situação' :
      containsOffensiveContent(addressHint.trim()) ? 'Ponto de Referência' : null;

    if (offensiveField) {
      Alert.alert(`Campo "${offensiveField}" Bloqueado 🚫`, getOffensiveContentMessage());
      return;
    }

    // Coordenadas finais seguras (se o GPS não estiver pronto, usa Nova Iguaçu/RJ)
    const finalLocation: GeoPointLiteral = currentCoords ?? {
      latitude: -22.755,
      longitude: -43.452,
    };

    setSaving(true);
    try {
      // A foto já está em Base64 desde o momento da seleção (setPhotoUri recebe b64)
      await createSosAlert({
        authorId: user.uid,
        authorName: profile?.name ?? 'Membro da Comunidade',
        description: description.trim(),
        location: finalLocation,
        addressHint: addressHint.trim() || undefined,
        photos: photoUri ? [photoUri] : [],
      });

      Alert.alert(
        '🎉 Alerta Publicado!',
        'O alerta foi gravado com foto no banco de dados e adicionado ao mapa para resgate da comunidade! 🐾',
        [{ text: 'Ver no Mapa', onPress: () => navigation.goBack() }],
      );
    } catch {
      Alert.alert('Erro', 'Não foi possível registrar o alerta. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.emoji}>🆘</Text>
      <Text style={styles.title}>Encontrou um animal precisando de ajuda?</Text>
      <Text style={styles.subtitle}>
        O alerta será marcado com o ícone 🆘 no mapa e salvo no banco de dados para toda a comunidade.
      </Text>

      {/* Seção de Marcação de Localização */}
      <View style={styles.locationCard}>
        <View style={styles.locationHeaderRow}>
          <Text style={styles.locationTitle}>📍 Localização do Resgate</Text>
          {currentCoords && (
            <View style={styles.coordBadge}>
              <Text style={styles.coordBadgeText}>GPS Ativo</Text>
            </View>
          )}
        </View>

        <Text style={styles.locationHelpText}>
          Toque no botão abaixo para marcar exatamente onde você está ou digite o CEP:
        </Text>

        <TouchableOpacity
          style={styles.gpsButton}
          onPress={handleCaptureExactLocation}
          disabled={capturingGps}
          activeOpacity={0.85}
        >
          {capturingGps ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <>
              <Text style={styles.gpsButtonIcon}>🎯</Text>
              <Text style={styles.gpsButtonText}>
                {currentCoords ? 'Atualizar Minha Localização Atual' : 'Marcar Minha Localização Atual'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {currentCoords && (
          <View style={styles.coordInfoBox}>
            <Text style={styles.coordText}>
              ✔ Coordenadas: {currentCoords.latitude.toFixed(5)}, {currentCoords.longitude.toFixed(5)}
            </Text>
            {locationSuccessMsg ? (
              <Text style={styles.addressDetectedText}>{locationSuccessMsg}</Text>
            ) : null}
          </View>
        )}

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OU POR CEP</Text>
          <View style={styles.dividerLine} />
        </View>

        <Input
          label="CEP do Local (Opcional)"
          placeholder="00000-000"
          value={cep}
          onChangeText={handleCepChange}
          keyboardType="numeric"
          maxLength={9}
          style={styles.cepInput}
        />
        {loadingCep && <Text style={styles.cepLoading}>🔍 Buscando CEP...</Text>}
      </View>

      <Input
        label="Ponto de referência ou endereço aproximado"
        value={addressHint}
        onChangeText={setAddressHint}
        placeholder="Ex.: Em frente à padaria X, próximo à praça..."
        style={styles.input}
      />

      <Input
        label="O que está acontecendo? *"
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={4}
        placeholder="Descreva o animal (cor, raça, porte), condições de saúde (machucado, sem água/comida) e situação de urgência..."
        style={[styles.input, styles.textArea]}
      />

      {/* Foto opcional */}
      <Text style={styles.fieldLabel}>Foto do Animal (Opcional)</Text>
      {photoUri ? (
        <View style={styles.photoContainer}>
          <Image source={{ uri: photoUri }} style={styles.photo} />
          <TouchableOpacity style={styles.changePhotoBtn} onPress={pickPhoto}>
            <Text style={styles.changePhotoText}>Alterar foto</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.addPhotoCard} onPress={pickPhoto} activeOpacity={0.8}>
          <Text style={styles.addPhotoIcon}>📷</Text>
          <Text style={styles.addPhotoText}>Toque para anexar foto do animal</Text>
        </TouchableOpacity>
      )}

      <Button
        title="🚨 Publicar Alerta SOS no Mapa"
        variant="danger"
        onPress={handleSave}
        loading={saving}
        style={styles.submitBtn}
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
  emoji: {
    fontSize: 44,
    textAlign: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  locationCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    marginBottom: spacing.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  locationHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  locationTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#B91C1C',
  },
  coordBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.round,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  coordBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
  },
  locationHelpText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    lineHeight: 16,
  },
  gpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 12,
    borderRadius: radii.md,
    gap: spacing.xs,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  gpsButtonIcon: {
    fontSize: 18,
  },
  gpsButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '800',
  },
  coordInfoBox: {
    marginTop: spacing.sm,
    backgroundColor: '#FEF2F2',
    padding: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  coordText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#991B1B',
  },
  addressDetectedText: {
    fontSize: 11,
    color: '#B91C1C',
    marginTop: 2,
    fontWeight: '600',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    marginHorizontal: spacing.sm,
  },
  cepInput: {
    marginBottom: 0,
  },
  cepLoading: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 4,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
    marginTop: spacing.xs,
  },
  input: {
    marginBottom: spacing.md,
  },
  textArea: {
    height: 105,
    paddingTop: spacing.md,
    textAlignVertical: 'top',
  },
  addPhotoCard: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: radii.md,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  addPhotoIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  addPhotoText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  photoContainer: {
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  photo: {
    width: '100%',
    height: 180,
    borderRadius: radii.md,
  },
  changePhotoBtn: {
    marginTop: spacing.xs,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  changePhotoText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  submitBtn: {
    marginTop: spacing.xs,
  },
});