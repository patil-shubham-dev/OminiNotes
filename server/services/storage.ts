export interface StorageResult {
  key: string;
  url: string;
  size: number;
}

export async function uploadFile(
  buffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<StorageResult> {
  const key = `documents/${Date.now()}-${fileName}`;
  return {
    key,
    url: `/storage/${key}`,
    size: buffer.length,
  };
}

export async function deleteFile(key: string): Promise<boolean> {
  console.log(`Deleting file: ${key}`);
  return true;
}

export function generateSignedUrl(key: string, expiresIn = 3600): string {
  return `/storage/${key}?expires=${expiresIn}`;
}
