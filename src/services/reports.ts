/**
 * Serviço de Denúncias — DoaPet
 *
 * Registra denúncias de conteúdo ofensivo/impróprio na coleção
 * 'denuncias' do Cloud Firestore para moderação posterior.
 */
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';

export type ReportTargetType = 'pet' | 'sos_alert';
export type ReportStatus = 'pending' | 'reviewed' | 'dismissed';

export type ReportReason =
  | 'conteudo_ofensivo'
  | 'imagem_inapropriada'
  | 'informacoes_falsas'
  | 'spam'
  | 'crueldade_animal'
  | 'outro';

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  conteudo_ofensivo: '🤬 Conteúdo ofensivo ou linguagem de ódio',
  imagem_inapropriada: '🔞 Imagem inapropriada ou pornográfica',
  informacoes_falsas: '❌ Informações falsas ou enganosas',
  spam: '📢 Spam ou anúncio duplicado',
  crueldade_animal: '🐾 Indício de maus-tratos ao animal',
  outro: '📝 Outro motivo',
};

export interface CreateReportInput {
  targetId: string;
  targetType: ReportTargetType;
  targetTitle: string;    // nome do pet ou "Alerta SOS"
  reporterId: string;     // uid de quem denunciou
  reporterName: string;
  reason: ReportReason;
  details?: string;       // texto livre opcional
}

/**
 * Registra uma denúncia no Firestore (coleção 'denuncias').
 */
export async function submitReport(input: CreateReportInput): Promise<void> {
  if (!isFirebaseConfigured) {
    console.warn('[DoaPet] Firebase não configurado — denúncia não enviada.');
    return;
  }

  const payload: Record<string, unknown> = {
    targetId: input.targetId,
    targetType: input.targetType,
    targetTitle: input.targetTitle,
    reporterId: input.reporterId,
    reporterName: input.reporterName,
    reason: input.reason,
    status: 'pending' as ReportStatus,
    createdAt: serverTimestamp(),
  };

  if (input.details?.trim()) {
    payload['details'] = input.details.trim();
  }

  await addDoc(collection(db, 'denuncias'), payload);
}

/**
 * Verifica se o usuário já denunciou este conteúdo (evita spam de denúncias).
 */
export async function hasAlreadyReported(
  reporterId: string,
  targetId: string,
): Promise<boolean> {
  if (!isFirebaseConfigured) return false;
  try {
    const snap = await getDocs(
      query(
        collection(db, 'denuncias'),
        where('reporterId', '==', reporterId),
        where('targetId', '==', targetId),
      ),
    );
    return !snap.empty;
  } catch {
    return false;
  }
}
