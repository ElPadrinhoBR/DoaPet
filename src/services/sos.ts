/**
 * Serviço de Alertas Comunitários "SOS Rua"
 *
 * - Expiração automática após 1 semana (7 dias)
 * - Exclusão restrita apenas ao autor do alerta
 * - Sincronização direta com Cloud Firestore e mapa comunitário
 */
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  doc,
  query,
  where,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { isFirebaseConfigured, db } from './firebase';
import { MOCK_SOS_ALERTS } from './mockData';
import { petImageToBase64 } from '@/utils/image';
import type { SosAlert, SosAlertStatus, GeoPointLiteral } from '@/types';

// Alertas SOS expiram e somem do mapa após 7 dias (1 semana)
export const SOS_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000;

function normalizeLocation(raw: unknown): GeoPointLiteral {
  if (raw && typeof raw === 'object') {
    const loc = raw as Record<string, unknown>;
    const lat = typeof loc['latitude'] === 'number' ? loc['latitude'] : 0;
    const lng = typeof loc['longitude'] === 'number' ? loc['longitude'] : 0;
    return { latitude: lat, longitude: lng };
  }
  return { latitude: 0, longitude: 0 };
}

export interface CreateSosAlertInput {
  authorId: string;
  authorName: string;
  description: string;
  location: { latitude: number; longitude: number };
  addressHint?: string;
  photos?: string[];
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

export async function createSosAlert(input: CreateSosAlertInput): Promise<string> {
  let alertId = `sos_${Date.now()}`;
  if (isFirebaseConfigured) {
    try {
      const payload = cleanFirestoreData({
        ...input,
        photos: input.photos ?? [],
        status: 'open' as const,
        createdAt: serverTimestamp(),
      });
      const alertRef = await addDoc(collection(db, 'sos_alerts'), payload);
      alertId = alertRef.id;
    } catch {
      // Fallback para ID local se rede falhar
    }
  }

  // Adiciona ao array em memória para exibição em tempo real
  MOCK_SOS_ALERTS.unshift({
    id: alertId,
    ...input,
    photos: input.photos ?? [],
    status: 'open',
    createdAt: Date.now(),
  });

  return alertId;
}

/**
 * Lista alertas abertos/em resgate.
 * FILTRO DE VALIDADE: Alertas com mais de 7 dias expiram e não são exibidos no mapa.
 */
export async function listOpenAlerts(): Promise<SosAlert[]> {
  const now = Date.now();

  if (!isFirebaseConfigured) {
    return MOCK_SOS_ALERTS.filter(
      (a) => a.status !== 'resolved' && now - a.createdAt <= SOS_EXPIRATION_MS,
    );
  }

  try {
    const snapshot = await getDocs(
      query(collection(db, 'sos_alerts'), where('status', 'in', ['open', 'rescuing'])),
    );
    const alerts = snapshot.docs.map((docSnap) => {
      const raw = docSnap.data();
      return {
        id: docSnap.id,
        ...(raw as Omit<SosAlert, 'id' | 'location'>),
        location: normalizeLocation(raw['location']),
        createdAt: typeof raw['createdAt'] === 'number'
          ? raw['createdAt']
          : (raw['createdAt']?.seconds ?? 0) * 1000,
      } as SosAlert;
    });

    // Filtra apenas alertas válidos criados há menos de 7 dias
    return alerts
      .filter((a) => now - a.createdAt <= SOS_EXPIRATION_MS)
      .sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

/** Lista apenas os alertas criados pelo usuário logado para gerenciar/excluir no perfil */
export async function listUserAlerts(userId: string): Promise<SosAlert[]> {
  if (!isFirebaseConfigured) {
    return MOCK_SOS_ALERTS.filter((a) => a.authorId === userId);
  }

  try {
    const snapshot = await getDocs(
      query(collection(db, 'sos_alerts'), where('authorId', '==', userId)),
    );
    const alerts = snapshot.docs.map((docSnap) => {
      const raw = docSnap.data();
      return {
        id: docSnap.id,
        ...(raw as Omit<SosAlert, 'id' | 'location'>),
        location: normalizeLocation(raw['location']),
        createdAt: typeof raw['createdAt'] === 'number'
          ? raw['createdAt']
          : (raw['createdAt']?.seconds ?? 0) * 1000,
      } as SosAlert;
    });

    return alerts.sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

/**
 * Exclui o alerta SOS do banco de dados e do mapa.
 * Regra de segurança: Apenas o autor que criou o alerta tem permissão para excluir.
 */
export async function deleteSosAlert(alertId: string, currentUserId: string): Promise<boolean> {
  // 1. Remove da lista em memória local
  const memoryIndex = MOCK_SOS_ALERTS.findIndex(
    (a) => a.id === alertId && a.authorId === currentUserId,
  );
  if (memoryIndex !== -1) {
    MOCK_SOS_ALERTS.splice(memoryIndex, 1);
  }

  // 2. Remove do Firestore verificando se o autor é o mesmo
  if (isFirebaseConfigured) {
    try {
      const alertRef = doc(db, 'sos_alerts', alertId);
      const snap = await getDoc(alertRef);
      if (snap.exists()) {
        const data = snap.data();
        if (data.authorId !== currentUserId) {
          throw new Error('Apenas o autor do alerta tem permissão para excluí-lo.');
        }
        await deleteDoc(alertRef);
      }
    } catch (e: any) {
      if (e?.message?.includes('Apenas o autor')) {
        throw e;
      }
    }
  }

  return true;
}

/** Converte a foto do alerta para Base64 e salva diretamente no Firestore */
export async function attachSosPhoto(alertId: string, uri: string): Promise<void> {
  let photoData = uri;
  try {
    photoData = await petImageToBase64(uri);
  } catch {
    // usa URI local como fallback
  }

  if (isFirebaseConfigured) {
    try {
      await updateDoc(doc(db, 'sos_alerts', alertId), { photos: [photoData] });
    } catch (e) {
      console.error('Erro ao salvar foto base64 do alerta SOS:', e);
    }
  }

  const existing = MOCK_SOS_ALERTS.find((a) => a.id === alertId);
  if (existing) {
    existing.photos = [photoData];
  }
}

export async function updateAlertStatus(
  alertId: string,
  status: SosAlertStatus,
): Promise<void> {
  await updateDoc(doc(db, 'sos_alerts', alertId), { status });
}