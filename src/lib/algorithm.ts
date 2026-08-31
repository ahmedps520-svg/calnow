import type { TKey } from './i18n';
import {
  DAY, addDays, ageFrom, dayKey, gestationalWeek, glucoseStatus, mean, round, startOfDay, sum, trimester,
} from './format';
import type {
  Entry, GlucoseContext, GlucoseEntry, MealEntry, MealSlot, Profile, Targets,
} from './types';

/* ------------------------------------------------------------------ *
 * Shared selectors
 * ------------------------------------------------------------------ */

export const ofType = <T extends Entry['type']>(entries: Entry[], type: T) =>
  entries.filter((e): e is Extract<Entry, { type: T }> => e.type === type);

export const between = (entries: Entry[], from: number, to: number) =>
  entries.filter((e) => e.ts >= from && e.ts <= to);

export const onDay = (entries: Entry[], ts: number) => {
  const k = dayKey(ts);
  return entries.filter((e) => dayKey(e.ts) === k);
};

export interface DailyTotals {
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  water: number;
  activeMin: number;
  insulinUnits: number;
  meals: MealEntry[];
  readings: GlucoseEntry[];
}

export function dailyTotals(entries: Entry[], ts: number): DailyTotals {
  const day = onDay(entries, ts);
  const meals = ofType(day, 'meal');
  return {
    calories: sum(meals.map((m) => m.calories || 0)),
    carbs: sum(meals.map((m) => m.carbs || 0)),
    protein: sum(meals.map((m) => m.protein || 0)),
    fat: sum(meals.map((m) => m.fat || 0)),
    water: sum(ofType(day, 'water').map((w) => w.ml)),
    activeMin: sum(ofType(day, 'activity').map((a) => a.minutes)),
    insulinUnits: sum(ofType(day, 'insulin').map((i) => i.units)),
    meals,
    readings: ofType(day, 'glucose'),
  };
}

/** Consecutive days ending today (or yesterday) with at least one entry. */
export function streak(entries: Entry[], now = Date.now()): number {
  if (!entries.length) return 0;
  const days = new Set(entries.map((e) => dayKey(e.ts)));
  let cursor = startOfDay(now);
  if (!days.has(dayKey(cursor))) {
    cursor = addDays(cursor, -1);
    if (!days.has(dayKey(cursor))) return 0;
  }
  let n = 0;
  while (days.has(dayKey(cursor))) {
    n += 1;
    cursor = addDays(cursor, -1);
  }
  return n;
}

/* ------------------------------------------------------------------ *
 * 1. Smart daily budget
 * ------------------------------------------------------------------ */

const ACTIVITY_FACTOR: Record<number, number> = { 1: 1.2, 2: 1.375, 3: 1.55, 4: 1.725, 5: 1.9 };

/** Baseline carb share of each meal for a gestational-diabetes day. */
const BASE_CARB_SPLIT: Record<MealSlot, number> = {
  breakfast: 0.17,
  lunch: 0.3,
  dinner: 0.3,
  snack: 0.23,
};
const BASE_CAL_SPLIT: Record<MealSlot, number> = {
  breakfast: 0.25,
  lunch: 0.3,
  dinner: 0.3,
  snack: 0.15,
};

export interface SlotBudget {
  slot: MealSlot;
  calories: number;
  carbs: number;
  /** true when the algorithm trimmed this slot because readings after it ran high */
  adjusted: boolean;
}

export interface Budget {
  calories: number;
  carbs: number;
  protein: number;
  slots: SlotBudget[];
  /** how it was derived, for the "why this number" line in Settings */
  basis: 'manual' | 'calculated' | 'default';
  bmr?: number;
  week?: number;
  trimester?: 1 | 2 | 3;
}

/**
 * Mifflin-St Jeor, an activity factor, and a trimester allowance — then carbs
 * are split across meals and trimmed for whichever meal her own readings say
 * is hardest on her.
 */
