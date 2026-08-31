import { useMemo, useState } from 'react';
import { DayBars, GlucoseChart, Sparkline } from '../components/Charts';
import { IconChart, IconSpark } from '../components/Icons';
import { Bar, Empty, Segmented } from '../components/UI';
import {
  computeBudget, findings, glucoseStats, lastNDays, mealOutcomes, ofType,
} from '../lib/algorithm';
import { DAY, fmtDate, fmtWeekday, mean, num } from '../lib/format';
import { CONTEXT_KEY, SLOT_KEY } from '../lib/labels';
import { useStore } from '../lib/store';

type Range = '7' | '30';

export function Insights({ onSwitch }: { onSwitch: () => void }) {
  const { t, profile, entries, lang } = useStore();
  const [range, setRange] = useState<Range>('7');
  const now = Date.now();
  const days = Number(range);
  const from = now - days * DAY;

  const stats = useMemo(
    () => (profile ? glucoseStats(entries, profile.targets, from, now) : null),
    [entries, profile, from, now],
  );
  const budget = useMemo(() => (profile ? computeBudget(profile, entries, now) : null), [profile, entries, now]);
  const list = useMemo(
    () => (profile ? findings(profile, entries, (s) => t(SLOT_KEY[s]), now) : []),
    [profile, entries, t, now],
  );
  const outcomes = useMemo(
    () => (profile ? mealOutcomes(entries, profile.targets, now) : []),
    [entries, profile, now],
  );
  const dayRows = useMemo(() => lastNDays(entries, Math.min(days, 14), now), [entries, days, now]);
  const weights = useMemo(
    () => ofType(entries, 'weight').filter((w) => w.ts >= from).sort((a, b) => a.ts - b.ts),
    [entries, from],
  );
  const bps = useMemo(
    () => ofType(entries, 'bp').filter((b) => b.ts >= from).sort((a, b) => b.ts - a.ts).slice(0, 3),
    [entries, from],
  );

  if (!profile || !stats || !budget) return null;
  /* "spiked you" has to mean something — only meals that actually cleared the ceiling */
  const worstMeals = [...outcomes]
    .reverse()
    .filter((o) => o.avgPost > profile.targets.post2Max)
    .slice(0, 3);
  const isMom = profile.role === 'mom';
  const readings = ofType(entries, 'glucose');

  return (
    <>
      <header className="appbar">
        <div>
          <h1 className="appbar-title display">{t('navInsights')}</h1>
          <p className="appbar-sub">{t('daysCovered', { a: num(days, lang) })}</p>
        </div>
        <button className="avatar" onClick={onSwitch} aria-label={t('switchProfile')}>{profile.emoji}</button>
      </header>

      <Segmented
        value={range}
        onChange={setRange}
        options={[
          { value: '7', label: t('week') },
          { value: '30', label: t('month') },
        ]}
      />

      {isMom && (
        <section className="card">
          <div className="card-head">
            <h3 className="card-title">{t('glucoseTrend')}</h3>
            <span className="small faint">{num(stats.count, lang)} {t('readings')}</span>
          </div>
          {stats.count ? (
            <>
              <div className="stat-grid" style={{ marginBottom: 12 }}>
                <div className="stat">
                  <div className="stat-value" style={{ color: stats.tir >= 0.7 ? 'var(--good)' : 'var(--warn)' }}>
                    {num(stats.tir * 100, lang)}%
                  </div>
                  <div className="stat-label">{t('timeInRange')}</div>
                </div>
                <div className="stat">
                  <div className="stat-value">{num(stats.avg, lang)}</div>
                  <div className="stat-label">{t('average')}</div>
                </div>
                <div className="stat">
                  <div className="stat-value">{num(stats.eA1c, lang, 1)}%</div>
                  <div className="stat-label">{t('estA1c')}</div>
                </div>
              </div>
              <GlucoseChart
                readings={readings}
                targets={profile.targets}
                days={days}
                labels={[fmtDate(from, lang), fmtDate(now, lang)]}
              />
              <div className="legend" style={{ marginTop: 8 }}>
                <span><i style={{ background: 'var(--good)' }} />{t('inRange')} {num(stats.inRange, lang)}</span>
                <span><i style={{ background: 'var(--bad)' }} />{t('highs')} {num(stats.high, lang)}</span>
                <span><i style={{ background: 'var(--warn)' }} />{t('lows')} {num(stats.low, lang)}</span>
              </div>
            </>
          ) : (
            <Empty icon={<IconChart size={20} />} title={t('needMoreData')} />
          )}
        </section>
      )}

      {isMom && stats.byContext.length > 0 && (
        <section className="card">
          <div className="card-head"><h3 className="card-title">{t('byContext')}</h3></div>
          <div className="col" style={{ gap: 12 }}>
            {stats.byContext.map((c) => (
              <div key={c.context} className="stack-2">
                <div className="row-between small">
                  <span>{t(CONTEXT_KEY[c.context])}</span>
                  <span className="faint">
                    {num(c.avg, lang)} {t('mgdl')} · {num(c.inRatio * 100, lang)}% {t('inRange')}
                  </span>
                </div>
                <Bar value={c.inRatio * 100} max={100} tone={c.inRatio >= 0.7 ? 'good' : c.inRatio >= 0.4 ? 'warn' : 'bad'} />
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="card">
        <div className="card-head">
          <h3 className="card-title row" style={{ gap: 6 }}>
            <IconSpark size={16} /> {t('whatWeLearned')}
          </h3>
        </div>
        {list.length ? (
          <div className="list">
            {list.slice(0, 6).map((f) => (
              <div key={f.id} className="finding">
                <span className={`finding-mark finding-${f.tone}`}>
                  {f.tone === 'good' ? '✓' : f.tone === 'warn' ? '!' : 'i'}
                </span>
                <span>{t(f.key, f.params)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted small">{t('needMoreData')}</p>
        )}
      </section>

      <section className="card">
        <div className="card-head">
          <h3 className="card-title">{t('intakeTrend')}</h3>
          <span className="small faint">{t('ofTarget', { a: num(budget.calories, lang) })}</span>
        </div>
        <DayBars
          data={dayRows.map((d) => ({ label: fmtWeekday(d.ts, lang), value: d.calories }))}
          target={budget.calories}
        />
        {isMom && (
          <>
            <div className="card-head" style={{ marginTop: 14 }}>
              <h3 className="card-title">{t('carbTrend')}</h3>
              <span className="small faint">{t('ofTarget', { a: num(budget.carbs, lang) })}</span>
            </div>
            <DayBars
              data={dayRows.map((d) => ({ label: fmtWeekday(d.ts, lang), value: d.carbs }))}
              target={budget.carbs}
            />
          </>
        )}
      </section>

      {isMom && outcomes.length >= 2 && (
        <section className="card">
          <div className="card-head"><h3 className="card-title">{t('bestMeals')}</h3></div>
          <div className="list">
            {outcomes.slice(0, 3).map((o) => (
              <div key={`b-${o.name}`} className="item" style={{ cursor: 'default' }}>
                <span className="item-icon">🌿</span>
                <span className="item-main">
                  <span className="item-title">{o.name}</span>
                  <span className="item-sub">{t('basedOnReadings', { a: num(o.n, lang) })}</span>
                </span>
                <span className="tag tag-good">{num(o.avgPost, lang)}</span>
              </div>
            ))}
          </div>
          {worstMeals.length > 0 && (
            <>
              <div className="card-head" style={{ marginTop: 14 }}>
                <h3 className="card-title">{t('worstMeals')}</h3>
              </div>
              <div className="list">
                {worstMeals.map((o) => (
                  <div key={`w-${o.name}`} className="item" style={{ cursor: 'default' }}>
                    <span className="item-icon">⚠️</span>
                    <span className="item-main">
                      <span className="item-title">{o.name}</span>
                      <span className="item-sub">{t('basedOnReadings', { a: num(o.n, lang) })}</span>
                    </span>
                    <span className="tag tag-bad">{num(o.avgPost, lang)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {weights.length >= 2 && (
        <section className="card">
          <div className="card-head">
            <h3 className="card-title">{t('weightTrend')}</h3>
            <span className="small faint num">
              {num(weights[weights.length - 1].kg, lang, 1)} {t('kg')}
            </span>
          </div>
          <Sparkline values={weights.map((w) => w.kg)} />
        </section>
      )}

      {isMom && bps.length > 0 && (
        <section className="card">
          <div className="card-head">
            <h3 className="card-title">{t('bpTrend')}</h3>
            <span className="small faint num">
              {num(mean(bps.map((b) => b.systolic)), lang)}/{num(mean(bps.map((b) => b.diastolic)), lang)}
            </span>
          </div>
          <div className="list">
            {bps.map((b) => (
              <div key={b.id} className="item" style={{ cursor: 'default' }}>
                <span className="item-main">
                  <span className="item-title num">{num(b.systolic, lang)}/{num(b.diastolic, lang)} {t('mmHg')}</span>
                  <span className="item-sub">{fmtDate(b.ts, lang)}</span>
                </span>
                {b.pulse ? <span className="item-value">{num(b.pulse, lang)}</span> : null}
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
