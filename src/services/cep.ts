/**
 * Serviço de Busca de Endereço por CEP (ViaCEP)
 *
 * Preenchimento automático de logradouro, bairro, cidade e estado
 * a partir do CEP brasileiro (8 dígitos).
 */

export interface CepResult {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string; // Cidade
  uf: string;
  formattedAddress: string;
  erro?: boolean;
}

/** Formata o texto como CEP (ex: 01001-000) */
export function formatCep(text: string): string {
  const digits = text.replace(/\D/g, '').slice(0, 8);
  if (digits.length > 5) {
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  }
  return digits;
}

/** Busca os dados do endereço na API ViaCEP */
export async function fetchAddressByCep(cep: string): Promise<CepResult | null> {
  const clean = cep.replace(/\D/g, '');
  if (clean.length !== 8) {
    return null;
  }

  try {
    const response = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
    if (!response.ok) return null;

    const data: CepResult = await response.json();
    if (data.erro) {
      return null;
    }

    const parts = [data.bairro, `${data.localidade} - ${data.uf}`].filter(Boolean);
    data.formattedAddress = parts.join(', ');

    return data;
  } catch {
    return null;
  }
}