export function computeBudget(profile: Profile, entries: Entry[], now = Date.now()): Budget {
  const isMom = profile.role === 'mom';
  const week = isMom ? gestationalWeek(profile.dueDate) : undefined;
  const tri = trimester(week);

  const age = ageFrom(profile.dob);
  const weight = isMom ? profile.prePregnancyWeightKg ?? profile.weightKg : profile.weightKg;
  const height = profile.heightCm;

  let calories = profile.targets.calories;
  let basis: Budget['basis'] = calories ? 'manual' : 'default';
  let bmr: number | undefined;

  if (!calories) {
    if (weight && height && age) {
      // Mom's profile uses the female equation; the son's uses the male one.
      bmr = 10 * weight + 6.25 * height - 5 * age + (isMom ? -161 : 5);
      const tdee = bmr * (ACTIVITY_FACTOR[profile.activity] ?? 1.375);
      const pregnancyAdd = tri === 2 ? 340 : tri === 3 ? 452 : 0;
      calories = round(tdee + pregnancyAdd, 10);
      basis = 'calculated';
    } else {
      calories = isMom ? 2000 : 2400;
    }
  }

  // Carbs: ~42% of calories, never under the 175 g/day pregnancy floor.
  let carbs = profile.targets.carbs;
  if (!carbs) {
    const fromCalories = round((calories * 0.42) / 4, 5);
    carbs = isMom ? Math.max(175, fromCalories) : fromCalories;
  }
  const protein = profile.targets.protein ?? round(weight ? Math.max(71, weight * 1.1) : 80, 5);

  // Adaptive step: shave carbs off any meal that keeps landing out of range.
  const trouble = isMom ? slotTrouble(entries, profile.targets, now) : {};
  const split = { ...BASE_CARB_SPLIT };
  let freed = 0;
  (Object.keys(split) as MealSlot[]).forEach((slot) => {
    const rate = trouble[slot];
    if (slot !== 'snack' && rate !== undefined && rate > 0.4) {
      const cut = split[slot] * Math.min(0.2, (rate - 0.4) * 0.5);
      split[slot] -= cut;
      freed += cut;
    }
  });
  split.snack += freed;

  const slots: SlotBudget[] = (Object.keys(BASE_CARB_SPLIT) as MealSlot[]).map((slot) => ({
    slot,
    calories: round(calories! * BASE_CAL_SPLIT[slot], 5),
    carbs: round(carbs! * split[slot], 5),
    adjusted: split[slot] !== BASE_CARB_SPLIT[slot],
  }));

  return { calories, carbs, protein, slots, basis, bmr, week, trimester: tri };
}

/** Share of post-meal readings that landed high, per meal slot, over 21 days. */
function slotTrouble(entries: Entry[], targets: Targets, now: number): Partial<Record<MealSlot, number>> {
  const links = linkReadingsToMeals(entries, now - 21 * DAY, now);
  const acc: Partial<Record<MealSlot, { high: number; n: number }>> = {};
  links.forEach(({ meal, reading }) => {
    const bucket = (acc[meal.slot] ??= { high: 0, n: 0 });
    bucket.n += 1;
    if (glucoseStatus(reading.mgdl, reading.context, targets) === 'high') bucket.high += 1;
  });
  const out: Partial<Record<MealSlot, number>> = {};
  (Object.keys(acc) as MealSlot[]).forEach((slot) => {
    const b = acc[slot]!;
    if (b.n >= 3) out[slot] = b.high / b.n;
  });
  return out;
}

/* ------------------------------------------------------------------ *
 * 2. Pattern insights
 * ------------------------------------------------------------------ */

/** A reading counts as "after" a meal when it lands 45–210 min later. */
export function linkReadingsToMeals(entries: Entry[], from: number, to: number) {
  const meals = ofType(between(entries, from, to), 'meal').sort((a, b) => a.ts - b.ts);
  const readings = ofType(between(entries, from, to), 'glucose');
  const links: { meal: MealEntry; reading: GlucoseEntry; gapMin: number }[] = [];
  readings.forEach((r) => {
    if (r.context !== 'post1' && r.context !== 'post2' && !r.mealId) return;
    let best: MealEntry | undefined;
    if (r.mealId) best = meals.find((m) => m.id === r.mealId);
    if (!best) {
      for (const m of meals) {
        const gap = (r.ts - m.ts) / 60000;
        if (gap >= 45 && gap <= 210) best = m;
      }
    }
    if (best) links.push({ meal: best, reading: r, gapMin: (r.ts - best.ts) / 60000 });
  });
  return links;
}

export interface GlucoseStats {
  count: number;
  avg: number;
  inRange: number;
  high: number;
  low: number;
  tir: number;
  eA1c: number;
  byContext: { context: GlucoseContext; avg: number; n: number; inRatio: number }[];
}

