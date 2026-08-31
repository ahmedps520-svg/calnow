import { supabase } from './supabase';
import type { Entry, Food, Profile, Role } from './types';
import { DEFAULT_TARGETS } from './types';

/* Rows are kept lean: anything undefined, null or blank is dropped before it
   is written, so the jsonb payload only ever holds fields that mean something. */
function compact<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === '') continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out;
}

/* ------------------------------ profiles -------------------------------- */

interface ProfileRow {
  key: Role;
  data: Record<string, unknown>;
}

export function rowToProfile(row: ProfileRow): Profile {
  const d = row.data ?? {};
  return {
    id: row.key,
    role: row.key,
    name: (d.name as string) ?? (row.key === 'mom' ? 'Mom' : 'Me'),
    emoji: (d.emoji as string) ?? (row.key === 'mom' ? '🌸' : '⚡'),
    lang: (d.lang as Profile['lang']) ?? 'en',
    dob: d.dob as string | undefined,
    heightCm: d.heightCm as number | undefined,
    weightKg: d.weightKg as number | undefined,
    activity: (d.activity as Profile['activity']) ?? (row.key === 'mom' ? 2 : 3),
    dueDate: d.dueDate as string | undefined,
    prePregnancyWeightKg: d.prePregnancyWeightKg as number | undefined,
    targets: { ...DEFAULT_TARGETS, ...((d.targets as object) ?? {}) },
    pin: d.pin as string | undefined,
    reminders: {
      postMealTest: row.key === 'mom',
      testAfterMin: 120,
      walkNudge: row.key === 'mom',
      ...((d.reminders as object) ?? {}),
    },
    onboarded: d.onboarded === true,
    createdAt: (d.createdAt as number) ?? Date.now(),
  };
}

function profileToRow(p: Profile) {
  const { id, role, ...rest } = p;
  void id;
  void role;
  return { key: p.role, data: compact(rest as unknown as Record<string, unknown>), updated_at: new Date().toISOString() };
}

export async function fetchProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase.from('profiles').select('key, data');
  if (error) throw error;
  return (data as ProfileRow[]).map(rowToProfile);
}

export async function upsertProfile(p: Profile): Promise<void> {
  const { error } = await supabase.from('profiles').upsert(profileToRow(p), { onConflict: 'user_id,key' });
  if (error) throw error;
}

/* ------------------------------- entries -------------------------------- */

interface EntryRow {
  id: string;
  profile_key: Role;
  type: Entry['type'];
  ts: string;
  data: Record<string, unknown>;
  note: string | null;
  created_at: string;
}

export function rowToEntry(row: EntryRow): Entry {
  return {
    id: row.id,
    profileId: row.profile_key,
    type: row.type,
    ts: new Date(row.ts).getTime(),
    note: row.note ?? undefined,
    createdAt: new Date(row.created_at).getTime(),
    ...(row.data ?? {}),
  } as Entry;
}

function entryToRow(e: Entry) {
  const { id, profileId, ts, note, createdAt, type, ...rest } = e;
  void createdAt;
  return {
    id,
    profile_key: profileId,
    type,
    ts: new Date(ts).toISOString(),
    note: note?.trim() || null,
    data: compact(rest as unknown as Record<string, unknown>),
  };
}

/** Entries for the whole household — the son's home screen checks Mom's day. */
export async function fetchEntries(sinceDays = 200): Promise<Entry[]> {
  const since = new Date(Date.now() - sinceDays * 86400000).toISOString();
  const { data, error } = await supabase
    .from('entries')
    .select('id, profile_key, type, ts, data, note, created_at')
    .gte('ts', since)
    .order('ts', { ascending: false });
  if (error) throw error;
  return (data as EntryRow[]).map(rowToEntry);
}

export async function insertEntry(e: Entry): Promise<void> {
  const { error } = await supabase.from('entries').upsert(entryToRow(e));
  if (error) throw error;
}

export async function insertEntries(list: Entry[]): Promise<void> {
  if (!list.length) return;
  const { error } = await supabase.from('entries').upsert(list.map(entryToRow));
  if (error) throw error;
}

export async function removeEntry(id: string): Promise<void> {
  const { error } = await supabase.from('entries').delete().eq('id', id);
  if (error) throw error;
}

/* -------------------------------- foods --------------------------------- */

interface FoodRow {
  id: string;
  profile_key: Role;
  name: string;
  data: Record<string, unknown>;
  uses: number;
  last_used: string;
}

export async function fetchFoods(): Promise<Food[]> {
  const { data, error } = await supabase
    .from('foods')
    .select('id, profile_key, name, data, uses, last_used')
    .order('uses', { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data as FoodRow[]).map((r) => ({
    id: r.id,
    profileId: r.profile_key,
    name: r.name,
    uses: r.uses,
    lastUsed: new Date(r.last_used).getTime(),
    ...(r.data ?? {}),
  })) as Food[];
}

export async function upsertFood(f: Food): Promise<void> {
  const { id, profileId, name, uses, lastUsed, ...rest } = f;
  void id;
  const { error } = await supabase.from('foods').upsert(
    {
      profile_key: profileId,
      name,
      uses,
      last_used: new Date(lastUsed).toISOString(),
      data: compact(rest as unknown as Record<string, unknown>),
    },
    { onConflict: 'user_id,profile_key,name' },
  );
  if (error) throw error;
}

export async function removeFood(id: string): Promise<void> {
  const { error } = await supabase.from('foods').delete().eq('id', id);
  if (error) throw error;
}
