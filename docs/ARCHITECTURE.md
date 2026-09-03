# 🏛️ Arquitetura do Sistema — DoaPet

Este documento descreve a arquitetura de software, componentes estruturais, gerenciamento de estado e fluxo de dados do DoaPet.

---

## 1. Stack Tecnológica

| Camada | Tecnologia | Versão | Função |
|---|---|---|---|
| **Plataforma Mobile** | Expo | SDK 57 (~57.0.0) | Runtime multiplataforma (Android & iOS) |
| **Framework UI** | React Native | 0.86.3 | Componentes nativos de alto desempenho |
| **Core de Renderização**| React | 19.2.3 | Estado reativo, hooks modernos |
| **Linguagem** | TypeScript | ~6.0.3 | Tipagem estática rigorosa em todo o código |
| **Navegação** | React Navigation | v7 | Stack Navigation + Bottom Tabs Navigation |
| **Geolocalização/Mapas**| `react-native-maps` + `expo-location` | 1.27.2 / 18.1.5 | Renderização de mapas, GPS e raio de busca |
| **Autenticação** | Firebase Auth (E-mail/Senha & Google) | 11.10.0 | Login direto por E-mail/Senha, recuperação e Google OAuth |
| **Persistência Local** | `@react-native-async-storage/async-storage` | 2.2.0 | Cache de credenciais e persistência de sessão |
| **Backend & Nuvem** | Google Firebase (Firestore, Storage) | 11.10.0 | Banco NoSQL em tempo real e armazenamento de fotos |

---

## 2. Estrutura de Diretórios

```
DoaPet/
├── docs/                      # Documentação técnica completa
│   ├── README.md
│   ├── ARCHITECTURE.md
│   ├── DATABASE_SCHEMA.md
│   ├── FRONTEND_GUIDE.md
│   ├── BACKEND_FIREBASE.md
│   └── CHANGELOG_HISTORY.md
├── src/
│   ├── components/            # Componentes reutilizáveis (Button, Input, PetCard, etc.)
│   ├── context/               # Contextos React (AuthContext)
│   ├── hooks/                 # Custom hooks (useLocation)
│   ├── navigation/            # Configuração do React Navigation v7
│   │   ├── index.tsx          # RootNavigator e MainTabNavigator
│   │   └── types.ts           # Tipagem das rotas (RootStackParamList, etc.)
│   ├── screens/               # Telas do aplicativo
│   │   ├── auth/              # Login com Google
│   │   ├── home/              # Mapa Explorar interativo
│   │   ├── swipe/             # Tinder de Adoção (Swipe & Match)
│   │   ├── pets/              # Detalhes e Cadastro de Doação de Pets
│   │   ├── chat/              # Lista de Conversas e Chat com Ficha do Adotante
│   │   ├── sos/               # Alertas comunitários SOS Rua
│   │   ├── events/            # Feiras e Campanhas de Adoção
│   │   └── settings/          # Perfil do tutor/ONG e configurações
│   ├── services/              # Integrações externas e chamadas de API
│   │   ├── firebase.ts        # Inicialização do Firebase e Auth AsyncStorage
│   │   ├── auth.ts            # Fluxo Google OAuth e perfil Firestore
│   │   ├── pets.ts            # CRUD de pets e upload de fotos
│   │   ├── sos.ts             # Alertas comunitários
│   │   ├── events.ts          # Feiras e campanhas
│   │   ├── vets.ts            # Clínicas 24h e cálculo de distância
│   │   ├── chat.ts            # Mensagens em tempo real e Match
│   │   └── mockData.ts        # Dados offline de contingência / Modo Demo
│   ├── theme/                 # Paleta de cores, tipografia, raios e espaçamentos
│   └── types/                 # Definições TypeScript das entidades de domínio
├── .env                       # Variáveis de ambiente (chaves públicas do Firebase e Google)
├── app.json                   # Configurações do Expo (permissões, schemes, plugins)
├── firestore.rules            # Regras de segurança do Cloud Firestore
└── storage.rules              # Regras de segurança do Cloud Storage
```

---

## 3. Gerenciamento de Estado & Ciclo de Autenticação

A autenticação é gerida centralizadamente pelo [`AuthContext`](../src/context/AuthContext.tsx):
- O `onAuthStateChanged` do Firebase monitora a sessão nativa do usuário.
- Se o usuário estiver autenticado, seu perfil completo é lido da coleção `users` no Firestore.
- Quando o usuário faz login pela primeira vez com o Google, o método `upsertUserProfile` cria o documento no Firestore com o nome, email e foto fornecidos pela conta Google.
- Caso o usuário utilize o botão de **Modo Demonstração**, um perfil em memória (`MOCK_USER`) é assumido para permitir exploração imediata sem exigir conta ativa.