export function glucoseStats(entries: Entry[], targets: Targets, from: number, to: number): GlucoseStats {
  const rs = ofType(between(entries, from, to), 'glucose');
  const values = rs.map((r) => r.mgdl);
  const avg = mean(values);
  let inRange = 0;
  let high = 0;
  let low = 0;
  rs.forEach((r) => {
    const s = glucoseStatus(r.mgdl, r.context, targets);
    if (s === 'high') high += 1;
    else if (s === 'low') low += 1;
    else inRange += 1;
  });
  const contexts: GlucoseContext[] = ['fasting', 'pre', 'post1', 'post2', 'bedtime', 'random'];
  const byContext = contexts
    .map((context) => {
      const subset = rs.filter((r) => r.context === context);
      return {
        context,
        n: subset.length,
        avg: mean(subset.map((r) => r.mgdl)),
        inRatio: subset.length
          ? subset.filter((r) => glucoseStatus(r.mgdl, r.context, targets) === 'in').length / subset.length
          : 0,
      };
    })
    .filter((c) => c.n > 0);

  return {
    count: rs.length,
    avg,
    inRange,
    high,
    low,
    tir: rs.length ? inRange / rs.length : 0,
    eA1c: values.length ? (avg + 46.7) / 28.7 : 0,
    byContext,
  };
}

export type FindingTone = 'good' | 'warn' | 'info';
export interface Finding {
  id: string;
  key: TKey;
  params?: Record<string, string | number>;
  tone: FindingTone;
  /** higher shows first */
  weight: number;
}

/**
 * Plain-language patterns pulled out of her own history. Everything here is
 * descriptive — it reports what happened, it never prescribes treatment.
 */
export function findings(
  profile: Profile,
  entries: Entry[],
  slotLabel: (slot: MealSlot) => string,
  now = Date.now(),
): Finding[] {
  const out: Finding[] = [];
  const targets = profile.targets;
  const weekAgo = now - 7 * DAY;
  const twoWeeks = now - 14 * DAY;

  if (profile.role === 'mom') {
    /* which meal runs hottest */
    const links = linkReadingsToMeals(entries, twoWeeks, now);
    const bySlot = new Map<MealSlot, number[]>();
    links.forEach(({ meal, reading }) => {
      const list = bySlot.get(meal.slot) ?? [];
      list.push(reading.mgdl);
      bySlot.set(meal.slot, list);
    });
    const slotAvgs = [...bySlot.entries()]
      .filter(([, v]) => v.length >= 3)
      .map(([slot, v]) => ({ slot, avg: mean(v), n: v.length }));
    if (slotAvgs.length >= 2) {
      const sorted = [...slotAvgs].sort((a, b) => b.avg - a.avg);
      const hottest = sorted[0];
      const rest = mean(sorted.slice(1).flatMap((s) => bySlot.get(s.slot) ?? []));
      const delta = Math.round(hottest.avg - rest);
      if (delta >= 8) {
        out.push({
          id: 'high-slot',
          key: 'fHighSlot',
          params: { a: slotLabel(hottest.slot), b: delta },
          tone: 'warn',
          weight: 90,
        });
      }
      const coolest = sorted[sorted.length - 1];
      if (coolest.n >= 4 && coolest.avg <= targets.post1Max) {
        out.push({
          id: 'best-slot',
          key: 'fBestSlot',
          params: { a: slotLabel(coolest.slot) },
          tone: 'good',
          weight: 60,
        });
      }
    }

    /* does walking actually help her */
    const walkEffect = activityEffect(entries, twoWeeks, now);
    if (walkEffect && walkEffect.n >= 3 && walkEffect.delta <= -5) {
      out.push({
        id: 'walk',
        key: 'fWalkHelps',
        params: { a: Math.abs(Math.round(walkEffect.delta)) },
        tone: 'good',
        weight: 85,
      });
    }

    /* the carb threshold where things go sideways */
    const carbLink = carbThreshold(links, targets);
    if (carbLink) {
      out.push({
        id: 'carb-threshold',
        key: 'fCarbLink',
        params: { a: carbLink.grams, b: Math.round(carbLink.highRate * 100) },
        tone: 'warn',
        weight: 88,
      });
    }

    /* fasting drift week over week */
    const fastingNow = ofType(between(entries, weekAgo, now), 'glucose').filter((r) => r.context === 'fasting');
    const fastingPrev = ofType(between(entries, twoWeeks, weekAgo), 'glucose').filter(
      (r) => r.context === 'fasting',
    );
    if (fastingNow.length >= 3 && fastingPrev.length >= 3) {
      const delta = mean(fastingNow.map((r) => r.mgdl)) - mean(fastingPrev.map((r) => r.mgdl));
      if (delta >= 5) {
        out.push({ id: 'fasting-up', key: 'fFastingUp', params: { a: Math.round(delta) }, tone: 'warn', weight: 95 });
      } else if (delta <= -5) {
        out.push({
          id: 'fasting-down',
          key: 'fFastingDown',
          params: { a: Math.abs(Math.round(delta)) },
          tone: 'good',
          weight: 92,
        });
      }
    }

    /* lows are worth flagging to a doctor */
    const lows = ofType(between(entries, weekAgo, now), 'glucose').filter(
      (r) => glucoseStatus(r.mgdl, r.context, targets) === 'low',
    );
    if (lows.length) {
      out.push({ id: 'lows', key: 'fLowRisk', params: { a: lows.length }, tone: 'warn', weight: 98 });
    }

    /* a breakfast streak is the most motivating thing to show */
    const breakfastStreak = inRangeStreak(entries, targets, 'post1');
    if (breakfastStreak >= 3) {
      out.push({ id: 'streak', key: 'fStreak', params: { a: breakfastStreak }, tone: 'good', weight: 70 });
    }
  } else {
    const days = lastNDays(entries, 7, now);
    const eaten = days.filter((d) => d.calories > 0);
    if (eaten.length >= 3) {
      out.push({
        id: 'cal-avg',
        key: 'fCalorieAvg',
        params: { a: Math.round(mean(eaten.map((d) => d.calories))) },
        tone: 'info',
        weight: 60,
      });
    }
  }

  /* shared */
  const dayEntries = lastNDays(entries, 7, now);
  if (dayEntries.every((d) => d.logged)) {
    out.push({ id: 'consistent', key: 'fConsistent', tone: 'good', weight: 50 });
  }
  const waterDays = dayEntries.filter((d) => d.water > 0);
  if (waterDays.length >= 3 && mean(waterDays.map((d) => d.water)) < targets.waterMl * 0.7) {
    out.push({ id: 'water', key: 'fWaterLow', tone: 'info', weight: 40 });
  }
  const target = profile.targets.calories;
  if (target) {
    const low = dayEntries.filter((d) => d.calories > 0 && d.calories < target * 0.7);
    if (low.length >= 2) out.push({ id: 'under', key: 'fUnderEating', tone: 'warn', weight: 65 });
  }

  return out.sort((a, b) => b.weight - a.weight);
}

