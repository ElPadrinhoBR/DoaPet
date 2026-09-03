/**
 * Tela de Formulário de Doação de Pet
 *
 * Onde as pessoas que querem doar um animalzinho informam:
 * - Fotos reais (até 5)
 * - Dados do pet (nome, espécie, raça, idade, porte, sexo)
 * - Histórico médico (vacinado, castrado, vermifugado)
 * - Onde o animal está localizado (Bairro / Cidade)
 * - Contatos diretos: WhatsApp e Instagram
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { useAuth } from '@/context/AuthContext';
import { useLocation } from '@/hooks/useLocation';
import { createPetWithPhotos } from '@/services/pets';
import { formatCep, fetchAddressByCep } from '@/services/cep';
import { petImageToBase64 } from '@/utils/image';
import { containsOffensiveContent, getOffensiveContentMessage } from '@/utils/contentFilter';
import { colors, radii, spacing } from '@/theme';
import type { PetGender, PetSize, GeoPointLiteral } from '@/types';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'CreatePet'>;

export function CreatePetScreen({ navigation }: Props) {
  const { user, profile } = useAuth();
  const { location } = useLocation();

  const [name, setName] = useState('');
  const [species, setSpecies] = useState('cachorro');
  const [breed, setBreed] = useState('');
  const [ageText, setAgeText] = useState('');
  const [size, setSize] = useState<PetSize>('medio');
  const [gender, setGender] = useState<PetGender>('macho');
  const [description, setDescription] = useState('');
  const [cep, setCep] = useState('');
  const [loadingCep, setLoadingCep] = useState(false);
  const [cepSuccess, setCepSuccess] = useState(false);
  const [locationHint, setLocationHint] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [instagram, setInstagram] = useState('');
  const [vaccinated, setVaccinated] = useState(false);
  const [neutered, setNeutered] = useState(false);
  const [dewormed, setDewormed] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [convertingPhotos, setConvertingPhotos] = useState(false);
  const [capturingGps, setCapturingGps] = useState(false);
  const [coordsFromCep, setCoordsFromCep] = useState<GeoPointLiteral | null>(null);

  async function handleCepChange(text: string) {
    const formatted = formatCep(text);
    setCep(formatted);
    setCepSuccess(false);

    const clean = formatted.replace(/\D/g, '');
    if (clean.length === 8) {
      setLoadingCep(true);
      try {
        const result = await fetchAddressByCep(clean);
        if (result && !result.erro) {
          setLocationHint(result.formattedAddress);
          setCepSuccess(true);
          // O CEP é a autoridade máxima de localização no mapa: geocodifica o endereço do CEP
          try {
            const geo = await Location.geocodeAsync(result.formattedAddress);
            if (geo && geo[0]) {
              setCoordsFromCep({
                latitude: geo[0].latitude,
                longitude: geo[0].longitude,
              });
            }
          } catch {
            // Silencioso se geocode falhar
          }
        }
      } finally {
        setLoadingCep(false);
      }
    }
  }

  /** Captura GPS atual e preenche o CEP automaticamente via endereço reverso */
  async function handleUseMyLocation() {
    setCapturingGps(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão necessária', 'Permita o acesso à localização para preencher o CEP automaticamente.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const rev = await Location.reverseGeocodeAsync({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
      if (rev && rev[0]) {
        const info = rev[0];
        if (info.postalCode) {
          const rawCep = info.postalCode.replace(/\D/g, '');
          if (rawCep.length === 8) {
            await handleCepChange(rawCep);
            Alert.alert('📍 CEP Identificado!', `Seu CEP foi preenchido como ${formatCep(rawCep)} com base na sua localização atual.`);
            return;
          }
        }
        // Se não tiver postalCode no reverso, usa o endereço para localização
        const parts = [info.street, info.district || info.subregion, info.city || info.region].filter(Boolean);
        if (parts.length > 0) {
          setLocationHint(parts.join(', '));
          setCoordsFromCep({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
          Alert.alert('📍 Localização preenchida', 'Endereço detectado. Se possível, confira o CEP para maior precisão.');
        }
      }
    } catch {
      Alert.alert('Aviso', 'Não foi possível detectar o CEP pelo GPS. Você pode digitar o CEP manualmente.');
    } finally {
      setCapturingGps(false);
    }
  }

  /** Converte as URIs selecionadas para Base64 imediatamente e salva no state */
  async function processAndAddPhotos(uris: string[]) {
    setConvertingPhotos(true);
    try {
      const base64Photos: string[] = [];
      for (const uri of uris) {
        try {
          const b64 = await petImageToBase64(uri);
          base64Photos.push(b64);
        } catch {
          base64Photos.push(uri); // fallback para URI local se conversão falhar
        }
      }
      setPhotos((prev) => [...prev, ...base64Photos].slice(0, 5));
    } finally {
      setConvertingPhotos(false);
    }
  }

  async function pickPhotoOption(source: 'camera' | 'gallery') {
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
          allowsMultipleSelection: true,
          selectionLimit: 5 - photos.length,
          quality: 0.7,
        });
      }
      if (!result.canceled && result.assets.length > 0) {
        const uris = result.assets.map((a) => a.uri);
        await processAndAddPhotos(uris);
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar a imagem.');
    }
  }

  function pickPhotos() {
    Alert.alert(
      'Adicionar Foto do Pet',
      'Escolha como deseja adicionar a foto:',
      [
        { text: '📷 Tirar Foto com a Câmera', onPress: () => pickPhotoOption('camera') },
        { text: '🖼️ Escolher da Galeria', onPress: () => pickPhotoOption('gallery') },
        { text: 'Cancelar', style: 'cancel' },
      ],
    );
  }

  function removePhoto(indexToRemove: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== indexToRemove));
  }

  async function handleSave() {
    if (!user && !profile) {
      Alert.alert('Atenção', 'Você precisa estar logado para publicar um pet.');
      return;
    }
    if (!name.trim()) {
      Alert.alert('Atenção', 'Por favor, informe o nome do pet.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Atenção', 'Conte um pouco sobre a história e personalidade do pet.');
      return;
    }
    if (!locationHint.trim()) {
      Alert.alert('Atenção', 'Informe o Bairro / Cidade onde o pet se encontra.');
      return;
    }

    // Filtro de palavras ofensivas e palavrões
    const offensiveField =
      containsOffensiveContent(name.trim()) ? 'Nome' :
      containsOffensiveContent(description.trim()) ? 'História e Temperamento' :
      containsOffensiveContent(whatsapp.trim()) ? 'WhatsApp' :
      containsOffensiveContent(locationHint.trim()) ? 'Bairro/Cidade' : null;

    if (offensiveField) {
      Alert.alert(`Campo "${offensiveField}" Bloqueado 🚫`, getOffensiveContentMessage());
      return;
    }

    const ageMonths = parseInt(ageText, 10);
    // Prioridade máxima: coordenadas geradas a partir do CEP informado pelo usuário!
    const resolvedCoords = coordsFromCep ?? location ?? {
      latitude: -22.755,
      longitude: -43.452,
    };

    setSaving(true);
    try {
      // As fotos já foram convertidas para Base64 no momento da seleção.
      // createPetWithPhotos é chamado com as strings Base64 — internamente ele
      // vai ignorar nova conversão pois detecta o prefixo "data:image/".
      await createPetWithPhotos(
        {
          ownerId: user?.uid ?? 'demo-user-id',
          ownerName: profile?.role === 'ong' ? profile.organizationName ?? profile.name : profile?.name ?? 'Doador DoaPet',
          ownerRole: profile?.role ?? 'user',
          name: name.trim(),
          description: description.trim(),
          species: species.trim().toLowerCase(),
          breed: breed.trim() || undefined,
          ageMonths: Number.isNaN(ageMonths) ? 12 : ageMonths,
          size,
          gender,
          personality: ['amigável', 'dócil'],
          medical: { vaccinated, neutered, dewormed },
          location: resolvedCoords,
          locationHint: locationHint.trim(),
          whatsapp: whatsapp.trim() || undefined,
          instagram: instagram.trim() || undefined,
        },
        photos,
      );

      Alert.alert(
        '🎉 Pet Publicado!',
        'Seu animalzinho já está disponível na vitrine de adoção e no mapa!',
        [{ text: 'Maravilha!', onPress: () => navigation.goBack() }],
      );
    } catch {
      Alert.alert('Erro', 'Não foi possível publicar o pet. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Banner explicativo */}
      <View style={styles.banner}>
        <Text style={styles.bannerEmoji}>🐾</Text>
        <View style={styles.bannerTextContainer}>
          <Text style={styles.bannerTitle}>Cadastre um Pet para Doação</Text>
          <Text style={styles.bannerSubtitle}>
            Preencha as informações para que possíveis adotantes encontrem e entrem em contato diretamente com você!
          </Text>
        </View>
      </View>

      {/* Upload de fotos */}
      <Text style={styles.sectionTitle}>📸 Fotos do Animal (até 5)</Text>
      {convertingPhotos && (
        <View style={styles.convertingBanner}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.convertingText}>Convertendo foto para Base64... aguarde</Text>
        </View>
      )}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoRow}>
        {photos.map((uri, index) => (
          <View key={index} style={styles.thumbnailContainer}>
            <Image source={{ uri }} style={styles.thumbnail} />
            <TouchableOpacity style={styles.removePhotoBadge} onPress={() => removePhoto(index)}>
              <Text style={styles.removePhotoText}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}
        {photos.length < 5 && !convertingPhotos && (
          <TouchableOpacity style={styles.addPhoto} onPress={pickPhotos}>
            <Text style={styles.addPhotoIcon}>📷</Text>
            <Text style={styles.addPhotoText}>Adicionar{'\n'}Foto</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Dados Básicos */}
      <Text style={styles.sectionTitle}>ℹ️ Sobre o Animalzinho</Text>
      <Input label="Nome do Pet *" placeholder="Ex: Luna, Thor, Mel..." value={name} onChangeText={setName} style={styles.input} />

      {/* Espécie */}
      <Text style={styles.fieldLabel}>Espécie</Text>
      <View style={styles.chipRow}>
        {['cachorro', 'gato', 'outro'].map((item) => (
          <Chip
            key={item}
            label={item === 'cachorro' ? '🐶 Cachorro' : item === 'gato' ? '🐱 Gato' : '🐾 Outro'}
            selected={species === item}
            onPress={() => setSpecies(item)}
          />
        ))}
      </View>

      <Input label="Raça" placeholder="Ex: Vira-lata (SRD), Poodle, Golden..." value={breed} onChangeText={setBreed} style={styles.input} />
      <Input
        label="Idade aproximada (em meses)"
        placeholder="Ex: 6 (para 6 meses), 24 (para 2 anos)"
        value={ageText}
        onChangeText={setAgeText}
        keyboardType="number-pad"
        style={styles.input}
      />

      {/* Porte */}
      <Text style={styles.fieldLabel}>Porte</Text>
      <View style={styles.chipRow}>
        {(['pequeno', 'medio', 'grande'] as PetSize[]).map((option) => (
          <Chip
            key={option}
            label={option === 'pequeno' ? 'Pequeno (até 10kg)' : option === 'medio' ? 'Médio (10-25kg)' : 'Grande (+25kg)'}
            selected={size === option}
            onPress={() => setSize(option)}
          />
        ))}
      </View>

      {/* Sexo */}
      <Text style={styles.fieldLabel}>Sexo</Text>
      <View style={styles.chipRow}>
        <Chip label="♂️ Macho" selected={gender === 'macho'} onPress={() => setGender('macho')} />
        <Chip label="♀️ Fêmea" selected={gender === 'femea'} onPress={() => setGender('femea')} />
      </View>

      {/* Histórico médico */}
      <Text style={styles.fieldLabel}>Cuidados Veterinários</Text>
      <View style={styles.chipRow}>
        <Chip label="💉 Vacinado" selected={vaccinated} onPress={() => setVaccinated((v) => !v)} />
        <Chip label="✂️ Castrado" selected={neutered} onPress={() => setNeutered((n) => !n)} />
        <Chip label="🪱 Vermifugado" selected={dewormed} onPress={() => setDewormed((d) => !d)} />
      </View>

      <Input
        label="História e Temperamento *"
        placeholder="Conte como ele é, se convive bem com crianças, outros cães, gatos, se é brincalhão ou calmo..."
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={4}
        style={[styles.input, styles.description]}
      />

      {/* Localização e Contatos */}
      <Text style={styles.sectionTitle}>📍 Localização & Canais de Contato</Text>
      
      <Input
        label="CEP (Gera endereço e posiciona no mapa)"
        placeholder="00000-000"
        value={cep}
        onChangeText={handleCepChange}
        keyboardType="numeric"
        maxLength={9}
        style={styles.input}
      />
      {loadingCep && <Text style={styles.cepLoadingText}>🔍 Consultando CEP...</Text>}
      {cepSuccess && <Text style={styles.cepSuccessText}>✔ Endereço e mapa definidos com sucesso pelo CEP!</Text>}

      {/* Botão para preencher pelo GPS mantendo autoridade do CEP */}
      <TouchableOpacity
        style={styles.gpsAutoCepBtn}
        onPress={handleUseMyLocation}
        disabled={capturingGps}
        activeOpacity={0.8}
      >
        {capturingGps ? (
          <ActivityIndicator size="small" color={colors.primaryDark} />
        ) : (
          <>
            <Text style={styles.gpsAutoCepIcon}>🎯</Text>
            <Text style={styles.gpsAutoCepText}>Usar Minha Localização Atual para Preencher CEP</Text>
          </>
        )}
      </TouchableOpacity>

      <Input
        label="Bairro e Cidade *"
        placeholder="Ex: Botafogo, Rio de Janeiro - RJ"
        value={locationHint}
        onChangeText={setLocationHint}
        style={styles.input}
      />

      <Input
        label="WhatsApp para Contato"
        placeholder="Ex: (11) 98765-4321"
        value={whatsapp}
        onChangeText={setWhatsapp}
        keyboardType="phone-pad"
        style={styles.input}
      />

      <Input
        label="Instagram do Doador / ONG"
        placeholder="Ex: @doapet ou @ongpatasamigas"
        value={instagram}
        onChangeText={setInstagram}
        autoCapitalize="none"
        style={styles.input}
      />

      <Button
        title="Publicar Pet para Doação"
        onPress={handleSave}
        loading={saving}
        style={styles.submitButton}
      />
    </ScrollView>
  );
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl + spacing.md,
  },
  banner: {
    backgroundColor: colors.primaryLight,
    borderRadius: radii.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  bannerEmoji: {
    fontSize: 36,
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  bannerSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.primaryDark,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    marginTop: spacing.xs,
  },
  photoRow: {
    marginBottom: spacing.md,
  },
  thumbnailContainer: {
    position: 'relative',
    marginRight: spacing.sm,
  },
  thumbnail: {
    width: 96,
    height: 96,
    borderRadius: radii.lg,
  },
  removePhotoBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.sos,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  removePhotoText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '900',
  },
  addPhoto: {
    width: 96,
    height: 96,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
  },
  addPhotoIcon: {
    fontSize: 24,
  },
  addPhotoText: {
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 2,
  },
  input: {
    marginBottom: spacing.md,
  },
  description: {
    height: 110,
    paddingTop: spacing.md,
    textAlignVertical: 'top',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  chip: {
    borderRadius: radii.round,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  chipLabel: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 13,
  },
  chipLabelSelected: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  submitButton: {
    marginTop: spacing.md,
  },
  cepLoadingText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    marginTop: -8,
    marginBottom: spacing.sm,
  },
  cepSuccessText: {
    fontSize: 12,
    color: '#166534',
    fontWeight: '700',
    marginTop: -8,
    marginBottom: spacing.sm,
  },
  convertingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primaryLight,
    borderRadius: radii.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  convertingText: {
    fontSize: 13,
    color: colors.primaryDark,
    fontWeight: '600',
    flex: 1,
  },
  gpsAutoCepBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primaryLight,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.primary,
    marginBottom: spacing.md,
    marginTop: -4,
  },
  gpsAutoCepIcon: {
    fontSize: 16,
  },
  gpsAutoCepText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
  },
});