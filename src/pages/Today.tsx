import { useMemo } from 'react';
import { GlucoseChart } from '../components/Charts';
import {
  IconChevron, IconDroplet, IconSpark, IconSyringe, IconWalk, IconWater,
} from '../components/Icons';
import type { LogIntent } from '../components/LogSheet';
import { Bar, Empty, Ring } from '../components/UI';
import {
  alerts, computeBudget, dailyTotals, lastNDays, mealOutcomes, scoreMeal, streak,
} from '../lib/algorithm';
import { fmtTime, fmtWeekday, glucoseStatus, num } from '../lib/format';
import { CONTEXT_KEY, SLOTS, SLOT_KEY } from '../lib/labels';
import { useStore } from '../lib/store';
import type { MealSlot } from '../lib/types';
import { MealRow } from './MealRow';

export function Today({ onLog, onSwitch }: { onLog: (intent?: LogIntent) => void; onSwitch: () => void }) {
  const { t, profile, entries, lang } = useStore();
  const now = Date.now();

  const budget = useMemo(() => (profile ? computeBudget(profile, entries, now) : null), [profile, entries, now]);
  const totals = useMemo(() => dailyTotals(entries, now), [entries, now]);
  const outcomes = useMemo(() => (profile ? mealOutcomes(entries, profile.targets) : []), [entries, profile]);
  const live = useMemo(
    () =>
      profile
        ? alerts(
            profile,
            entries,
            { slot: (s) => t(SLOT_KEY[s]), context: (c) => t(CONTEXT_KEY[c]) },
            now,
          )
        : [],
    [profile, entries, t, now],
  );
  const days = useMemo(() => lastNDays(entries, 7, now), [entries, now]);
  const runStreak = useMemo(() => streak(entries, now), [entries, now]);

  if (!profile || !budget) return null;

  const hour = new Date().getHours();
  const greet = hour < 12 ? 'greetMorning' : hour < 18 ? 'greetAfternoon' : 'greetEvening';
  const left = Math.round(budget.calories - totals.calories);
  const inRangeToday = totals.readings.filter(
    (r) => glucoseStatus(r.mgdl, r.context, profile.targets) === 'in',
  ).length;

  const perSlot = SLOTS.map((slot: MealSlot) => {
    const plan = budget.slots.find((s) => s.slot === slot);
    const eaten = totals.meals.filter((m) => m.slot === slot);
    return {
      slot,
      plannedCarbs: plan?.carbs ?? 0,
      eatenCarbs: eaten.reduce((a, m) => a + (m.carbs ?? 0), 0),
      eatenCals: eaten.reduce((a, m) => a + m.calories, 0),
      count: eaten.length,
      adjusted: plan?.adjusted ?? false,
    };
  });

  const glassesLeft = Math.max(0, Math.ceil((profile.targets.waterMl - totals.water) / 250));

  return (
    <>
      <header className="appbar">
        <div>
          {/* separate spans keep the bidi algorithm from reshuffling the line in Arabic */}
          <h1 className="appbar-title display row wrap" style={{ gap: 8 }}>
            <span>{t(greet)}</span>
            <span>{profile.name}</span>
          </h1>
          <p className="appbar-sub row wrap" style={{ gap: 8 }}>
            {budget.week ? (
              <>
                <span>{t('week')} {num(budget.week, lang)}</span>
                <span aria-hidden>·</span>
                <span>{num(runStreak, lang)} {t('streak')}</span>
              </>
            ) : (
              <span>{t('tagline')}</span>
            )}
          </p>
        </div>
        <button className="avatar" onClick={onSwitch} aria-label={t('switchProfile')}>{profile.emoji}</button>
      </header>

      {/* ---- alerts the algorithm raised ---- */}
      {live.map((a) => (
        <div key={a.id} className={`banner banner-${a.tone === 'warn' ? 'warn' : 'info'}`}>
          <span className="banner-dot" />
          <span className="grow">{t(a.key, a.params)}</span>
          {(a.kind === 'test-due' || a.kind === 'test-soon') && (
            <button
              className="btn btn-sm btn-primary"
              onClick={() => onLog({ type: 'glucose', context: a.context, mealId: a.mealId })}
            >
              {t('logNow')}
            </button>
          )}
          {a.kind === 'walk' && (
            <button className="btn btn-sm btn-ghost" onClick={() => onLog({ type: 'activity' })}>
              <IconWalk size={16} />
            </button>
          )}
        </div>
      ))}

      {/* ---- energy + carbs ---- */}
      <section className="card card-hero">
        <div className="row" style={{ gap: 20 }}>
          <Ring value={totals.calories} max={budget.calories} size={132} stroke={12}>
            <div>
              <div className="hero-num" style={{ fontSize: 30 }}>{num(Math.abs(left), lang)}</div>
              <div className="tiny faint">{left >= 0 ? t('leftToday') : t('overBudget')}</div>
            </div>
          </Ring>
          <div className="grow stack-2">
            <div>
              <div className="eyebrow">{t('eatenToday')}</div>
              <div className="row" style={{ gap: 6, alignItems: 'baseline' }}>
                <span className="stat-value">{num(totals.calories, lang)}</span>
                <span className="small faint">{t('ofTarget', { a: num(budget.calories, lang) })}</span>
              </div>
            </div>
            <div className="stack-2">
              <div className="row-between tiny">
                <span className="muted">{t('carbsToday')}</span>
                <span className="num muted">
                  {num(totals.carbs, lang)} / {num(budget.carbs, lang)} {t('gramsShort')}
                </span>
              </div>
              <Bar value={totals.carbs} max={budget.carbs} tone={totals.carbs > budget.carbs ? 'warn' : undefined} />
            </div>
            <div className="row wrap" style={{ gap: 6 }}>
              <span className="tag tag-accent">
                {num(totals.protein, lang)} {t('gramsShort')} · {t('protein')}
              </span>
              {runStreak > 1 && <span className="tag tag-good">{num(runStreak, lang)} {t('streak')}</span>}
            </div>
          </div>
        </div>
      </section>

      {/* ---- today's readings ---- */}
      <section className="card">
        <div className="card-head">
          <h3 className="card-title">{t('glucose')}</h3>
          <span className="small muted">
            {totals.readings.length
              ? `${num(inRangeToday, lang)}/${num(totals.readings.length, lang)} ${t('inRange')}`
              : ''}
          </span>
        </div>
        {totals.readings.length ? (
          <>
            <GlucoseChart
              readings={totals.readings}
              targets={profile.targets}
              days={1}
              height={120}
              labels={['00', '12', '24']}
            />
            <div className="list" style={{ marginTop: 6 }}>
              {[...totals.readings]
                .sort((a, b) => b.ts - a.ts)
                .slice(0, 4)
                .map((r) => {
                  const status = glucoseStatus(r.mgdl, r.context, profile.targets);
                  return (
                    <div key={r.id} className="item" style={{ cursor: 'default' }}>
                      <span className="item-icon"><IconDroplet size={18} /></span>
                      <span className="item-main">
                        <span className="item-title">{t(CONTEXT_KEY[r.context])}</span>
                        <span className="item-sub">{fmtTime(r.ts, lang)}</span>
                      </span>
                      <span className={`tag tag-${status === 'in' ? 'good' : status === 'high' ? 'bad' : 'warn'}`}>
                        {num(r.mgdl, lang)}
                      </span>
                    </div>
                  );
                })}
            </div>
          </>
        ) : (
          <button className="btn btn-ghost btn-block" onClick={() => onLog({ type: 'glucose' })}>
            {t('noReadingsToday')} · {t('logGlucose')}
          </button>
        )}
      </section>

      {/* ---- the adaptive plan ---- */}
      <section className="card">
        <div className="card-head">
          <h3 className="card-title">{t('todayPlan')}</h3>
          <span className="tiny faint row" style={{ gap: 4 }}><IconSpark size={13} /> {t('autoTargets')}</span>
        </div>
        <div className="col" style={{ gap: 12 }}>
          {perSlot.map((s) => (
            <div key={s.slot} className="stack-2">
              <div className="row-between small">
                <span className="row wrap" style={{ gap: 6 }}>
                  {t(SLOT_KEY[s.slot])}
                  {s.adjusted && <span className="tag tag-accent tiny">{t('slotTrimmed')}</span>}
                </span>
                <span className="num faint">
                  {num(s.eatenCarbs, lang)} / {num(s.plannedCarbs, lang)} {t('gramsShort')}
                </span>
              </div>
              <Bar
                value={s.eatenCarbs}
                max={s.plannedCarbs}
                tone={s.eatenCarbs > s.plannedCarbs * 1.05 ? 'warn' : s.count ? 'good' : undefined}
              />
            </div>
          ))}
        </div>
      </section>

      {/* ---- water + movement ---- */}
      <div className="grid-2">
        <button className="card card-tight" onClick={() => onLog({ type: 'water' })}>
          <div className="row-between">
            <span className="item-icon"><IconWater size={18} /></span>
            <span className="stat-value" style={{ fontSize: 18 }}>{num(totals.water, lang)}</span>
          </div>
          <div className="tiny faint" style={{ marginTop: 8, textAlign: 'start' }}>
            {glassesLeft > 0 ? t('waterLeft', { a: num(glassesLeft, lang) }) : t('waterDone')}
          </div>
          <Bar value={totals.water} max={profile.targets.waterMl} tone={glassesLeft ? undefined : 'good'} />
        </button>
        <button className="card card-tight" onClick={() => onLog({ type: 'activity' })}>
          <div className="row-between">
            <span className="item-icon"><IconWalk size={18} /></span>
            <span className="stat-value" style={{ fontSize: 18 }}>{num(totals.activeMin, lang)}</span>
          </div>
          <div className="tiny faint" style={{ marginTop: 8, textAlign: 'start' }}>
            {t('moveGoal', { a: num(totals.activeMin, lang), b: num(profile.targets.activityMin, lang) })}
          </div>
          <Bar
            value={totals.activeMin}
            max={profile.targets.activityMin}
            tone={totals.activeMin >= profile.targets.activityMin ? 'good' : undefined}
          />
        </button>
      </div>

      {/* ---- meals ---- */}
      <section className="card">
        <div className="card-head">
          <h3 className="card-title">{t('todaysMeals')}</h3>
          {totals.insulinUnits > 0 && (
            <span className="tag"><IconSyringe size={13} /> {num(totals.insulinUnits, lang, 1)} {t('units')}</span>
          )}
        </div>
        {totals.meals.length ? (
          <div className="list">
            {[...totals.meals]
              .sort((a, b) => b.ts - a.ts)
              .map((m) => (
                <MealRow key={m.id} meal={m} score={scoreMeal(m, budget, outcomes, profile.role).score} />
              ))}
          </div>
        ) : (
          <Empty icon={<IconChevron size={20} />} title={t('nothingLoggedYet')} body={t('startByAdding')} />
        )}
      </section>

      {/* ---- the week ---- */}
      <section className="card">
        <div className="card-head">
          <h3 className="card-title">{t('weekAtGlance')}</h3>
        </div>
        <div className="week-strip">
          {days.map((d, i) => (
            <div key={d.ts} className="week-day">
              <div className={`week-dot${d.logged ? ' filled' : ''}${i === days.length - 1 ? ' today' : ''}`}>
                {d.avgGlucose ? num(Math.round(d.avgGlucose), lang) : d.logged ? '·' : ''}
              </div>
              <span className="week-label">{fmtWeekday(d.ts, lang)}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