export function lastNDays(entries: Entry[], n: number, now = Date.now()) {
  const days: { ts: number; calories: number; carbs: number; water: number; logged: boolean; avgGlucose: number }[] = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    const ts = startOfDay(addDays(now, -i));
    const t = dailyTotals(entries, ts);
    const dayHas = onDay(entries, ts).length > 0;
    days.push({
      ts,
      calories: t.calories,
      carbs: t.carbs,
      water: t.water,
      logged: dayHas,
      avgGlucose: mean(t.readings.map((r) => r.mgdl)),
    });
  }
  return days;
}

/** Average change in the next reading when movement was logged beforehand. */
function activityEffect(entries: Entry[], from: number, to: number) {
  const acts = ofType(between(entries, from, to), 'activity');
  const readings = ofType(between(entries, from, to), 'glucose').sort((a, b) => a.ts - b.ts);
  if (!acts.length || readings.length < 4) return null;
  const withWalk: number[] = [];
  const without: number[] = [];
  readings.forEach((r) => {
    if (r.context !== 'post1' && r.context !== 'post2') return;
    const walked = acts.some((a) => r.ts - a.ts > 0 && r.ts - a.ts < 2 * 3600000);
    (walked ? withWalk : without).push(r.mgdl);
  });
  if (withWalk.length < 3 || without.length < 3) return null;
  return { delta: mean(withWalk) - mean(without), n: withWalk.length };
}

/** The carb load above which her readings start going out of range. */
function carbThreshold(
  links: { meal: MealEntry; reading: GlucoseEntry }[],
  targets: Targets,
): { grams: number; highRate: number } | null {
  const withCarbs = links.filter((l) => (l.meal.carbs ?? 0) > 0);
  if (withCarbs.length < 6) return null;
  let best: { grams: number; highRate: number } | null = null;
  for (const grams of [30, 40, 45, 50, 60, 75]) {
    const above = withCarbs.filter((l) => (l.meal.carbs ?? 0) > grams);
    if (above.length < 3) continue;
    const highRate =
      above.filter((l) => glucoseStatus(l.reading.mgdl, l.reading.context, targets) === 'high').length /
      above.length;
    if (highRate >= 0.5 && (!best || highRate > best.highRate)) best = { grams, highRate };
  }
  return best;
}

