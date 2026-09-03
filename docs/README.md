# 🐾 DoaPet — Documentação Oficial do Projeto

Bem-vindo à documentação técnica do **DoaPet**, a plataforma filantrópica mobile para doação de animais, adoção responsável (estilo Tinder de pets), alertas comunitários SOS Rua e assistência emergencial para tutores e ONGs.

---

## 📚 Estrutura da Documentação

Esta pasta reúne todos os manuais técnicos para desenvolvedores **Frontend** e **Backend**:

1. [**Arquitetura do Sistema (`ARCHITECTURE.md`)**](./ARCHITECTURE.md)
   - Visão geral da stack (Expo SDK 57, React Native 0.86, React 19, TypeScript).
   - Estrutura de pastas e padrões de código.
   - Gerenciamento de estado e ciclo de vida da autenticação.

2. [**Banco de Dados & Schema Firestore (`DATABASE_SCHEMA.md`)**](./DATABASE_SCHEMA.md)
   - Modelagem de dados de todas as coleções (`users`, `pets`, `sos_alerts`, `events`, `vet_clinics`, `chats`, `messages`).
   - Regras de segurança (`firestore.rules` e `storage.rules`).
   - Estrutura de subcoleções e índices recomendados.

3. [**Guia de Desenvolvimento Frontend (`FRONTEND_GUIDE.md`)**](./FRONTEND_GUIDE.md)
   - Navegação (Abas inferiores com botão de Patinha Central elevado e pilhas de navegação).
   - Sistema de Design & Tokens (`src/theme`).
   - Mecânica de Swipe tátil com `PanResponder` e celebração de "Deu Match!".
   - Mapa interativo com zoom, busca local e marcadores customizados.

4. [**Guia Backend & Firebase (`BACKEND_FIREBASE.md`)**](./BACKEND_FIREBASE.md)
   - Projeto Firebase (`doapet-b8a55`).
   - Autenticação exclusiva com Google Sign-In via `expo-auth-session` e ID Tokens.
   - Persistência com `initializeAuth` e `AsyncStorage`.
   - Upload de imagens para o Cloud Storage.
   - Camada resiliente de Modo Demonstração (Mock Store) para testes offline.

5. [**Histórico de Decisões & Changelog (`CHANGELOG_HISTORY.md`)**](./CHANGELOG_HISTORY.md)
   - Linha do tempo das decisões arquiteturais tomadas.
   - Upgrade de SDK 53 para SDK 57.
   - Migração para Google Sign-In único.
   - Criação da Ficha do Adotante e formulário com WhatsApp/Instagram.

---

## ⚡ Início Rápido (Quick Start)

### Pré-requisitos
- Node.js 18+ ou 20+ instalado
- Celular com o aplicativo **Expo Go** instalado (SDK 57)

### Instalação e Execução
```bash
# 1. Clonar ou abrir o diretório do projeto
cd c:\PROJETOS\DoaPet

# 2. Assegurar que as dependências estão instaladas
npm install

# 3. Iniciar o bundler Metro
npx expo start
```
Escaneie o QR Code exibido no terminal com a câmera do celular (iOS) ou pelo app Expo Go (Android).
