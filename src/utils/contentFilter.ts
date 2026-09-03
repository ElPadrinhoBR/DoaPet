/**
 * Filtro de Conteúdo Ofensivo — DoaPet
 *
 * Bloqueia palavrões e termos ofensivos em PT/EN antes de enviar
 * qualquer texto ao Firebase (chat, cadastro de pet, alertas SOS).
 */

const BLOCKED_TERMS: string[] = [
  // Palavrões PT
  'porra', 'merda', 'caralho', 'puta', 'viado', 'buceta', 'cacete',
  'fdp', 'filhadaputa', 'filhodaputa', 'arrombado', 'babaca', 'idiota',
  'imbecil', 'canalha', 'vagabunda', 'vagabundo', 'piranha', 'safada',
  'safado', 'desgraca', 'desgraçado', 'bosta', 'cuzao', 'vadia',
  'otario', 'corno', 'broxa', 'punheta', 'foder', 'foda', 'fodase',
  'vtnc', 'vsf', 'kct', 'pqp', 'tnc', 'vai tomar no cu',
  // Termos discriminatórios
  'macaco', 'crioulo', 'terrorista',
  // Conteúdo sexual/pornográfico
  'porno', 'sexo explicito', 'strip', 'stripper', 'xota', 'xoxota',
  // Palavrões EN
  'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'crap',
  'whore', 'slut', 'faggot', 'nigger', 'retard', 'moron',
  'porn', 'dick', 'cock', 'pussy', 'boobs',
];

/** Normaliza: minúsculas + remove acentos */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Verifica se o texto contém algum termo proibido.
 * Retorna `true` se conteúdo ofensivo for detectado.
 */
export function containsOffensiveContent(text: string): boolean {
  if (!text || !text.trim()) return false;
  const normalized = normalize(text);
  return BLOCKED_TERMS.some((term) => {
    const normTerm = normalize(term);
    if (normalized.includes(normTerm)) return true;
    if (normTerm.length >= 4) {
      try {
        const regex = new RegExp(`\\b${normTerm}\\b`, 'i');
        return regex.test(normalized);
      } catch {
        return false;
      }
    }
    return false;
  });
}

/**
 * Retorna mensagem de erro amigável para uso em Alert.
 */
export function getOffensiveContentMessage(): string {
  return 'O texto contém palavras ou expressões não permitidas.\n\nO DoaPet é um espaço seguro para os animais e para toda a comunidade. Por favor, revise o conteúdo. 🐾';
}

/**
 * Valida múltiplos campos de uma vez.
 * Retorna o nome do primeiro campo inválido, ou null se todos estão ok.
 */
export function validateFields(fields: Record<string, string>): string | null {
  for (const [fieldName, value] of Object.entries(fields)) {
    if (value && containsOffensiveContent(value)) {
      return fieldName;
    }
  }
  return null;
}
