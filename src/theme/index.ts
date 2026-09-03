/**
 * Tema visual do DoaPet — Alinhado com a Arte Conceitual (Teal & Âmbar)
 */
export const colors = {
  primary: '#0D9488', // Teal vibrante (marca principal)
  primaryDark: '#0F766E',
  primaryLight: '#CCFBF1',
  primarySoft: '#E6FFFA',
  accent: '#F59E0B', // Âmbar / Laranja (destaques, Agendar Visita, likes)
  accentDark: '#D97706',
  accentLight: '#FEF3C7',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  text: '#1E293B',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  error: '#EF4444',
  sos: '#E11D48', // Alertas SOS Rua
  vet: '#0284C7', // Clínicas e emergência veterinária
  border: '#E2E8F0',
  white: '#FFFFFF',
  cardBg: '#FFFFFF',
  badgeBg: '#F1F5F9',
  success: '#10B981',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  round: 999,
} as const;

export const fontSizes = {
  xs: 11,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 20,
  title: 24,
  hero: 28,
} as const;