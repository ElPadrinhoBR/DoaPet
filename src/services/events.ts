/**
 * Serviço de Feiras e Campanhas de Adoção
 */
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';

import { isFirebaseConfigured, db } from './firebase';
import { MOCK_EVENTS } from './mockData';
import type { AdoptionEvent } from '@/types';

export interface CreateEventInput {
  organizerId: string;
  organizerName: string;
  title: string;
  description: string;
  location: { latitude: number; longitude: number };
  address: string;
  startsAt: number;
  endsAt: number;
}

export async function createEvent(input: CreateEventInput): Promise<string> {
  const eventRef = await addDoc(collection(db, 'events'), {
    ...input,
    createdAt: serverTimestamp(),
  });
  return eventRef.id;
}

/** Lista eventos futuros (agenda) */
export async function listUpcomingEvents(): Promise<AdoptionEvent[]> {
  if (!isFirebaseConfigured) {
    return MOCK_EVENTS;
  }
  try {
    const snapshot = await getDocs(
      query(
        collection(db, 'events'),
        where('endsAt', '>=', Date.now()),
        orderBy('endsAt', 'asc'),
      ),
    );
    const events = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<AdoptionEvent, 'id'>),
    }));
    return events.length > 0 ? events : MOCK_EVENTS;
  } catch {
    return MOCK_EVENTS;
  }
}