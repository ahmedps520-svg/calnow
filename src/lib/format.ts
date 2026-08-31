import { localizeDigits } from './i18n';
import type { Lang, Targets } from './types';

export const DAY = 86400000;

export const startOfDay = (ts: number): number => {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};
export const endOfDay = (ts: number): number => startOfDay(ts) + DAY - 1;
export const addDays = (ts: number, n: number): number => {
  const d = new Date(ts);
  d.setDate(d.getDate() + n);
  return d.getTime();
};
export const dayKey = (ts: number): string => {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
export const sameDay = (a: number, b: number): boolean => dayKey(a) === dayKey(b);

const locale = (lang: Lang) => (lang === 'ar' ? 'ar-EG' : 'en-GB');

export const fmtTime = (ts: number, lang: Lang): string =>
  new Intl.DateTimeFormat(locale(lang), { hour: 'numeric', minute: '2-digit' }).format(ts);

export const fmtDate = (ts: number, lang: Lang): string =>
  new Intl.DateTimeFormat(locale(lang), { day: 'numeric', month: 'short' }).format(ts);

export const fmtLongDate = (ts: number, lang: Lang): string =>
  new Intl.DateTimeFormat(locale(lang), { weekday: 'long', day: 'numeric', month: 'long' }).format(ts);

export const fmtWeekday = (ts: number, lang: Lang): string =>
  new Intl.DateTimeFormat(locale(lang), { weekday: 'narrow' }).format(ts);

/** Numbers, with Arabic-Indic digits when the UI is Arabic. */
export const num = (n: number, lang: Lang, digits = 0): string =>
  localizeDigits(
    n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits }),
    lang,
  );

export type GlucoseStatus = 'low' | 'in' | 'high';

/** Which ceiling applies depends on when the reading was taken. */
export function glucoseCeiling(context: string, t: Targets): number {
  switch (context) {
    case 'fasting':
    case 'pre':
    case 'bedtime':
      return t.fastingMax;
    case 'post1':
      return t.post1Max;
    case 'post2':
      return t.post2Max;
    default:
      return t.post2Max;
  }
}

export function glucoseStatus(mgdl: number, context: string, t: Targets): GlucoseStatus {
  if (mgdl < t.lowMin) return 'low';
  return mgdl > glucoseCeiling(context, t) ? 'high' : 'in';
}

export const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));

export const mean = (xs: number[]): number =>
  xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;

export const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);

export const round = (n: number, step = 1): number => Math.round(n / step) * step;

/** Age in years from an ISO date string. */
export function ageFrom(dob?: string): number | undefined {
  if (!dob) return undefined;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return undefined;
  return Math.floor((Date.now() - d.getTime()) / (365.2425 * DAY));
}

/** Pregnancy week from the due date (40-week term). */
export function gestationalWeek(dueDate?: string): number | undefined {
  if (!dueDate) return undefined;
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return undefined;
  const weeksLeft = (due.getTime() - Date.now()) / (7 * DAY);
  const week = 40 - weeksLeft;
  return week > 0 && week < 45 ? Math.round(week) : undefined;
}

export const trimester = (week?: number): 1 | 2 | 3 | undefined =>
  week === undefined ? undefined : week < 14 ? 1 : week < 28 ? 2 : 3;
