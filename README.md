# DoaPet 🐾

O **DoaPet** é uma plataforma mobile comunitária focada na aproximação entre adotantes e doadores de animais de estimação através de geolocalização (estilo *match*), além de contar com um sistema colaborativo de alertas de resgate ("SOS Rua"), divulgação de campanhas/feiras de adoção e um localizador rápido de emergências veterinárias 24h.

---

## 🚀 Funcionalidades Principais

1. **Adoção Local por Geolocalização (Swipe):** Sistema de cards estilo Tinder para conectar adotantes e doadores em um raio personalizável (5 km a 30 km).
2. **Perfil Completo & Edição do Pet:** Ficha com fotos em Base64, histórico médico (vacinado, castrado, vermifugado), porte, personalidade e tela dedicada para edição de dados pelo tutor.
3. **Chat Integrado em Tempo Real:** Canal direto com envio automático da ficha do adotante e alertas de desistência de match.
4. **Filtro Universal de Conteúdo:** Bloqueio ativo de palavras ofensivas, termos impróprios e palavrões no chat e nos cadastros.
5. **Central de Denúncias:** Ferramenta para denunciar anúncios irregulares ou ofensivos direto no banco de dados para moderação.
6. **Alerta Comunitário "SOS Rua":** Mapeamento de animais em risco com foto Base64, GPS de alta precisão, rotas no Google Maps/Waze e botão de compartilhamento.
7. **Localização por CEP com GPS Opcional:** O CEP é a autoridade máxima no mapa; botão interativo preenche o CEP via GPS.
8. **Feiras e Campanhas:** Agenda e mapa interativo com eventos de adoção organizados por ONGs e protetores.
9. **Emergência Veterinária (SOS Vet):** Clínicas e hospitais 24h reais próximos com rota e discagem direta.
10. **Ajuste de Tela Safe Area:** Totalmente compatível com telas modernas, notch e barras de status (ex: Moto G23).

---

## 🛠️ Tecnologias Utilizadas (Stack Tecnológica)

Para manter o projeto **100% gratuito** na fase de MVP e desenvolvimento, a seguinte stack foi escolhida:

* **Framework Mobile:** **React Native (com Expo)**
  * *Por quê?* Permite desenvolver para Android e iOS simultaneamente usando JavaScript/TypeScript, com suporte excelente a geolocalização e mapas na camada gratuita.
* **Linguagem:** **TypeScript**
  * *Por quê?* Garante tipagem estática, escalabilidade e menos bugs durante o desenvolvimento.
* **Backend & Banco de Dados:** **Firebase (Google Cloud)**
  * **Firebase Authentication:** Sistema de login seguro por E-mail/Senha e login social (Google).
  * **Cloud Firestore:** Banco de dados NoSQL em tempo real para armazenar perfis de pets, chats, alertas de rua e clínicas.
  * **Firebase Storage:** Armazenamento otimizado de imagens e fotos dos animais.
  * **Firebase Cloud Messaging (FCM):** Envio de notificações push para novos pets na redondeza e alertas SOS.
* **Mapas e Geolocalização:** **React Native Maps** / **Leaflet / OpenStreetMap** (integrado via API gratuita).
* **Design e Prototipagem:** **Figma**.

---

## 📱 Arquitetura de Telas

- **Splash Screen:** Carregamento inicial com cache local de sessão.
- **Autenticação:** Telas de Login, Cadastro e Recuperação de Senha.
- **Home / Mapa Principal:** Visão geográfica com marcadores de pets, alertas SOS e clínicas veterinárias, além do acesso rápido ao botão de "Emergência Vet".
- **Modo Swipe (Adoção):** Interface de cartões para curtir ou passar os pets disponíveis no raio escolhido.
- **Tela de Cadastro de Pet / Alerta:** Formulários dinâmicos com upload de fotos e marcação de localização.
- **Chat:** Lista de conversas ativas e tela de mensagens em tempo real.
- **Configurações:** Ajuste de raio de busca, notificações push, dados de perfil e termos de uso.

---

## 💡 Custos e Publicação na Play Store

* **Custo de Servidores/Backend:** R$ 0,00 (utilizando os planos gratuitos (*Free Tiers*) do Firebase).
* **Google Play Console:** Taxa única de **US$ 25** para criação da conta de desenvolvedor (permite publicar múltiplos aplicativos de forma ilimitada).

---

## 🚀 Como Executar o Projeto (Ambiente de Desenvolvimento)

### Pré-requisitos
* Node.js instalado (versão LTS recomendada)
* Gerenciador de pacotes npm ou yarn
* Expo Go instalado no seu celular (para testes rápidos) ou Android Studio / Xcode configurados.

### Passos para Instalação

