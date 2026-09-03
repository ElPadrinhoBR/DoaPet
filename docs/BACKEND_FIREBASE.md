# ☁️ Guia Backend & Firebase — DoaPet

Este documento reúne todas as orientações para gerenciar, configurar e manter a infraestrutura de backend no Google Firebase.

---

## 1. Projeto Firebase Ativo

- **Nome do Projeto:** `DoaPet`
- **Project ID:** `doapet-b8a55`
- **Project Number:** `428930977134`
- **Localização recomendada do Firestore:** `southamerica-east1` (São Paulo, Brasil)

---

## 2. Autenticação (Google Sign-In Exclusivo)

O aplicativo utiliza exclusivamente o **Google Sign-In** como provedor de autenticação:
- **Fluxo:**
  1. O app invoca `useIdTokenAuthRequest` do pacote `expo-auth-session/providers/google`.
  2. O usuário seleciona sua conta Google na interface segura do navegador nativo.
  3. O Google retorna um `id_token`.
  4. O token é convertido em credencial Firebase via `GoogleAuthProvider.credential(idToken)`.
  5. O Firebase Auth autentica o usuário e grava/atualiza seu perfil no Firestore (`upsertUserProfile`).
- **Web Client ID Ativo:** `428930977134-meesjdt8gjfvihob8qug3p697bf6lmb6.apps.googleusercontent.com`
- **Persistência de Sessão:** Implementada via `initializeAuth` combinada com `getReactNativePersistence(AsyncStorage)`, garantindo que o login não expire ao reiniciar o app.

---

## 3. Armazenamento de Fotos (Cloud Storage)

- **Bucket:** `doapet-b8a55.firebasestorage.app`
- **Estrutura de Pastas:**
  - `pets/{petId}/{timestamp}_{index}.jpg` — Fotos de animais cadastrados para adoção.
  - `sos_alerts/{alertId}/{timestamp}_{index}.jpg` — Imagens de animais de rua para resgate.
  - `users/{userId}/profile/avatar.jpg` — Foto de perfil.
- **Regras:**
  - Limite de 5 MB por foto.
  - Formato estritamente imagem (`image/*`).
  - Escrita restrita ao proprietário autenticado.

---

## 4. Variáveis de Ambiente (`.env`)

```env
# Configurações do Projeto Firebase (DoaPet)
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyDLhtlUreBHjAr0tMbHMNPM8umAmxWiTPo
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=doapet-b8a55.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=doapet-b8a55
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=doapet-b8a55.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=428930977134
EXPO_PUBLIC_FIREBASE_APP_ID=1:428930977134:web:d96019bc0be7623233457f

# Google OAuth Client ID
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=428930977134-meesjdt8gjfvihob8qug3p697bf6lmb6.apps.googleusercontent.com
```

---

## 5. Camada Resiliente de Demonstração (Modo Demo Offline)

Caso o Firebase não esteja acessível ou o desenvolvedor deseje testar a interface sem conexão ativa à internet:
- O [`src/services/mockData.ts`](../src/services/mockData.ts) provê registros simulados (Luna, Thor, Mel, alertas SOS, clínicas 24h).
- Todos os serviços de dados (`pets.ts`, `sos.ts`, `events.ts`, `vets.ts`, `chat.ts`) contam com *try/catch fallbacks* automáticos para os dados locais, garantindo estabilidade e fluidez durante demonstrações e testes em campo.
