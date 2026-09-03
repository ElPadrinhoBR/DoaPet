# 📜 Histórico de Decisões & Changelog — DoaPet

Este registro histórico detalha a evolução do projeto DoaPet para alinhar qualquer desenvolvedor que se junte à equipe.

## [Versão 1.9.0] — Edição de Doação, Filtro Ofensivo, Denúncias, CEP Prioritário e Novo Ícone
- **Novo Ícone do Aplicativo (`assets/icon.png`, `adaptive-icon.png`):**
  - Desenvolvido ícone moderno em vetor estilizado com um cãozinho e gatinho sorrindo abraçados dentro de um coração verde esmeralda com a tipografia oficial DoaPet.
  - Configurado em `app.json` tanto para o ícone padrão quanto para o `adaptiveIcon` do Android.
- **Edição Completa de Doações (`EditPetScreen.tsx` & `pets.ts`):**
  - Permite aos tutores e ONGs editarem todas as informações de pets cadastrados (nome, fotos, espécie, raça, idade, porte, sexo, histórico médico, temperamento, CEP, bairro e contatos).
  - Acesso direto via botão `✏️ Editar` em "Meus Pets para Doação" e na tela de detalhes do pet.
- **Filtro Universal de Palavras Ofensivas e Palavrões (`src/utils/contentFilter.ts`):**
  - Sistema com normalização inteligente de caracteres e diacríticos.
  - Bloqueia envios inadequados no Chat, Cadastro de Pets, Edição de Pets e Alertas SOS Rua.
- **Central de Denúncias no Cloud Firestore (`src/services/reports.ts`):**
  - Botão de denúncia disponível para anúncios de pets e alertas SOS para usuários que não sejam os autores.
  - Grava ocorrências na coleção `denuncias` categorizadas por motivo (conteúdo ofensivo, imagem imprópria, falsidade, maus-tratos, spam ou outro).
- **Prioridade Absoluta do CEP no Mapa com GPS Opcional (`CreatePetScreen.tsx`):**
  - Botão `🎯 Usar Minha Localização Atual para Preencher CEP` descobre o CEP via GPS.
  - O sistema geocodifica o endereço do CEP informado e salva as coordenadas como posição do pet, garantindo consistência com o endereço real.
- **Ajuste de Barra de Status e Notch (`useSafeAreaInsets`):**
  - Resolvido o conflito em smartphones como Moto G23 onde relógio e bateria ficavam sobrepostos aos botões de navegação e filtros.

---

## [Versão 1.8.1] — Notificação de Desistência no Chat da Doação
- **Aviso Automático de Desistência (`src/services/chat.ts`):**
  - Ao desfazer o match (seja pelo perfil do pet ou pelas configurações), o app não apaga o histórico: envia uma mensagem automática de aviso no chat da doação: `"⚠️ AVISO: [Nome do Adotante] desfez o match e desistiu do processo de adoção deste pet."`.
  - O documento da conversa é marcado como `isMatchActive: false` no Firestore.
- **Card Visual Especial no Chat (`ChatRoomScreen.tsx`):**
  - Mensagens do sistema e avisos de desistência são destacados em um card de alerta com borda vermelha e carimbo `⚠️ AVISO DO SISTEMA`, informando claramente que o match foi desfeito e o pet continua disponível para outros adotantes.
- **Preview Atualizado:**
  - A lista de conversas exibe imediatamente o resumo atualizado informando ao doador que o interessado desistiu.

---

## [Versão 1.8.0] — Modal Detalhado do SOS com Foto Base64 e Gestão de Doação/Adoção
- **Visualização Completa do Alerta SOS (`HomeMapScreen.tsx`):**
  - Ao tocar em "Ver Alerta Completo →" no mapa, abre um modal com foto em Base64, descrição completa, dados do autor, data/hora e localização.
  - Botão interativo para traçar rotas diretamente no Google Maps/Waze e botão para compartilhar o alerta em redes sociais/WhatsApp.
- **Fotos de Alertas SOS em Base64 com Câmera e Galeria (`CreateSosAlertScreen.tsx` & `sos.ts`):**
  - Permite fotografar diretamente pela câmera ou escolher da galeria, convertendo para Base64 antes de salvar na coleção `sos_alerts`.