1. Clone o repositório:
   ```bash
   git clone https://github.com/seu-usuario/doapet.git
   cd doapet
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Configure as credenciais do Firebase:
   * Crie um projeto no [Firebase Console](https://console.firebase.google.com/).
   * Ative o Authentication (Google / E-mail) e o Firestore Database.
   * Copie `.env.example` para `.env` e preencha com as credenciais do seu projeto Firebase:
     ```bash
     cp .env.example .env
     ```
   * Aplique as regras de segurança de [`firestore.rules`](firestore.rules) e [`storage.rules`](storage.rules) no console.

4. Inicie o projeto com o Expo:
   ```bash
   npx expo start
   ```

5. Escaneie o QR Code exibido no terminal usando o aplicativo **Expo Go** no seu celular ou execute em um emulador.

---

## 📁 Estrutura do Projeto

```text
doapet/
├── App.tsx                      # Componente raiz (SafeAreaProvider + AuthProvider + Navegação)
├── index.ts                     # Entry point do Expo (registerRootComponent)
├── app.json                     # Configuração do Expo (permissões de localização/fotos, bundle IDs)
├── babel.config.js              # Configuração do Babel
├── tsconfig.json                # TypeScript estrito + alias "@/ -> src/"
├── package.json                 # Dependências e scripts (start/android/ios/typecheck)
├── .env.example                 # Modelo das credenciais Firebase (copie para .env)
├── firestore.rules              # Regras de segurança do Firestore
├── storage.rules                # Regras de segurança do Storage
│
└── src/
    ├── components/              # Componentes reutilizáveis
    │   ├── Button.tsx           #   Botão (primary/secondary/danger)
    │   ├── Input.tsx            #   Campo de texto com label
    │   └── PetCard.tsx          #   Card de pet com foto, badges médicos e distância
    │
    ├── config/                  # (configurações centralizadas, se necessário)
    │
    ├── context/
    │   └── AuthContext.tsx      # Sessão global: onAuthStateChanged + perfil do usuário
    │
    ├── hooks/
    │   └── useLocation.ts       # Permissões e posição atual via expo-location
    │
    ├── navigation/
    │   ├── index.tsx            # Stack raiz: fluxo auth <-> app principal
    │   └── types.ts             # Tipos das rotas (RootStackParamList, MainTabParamList)
    │
    ├── screens/
    │   ├── auth/                # Splash, Login, Cadastro (pessoa/ONG), Recuperar senha
    │   ├── home/
    │   │   └── HomeMapScreen.tsx        # Mapa principal: pets 🐾, SOS 🆘, clínicas 🏥 + FABs
    │   ├── swipe/
    │   │   └── SwipeScreen.tsx          # Modo Adoção: cards por raio (5–30 km), curtir/passer
    │   ├── pets/
    │   │   ├── PetDetailScreen.tsx      # Perfil completo do pet (fotos, histórico médico)
    │   │   └── CreatePetScreen.tsx      # Cadastro de pet: fotos, porte, médico, localização
    │   ├── sos/
    │   │   └── CreateSosAlertScreen.tsx # Alerta "SOS Rua" com foto e geolocalização
    │   ├── events/
    │   │   └── EventsScreen.tsx         # Agenda de feiras/campanhas + rota no mapa
    │   ├── chat/
    │   │   ├── ChatsScreen.tsx          # Lista de conversas em tempo real
    │   │   └── ChatRoomScreen.tsx       # Mensagens em tempo real (doador ↔ adotante)
    │   └── settings/
    │       └── SettingsScreen.tsx       # Raio de busca, notificações, perfil, termos, logout
    │
    ├── services/                # Camada de dados (Firebase)
    │   ├── firebase.ts          #   Inicialização (Auth/Firestore/Storage) via variáveis EXPO_PUBLIC_*
    │   ├── auth.ts              #   Login/cadastro/recuperação/perfil
    │   ├── pets.ts              #   CRUD de pets + upload de fotos
    │   ├── sos.ts               #   Alertas comunitários SOS Rua
    │   ├── events.ts            #   Feiras e campanhas
    │   ├── vets.ts              #   Clínicas 24h ordenadas por distância (Haversine)
    │   └── chat.ts              #   Conversas e mensagens em tempo real
    │
    ├── theme/
    │   └── index.ts             # Cores, espaçamentos, raios e tamanhos de fonte
    ├── types/
    │   └── index.ts             # Modelos: Pet, SosAlert, Event, VetClinic, Chat, UserProfile...
    └── utils/
        ├── geo.ts               # Haversine e limites de raio (5–30 km)
        └── format.ts            # Formatação de idade, distância e datas
```

### Coleções do Firestore

| Coleção | Descrição |
|---|---|
| `users` | Perfis (`role`: `user` ou `ong` — ONGs recebem selo verificado) |
| `pets` | Pets para adoção (status `available`/`adopted`) |
| `sos_alerts` | Alertas comunitários "SOS Rua" (`open`/`rescuing`/`resolved`) |
| `events` | Feiras, campanhas e mutirões |
| `vet_clinics` | Catálogo de clínicas veterinárias 24h |
| `chats/{id}/messages` | Mensagens das conversas |

> 💡 As regras prontas estão em [`firestore.rules`](firestore.rules) e [`storage.rules`](storage.rules).

---

## 📄 Licença
Este projeto é de código aberto desenvolvido com fins comunitários e sociais.
---

## 📄 Licença
Este projeto é de código aberto desenvolvido com fins comunitários e sociais.
