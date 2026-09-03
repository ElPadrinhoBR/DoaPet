/**
 * Serviço de Banco de Dados de Adoções — Cloud Firestore
 * Coleção oficial: 'adoptions'
 *
 * Gerencia o ciclo de vida completo de adoção:
 * - Registro de interesse (Match ou solicitação direta)
 * - Análise pelo doador (em análise / aprovado)
 * - Conclusão formal da adoção (marcando o pet como adotado no banco)
 * - Histórico de adoções para adotantes e doadores
 */
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';

import { isFirebaseConfigured, db } from './firebase';
import { markPetAsAdopted } from './pets';
import type { AdoptionRecord, AdoptionStatus, Pet, UserProfile } from '@/types';

// Cache em memória para modo offline / demonstração
const memoryAdoptions: AdoptionRecord[] = [];

function cleanData<T extends Record<string, unknown>>(data: T): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

/**
 * Registra um novo interesse de adoção no banco de dados
 */
export async function registerAdoptionInterest(
  adopter: UserProfile,
  pet: Pet,
): Promise<string> {
  const now = Date.now();
  let adoptionId = `adopt_${now}_${Math.random().toString(36).slice(2, 7)}`;

  if (isFirebaseConfigured) {
    try {
      const adoptionsRef = collection(db, 'adoptions');
      // Verifica se já existe interesse registrado para evitar duplicatas
      const snap = await getDocs(
        query(
          adoptionsRef,
          where('petId', '==', pet.id),
          where('adopterId', '==', adopter.uid),
          where('status', 'in', ['pending', 'in_review', 'approved']),
        ),
      );

      if (!snap.empty) {
        return snap.docs[0].id;
      }

      const payload = cleanData({
        petId: pet.id,
        petName: pet.name,
        petPhoto: pet.photos?.[0] || null,
        petSpecies: pet.species,
        ownerId: pet.ownerId,
        ownerName: pet.ownerName,
        adopterId: adopter.uid,
        adopterName: adopter.name,
        adopterPhone: adopter.phone || null,
        adopterEmail: adopter.email,
        status: 'pending' as AdoptionStatus,
        createdAt: now,
        updatedAt: now,
        serverCreatedAt: serverTimestamp(),
      });

      const docRef = await addDoc(adoptionsRef, payload);
      adoptionId = docRef.id;
    } catch {
      // Continua com ID local se a rede oscilar
    }
  }

  // Atualiza cache em memória
  const memoryRecord: AdoptionRecord = {
    id: adoptionId,
    petId: pet.id,
    petName: pet.name,
    petPhoto: pet.photos?.[0],
    petSpecies: pet.species,
    ownerId: pet.ownerId,
    ownerName: pet.ownerName,
    adopterId: adopter.uid,
    adopterName: adopter.name,
    adopterPhone: adopter.phone,
    adopterEmail: adopter.email,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };
  memoryAdoptions.unshift(memoryRecord);

  return adoptionId;
}

/**
 * Lista todos os processos de adoção de um adotante
 */
export async function listAdoptionsByAdopter(adopterId: string): Promise<AdoptionRecord[]> {
  if (!isFirebaseConfigured) {
    return memoryAdoptions.filter((a) => a.adopterId === adopterId);
  }

  try {
    const snap = await getDocs(
      query(collection(db, 'adoptions'), where('adopterId', '==', adopterId)),
    );
    const records = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<AdoptionRecord, 'id'>),
    }));
    return records.sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return memoryAdoptions.filter((a) => a.adopterId === adopterId);
  }
}

/**
 * Lista todos os pedidos de adoção recebidos pelo doador/ONG
 */
export async function listAdoptionsByOwner(ownerId: string): Promise<AdoptionRecord[]> {
  if (!isFirebaseConfigured) {
    return memoryAdoptions.filter((a) => a.ownerId === ownerId);
  }

  try {
    const snap = await getDocs(
      query(collection(db, 'adoptions'), where('ownerId', '==', ownerId)),
    );
    const records = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<AdoptionRecord, 'id'>),
    }));
    return records.sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return memoryAdoptions.filter((a) => a.ownerId === ownerId);
  }
}

/**
 * Atualiza o status do processo de adoção
 * Se 'completed', marca o pet como 'adopted' no banco de dados de pets
 */
export async function updateAdoptionStatus(
  adoptionId: string,
  petId: string,
  status: AdoptionStatus,
): Promise<void> {
  const now = Date.now();

  if (isFirebaseConfigured) {
    try {
      await updateDoc(doc(db, 'adoptions', adoptionId), {
        status,
        updatedAt: now,
      });
      if (status === 'completed') {
        await markPetAsAdopted(petId);
      }
    } catch {
      // Ignora erro
    }
  }

  const existing = memoryAdoptions.find((a) => a.id === adoptionId);
  if (existing) {
    existing.status = status;
    existing.updatedAt = now;
  }
}

/**
 * Cancela/desfaz um processo de adoção
 */
export async function cancelAdoption(petId: string, adopterId: string): Promise<void> {
  const now = Date.now();

  if (isFirebaseConfigured) {
    try {
      const snap = await getDocs(
        query(
          collection(db, 'adoptions'),
          where('petId', '==', petId),
          where('adopterId', '==', adopterId),
        ),
      );
      for (const d of snap.docs) {
        await updateDoc(doc(db, 'adoptions', d.id), {
          status: 'cancelled' as AdoptionStatus,
          updatedAt: now,
        });
      }
    } catch {
      // Silencioso
    }
  }

  const existing = memoryAdoptions.find(
    (a) => a.petId === petId && a.adopterId === adopterId,
  );
  if (existing) {
    existing.status = 'cancelled';
    existing.updatedAt = now;
  }
}
