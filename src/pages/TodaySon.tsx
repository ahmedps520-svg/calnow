import { useMemo } from 'react';
import { DayBars } from '../components/Charts';
import { IconMeal, IconWalk, IconWater } from '../components/Icons';
import type { LogIntent } from '../components/LogSheet';
import { Bar, Empty, Ring } from '../components/UI';
import { computeBudget, dailyTotals, lastNDays, streak } from '../lib/algorithm';
import { dayKey, fmtWeekday, num } from '../lib/format';
import { useStore } from '../lib/store';
import { MealRow } from './MealRow';

export function TodaySon({ onLog, onSwitch }: { onLog: (intent?: LogIntent) => void; onSwitch: () => void }) {
  const { t, profile, entries, allEntries, profiles, lang } = useStore();
  const now = Date.now();

  const budget = useMemo(() => (profile ? computeBudget(profile, entries, now) : null), [profile, entries, now]);
  const totals = useMemo(() => dailyTotals(entries, now), [entries, now]);
  const days = useMemo(() => lastNDays(entries, 7, now), [entries, now]);
  const runStreak = useMemo(() => streak(entries, now), [entries, now]);

  /* the solidarity bit — did Mom log today too? */
  const mom = profiles.find((p) => p.role === 'mom');
  const momLoggedToday = useMemo(
    () => (mom ? allEntries.some((e) => e.profileId === mom.id && dayKey(e.ts) === dayKey(now)) : false),
    [allEntries, mom, now],
  );
  const iLoggedToday = totals.meals.length > 0;

  if (!profile || !budget) return null;

  const left = Math.round(budget.calories - totals.calories);
  const togetherKey = momLoggedToday && iLoggedToday ? 'sonTogether' : momLoggedToday ? 'sonSolo' : 'sonNoOne';
  const togetherBody = momLoggedToday && iLoggedToday ? 'sonTogetherBody' : momLoggedToday ? 'sonSoloBody' : 'startByAdding';

  return (
    <>
      <header className="appbar">
        <div>
          <h1 className="appbar-title display">{t('sonHomeTitle')}</h1>
          <p className="appbar-sub">{t('sonSubtitle')}</p>
        </div>
        <button className="avatar" onClick={onSwitch} aria-label={t('switchProfile')}>{profile.emoji}</button>
      </header>

      <section className="card card-hero">
        <div className="row" style={{ gap: 20 }}>
          <Ring value={totals.calories} max={budget.calories} size={128} stroke={11}>
            <div>
              <div className="hero-num" style={{ fontSize: 28 }}>{num(Math.abs(left), lang)}</div>
              <div className="tiny faint">{left >= 0 ? t('leftToday') : t('overBudget')}</div>
            </div>
          </Ring>
          <div className="grow stack-2">
            <div className="eyebrow">{t('eatenToday')}</div>
            <div className="row" style={{ gap: 6, alignItems: 'baseline' }}>
              <span className="stat-value">{num(totals.calories, lang)}</span>
              <span className="small faint">{t('ofTarget', { a: num(budget.calories, lang) })}</span>
            </div>
            <div className="row wrap" style={{ gap: 6 }}>
              {runStreak > 0 && (
                <span className="tag tag-accent">{t('sonStreakLine', { a: num(runStreak, lang) })}</span>
              )}
              <span className="tag">{num(totals.protein, lang)}{t('gramsShort')} {t('protein')}</span>
            </div>
          </div>
        </div>
      </section>

      <section className={`banner banner-${momLoggedToday && iLoggedToday ? 'good' : 'info'}`}>
        <span className="banner-dot" />
        <span className="grow">
          <b>{t(togetherKey)}</b>
          <div className="small muted">{t(togetherBody)}</div>
        </span>
      </section>

      <div className="grid-2">
        <button className="card card-tight" onClick={() => onLog({ type: 'water' })}>
          <div className="row-between">
            <span className="item-icon"><IconWater size={18} /></span>
            <span className="stat-value" style={{ fontSize: 18 }}>{num(totals.water, lang)}</span>
          </div>
          <Bar value={totals.water} max={profile.targets.waterMl} />
        </button>
        <button className="card card-tight" onClick={() => onLog({ type: 'activity' })}>
          <div className="row-between">
            <span className="item-icon"><IconWalk size={18} /></span>
            <span className="stat-value" style={{ fontSize: 18 }}>{num(totals.activeMin, lang)}</span>
          </div>
          <Bar value={totals.activeMin} max={profile.targets.activityMin} />
        </button>
      </div>

      <section className="card">
        <div className="card-head">
          <h3 className="card-title">{t('todaysMeals')}</h3>
          <span className="small faint">{num(totals.meals.length, lang)}</span>
        </div>
        {totals.meals.length ? (
          <div className="list">
            {[...totals.meals].sort((a, b) => b.ts - a.ts).map((m) => <MealRow key={m.id} meal={m} />)}
          </div>
        ) : (
          <Empty icon={<IconMeal size={20} />} title={t('nothingLoggedYet')} body={t('startByAdding')} />
        )}
      </section>

      <section className="card">
        <div className="card-head">
          <h3 className="card-title">{t('weekAtGlance')}</h3>
          <span className="small faint">{t('intakeTrend')}</span>
        </div>
        <DayBars
          data={days.map((d) => ({ label: fmtWeekday(d.ts, lang), value: d.calories }))}
          target={budget.calories}
        />
      </section>
    </>
  );
}
