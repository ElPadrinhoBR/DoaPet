/**
 * Serviço de Apoio Comunitário e Doações ao Projeto DoaPet
 *
 * Gerencia a exibição da mensagem de apoio:
 * - Na primeira vez que o usuário entra no app
 * - E a cada 15 dias (quinzenalmente)
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking, Alert } from 'react-native';

const LAST_PROMPT_KEY = '@doapet_last_support_prompt';
const FIFTEEN_DAYS_MS = 15 * 24 * 60 * 60 * 1000;

export const SUPPORT_WHATSAPP = '21983237279';
export const SUPPORT_PHONE_FORMATTED = '(21) 98323-7279';

export const SUPPORT_MESSAGE_TEXT =
  'Nosso projeto é gratuito, caso queira contribuir para expandir ainda mais o banco de dados por todo o Brasil entrar em contato pelo WhatsApp (21) 98323-7279.';

/** Verifica se deve exibir o modal de apoio (primeira vez ou após 15 dias) */
export async function shouldShowSupportModal(): Promise<boolean> {
  try {
    const lastPromptStr = await AsyncStorage.getItem(LAST_PROMPT_KEY);
    if (!lastPromptStr) {
      // Primeira vez no app
      return true;
    }
    const lastPromptTime = parseInt(lastPromptStr, 10);
    if (isNaN(lastPromptTime)) return true;

    return Date.now() - lastPromptTime >= FIFTEEN_DAYS_MS;
  } catch {
    return false;
  }
}

/** Registra que o aviso foi exibido na data atual */
export async function recordSupportModalShown(): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_PROMPT_KEY, Date.now().toString());
  } catch {
    // Silencioso
  }
}

/** Abre o WhatsApp direto para contato com o projeto */
export function openSupportWhatsApp(): void {
  const text = encodeURIComponent(
    'Olá! Estou usando o app DoaPet e gostaria de contribuir com o projeto para expandir o banco de dados por todo o Brasil! 🐾💛',
  );
  const url = `https://wa.me/55${SUPPORT_WHATSAPP}?text=${text}`;
  Linking.openURL(url).catch(() => {
    Alert.alert(
      'Contato do Projeto',
      `Entre em contato pelo WhatsApp: ${SUPPORT_PHONE_FORMATTED}`,
    );
  });
}
