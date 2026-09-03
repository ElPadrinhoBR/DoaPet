/**
 * Serviço de Chat em tempo real — Cloud Firestore
 */
import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
  deleteDoc,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';

import { isFirebaseConfigured, db } from './firebase';
import type { Chat, ChatMessage, Pet, UserProfile } from '@/types';

// Armazenamento em memória vazio — o app utiliza apenas conversas reais
const demoChats: Chat[] = [];
const demoMessages: Record<string, ChatMessage[]> = {};

const messageListeners: Record<string, Array<(messages: ChatMessage[]) => void>> = {};
const userChatListeners: Record<string, Array<(chats: Chat[]) => void>> = {};

function notifyMessageListeners(chatId: string) {
  const listeners = messageListeners[chatId] ?? [];
  const list = [...(demoMessages[chatId] ?? [])];
  listeners.forEach((cb) => cb(list));
}

function notifyChatListeners(userId: string) {
  const listeners = userChatListeners[userId] ?? [];
  const list = demoChats.filter((c) => c.participants.includes(userId));
  listeners.forEach((cb) => cb(list));
}

/** Cria ou abre canal de conexão para adoção com Ficha do Adotante automática */
export async function connectAndStartAdoptionChat(
  adopter: UserProfile,
  pet: Pet,
): Promise<string> {
  const chatId = await getOrCreateChat(adopter.uid, pet.ownerId, pet.id);

  const introText =
    `📋 FICHA DE INTERESSE EM ADOÇÃO 🐾\n` +
    `• Adotante: ${adopter.name}\n` +
    `• Contato: ${adopter.phone ?? 'Não informado'} | ${adopter.email}\n` +
    `• Localização: Raio de ${adopter.searchRadiusKm} km\n` +
    `• Interesse: Adoção responsável de ${pet.name} (${pet.species}, ${pet.gender === 'femea' ? 'Fêmea' : 'Macho'})\n\n` +
    `"Olá! Me interessei pelo pet e gostaria de conversar para dar um lar amoroso e responsável a ele(a)!"`;

  await sendMessage(chatId, adopter.uid, `${adopter.name} (Adotante)`, introText);

  // No modo demo, simula uma resposta acolhedora da ONG/Doador após 2 segundos
  if (!isFirebaseConfigured) {
    setTimeout(() => {
      const reply = `Olá, ${adopter.name}! Muito obrigado pelo seu interesse em adotar ${pet.name}! Recebemos sua ficha e ficamos muito felizes. Quando você teria disponibilidade para conversar ou fazer uma visita? 🐾`;
      sendMessage(chatId, pet.ownerId, pet.ownerName, reply);
    }, 2000);
  }

  return chatId;
}

/** Cria (ou retorna o id de) um chat entre dois usuários para um pet */
export async function getOrCreateChat(
  currentUserId: string,
  otherUserId: string,
  petId?: string,
): Promise<string> {
  if (!isFirebaseConfigured) {
    const existing = demoChats.find(
      (c) =>
        c.participants.includes(currentUserId) &&
        c.participants.includes(otherUserId) &&
        (!petId || c.petId === petId),
    );
    if (existing) return existing.id;

    const newId = `chat_${Date.now()}`;
    demoChats.unshift({
      id: newId,
      participants: [currentUserId, otherUserId],
      petId: petId ?? undefined,
      lastMessagePreview: 'Nova conversa iniciada',
      lastMessageAt: Date.now(),
    });
    demoMessages[newId] = [];
    notifyChatListeners(currentUserId);
    return newId;
  }

  try {
    const chatsRef = collection(db, 'chats');
    const snapshot = await getDocs(
      query(chatsRef, where('participants', 'array-contains', currentUserId)),
    );

    const existing = snapshot.docs.find((docSnap) => {
      const data = docSnap.data() as Chat;
      return (
        data.participants.includes(otherUserId) &&
        (!petId || data.petId === petId)
      );
    });

    if (existing) return existing.id;

    const chatRef = await addDoc(chatsRef, {
      participants: [currentUserId, otherUserId],
      petId: petId ?? null,
      lastMessagePreview: '',
      lastMessageAt: Date.now(),
    });
    return chatRef.id;
  } catch {
    return 'demo_chat_luna';
  }
}

/** Assina as mensagens de um chat em tempo real */
export function subscribeToMessages(
  chatId: string,
  callback: (messages: ChatMessage[]) => void,
): Unsubscribe {
  if (!isFirebaseConfigured) {
    if (!messageListeners[chatId]) {
      messageListeners[chatId] = [];
    }
    messageListeners[chatId].push(callback);
    callback(demoMessages[chatId] ?? []);
    return () => {
      messageListeners[chatId] = (messageListeners[chatId] ?? []).filter(
        (cb) => cb !== callback,
      );
    };
  }

  try {
    return onSnapshot(
      query(
        collection(db, 'chats', chatId, 'messages'),
        orderBy('sentAt', 'asc'),
        limit(200),
      ),
      (snapshot) => {
        callback(
          snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...(docSnap.data() as Omit<ChatMessage, 'id'>),
          })),
        );
      },
    );
  } catch {
    callback(demoMessages[chatId] ?? []);
    return () => {};
  }
}

