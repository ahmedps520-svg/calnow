import { useMemo, useState } from 'react';
import { IconBack, IconChevron } from '../components/Icons';
import { dailyTotals, glucoseStats, ofType } from '../lib/algorithm';
import { DAY, addDays, fmtLongDate, fmtTime, glucoseStatus, num, startOfDay } from '../lib/format';
import { ACTIVITY_KEY, CONTEXT_KEY, INSULIN_KEY, SLOT_KEY, SYMPTOM_KEY } from '../lib/labels';
import { useStore } from '../lib/store';
import type { Entry, Profile } from '../lib/types';

/** Read-only view meant to be handed across a desk. No editing, no clutter. */
export function Doctor({ profileId, onExit }: { profileId: string; onExit: () => void }) {
  const { profiles, allEntries, t, lang } = useStore();
  const profile = profiles.find((p) => p.id === profileId) as Profile | undefined;
  const [weekOffset, setWeekOffset] = useState(0);

  const entries = useMemo(
    () => allEntries.filter((e) => e.profileId === profileId),
    [allEntries, profileId],
  );

  const to = startOfDay(Date.now()) + DAY - 1 - weekOffset * 7 * DAY;
  const from = startOfDay(to) - 6 * DAY;

  const stats = useMemo(
    () => (profile ? glucoseStats(entries, profile.targets, from, to) : null),
    [entries, profile, from, to],
  );

  const days = useMemo(() => {
    const out: { ts: number; entries: Entry[] }[] = [];
    for (let i = 0; i < 7; i += 1) {
      const ts = startOfDay(addDays(from, i));
      const list = entries
        .filter((e) => e.ts >= ts && e.ts < ts + DAY)
        .sort((a, b) => a.ts - b.ts);
      out.push({ ts, entries: list });
    }
    return out.reverse();
  }, [entries, from]);

  if (!profile || !stats) return null;

  const totalDaysLogged = days.filter((d) => d.entries.length > 0).length;

  return (
    <div className="doctor" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="doc-head no-print">
        <button className="icon-btn" onClick={onExit} aria-label={t('exitDoctorMode')}>
          <IconBack size={19} />
        </button>
        <div style={{ textAlign: 'center' }}>
          <div className="doc-title">{profile.name}</div>
          <div style={{ fontSize: 12, color: '#7d7268' }}>{t('doctorSubtitle')}</div>
        </div>
        <button className="btn btn-sm btn-ghost" onClick={() => window.print()}>{t('printReport')}</button>
      </div>

      <div className="screen" style={{ paddingTop: 16 }}>
        <div className="doc-nav no-print">
          <button className="btn btn-sm btn-ghost" onClick={() => setWeekOffset((w) => w + 1)}>
            <IconBack size={16} />
          </button>
          <div style={{ fontWeight: 600 }}>
            {fmtLongDate(from, lang)} — {fmtLongDate(to, lang)}
          </div>
          <button
            className="btn btn-sm btn-ghost"
            disabled={weekOffset === 0}
            onClick={() => setWeekOffset((w) => Math.max(0, w - 1))}
          >
            <IconChevron size={16} />
          </button>
        </div>

        <div className="doc-summary">
          <div className="doc-stat">
            <b>{num(stats.count, lang)}</b>
            <span>{t('readings')}</span>
          </div>
          <div className="doc-stat">
            <b>{stats.count ? `${num(stats.tir * 100, lang)}%` : '—'}</b>
            <span>{t('inRange')}</span>
          </div>
          <div className="doc-stat">
            <b>{stats.count ? num(stats.avg, lang) : '—'}</b>
            <span>{t('average')}</span>
          </div>
          <div className="doc-stat">
            <b>{stats.count ? num(stats.eA1c, lang, 1) : '—'}</b>
            <span>{t('estA1c')}</span>
          </div>
        </div>

        <p className="doc-note" style={{ marginBottom: 16 }}>
          {t('targetsRow', {
            a: num(profile.targets.fastingMax, lang),
            b: num(profile.targets.post1Max, lang),
            c: num(profile.targets.post2Max, lang),
          })}
          {' · '}
          {t('daysCovered', { a: num(totalDaysLogged, lang) })}
        </p>

        {days.map((d) => {
          const totals = dailyTotals(d.entries, d.ts);
          const readings = ofType(d.entries, 'glucose');
          const insulin = ofType(d.entries, 'insulin');
          const meals = ofType(d.entries, 'meal');
          const others = d.entries.filter(
            (e) => e.type === 'bp' || e.type === 'weight' || e.type === 'symptom' || e.type === 'activity',
          );

          return (
            <div className="doc-day" key={d.ts}>
              <div className="doc-date">{fmtLongDate(d.ts, lang)}</div>
              {d.entries.length === 0 ? (
                <p className="doc-note">{t('noEntriesDay')}</p>
              ) : (
                <>
                  <p className="doc-note" style={{ marginBottom: 10 }}>
                    {num(totals.calories, lang)} {t('kcal')} · {num(totals.carbs, lang)} {t('gramsShort')} {t('carbs')}
                    {totals.insulinUnits > 0 && ` · ${num(totals.insulinUnits, lang, 1)} ${t('units')} ${t('insulin')}`}
                  </p>

                  {readings.length > 0 && (
                    <table className="doc-table" style={{ marginBottom: 12 }}>
                      <thead>
                        <tr>
                          <th>{t('time')}</th>
                          <th>{t('when')}</th>
                          <th style={{ textAlign: 'end' }}>{t('mgdl')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {readings.map((r) => {
                          const status = glucoseStatus(r.mgdl, r.context, profile.targets);
                          return (
                            <tr key={r.id}>
                              <td>{fmtTime(r.ts, lang)}</td>
                              <td>{t(CONTEXT_KEY[r.context])}</td>
                              <td style={{ textAlign: 'end' }}>
                                <span className={`doc-flag doc-${status}`}>
                                  {num(r.mgdl, lang)}
                                  {status === 'high' ? ' ↑' : status === 'low' ? ' ↓' : ''}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}

                  {insulin.length > 0 && (
                    <table className="doc-table" style={{ marginBottom: 12 }}>
                      <tbody>
                        {insulin.map((i) => (
                          <tr key={i.id}>
                            <td>{fmtTime(i.ts, lang)}</td>
                            <td>{t(INSULIN_KEY[i.kind])} {t('insulin')}</td>
                            <td style={{ textAlign: 'end' }}>{num(i.units, lang, 1)} {t('units')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {meals.length > 0 && (
                    <table className="doc-table">
                      <tbody>
                        {meals.map((m) => (
                          <tr key={m.id}>
                            <td>{fmtTime(m.ts, lang)}</td>
                            <td>
                              {m.name}
                              <div style={{ fontSize: 12, color: '#7d7268' }}>{t(SLOT_KEY[m.slot])}</div>
                            </td>
                            <td style={{ textAlign: 'end' }}>
                              {num(m.calories, lang)} {t('kcal')}
                              {m.carbs ? (
                                <div style={{ fontSize: 12, color: '#7d7268' }}>
                                  {num(m.carbs, lang)} {t('gramsShort')} {t('carbs')}
                                </div>
                              ) : null}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {others.length > 0 && (
                    <p className="doc-note" style={{ marginTop: 10 }}>
                      {others
                        .map((e) => {
                          if (e.type === 'bp') return `${t('bp')} ${num(e.systolic, lang)}/${num(e.diastolic, lang)}`;
                          if (e.type === 'weight') return `${t('weight')} ${num(e.kg, lang, 1)} ${t('kg')}`;
                          if (e.type === 'activity') return `${t(ACTIVITY_KEY[e.kind])} ${num(e.minutes, lang)} ${t('minutes')}`;
                          return `${t('symptom')}: ${e.tags.map((tag) => t(SYMPTOM_KEY[tag])).join(', ')}`;
                        })
                        .join(' · ')}
                    </p>
                  )}
                </>
              )}
            </div>
          );
        })}

        <p className="doc-note center no-print" style={{ marginTop: 8 }}>{t('medicalNote')}</p>
      </div>
    </div>
  );
}
