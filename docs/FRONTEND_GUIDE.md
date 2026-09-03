# 🎨 Guia de Desenvolvimento Frontend — DoaPet

Este documento orienta os desenvolvedores sobre a interface, fluxos visuais, componentes e tokens de estilo do DoaPet.

---

## 1. Design System & Tokens (`src/theme/index.ts`)

A identidade visual do DoaPet é baseada na paleta Teal (Verde Petróleo) e Amber (Âmbar Acolhedor):

```typescript
export const colors = {
  // Cores Principais
  primary: '#0D9488',          // Teal vibrante para botões e destaque
  primaryDark: '#115E59',      // Títulos e cabeçalhos
  primaryLight: '#CCFBF1',     // Badges, chips e fundos de destaque
  accent: '#F59E0B',           // Âmbar para alertas e destaques amigáveis
  
  // Status Funcionais
  sos: '#EF4444',              // Vermelho para SOS Rua e emergências
  vet: '#0284C7',              // Azul hospitalar para Clínicas 24h
  adopted: '#10B981',          // Verde sucesso para adoções concluídas
  
  // Neutros
  background: '#F8FAFC',       // Fundo limpo suave
  surface: '#FFFFFF',          // Cards e modais
  border: '#E2E8F0',           // Linhas divisórias
  text: '#0F172A',             // Tipografia primária
  textSecondary: '#64748B',    // Subtítulos e metadados
};
```

---

## 2. Navegação em Abas & Botão Central de Patinha

A navegação principal ocorre no arquivo [`src/navigation/index.tsx`](../src/navigation/index.tsx):
- **Aba 1 (Explorar):** Mapa interativo com zoom (+/-), centralização e marcadores de pets/alertas/clínicas.
- **Aba 2 (Conversas):** Chats ativos com doadores e adotantes.
- **Aba Central Elevada (🐾 Adoção & Doação):**
  - Botão circular elevado com a patinha (`CentralPawButton`).
  - Ao tocar, exibe o modal interativo com opções de **"Quero Adotar"** (leva ao Tinder de Pets) e **"Quero Doar"** (abre formulário de cadastro).
- **Aba 4 (Eventos):** Calendário de feiras de adoção e mutirões de castração.
- **Aba 5 (Perfil):** Configurações do usuário, raio de busca e status.

---

## 3. Tinder dos Pets (Swipe & Match)

Localizado em [`src/screens/swipe/SwipeScreen.tsx`](../src/screens/swipe/SwipeScreen.tsx):
- Utiliza a API nativa `PanResponder` e `Animated.ValueXY` para garantir **60-120 FPS** sem travamentos.
- **Carimbos visuais:**
  - Deslocamento para a direita (`dx > 0`): surge o selo verde **QUERO ADOTAR 💚**.
  - Deslocamento para a esquerda (`dx < 0`): surge o selo vermelho **PASSAR ✕**.
- **Rotação:** O card se inclina de -15° a +15° proporcionalmente ao arraste.
- **Match:** Ao atingir o limiar direito ou tocar no botão de coração 💚, o modal de match é acionado, enviando automaticamente a **Ficha do Adotante** e abrindo o chat correspondente.

---

## 4. Mapa Interativo (Explorar)

Localizado em [`src/screens/home/HomeMapScreen.tsx`](../src/screens/home/HomeMapScreen.tsx):
- **Controles de Câmera:**
  - Botões flutuantes `+` (aproximação) e `-` (afastamento) com animação suave via `mapRef.current.animateCamera`.
  - Botão de centralizar `🎯` para focar imediatamente na localização do usuário.
- **Filtros de Camada:** Permite filtrar instantaneamente entre `Todos`, `🐾 Pets`, `🆘 SOS Alertas` e `🏥 Clínicas 24h`.
- **Card Preview:** Ao tocar em qualquer marcador, um card suspenso no rodapé exibe foto, nome, distância calculada e botão de ação direta.
