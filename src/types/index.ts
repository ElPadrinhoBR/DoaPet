/**
 * Tipos de domínio do DoaPet
 */

export type UserRole = 'user' | 'ong';

/** Geolocalização no padrão GeoJSON Point usado pelo Firestore */
export interface GeoPointLiteral {
  latitude: number;
  longitude: number;
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  photoURL?: string;
  photoUrl?: string;
  role: UserRole; // 'ong' => perfil institucional verificado
  organizationName?: string; // obrigatório quando role === 'ong'
  searchRadiusKm: number; // raio de busca personalizável (5 a 30 km)
  pushNotificationsEnabled: boolean;
  soundAlertsEnabled?: boolean; // Alerta sonoro de pet próximo
  createdAt: number;
}

export type PetSize = 'pequeno' | 'medio' | 'grande';
export type PetGender = 'macho' | 'femea';

export type PetMedicalInfo = {
  vaccinated: boolean;
  neutered: boolean;
  dewormed: boolean;
};

export type PetStatus = 'available' | 'adopted' | 'removed';

export interface Pet {
  id: string;
  ownerId: string; // usuário/ONG que publicou
  ownerName: string;
  ownerRole: UserRole;
  name: string;
  description: string;
  species: string; // cachorro, gato, etc.
  breed?: string;
  ageMonths: number;
  size: PetSize;
  gender: PetGender;
  personality: string[]; // ex.: ['brincalhão', 'sociável']
  medical: PetMedicalInfo;
  photos: string[]; // URLs do Firebase Storage
  location: GeoPointLiteral;
  locationHint?: string; // Bairro ou referência textual
  whatsapp?: string; // Contato WhatsApp para doação/adoção
  instagram?: string; // Perfil do Instagram do tutor ou ONG
  status: PetStatus;
  createdAt: number;
}

/** Alerta comunitário "SOS Rua" */
export type SosAlertStatus = 'open' | 'rescuing' | 'resolved';

export interface SosAlert {
  id: string;
  authorId: string;
  authorName: string;
  description: string;
  photos: string[];
  location: GeoPointLiteral;
  addressHint?: string; // referência textual, ex.: "próximo ao mercado X"
  status: SosAlertStatus;
  createdAt: number;
}

/** Feiras, campanhas e mutirões */
export interface AdoptionEvent {
  id: string;
  organizerId: string;
  organizerName: string;
  title: string;
  description: string;
  location: GeoPointLiteral;
  address: string;
  startsAt: number;
  endsAt: number;
  coverImage?: string;
}

/** Clínica/hospital veterinário 24h */
export interface VetClinic {
  id: string;
  name: string;
  address: string;
  phone: string;
  isOpen24h: boolean;
  location: GeoPointLiteral;
}

/** Mensagens do chat entre adotante e doador */
export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  text: string;
  sentAt: number;
}

export interface Chat {
  id: string;
  participants: string[]; // uids dos participantes
  petId?: string; // chat originado de um pet específico
  isMatchActive?: boolean; // false quando o match foi desfeito / doação cancelada
  matchCancelledAt?: number;
  lastMessagePreview: string;
  lastMessageAt: number;
}

/** Registro oficial do Banco de Dados de Adoção (coleção 'adoptions' no Firestore) */
export type AdoptionStatus = 'pending' | 'in_review' | 'approved' | 'completed' | 'cancelled';

export interface AdoptionRecord {
  id: string;
  petId: string;
  petName: string;
  petPhoto?: string;
  petSpecies: string;
  ownerId: string;
  ownerName: string;
  adopterId: string;
  adopterName: string;
  adopterPhone?: string;
  adopterEmail?: string;
  status: AdoptionStatus;
  createdAt: number;
  updatedAt: number;
}