/**
 * Utilitário de Compressão e Conversão de Imagens para Base64
 *
 * Comprime e converte fotos diretamente para strings Base64 (Data URI)
 * para armazenamento seguro e autônomo dentro dos documentos do Cloud Firestore,
 * eliminando dependência de buckets externos de Storage.
 */
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

/**
 * Converte qualquer URI de imagem para string Base64 com redimensionamento e compressão
 */
export async function imageUriToBase64(
  uri: string,
  maxWidth: number = 720,
  compress: number = 0.6,
): Promise<string> {
  // Se já for uma string base64, retorna diretamente
  if (uri.startsWith('data:image/')) {
    return uri;
  }

  try {
    const result = await manipulateAsync(
      uri,
      [{ resize: { width: maxWidth } }],
      {
        compress,
        format: SaveFormat.JPEG,
        base64: true,
      },
    );

    if (result.base64) {
      return `data:image/jpeg;base64,${result.base64}`;
    }
    return result.uri;
  } catch {
    return uri;
  }
}

/**
 * Converte e comprime foto de perfil/avatar para Base64 (~20 a 35 KB).
 * Redimensiona para 320x320 pixels com compressão JPEG 55%.
 */
export async function profileImageToBase64(uri: string): Promise<string> {
  return imageUriToBase64(uri, 320, 0.55);
}

/**
 * Converte e comprime fotos de pets para adoção e alertas SOS para Base64 (~40 a 70 KB).
 * Redimensiona para 640px de largura com compressão JPEG 55%.
 */
export async function petImageToBase64(uri: string): Promise<string> {
  return imageUriToBase64(uri, 640, 0.55);
}

/**
 * Mantido para retrocompatibilidade
 */
export async function compressProfileImage(uri: string): Promise<string> {
  return profileImageToBase64(uri);
}

export async function compressPetImage(uri: string): Promise<string> {
  return petImageToBase64(uri);
}

export function uriToBlob(uri: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => {
      resolve(xhr.response as Blob);
    };
    xhr.onerror = () => {
      reject(new TypeError('Falha ao processar imagem para envio.'));
    };
    xhr.responseType = 'blob';
    xhr.open('GET', uri, true);
    xhr.send(null);
  });
}
