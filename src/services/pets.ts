/**
 * Serviço de Pets — Cloud Firestore + Firebase Storage
 */
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';


import { isFirebaseConfigured, db } from './firebase';
import { MOCK_PETS } from './mockData';
import { petImageToBase64 } from '@/utils/image';
import type { Pet, GeoPointLiteral, PetMedicalInfo, PetSize, PetGender, UserRole } from '@/types';

/**
 * Normaliza a localização de um documento Firestore que pode ser:
 * - Um objeto GeoPoint nativo do Firestore ({ latitude, longitude, toJSON() })
 * - Um plain object { latitude, longitude }
 * Garante que os marcadores do mapa recebam coordenadas válidas.
 */
function normalizeLocation(raw: unknown): GeoPointLiteral {
  if (raw && typeof raw === 'object') {
    const loc = raw as Record<string, unknown>;
    const lat = typeof loc['latitude'] === 'number' ? loc['latitude'] : 0;
    const lng = typeof loc['longitude'] === 'number' ? loc['longitude'] : 0;
    return { latitude: lat, longitude: lng };
  }
  return { latitude: 0, longitude: 0 };
}

export interface CreatePetInput {
  ownerId: string;
  ownerName: string;
  ownerRole: UserRole;
  name: string;
  description: string;
  species: string;
  breed?: string;
  ageMonths: number;
  size: PetSize;
  gender: PetGender;
  personality: string[];
  medical: PetMedicalInfo;
  location: { latitude: number; longitude: number };
  locationHint?: string;
  whatsapp?: string;
  instagram?: string;
  photos?: string[];
}

/** Converte as fotos do pet para Base64 Data URI e atualiza o Firestore */
export async function uploadPetPhotos(
  petId: string,
  uris: string[],
): Promise<string[]> {
  const base64Photos: string[] = [];

  for (let index = 0; index < uris.length; index += 1) {
    const rawUri = uris[index];
    try {
      const b64 = await petImageToBase64(rawUri);
      base64Photos.push(b64);
    } catch {
      base64Photos.push(rawUri);
    }
  }

  if (isFirebaseConfigured && base64Photos.length > 0) {
    try {
      await updateDoc(doc(db, 'pets', petId), { photos: base64Photos });
    } catch (e) {
      console.error('Erro ao atualizar fotos base64 do pet:', e);
    }
  }

  return base64Photos;
}

function cleanFirestoreData<T extends Record<string, unknown>>(data: T): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

export async function createPet(input: CreatePetInput): Promise<string> {
  if (!isFirebaseConfigured) {
    const mockId = `pet-mock-${Date.now()}`;
    return mockId;
  }
  const payload = cleanFirestoreData({
    ...input,
    photos: input.photos ?? [],
    status: 'available' as const,
    createdAt: serverTimestamp(),
  });
  const petRef = await addDoc(collection(db, 'pets'), payload);
  return petRef.id;
}

/** Publica o pet convertendo todas as fotos para Base64 diretamente no banco de dados */
export async function createPetWithPhotos(
  input: CreatePetInput,
  photoUris: string[],
): Promise<string> {
  // 1. Converte todas as fotos selecionadas para Base64 (~40-70 KB cada)
  const base64Photos: string[] = [];
  for (const uri of photoUris) {
    try {
      const b64 = await petImageToBase64(uri);
      base64Photos.push(b64);
    } catch {
      base64Photos.push(uri);
    }
  }

  // 2. Cria o documento do pet no Firestore já com as fotos em Base64
  const petId = await createPet({
    ...input,
    photos: base64Photos,
  });

  // Se o Firebase estiver offline, adiciona na lista em memória para teste
  if (!isFirebaseConfigured) {
    MOCK_PETS.unshift({
      id: petId,
      ...input,
      photos: base64Photos.length > 0 ? base64Photos : ['https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=800&auto=format&fit=crop'],
      status: 'available',
      createdAt: Date.now(),
    });
  }

  return petId;
}