function inRangeStreak(entries: Entry[], targets: Targets, context: GlucoseContext): number {
  const byDay = new Map<string, GlucoseEntry[]>();
  ofType(entries, 'glucose')
    .filter((r) => r.context === context)
    .forEach((r) => {
      const k = dayKey(r.ts);
      byDay.set(k, [...(byDay.get(k) ?? []), r]);
    });
  let n = 0;
  let cursor = startOfDay(Date.now());
  for (let i = 0; i < 30; i += 1) {
    const rs = byDay.get(dayKey(cursor));
    if (!rs || !rs.length) break;
    if (!rs.every((r) => glucoseStatus(r.mgdl, r.context, targets) === 'in')) break;
    n += 1;
    cursor = addDays(cursor, -1);
  }
  return n;
}

/* ------------------------------------------------------------------ *
 * 3. Meal scoring, learned from her own readings
 * ------------------------------------------------------------------ */

export const normalizeName = (name: string) =>
  name.trim().toLowerCase().replace(/\s+/g, ' ').replace(/[.,!?؟،]/g, '');

export interface MealOutcome {
  name: string;
  n: number;
  avgPost: number;
  inRate: number;
  avgCarbs: number;
}

/** How each dish has actually behaved for her, historically. */
export function mealOutcomes(entries: Entry[], targets: Targets, now = Date.now()): MealOutcome[] {
  const links = linkReadingsToMeals(entries, now - 90 * DAY, now);
  const acc = new Map<string, { name: string; readings: GlucoseEntry[]; carbs: number[] }>();
  links.forEach(({ meal, reading }) => {
    const key = normalizeName(meal.name);
    if (!key) return;
    const bucket = acc.get(key) ?? { name: meal.name, readings: [], carbs: [] };
    bucket.readings.push(reading);
    if (meal.carbs) bucket.carbs.push(meal.carbs);
    acc.set(key, bucket);
  });
  return [...acc.values()]
    .filter((b) => b.readings.length >= 2)
    .map((b) => ({
      name: b.name,
      n: b.readings.length,
      avgPost: mean(b.readings.map((r) => r.mgdl)),
      inRate: b.readings.filter((r) => glucoseStatus(r.mgdl, r.context, targets) === 'in').length / b.readings.length,
      avgCarbs: mean(b.carbs),
    }))
    .sort((a, b) => a.avgPost - b.avgPost);
}

export interface MealScore {
  score: number;
  /** i18n-free short reasons, rendered as chips */
  flags: { key: TKey; tone: FindingTone }[];
}

/**
 * 0–100 for a single meal: portion against its slot budget, carb load, whether
 * it is balanced, and — once there is history — how this dish has treated her.
 */
export function scoreMeal(
  meal: Pick<MealEntry, 'slot' | 'calories' | 'carbs' | 'protein' | 'fat' | 'name'>,
  budget: Budget,
  outcomes: MealOutcome[] = [],
  role: 'mom' | 'son' = 'mom',
): MealScore {
  const slot = budget.slots.find((s) => s.slot === meal.slot);
  const flags: MealScore['flags'] = [];
  let score = 70;

  if (slot && meal.calories > 0) {
    const ratio = meal.calories / Math.max(1, slot.calories);
    if (ratio <= 1.1) score += 12;
    else if (ratio <= 1.35) score -= 4;
    else {
      score -= 16;
      flags.push({ key: 'scorePortionBig', tone: 'warn' });
    }
  }

  if (role === 'mom' && slot && meal.carbs !== undefined) {
    const ratio = meal.carbs / Math.max(1, slot.carbs);
    if (ratio <= 0.9) {
      score += 14;
      flags.push({ key: 'scoreCarbGentle', tone: 'good' });
    } else if (ratio <= 1.15) {
      score += 4;
    } else {
      score -= ratio <= 1.5 ? 12 : 22;
      flags.push({ key: 'scoreCarbHeavy', tone: 'warn' });
    }
  }

  const hasProtein = (meal.protein ?? 0) > 0;
  const hasFat = (meal.fat ?? 0) > 0;
  if (hasProtein && (meal.carbs ?? 0) > 0) {
    score += 8; // protein alongside carbs blunts the rise
    flags.push({ key: 'scoreBalanced', tone: 'good' });
  }
  if (hasProtein && hasFat) score += 2;

  const known = outcomes.find((o) => normalizeName(o.name) === normalizeName(meal.name));
  if (known && known.n >= 2) {
    score += Math.round((known.inRate - 0.5) * 30);
    if (known.inRate >= 0.75) flags.push({ key: 'scoreKindHistory', tone: 'good' });
    else if (known.inRate <= 0.34) flags.push({ key: 'scoreRoughHistory', tone: 'warn' });
  }

  return { score: Math.max(0, Math.min(100, Math.round(score))), flags };
}

