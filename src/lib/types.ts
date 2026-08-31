export type Role = 'mom' | 'son';
export type Lang = 'en' | 'ar';

export type GlucoseContext = 'fasting' | 'pre' | 'post1' | 'post2' | 'bedtime' | 'random';
export type InsulinKind = 'rapid' | 'long' | 'mixed';
export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type ActivityKind = 'walk' | 'workout' | 'chores' | 'other';
export type SymptomTag =
  | 'good' | 'dizzy' | 'shaky' | 'tired' | 'nausea' | 'headache' | 'thirsty' | 'blurry' | 'cramps';

export interface EntryBase {
  id: string;
  profileId: string;
  /** epoch ms of when it happened (editable), not when it was typed */
  ts: number;
  note?: string;
  createdAt: number;
}

export interface MealEntry extends EntryBase {
  type: 'meal';
  slot: MealSlot;
  name: string;
  calories: number;
  carbs?: number;
  protein?: number;
  fat?: number;
  photoId?: string;
}
export interface GlucoseEntry extends EntryBase {
  type: 'glucose';
  /** always stored in mg/dL */
  mgdl: number;
  context: GlucoseContext;
  /** meal this reading follows, set when logged from a test reminder */
  mealId?: string;
}
export interface InsulinEntry extends EntryBase {
  type: 'insulin';
  units: number;
  kind: InsulinKind;
}
export interface WeightEntry extends EntryBase { type: 'weight'; kg: number }
export interface BpEntry extends EntryBase { type: 'bp'; systolic: number; diastolic: number; pulse?: number }
export interface WaterEntry extends EntryBase { type: 'water'; ml: number }
export interface ActivityEntry extends EntryBase { type: 'activity'; kind: ActivityKind; minutes: number }
export interface SymptomEntry extends EntryBase { type: 'symptom'; tags: SymptomTag[]; severity: 1 | 2 | 3 }

export type Entry =
  | MealEntry | GlucoseEntry | InsulinEntry | WeightEntry
  | BpEntry | WaterEntry | ActivityEntry | SymptomEntry;

export type EntryType = Entry['type'];

export interface Targets {
  /** manual overrides; when undefined the algorithm computes them */
  calories?: number;
  carbs?: number;
  protein?: number;
  fastingMax: number;
  post1Max: number;
  post2Max: number;
  lowMin: number;
  waterMl: number;
  activityMin: number;
}

export interface Reminders {
  postMealTest: boolean;
  /** minutes after a meal to nudge a reading */
  testAfterMin: number;
  walkNudge: boolean;
}

export interface Profile {
  id: string;
  role: Role;
  name: string;
  emoji: string;
  lang: Lang;
  dob?: string;
  heightCm?: number;
  weightKg?: number;
  activity: 1 | 2 | 3 | 4 | 5;
  /** mom only */
  dueDate?: string;
  prePregnancyWeightKg?: number;
  targets: Targets;
  /** soft lock — not encryption */
  pin?: string;
  /** household-level: set once the first-run setup has been completed */
  onboarded?: boolean;
  reminders: Reminders;
  createdAt: number;
}

export interface Photo {
  id: string;
  blob: Blob;
  createdAt: number;
}

/** Personal food library — what they actually eat, learned from their own logs. */
export interface Food {
  id: string;
  profileId: string;
  name: string;
  calories: number;
  carbs?: number;
  protein?: number;
  fat?: number;
  slot?: MealSlot;
  uses: number;
  lastUsed: number;
}

export interface AppState {
  onboarded?: boolean;
}

export const DEFAULT_TARGETS: Targets = {
  fastingMax: 95,
  post1Max: 140,
  post2Max: 120,
  lowMin: 70,
  waterMl: 2300,
  activityMin: 30,
};