/** Lista pets disponíveis para adoção diretamente do banco de dados */
export async function listAvailablePets(): Promise<Pet[]> {
  if (!isFirebaseConfigured) {
    return MOCK_PETS;
  }
  try {
    const snapshot = await getDocs(
      query(collection(db, 'pets'), where('status', '==', 'available')),
    );
    const pets = snapshot.docs.map((docSnap) => {
      const raw = docSnap.data();
      return {
        id: docSnap.id,
        ...(raw as Omit<Pet, 'id' | 'location'>),
        location: normalizeLocation(raw['location']),
        createdAt: typeof raw['createdAt'] === 'number'
          ? raw['createdAt']
          : (raw['createdAt']?.seconds ?? 0) * 1000,
      } as Pet;
    });
    // Retorna estritamente os animais reais cadastrados no banco
    return pets.sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

/** Lista os pets publicados por um usuário/ONG */
export async function listPetsByOwner(ownerId: string): Promise<Pet[]> {
  if (!isFirebaseConfigured) {
    return MOCK_PETS.filter((p) => p.ownerId === ownerId);
  }
  try {
    const snapshot = await getDocs(
      query(collection(db, 'pets'), where('ownerId', '==', ownerId)),
    );
    return snapshot.docs
      .map((docSnap) => {
        const raw = docSnap.data();
        return {
          id: docSnap.id,
          ...(raw as Omit<Pet, 'id' | 'location'>),
          location: normalizeLocation(raw['location']),
          createdAt: typeof raw['createdAt'] === 'number'
            ? raw['createdAt']
            : (raw['createdAt']?.seconds ?? 0) * 1000,
        } as Pet;
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

/** Marca o pet como adotado no banco de dados */
export async function markPetAsAdopted(petId: string): Promise<void> {
  if (isFirebaseConfigured) {
    try {
      await updateDoc(doc(db, 'pets', petId), { status: 'adopted' });
    } catch {}
  }
}

/** Cancela / desiste da doação de um pet (remove da vitrine pública) */
export async function cancelPetDonation(petId: string, ownerId: string): Promise<void> {
  if (isFirebaseConfigured) {
    try {
      await updateDoc(doc(db, 'pets', petId), { status: 'removed' });
    } catch {}
  }
  const idx = MOCK_PETS.findIndex((p) => p.id === petId && p.ownerId === ownerId);
  if (idx !== -1) {
    MOCK_PETS[idx].status = 'removed';
  }
}

/** Atualiza os dados de um pet existente (edição de doação) */
export async function updatePet(
  petId: string,
  ownerId: string,
  input: Partial<CreatePetInput>,
  newPhotoUris?: string[],
): Promise<void> {
  // Converte novas fotos para Base64 se houver
  const newBase64Photos: string[] = [];
  if (newPhotoUris && newPhotoUris.length > 0) {
    for (const uri of newPhotoUris) {
      try {
        const b64 = await petImageToBase64(uri);
        newBase64Photos.push(b64);
      } catch {
        newBase64Photos.push(uri);
      }
    }
  }

  const payload = cleanFirestoreData({
    ...input,
    ...(newBase64Photos.length > 0 ? { photos: newBase64Photos } : {}),
    updatedAt: serverTimestamp(),
  });

  if (isFirebaseConfigured) {
    try {
      await updateDoc(doc(db, 'pets', petId), payload);
    } catch (e) {
      console.error('[DoaPet] Erro ao atualizar pet:', e);
      throw e;
    }
  }

  // Atualiza mock local também
  const idx = MOCK_PETS.findIndex((p) => p.id === petId && p.ownerId === ownerId);
  if (idx !== -1) {
    MOCK_PETS[idx] = {
      ...MOCK_PETS[idx],
      ...input,
      ...(newBase64Photos.length > 0 ? { photos: newBase64Photos } : {}),
    };
  }
}