- **Controle para o Doador (Desistir da Doação / Marcar como Adotado):**
  - Em `PetDetailScreen.tsx` e `SettingsScreen.tsx`, o doador tem as opções de "🎉 Marcar como Adotado" (atualiza o status para `adopted`) ou "❌ Desistir / Cancelar Doação" (marca como `removed` e retira da vitrine e do mapa).
- **Controle para o Adotante (Desistir da Adoção):**
  - Em `PetDetailScreen.tsx` e `SettingsScreen.tsx`, o adotante pode cancelar seu pedido/interesse com "💔 Desistir da Adoção / Desfazer Match" (atualiza o registro em `adoptions` para `cancelled`).

---

## [Versão 1.7.1] — Armazenamento de Imagens em Base64 no Firestore
- **Fotos de Perfil em Base64 (`src/services/auth.ts`):**
  - Ao escolher ou tirar uma nova foto de perfil, a imagem é comprimida para 320x320 pixels (~25 KB) e salva diretamente no campo `photoUrl` da coleção `users` no Cloud Firestore.
  - O perfil do usuário agora persiste sua foto no banco de dados na nuvem, garantindo que qualquer aparelho que carregar a conta veja a foto de avatar imediatamente.
- **Fotos de Pets e Alertas SOS em Base64 (`src/services/pets.ts` e `src/services/sos.ts`):**
  - Todas as fotos são comprimidas (640px JPEG 55% ~40-70 KB) e salvas no Firestore como strings Base64 Data URI (`data:image/jpeg;base64,...`).
  - Elimina 100% a dependência de buckets externos de Storage, mantendo a integridade dos dados diretamente no banco.

---

## [Versão 1.7.0] — Banco de Dados Oficial de Adoções ('adoptions')
- **Nova Coleção no Cloud Firestore (`adoptions`):**
  - Criado o banco de dados oficial para gerenciar o ciclo de vida completo de adoção responsável.
  - Campos registrados: `petId`, `petName`, `petPhoto`, `petSpecies`, `ownerId`, `ownerName`, `adopterId`, `adopterName`, `adopterPhone`, `adopterEmail`, `status` ('pending' | 'in_review' | 'approved' | 'completed' | 'cancelled') e datas.
- **Serviço de Adoções (`src/services/adoptions.ts`):**
  - `registerAdoptionInterest`: grava o interesse de adoção a partir do Match (swipe direito) ou do botão no perfil do pet.
  - `updateAdoptionStatus`: permite aprovar e finalizar a adoção, marcando automaticamente o pet como `adopted` na coleção `pets`.
  - `cancelAdoption`: cancela e desfaz a solicitação quando o usuário opta por "Desfazer Match".
- **Atualização no Modo Swipe (`SwipeScreen.tsx`):**
  - Integrado `useFocusEffect` para buscar pets do banco em tempo real.
  - Removido o bloqueio rígido de raio para que pets cadastrados além de 15 km (como a gatinha *Menina*) nunca fiquem ocultos da vitrine de adoção.

---

## [Versão 1.6.2] — Sincronização em Tempo Real de Animais no Mapa
- **Auto-Zoom e Ajuste de Limites (`fitBounds`):**
  - O mapa agora calcula a extensão geográfica de todos os pets e alertas cadastrados, enquadrando automaticamente a visão para que animais fora do raio imediato (como a gatinha *Menina* a 15 km) fiquem visíveis imediatamente na tela.
- **Atualização Reativa de Foco (`useFocusEffect`):**
  - O mapa agora recarrega a lista de animais do Firestore sempre que a aba "Explorar" entra em foco, garantindo que pets recém-cadastrados apareçam na hora.
- **Diferenciação Visual de Espécies:**
  - Marcadores de gatos exibem `🐱` e cães exibem `🐶`.
- **Botão de Atalho Rápido (`🐾`):**
  - Adicionado botão de atalho para centralizar o mapa diretamente sobre os animais disponíveis para adoção.
- **Correção da Persistência no Firestore:**
  - Resolvido o erro de campos `undefined` em `createPet` que impedia o salvamento permanente no Firestore.

---

## [Versão 1.6.1] — Limpeza de Dados Operacionais
- **Limpeza do Cloud Firestore:**
  - Executada limpeza das coleções `pets`, `sos_alerts` e `chats` (incluindo subcoleções de mensagens).
  - Conta de acesso do administrador/usuário mantida intacta (`santigarudananda@gmail.com`).
