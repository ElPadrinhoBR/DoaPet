/**
 * Utilitários de formatação
 */

/** Converte idade em meses para texto amigável (ex.: "3 meses", "2 anos") */
export function formatPetAge(ageMonths: number): string {
  if (ageMonths < 12) {
    return ageMonths === 1 ? '1 mês' : `${ageMonths} meses`;
  }
  const years = Math.floor(ageMonths / 12);
  const months = ageMonths % 12;
  const yearsLabel = years === 1 ? '1 ano' : `${years} anos`;
  if (months === 0) return yearsLabel;
  const monthsLabel = months === 1 ? '1 mês' : `${months} meses`;
  return `${yearsLabel} e ${monthsLabel}`;
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

export function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}