export async function sendMessage(
  chatId: string,
  senderId: string,
  senderName: string,
  text: string,
): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;

  if (!isFirebaseConfigured) {
    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      chatId,
      senderId,
      senderName,
      text: trimmed,
      sentAt: Date.now(),
    };
    if (!demoMessages[chatId]) demoMessages[chatId] = [];
    demoMessages[chatId].push(newMsg);

    const chat = demoChats.find((c) => c.id === chatId);
    if (chat) {
      chat.lastMessagePreview = trimmed;
      chat.lastMessageAt = Date.now();
    }
    notifyMessageListeners(chatId);
    return;
  }

  try {
    await addDoc(collection(db, 'chats', chatId, 'messages'), {
      senderId,
      senderName,
      text: trimmed,
      sentAt: serverTimestamp(),
    });

    await setDoc(
      doc(db, 'chats', chatId),
      { lastMessagePreview: trimmed, lastMessageAt: Date.now() },
      { merge: true },
    );
  } catch {
    // Silencioso em caso de falha de conexão
  }
}

/** Assina a lista de conversas do usuário (mais recentes primeiro) */
export function subscribeToUserChats(
  userId: string,
  callback: (chats: Chat[]) => void,
): Unsubscribe {
  if (!isFirebaseConfigured) {
    if (!userChatListeners[userId]) {
      userChatListeners[userId] = [];
    }
    userChatListeners[userId].push(callback);
    callback(demoChats.filter((c) => c.participants.includes(userId)));
    return () => {
      userChatListeners[userId] = (userChatListeners[userId] ?? []).filter(
        (cb) => cb !== callback,
      );
    };
  }

  try {
    return onSnapshot(
      query(collection(db, 'chats'), where('participants', 'array-contains', userId)),
      (snapshot) => {
        const chats = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<Chat, 'id'>),
        }));
        callback(chats.sort((a, b) => b.lastMessageAt - a.lastMessageAt));
      },
    );
  } catch {
    callback(demoChats);
    return () => {};
  }
}

export async function markChatAsRead(chatId: string): Promise<void> {
  if (!isFirebaseConfigured) return;
  try {
    await updateDoc(doc(db, 'chats', chatId), { unreadForCurrentUser: false });
  } catch {}
}

/** Verifica se o usuário já deu match com determinado pet */
export async function checkPetMatch(
  userId: string,
  petId: string,
): Promise<string | null> {
  if (!isFirebaseConfigured) {
    const existing = demoChats.find(
      (c) => c.participants.includes(userId) && c.petId === petId,
    );
    return existing ? existing.id : null;
  }

  try {
    const chatsRef = collection(db, 'chats');
    const snapshot = await getDocs(
      query(chatsRef, where('participants', 'array-contains', userId)),
    );
    const existing = snapshot.docs.find((docSnap) => {
      const data = docSnap.data() as Chat;
      return data.petId === petId && data.isMatchActive !== false;
    });
    return existing ? existing.id : null;
  } catch {
    const existing = demoChats.find(
      (c) => c.participants.includes(userId) && c.petId === petId && c.isMatchActive !== false,
    );
    return existing ? existing.id : null;
  }
}

/** Desfaz o match com o pet e avisa no chat da doação que o adotante desistiu */
export async function undoPetMatch(
  userId: string,
  petId: string,
  adopterName?: string,
): Promise<void> {
  const name = adopterName || 'O adotante';
  const noticeText = `⚠️ AVISO: ${name} desfez o match e desistiu do processo de adoção deste pet.`;

  // 1. Atualiza no mock em memória e posta mensagem no chat
  const memoryChat = demoChats.find(
    (c) => c.participants.includes(userId) && c.petId === petId,
  );
  if (memoryChat) {
    memoryChat.isMatchActive = false;
    await sendMessage(memoryChat.id, 'system', 'Aviso do Sistema 🐾', noticeText);
    notifyChatListeners(userId);
  }

  // 2. Notifica no Firestore e preserva o histórico da conversa
  if (isFirebaseConfigured) {
    try {
      const chatsRef = collection(db, 'chats');
      const snapshot = await getDocs(
        query(chatsRef, where('participants', 'array-contains', userId)),
      );
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data() as Chat;
        if (data.petId === petId) {
          const chatId = docSnap.id;
          // Envia a mensagem avisando no chat da doação
          await sendMessage(chatId, 'system', 'Aviso do Sistema 🐾', noticeText);
          // Marca o match como inativo sem deletar a conversa
          await updateDoc(doc(db, 'chats', chatId), {
            isMatchActive: false,
            matchCancelledAt: Date.now(),
          });
        }
      }
    } catch {
      // Silencioso
    }
  }
}