- **Limpeza de Mocks em Memória (`src/services/mockData.ts` & `src/services/chat.ts`):**
  - Esvaziados os arrays de teste `MOCK_PETS`, `MOCK_SOS_ALERTS`, `MOCK_EVENTS`, `MOCK_VET_CLINICS` e `demoChats`.
  - O sistema agora opera 100% com banco de dados limpo, pronto para novos cadastros reais.

---

## [Versão 1.6.0] — Dados Reais no Mapa, Suporte por E-mail e Ciclo de Vida do SOS
- **Eliminação de Animais Fictícios (`src/services/pets.ts`):**
  - Removido fallback para dados mocados em consultas com Firebase ativo.
  - O mapa e o modo Swipe exibem estritamente animais com perfil e fotos reais salvos no banco de dados Cloud Firestore.
- **Clínicas e Hospitais Veterinários Reais do Mapa (`src/services/vets.ts`):**
  - Integração com dados geográficos do mapa (OpenStreetMap / Nominatim) para coletar clínicas, consultórios e hospitais 24h reais no raio do usuário.
- **Canal de Suporte por E-mail (`SettingsScreen.tsx`):**
  - Adicionado botão "✉️ Falar com o Suporte" na aba Perfil, abrindo o cliente de e-mail pré-preenchido para `santigarudananda@gmail.com`.
- **Ciclo de Vida e Segurança do SOS Rua (`src/services/sos.ts` & `SettingsScreen.tsx`):**
  - **Expiração Automática:** Alertas SOS agora expiram automaticamente após 7 dias (1 semana), sumindo do mapa da comunidade.
  - **Exclusão Restrita ao Autor:** Seção "Meus Alertas SOS Publicados" adicionada ao Perfil com botão `🗑️ Excluir`, permitindo que apenas o usuário que criou o alerta possa excluí-lo do banco de dados e do mapa.

---

## [Versão 1.5.0] — Apoio ao Projeto, SOS com GPS Exato e Desfazer Match
- **Aviso Quinzenal & Botão de Doação para o Projeto (`ProjectSupportModal` & `SettingsScreen`):**
  - Modal na primeira abertura e a cada 15 dias informando sobre a gratuidade do projeto e canal de contribuição para expansão do banco de dados pelo Brasil via WhatsApp (21) 98323-7279.
  - Botão e card permanente adicionado à aba Perfil (`SettingsScreen`) para contribuições voluntárias.
- **Marcação de Localização Atual no SOS Rua (`CreateSosAlertScreen`):**
  - Botão interativo para capturar o ponto GPS exato atual com alta precisão e preenchimento automático do endereço por geocodificação reversa ou CEP.
  - Gravação garantida das coordenadas no Cloud Firestore e sincronização imediata com os marcadores 🆘 do mapa comunitário.
- **Desfazer Match de Adoção (`PetDetailScreen` & `chat.ts`):**
  - Identificação de pets com match ativo no perfil do animal.
  - Botão e banner "💔 Desfazer Match" com diálogo de confirmação que remove a conversa e o interesse tanto no Firestore quanto no cache.
- **Mini-mapa com OpenStreetMap:**
  - Migração do mapa da tela de detalhes do pet (`PetDetailScreen`) para Leaflet, eliminando a tela em branco no Android/Expo Go.

---

## [Versão 1.4.0] — CEP Automático, expo-blob e Alertas Sonoros de Pets Próximos
- **Busca Automática de Endereço por CEP (`src/services/cep.ts`):**
  - Campo inteligente de CEP no formulário de doação de pet (`CreatePetScreen`).
  - Máscara dinâmica `00000-000` e consulta instantânea à API ViaCEP.
  - Preenchimento automático de bairro, cidade e estado sem necessidade de digitação manual.
- **Correção de Performance com `expo-blob`:**
  - Instalado o módulo `expo-blob` para otimização nativa de uploads binários no React Native, eliminando o aviso de lentidão do `Response.blob()`.
- **Aviso Sonoro e Tátil de Pet Próximo (`src/services/nearbyAlert.ts`):**
  - Ao carregar pets no mapa dentro do raio do usuário, emite um som suave de chime e vibração curta no celular.
  - Controle de ativação/desativação adicionado à tela de Perfil (`SettingsScreen`), persistido localmente e no Firestore.