/* ------------------------------------------------------------------ *
 * 4. Predictive alerts
 * ------------------------------------------------------------------ */

export type AlertKind = 'test-due' | 'test-soon' | 'trend-up' | 'walk' | 'high' | 'low';
export interface Alert {
  id: string;
  kind: AlertKind;
  key: TKey;
  params?: Record<string, string | number>;
  tone: FindingTone;
  /** meal this alert hangs off, so "Log it" can pre-fill the reading */
  mealId?: string;
  context?: GlucoseContext;
}

export interface AlertLabels {
  slot: (s: MealSlot) => string;
  context: (c: GlucoseContext) => string;
}

export function alerts(profile: Profile, entries: Entry[], labels: AlertLabels, now = Date.now()): Alert[] {
  if (profile.role !== 'mom') return [];
  const out: Alert[] = [];
  const targets = profile.targets;
  const readings = ofType(entries, 'glucose').sort((a, b) => b.ts - a.ts);
  const meals = ofType(entries, 'meal').sort((a, b) => b.ts - a.ts);

  /* the newest reading, if it needs attention */
  const latest = readings[0];
  if (latest && now - latest.ts < 45 * 60000) {
    const status = glucoseStatus(latest.mgdl, latest.context, targets);
    if (status === 'low') out.push({ id: 'low', kind: 'low', key: 'alertLow', tone: 'warn' });
    else if (status === 'high') out.push({ id: 'high', kind: 'high', key: 'alertHigh', tone: 'warn' });
  }

  /* a reading is due after the last meal */
  const lastMeal = meals[0];
  if (profile.reminders.postMealTest && lastMeal) {
    const due = lastMeal.ts + profile.reminders.testAfterMin * 60000;
    const testedSince = readings.some((r) => r.ts > lastMeal.ts && (r.context === 'post1' || r.context === 'post2'));
    if (!testedSince && now < due && due - now <= 30 * 60000) {
      out.push({
        id: 'test-soon',
        kind: 'test-soon',
        key: 'alertTestSoon',
        params: { a: Math.max(1, Math.round((due - now) / 60000)) },
        tone: 'info',
        mealId: lastMeal.id,
      });
    } else if (!testedSince && now >= due && now - due < 60 * 60000) {
      out.push({
        id: 'test-due',
        kind: 'test-due',
        key: 'alertTestDue',
        params: { a: `${profile.reminders.testAfterMin}m`, b: labels.slot(lastMeal.slot) },
        tone: 'warn',
        mealId: lastMeal.id,
        context: profile.reminders.testAfterMin >= 105 ? 'post2' : 'post1',
      });
    }
  }

  /* a walk right after a heavy meal is the cheapest intervention there is */
  if (profile.reminders.walkNudge && lastMeal) {
    const sinceMeal = (now - lastMeal.ts) / 60000;
    const budget = computeBudget(profile, entries, now);
    const slotCarbs = budget.slots.find((s) => s.slot === lastMeal.slot)?.carbs ?? 45;
    const heavy = (lastMeal.carbs ?? 0) > slotCarbs;
    const movedSince = ofType(entries, 'activity').some((a) => a.ts > lastMeal.ts);
    if (heavy && !movedSince && sinceMeal >= 10 && sinceMeal <= 60) {
      out.push({ id: 'walk', kind: 'walk', key: 'alertWalk', tone: 'info' });
    }
  }

  /* three readings of the same kind, each higher than the last */
  const contexts: GlucoseContext[] = ['fasting', 'post1', 'post2'];
  contexts.forEach((context) => {
    const last3 = readings.filter((r) => r.context === context).slice(0, 3);
    if (last3.length === 3) {
      const [a, b, c] = last3; // newest first
      const rising = a.mgdl > b.mgdl && b.mgdl > c.mgdl;
      const overCeiling = glucoseStatus(a.mgdl, context, targets) === 'high';
      if (rising && overCeiling && now - a.ts < 2 * DAY) {
        out.push({
          id: `trend-${context}`,
          kind: 'trend-up',
          key: 'alertTrendUp',
          params: { a: labels.context(context) },
          tone: 'warn',
          context,
        });
      }
    }
  });

  return out;
}
