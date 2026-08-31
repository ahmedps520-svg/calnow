import { db } from './db';
import type { AppState, Entry, Food, Profile } from './types';

export interface BackupFile {
  format: 'calnow-backup';
  version: 1;
  exportedAt: string;
  profiles: Profile[];
  entries: Entry[];
  foods: Food[];
  app?: AppState;
  photos: { id: string; createdAt: number; type: string; data: string }[];
}

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

const dataUrlToBlob = async (data: string) => (await fetch(data)).blob();

export async function exportBackup(): Promise<Blob> {
  const [profiles, entries, foods, photos, app] = await Promise.all([
    db.allProfiles(),
    db.allEntries(),
    db.allFoods(),
    db.allPhotos(),
    db.getApp(),
  ]);
  const encoded = await Promise.all(
    photos.map(async (p) => ({
      id: p.id,
      createdAt: p.createdAt,
      type: p.blob.type || 'image/jpeg',
      data: await blobToDataUrl(p.blob),
    })),
  );
  const file: BackupFile = {
    format: 'calnow-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    profiles,
    entries,
    foods,
    app,
    photos: encoded,
  };
  return new Blob([JSON.stringify(file)], { type: 'application/json' });
}

export async function importBackup(text: string): Promise<{ entries: number; photos: number }> {
  const parsed = JSON.parse(text) as BackupFile;
  if (parsed?.format !== 'calnow-backup') throw new Error('Not a Calnow backup file');
  await db.clearAll();
  for (const p of parsed.profiles ?? []) await db.putProfile(p);
  for (const e of parsed.entries ?? []) await db.putEntry(e);
  for (const f of parsed.foods ?? []) await db.putFood(f);
  for (const p of parsed.photos ?? []) {
    await db.putPhoto({ id: p.id, createdAt: p.createdAt, blob: await dataUrlToBlob(p.data) });
  }
  if (parsed.app) await db.setApp(parsed.app);
  return { entries: parsed.entries?.length ?? 0, photos: parsed.photos?.length ?? 0 };
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