---

## [Versão 1.3.0] — Foto de Perfil & Compressão Inteligente de Imagens
- **Foto de Perfil Dinâmica (`SettingsScreen`):**
  - Usuários podem adicionar ou trocar sua foto de perfil tirando uma foto com a câmera ou escolhendo da galeria.
  - Avatar circular estilizado com badge de câmera (`📷`) e estado de carregamento durante o upload.
- **Otimização e Compressão (`src/utils/image.ts`):**
  - Integração do `expo-image-manipulator` para redimensionamento e compressão JPEG.
  - **Fotos de Perfil:** Redimensionadas para 360x360 pixels com qualidade 60%, reduzindo o tamanho de ~5MB para apenas **~30KB** (mais de 95% de economia).
  - **Fotos de Pets:** Redimensionadas para largura máxima de 1080px com qualidade 65%, minimizando custos de armazenamento no Firebase Storage e acelerando o carregamento dos cards de adoção.
- **Persistência Completa:** Download URLs salvas no Firestore (`users/{userId}` -> `photoUrl`) e sincronizadas com o `AuthContext`.

---

## [Versão 1.2.0] — Expansão de Doação, Controles de Mapa e Documentação
- **Documentação de Engenharia:** Criada a pasta `/docs` com guias completos para Frontend e Backend (Arquitetura, Schemas, Guias de Telas, Firebase e Changelog).
- **Mapa do Explorar (`HomeMapScreen`):**
  - Adicionados botões flutuantes táteis de **Zoom In (+)** e **Zoom Out (-)**.
  - Adicionado botão de **Re-centralizar Câmera (🎯)** com fallback seguro para não travar em caso de atraso de GPS.
  - Adicionados filtros rápidos por categoria (`Todos`, `🐾 Pets`, `🆘 SOS Alertas`, `🏥 Clínicas 24h`).
  - Adicionado Card Preview inferior ao tocar em qualquer marcador no mapa.
- **Fluxo "Adotar x Doar" no Botão Central:**
  - O toque no botão central de patinha (`CentralPawButton`) agora apresenta a escolha direta entre navegar para o Tinder de Pets ou abrir o formulário de doação.
- **Formulário de Cadastro de Pet (`CreatePetScreen`):**
  - Adicionados campos diretos de contato: **WhatsApp** (com integração para conversa imediata) e **Instagram** do doador/ONG.
  - Adicionado campo de localização/bairro textual.
  - Tela de detalhes do pet atualizada com botões para iniciar conversa no WhatsApp ou abrir perfil do Instagram.

---

## [Versão 1.1.0] — Upgrade para SDK 57 & Google Sign-In Exclusivo
- **Upgrade de Plataforma:**
  - Migrado de Expo SDK 53 para **Expo SDK 57** para total compatibilidade com a versão mais recente do aplicativo **Expo Go**.
  - Atualizado React para `19.2.3`, React Native para `0.86.3` e TypeScript para `6.0.3`.
- **Autenticação Unificada com Google:**
  - Removido formulário convencional de e-mail/senha.
  - Implementado login com um toque via `useIdTokenAuthRequest` e credenciais Google.
  - Configurado Google Web Client ID no arquivo `.env`.
- **Persistência de Sessão:**
  - Resolvido o aviso do Firebase Auth integrando `initializeAuth` com `AsyncStorage`.
  - Sessão mantida mesmo após fechar ou reiniciar o app.

---

## [Versão 1.0.0] — MVP Inicial & Tinder dos Pets
- **Design System Alinhado:** Criada paleta Teal (`#0D9488`) e Âmbar (`#F59E0B`) com tipografia moderna e raio arredondado.
- **Tinder de Adoção (Swipe & Match):**
  - Implementados gestos reais de arraste com rotação e carimbos visuais (`QUERO ADOTAR 💚` e `PASSAR ✕`).
  - Tela de celebração "Deu Match! 🐾" com conexão entre adotante e animal.
- **Ficha do Adotante no Chat:**
  - O chat inicia automaticamente com um card estruturado com perfil e condições de acolhimento do adotante.
- **Módulos Comunitários:**
  - Alertas SOS Rua para resgate animal.
  - Feiras de Adoção e Campanhas de Castração.
  - Localizador de Emergência Veterinária 24h.
