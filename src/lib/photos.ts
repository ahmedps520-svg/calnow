import { db, uid } from './db';
import type { Photo } from './types';

const MAX_EDGE = 1280;
const QUALITY = 0.72;

/** Downscale before storing — a phone photo is ~4 MB, this lands around 150 KB. */
export async function compress(file: File | Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', QUALITY),
  );
  return blob ?? file;
}

export async function savePhoto(file: File | Blob): Promise<string> {
  const blob = await compress(file);
  const photo: Photo = { id: uid(), blob, createdAt: Date.now() };
  await db.putPhoto(photo);
  return photo.id;
}

const urlCache = new Map<string, string>();

export async function photoUrl(id: string): Promise<string | undefined> {
  const cached = urlCache.get(id);
  if (cached) return cached;
  const photo = await db.getPhoto(id);
  if (!photo) return undefined;
  const url = URL.createObjectURL(photo.blob);
  urlCache.set(id, url);
  return url;
}

export function forgetPhotoUrl(id: string): void {
  const url = urlCache.get(id);
  if (url) {
    URL.revokeObjectURL(url);
    urlCache.delete(id);
  }
}
