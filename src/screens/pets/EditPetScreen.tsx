/**
 * Tela de Edição de Doação de Pet
 *
 * Pré-popula todos os campos com os dados existentes do pet
 * e permite que o dono atualize qualquer informação.
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

import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { useAuth } from '@/context/AuthContext';
import { updatePet } from '@/services/pets';
import { formatCep, fetchAddressByCep } from '@/services/cep';
import { petImageToBase64 } from '@/utils/image';
import { containsOffensiveContent, getOffensiveContentMessage } from '@/utils/contentFilter';
import { colors, radii, spacing } from '@/theme';
import type { PetGender, PetSize } from '@/types';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'EditPet'>;

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

export function EditPetScreen({ route, navigation }: Props) {
  const { pet } = route.params;
  const { user } = useAuth();

  // Pré-popula com dados do pet existente
  const [name, setName] = useState(pet.name);
  const [species, setSpecies] = useState(pet.species);
  const [breed, setBreed] = useState(pet.breed ?? '');
  const [ageText, setAgeText] = useState(String(pet.ageMonths));
  const [size, setSize] = useState<PetSize>(pet.size);
  const [gender, setGender] = useState<PetGender>(pet.gender);
  const [description, setDescription] = useState(pet.description);
  const [cep, setCep] = useState('');
  const [loadingCep, setLoadingCep] = useState(false);
  const [cepSuccess, setCepSuccess] = useState(false);
  const [locationHint, setLocationHint] = useState(pet.locationHint ?? '');
  const [whatsapp, setWhatsapp] = useState(pet.whatsapp ?? '');
  const [instagram, setInstagram] = useState(pet.instagram ?? '');
  const [vaccinated, setVaccinated] = useState(pet.medical.vaccinated);
  const [neutered, setNeutered] = useState(pet.medical.neutered);
  const [dewormed, setDewormed] = useState(pet.medical.dewormed);
  const [photos, setPhotos] = useState<string[]>(pet.photos);
  const [saving, setSaving] = useState(false);
  const [convertingPhotos, setConvertingPhotos] = useState(false);

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
        }
      } finally {
        setLoadingCep(false);
      }
    }
  }

  async function processAndAddPhotos(uris: string[]) {
    setConvertingPhotos(true);
    try {
      const b64Photos: string[] = [];
      for (const uri of uris) {
        try {
          const b64 = await petImageToBase64(uri);
          b64Photos.push(b64);
        } catch {
          b64Photos.push(uri);
        }
      }
      setPhotos((prev) => [...prev, ...b64Photos].slice(0, 5));
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
          Alert.alert('Permissão necessária', 'Precisamos de acesso à câmera.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
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
    Alert.alert('Alterar Foto do Pet', 'Escolha como deseja adicionar a foto:', [
      { text: '📷 Tirar Foto com a Câmera', onPress: () => pickPhotoOption('camera') },
      { text: '🖼️ Escolher da Galeria', onPress: () => pickPhotoOption('gallery') },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  function removePhoto(indexToRemove: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== indexToRemove));
  }

  async function handleSave() {
    if (!user) {
      Alert.alert('Atenção', 'Você precisa estar logado.');
      return;
    }
    if (!name.trim()) {
      Alert.alert('Atenção', 'Informe o nome do pet.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Atenção', 'Informe a descrição do pet.');
      return;
    }
    if (!locationHint.trim()) {
      Alert.alert('Atenção', 'Informe o Bairro / Cidade onde o pet se encontra.');
      return;
    }

    // Filtro de conteúdo ofensivo
    const offensiveField =
      containsOffensiveContent(name.trim()) ? 'Nome' :
      containsOffensiveContent(description.trim()) ? 'Descrição' :
      containsOffensiveContent(whatsapp.trim()) ? 'WhatsApp' : null;

    if (offensiveField) {
      Alert.alert(`Campo "${offensiveField}" bloqueado`, getOffensiveContentMessage());
      return;
    }

    const ageMonths = parseInt(ageText, 10);

    setSaving(true);
    try {
      await updatePet(
        pet.id,
        user.uid,
        {
          name: name.trim(),
          description: description.trim(),
          species: species.trim().toLowerCase(),
          breed: breed.trim() || undefined,
          ageMonths: Number.isNaN(ageMonths) ? pet.ageMonths : ageMonths,
          size,
          gender,
          medical: { vaccinated, neutered, dewormed },
          locationHint: locationHint.trim(),
          whatsapp: whatsapp.trim() || undefined,
          instagram: instagram.trim() || undefined,
          photos,
        },
      );

      Alert.alert(
        '✅ Doação Atualizada!',
        'As informações do pet foram salvas com sucesso.',
        [{ text: 'Ótimo!', onPress: () => navigation.goBack() }],
      );
    } catch {
      Alert.alert('Erro', 'Não foi possível atualizar as informações. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.banner}>
        <Text style={styles.bannerEmoji}>✏️</Text>
        <View style={styles.bannerTextContainer}>
          <Text style={styles.bannerTitle}>Editando: {pet.name}</Text>
          <Text style={styles.bannerSubtitle}>
            Altere as informações abaixo e salve para atualizar o anúncio de doação.
          </Text>
        </View>
      </View>

      {/* Fotos */}
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
            <TouchableOpacity
              style={styles.removePhotoBadge}
              onPress={() => removePhoto(index)}
            >
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

      {/* Dados básicos */}
      <Text style={styles.sectionTitle}>ℹ️ Sobre o Animalzinho</Text>
      <Input
        label="Nome do Pet *"
        placeholder="Ex: Luna, Thor, Mel..."
        value={name}
        onChangeText={setName}
        style={styles.input}
      />

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

      <Input
        label="Raça"
        placeholder="Ex: Vira-lata (SRD), Poodle..."
        value={breed}
        onChangeText={setBreed}
        style={styles.input}
      />
      <Input
        label="Idade aproximada (em meses)"
        placeholder="Ex: 6 (para 6 meses)"
        value={ageText}
        onChangeText={setAgeText}
        keyboardType="number-pad"
        style={styles.input}
      />

      <Text style={styles.fieldLabel}>Porte</Text>
      <View style={styles.chipRow}>
        {(['pequeno', 'medio', 'grande'] as PetSize[]).map((option) => (
          <Chip
            key={option}
            label={
              option === 'pequeno'
                ? 'Pequeno (até 10kg)'
                : option === 'medio'
                ? 'Médio (10-25kg)'
                : 'Grande (+25kg)'
            }
            selected={size === option}
            onPress={() => setSize(option)}
          />
        ))}
      </View>

      <Text style={styles.fieldLabel}>Sexo</Text>
      <View style={styles.chipRow}>
        <Chip label="♂️ Macho" selected={gender === 'macho'} onPress={() => setGender('macho')} />
        <Chip label="♀️ Fêmea" selected={gender === 'femea'} onPress={() => setGender('femea')} />
      </View>

      <Text style={styles.fieldLabel}>Cuidados Veterinários</Text>
      <View style={styles.chipRow}>
        <Chip label="💉 Vacinado" selected={vaccinated} onPress={() => setVaccinated((v) => !v)} />
        <Chip label="✂️ Castrado" selected={neutered} onPress={() => setNeutered((n) => !n)} />
        <Chip label="🪱 Vermifugado" selected={dewormed} onPress={() => setDewormed((d) => !d)} />
      </View>

      <Input
        label="História e Temperamento *"
        placeholder="Conte como ele é, se convive bem com crianças, outros animais..."
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={4}
        style={[styles.input, styles.description]}
      />

      {/* Localização */}
      <Text style={styles.sectionTitle}>📍 Localização & Contato</Text>
      <Input
        label="CEP (para atualizar a localização no mapa)"
        placeholder="00000-000"
        value={cep}
        onChangeText={handleCepChange}
        keyboardType="numeric"
        maxLength={9}
        style={styles.input}
      />
      {loadingCep && <Text style={styles.cepLoadingText}>🔍 Consultando CEP...</Text>}
      {cepSuccess && (
        <Text style={styles.cepSuccessText}>✔ Endereço atualizado com sucesso pelo CEP!</Text>
      )}
      <Input
        label="Bairro e Cidade *"
        placeholder="Ex: Botafogo, Rio de Janeiro - RJ"
        value={locationHint}
        onChangeText={setLocationHint}
        style={styles.input}
      />
      <Input
        label="WhatsApp (opcional)"
        placeholder="(21) 99999-9999"
        value={whatsapp}
        onChangeText={setWhatsapp}
        keyboardType="phone-pad"
        style={styles.input}
      />
      <Input
        label="Instagram (opcional)"
        placeholder="@seu_perfil"
        value={instagram}
        onChangeText={setInstagram}
        style={styles.input}
      />

      <Button
        title={saving ? 'Salvando...' : '✅ Salvar Alterações'}
        onPress={handleSave}
        disabled={saving || convertingPhotos}
        style={styles.submitButton}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xl + spacing.md },
  banner: {
    backgroundColor: '#fef9c3',
    borderRadius: radii.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  bannerEmoji: { fontSize: 36 },
  bannerTextContainer: { flex: 1 },
  bannerTitle: { fontSize: 16, fontWeight: '800', color: '#92400e' },
  bannerSubtitle: { fontSize: 12, color: '#78350f', marginTop: 2, lineHeight: 16 },
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
  photoRow: { marginBottom: spacing.md },
  thumbnailContainer: { position: 'relative', marginRight: spacing.sm },
  thumbnail: { width: 96, height: 96, borderRadius: radii.lg },
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
  removePhotoText: { color: colors.white, fontSize: 12, fontWeight: '900' },
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
  addPhotoIcon: { fontSize: 24 },
  addPhotoText: {
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 2,
  },
  input: { marginBottom: spacing.md },
  description: { height: 110, paddingTop: spacing.md, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  chip: {
    borderRadius: radii.round,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.surface,
  },
  chipSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  chipLabel: { color: colors.textSecondary, fontWeight: '600', fontSize: 13 },
  chipLabelSelected: { color: colors.primaryDark, fontWeight: '700' },
  submitButton: { marginTop: spacing.md },
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
  convertingText: { fontSize: 13, color: colors.primaryDark, fontWeight: '600', flex: 1 },
});
