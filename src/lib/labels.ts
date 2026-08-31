import type { TKey } from './i18n';
import type { ActivityKind, EntryType, GlucoseContext, InsulinKind, MealSlot, SymptomTag } from './types';

export const SLOT_KEY: Record<MealSlot, TKey> = {
  breakfast: 'breakfast',
  lunch: 'lunch',
  dinner: 'dinner',
  snack: 'snack',
};

export const CONTEXT_KEY: Record<GlucoseContext, TKey> = {
  fasting: 'ctxFasting',
  pre: 'ctxPre',
  post1: 'ctxPost1',
  post2: 'ctxPost2',
  bedtime: 'ctxBedtime',
  random: 'ctxRandom',
};

export const INSULIN_KEY: Record<InsulinKind, TKey> = {
  rapid: 'insulinRapid',
  long: 'insulinLong',
  mixed: 'insulinMixed',
};

export const ACTIVITY_KEY: Record<ActivityKind, TKey> = {
  walk: 'actWalk',
  workout: 'actWorkout',
  chores: 'actChores',
  other: 'actOther',
};

export const SYMPTOM_KEY: Record<SymptomTag, TKey> = {
  good: 'symGood',
  dizzy: 'symDizzy',
  shaky: 'symShaky',
  tired: 'symTired',
  nausea: 'symNausea',
  headache: 'symHeadache',
  thirsty: 'symThirsty',
  blurry: 'symBlurry',
  cramps: 'symCramps',
};

export const TYPE_KEY: Record<EntryType, TKey> = {
  meal: 'meal',
  glucose: 'glucose',
  insulin: 'insulin',
  weight: 'weight',
  bp: 'bp',
  water: 'water',
  activity: 'activity',
  symptom: 'symptom',
};

export const SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'];
export const CONTEXTS: GlucoseContext[] = ['fasting', 'post1', 'post2', 'pre', 'bedtime', 'random'];
export const INSULIN_KINDS: InsulinKind[] = ['rapid', 'long', 'mixed'];
export const ACTIVITY_KINDS: ActivityKind[] = ['walk', 'workout', 'chores', 'other'];
export const SYMPTOMS: SymptomTag[] = [
  'good', 'tired', 'dizzy', 'shaky', 'nausea', 'headache', 'thirsty', 'blurry', 'cramps',
];

/** Which slot a meal logged at this hour most likely belongs to. */
export function guessSlot(ts = Date.now()): MealSlot {
  const h = new Date(ts).getHours();
  if (h < 10.5) return 'breakfast';
  if (h < 15.5) return 'lunch';
  if (h < 18) return 'snack';
  if (h < 22) return 'dinner';
  return 'snack';
}

/** Sensible default reading context for the current time of day. */
export function guessContext(ts = Date.now()): GlucoseContext {
  const h = new Date(ts).getHours();
  if (h < 9) return 'fasting';
  if (h >= 22) return 'bedtime';
  return 'post2';
}
