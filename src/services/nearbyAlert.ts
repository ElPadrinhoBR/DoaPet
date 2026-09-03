/**
 * Serviço de Alerta Sonoro e Notificação de Pets Próximos
 *
 * Reproduz aviso sonoro rápido e vibração quando um pet disponível
 * para doação é detectado dentro do raio de busca do usuário.
 * Totalmente compatível com Expo SDK 57 (expo-audio + Vibration nativa).
 */
import { Vibration } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAudioPlayer } from 'expo-audio';

const SOUND_SETTINGS_KEY = '@doapet_sound_alerts_enabled';

// Som de notificação curto e amigável (chime suave de sino)
const NOTIFICATION_SOUND_URL =
  'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

let lastAlertedPetId: string | null = null;
let lastAlertTimestamp = 0;

/** Verifica se os alertas sonoros estão ativados */
export async function isSoundAlertEnabled(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(SOUND_SETTINGS_KEY);
    return value !== null ? value === 'true' : true; // Padrão: ativado
  } catch {
    return true;
  }
}

/** Ativa ou desativa os alertas sonoros */
export async function setSoundAlertEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(SOUND_SETTINGS_KEY, enabled ? 'true' : 'false');
  } catch {
    // Silencioso
  }
}

/**
 * Toca aviso sonoro rápido e vibra o aparelho ao detectar pet próximo.
 * Inclui debounce para evitar repetições indesejadas (mínimo 30 segundos entre alertas).
 */
export async function triggerNearbyPetAlert(petId: string, _petName?: string): Promise<boolean> {
  const now = Date.now();
  if (lastAlertedPetId === petId && now - lastAlertTimestamp < 30000) {
    return false;
  }

  const soundActive = await isSoundAlertEnabled();
  if (!soundActive) {
    return false;
  }

  lastAlertedPetId = petId;
  lastAlertTimestamp = now;

  // 1. Vibração tátil no aparelho (120ms vibra, 80ms pausa, 120ms vibra)
  try {
    Vibration.vibrate([0, 120, 80, 120]);
  } catch {
    // Ignora em plataformas sem suporte
  }

  // 2. Reprodução de áudio rápido via expo-audio (SDK 57)
  try {
    const player = createAudioPlayer(NOTIFICATION_SOUND_URL);
    player.play();
    return true;
  } catch {
    // Silencioso caso dispositivo esteja mudo ou sem rede de áudio
    return false;
  }
}
