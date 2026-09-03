# 🗄️ Modelagem de Dados & Schema Firestore — DoaPet

O DoaPet utiliza o **Google Cloud Firestore**, um banco NoSQL em tempo real orientado a documentos e coleções.

---

## 1. Coleções Principais

### `users` (Perfis de Usuários e ONGs)
Armazena as informações públicas e de contato de quem doa ou adota.
- **Caminho:** `users/{userId}` (o `userId` corresponde ao `uid` do Firebase Auth).

```typescript
interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  photoUrl?: string | null;
  role: 'user' | 'ong';
  organizationName?: string;       // Obrigatório se role === 'ong'
  searchRadiusKm: number;          // Padrão: 10km (configurável de 5 a 30km)
  pushNotificationsEnabled: boolean;
  createdAt: Timestamp;
}
```

---

### `pets` (Animais Disponíveis para Adoção)
Armazena a ficha completa de cada animal colocado para adoção.
- **Caminho:** `pets/{petId}`

```typescript
interface Pet {
  id: string;
  ownerId: string;                 // UID de quem publicou o pet
  ownerName: string;               // Nome da pessoa ou da ONG
  ownerRole: 'user' | 'ong';
  name: string;                    // Nome do pet (ex: "Luna")
  species: string;                 // 'cachorro', 'gato', 'outro'
  breed?: string;                  // Raça ou "SRD / Sem Raça Definida"
  ageMonths: number;               // Idade em meses (convertível em anos na UI)
  size: 'pequeno' | 'medio' | 'grande';
  gender: 'macho' | 'femea';
  personality: string[];           // Ex: ['dócil', 'brincalhão', 'sociável']
  description: string;             // História e temperamento do pet
  medical: {
    vaccinated: boolean;
    neutered: boolean;
    dewormed: boolean;
  };
  photos: string[];                // URLs de download do Firebase Storage
  location: {
    latitude: number;
    longitude: number;
  };
  locationHint?: string;           // Bairro ou Cidade textual (ex: "Copacabana, RJ")
  whatsapp?: string;               // Número de WhatsApp direto para contato
  instagram?: string;              // Perfil do Instagram (ex: "@ongpatasamigas")
  status: 'available' | 'adopted' | 'removed';
  createdAt: number;               // Epoch timestamp ou Timestamp
}
```

---

### `adoptions` (Processos e Histórico de Adoção)
Armazena o registro formal de interesse, aprovação e conclusão da adoção responsável.
- **Caminho:** `adoptions/{adoptionId}`

```typescript
interface AdoptionRecord {
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
  status: 'pending' | 'in_review' | 'approved' | 'completed' | 'cancelled';
  createdAt: number;
  updatedAt: number;
}
```

---

### `sos_alerts` (Alertas Comunitários SOS Rua)
Animais perdidos, machucados ou abandonados na rua necessitando de resgate imediato.
- **Caminho:** `sos_alerts/{alertId}`

```typescript
interface SosAlert {
  id: string;
  authorId: string;
  authorName: string;
  description: string;
  photos: string[];
  location: {
    latitude: number;
    longitude: number;
  };
  addressHint?: string;            // Ponto de referência (ex: "Em frente ao posto Shell")
  status: 'open' | 'rescuing' | 'resolved';
  createdAt: number;
}
```

---

### `events` (Feiras e Campanhas de Adoção)
Divulgação de eventos presenciais de ONGs e abrigos.
- **Caminho:** `events/{eventId}`

```typescript
interface AdoptionEvent {
  id: string;
  organizerId: string;
  organizerName: string;
  title: string;
  description: string;
  location: {
    latitude: number;
    longitude: number;
  };
  address: string;
  startsAt: number;
  endsAt: number;
  coverImage?: string;
}
```

---

### `vet_clinics` (Catálogo de Clínicas Veterinárias 24h)
Locais de atendimento emergencial próximo ao tutor.
- **Caminho:** `vet_clinics/{clinicId}`

```typescript
interface VetClinic {
  id: string;
  name: string;
  address: string;
  phone: string;
  isOpen24h: boolean;
  location: {
    latitude: number;
    longitude: number;
  };
}
```

---

### `chats` & `messages` (Conversas em Tempo Real & Match)
Conexões geradas a partir do swipe ("Deu Match!").
- **Caminho:** `chats/{chatId}`
- **Subcoleção:** `chats/{chatId}/messages/{messageId}`

```typescript
interface Chat {
  id: string;
  participants: string[];          // Array com os UIDs do adotante e do doador
  petId?: string;                  // ID do pet relacionado ao match
  lastMessagePreview: string;
  lastMessageAt: number;
}

interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  text: string;                    // Suporta mensagens comuns ou a Ficha do Adotante
  sentAt: number;
}
```

---

### `denuncias` (Moderação e Denúncias de Anúncios)
Registros de denúncias de conteúdo impróprio, ofensivo ou irregular feitas pela comunidade.
- **Caminho:** `denuncias/{denunciaId}`

```typescript
interface ReportRecord {
  id: string;
  targetId: string;                // ID do pet ou do alerta SOS denunciado
  targetType: 'pet' | 'sos_alert';
  targetTitle: string;             // Nome do pet ou resumo do alerta
  reporterId: string;              // UID de quem fez a denúncia
  reporterName: string;            // Nome de quem fez a denúncia
  reason:                          // Motivo selecionado
    | 'conteudo_ofensivo'
    | 'imagem_inapropriada'
    | 'informacoes_falsas'
    | 'spam'
    | 'crueldade_animal'
    | 'outro';
  details?: string;                // Detalhes opcionais
  status: 'pending' | 'reviewed' | 'dismissed';
  createdAt: Timestamp;
}
```

---

## 2. Regras de Segurança (`firestore.rules`)

- **`users`:** Apenas o próprio usuário autenticado pode alterar seu perfil (`request.auth.uid == userId`).
- **`pets`:** Leitura pública para autenticados; criação, edição e exclusão permitidas apenas ao doador dono (`request.auth.uid == resource.data.ownerId`).
- **`chats` & `messages`:** Leitura e envio de mensagens permitidos exclusivamente para os dois participantes da conversa (`request.auth.uid in resource.data.participants`).
- **`vet_clinics`:** Leitura aberta a todos; escrita restrita a administradores.
