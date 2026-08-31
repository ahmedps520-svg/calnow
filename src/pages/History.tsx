import { useMemo, useState } from 'react';
import {
  IconDroplet, IconHeart, IconList, IconMeal, IconScale, IconSmile, IconSyringe, IconTrash, IconWalk, IconWater,
} from '../components/Icons';
import { Confirm, Empty, Sheet } from '../components/UI';
import { computeBudget, mealOutcomes, scoreMeal } from '../lib/algorithm';
import { dayKey, fmtLongDate, fmtTime, glucoseStatus, num, sameDay } from '../lib/format';
import {
  ACTIVITY_KEY, CONTEXT_KEY, INSULIN_KEY, SLOT_KEY, SYMPTOM_KEY, TYPE_KEY,
} from '../lib/labels';
import { photoUrl } from '../lib/photos';
import { useStore } from '../lib/store';
import type { Entry, EntryType } from '../lib/types';
import { MealRow } from './MealRow';
import { useEffect } from 'react';

const ICONS: Record<EntryType, JSX.Element> = {
  meal: <IconMeal size={18} />,
  glucose: <IconDroplet size={18} />,
  insulin: <IconSyringe size={18} />,
  water: <IconWater size={18} />,
  activity: <IconWalk size={18} />,
  weight: <IconScale size={18} />,
  bp: <IconHeart size={18} />,
  symptom: <IconSmile size={18} />,
};

export function History({ onSwitch }: { onSwitch: () => void }) {
  const { t, profile, entries, deleteEntry, lang } = useStore();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<EntryType | 'all'>('all');
  const [detail, setDetail] = useState<Entry | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [photo, setPhoto] = useState<string>();

  const budget = useMemo(() => (profile ? computeBudget(profile, entries) : null), [profile, entries]);
  const outcomes = useMemo(() => (profile ? mealOutcomes(entries, profile.targets) : []), [entries, profile]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (filter !== 'all' && e.type !== filter) return false;
      if (!q) return true;
      const hay = [
        e.type === 'meal' ? e.name : '',
        e.note ?? '',
        e.type === 'glucose' ? String(e.mgdl) : '',
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [entries, query, filter]);

  const groups = useMemo(() => {
    const map = new Map<string, Entry[]>();
    filtered.forEach((e) => {
      const k = dayKey(e.ts);
      map.set(k, [...(map.get(k) ?? []), e]);
    });
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [filtered]);

  useEffect(() => {
    let alive = true;
    setPhoto(undefined);
    if (detail?.type === 'meal' && detail.photoId) {
      photoUrl(detail.photoId).then((u) => alive && setPhoto(u));
    }
    return () => {
      alive = false;
    };
  }, [detail]);

  if (!profile || !budget) return null;

  const types: (EntryType | 'all')[] =
    profile.role === 'mom'
      ? ['all', 'meal', 'glucose', 'insulin', 'weight', 'bp', 'activity', 'water', 'symptom']
      : ['all', 'meal', 'activity', 'water', 'weight'];

  const describe = (e: Entry): { title: string; sub: string; value: string; tone?: string } => {
    switch (e.type) {
      case 'glucose': {
        const status = glucoseStatus(e.mgdl, e.context, profile.targets);
        return {
          title: t(CONTEXT_KEY[e.context]),
          sub: fmtTime(e.ts, lang),
          value: `${num(e.mgdl, lang)}`,
          tone: status === 'in' ? 'good' : status === 'high' ? 'bad' : 'warn',
        };
      }
      case 'insulin':
        return { title: t(INSULIN_KEY[e.kind]), sub: fmtTime(e.ts, lang), value: `${num(e.units, lang, 1)} ${t('units')}` };
      case 'weight':
        return { title: t('weight'), sub: fmtTime(e.ts, lang), value: `${num(e.kg, lang, 1)} ${t('kg')}` };
      case 'bp':
        return {
          title: t('bp'),
          sub: fmtTime(e.ts, lang),
          value: `${num(e.systolic, lang)}/${num(e.diastolic, lang)}`,
        };
      case 'water':
        return { title: t('water'), sub: fmtTime(e.ts, lang), value: `${num(e.ml, lang)} ${t('ml')}` };
      case 'activity':
        return {
          title: t(ACTIVITY_KEY[e.kind]),
          sub: fmtTime(e.ts, lang),
          value: `${num(e.minutes, lang)} ${t('minutes')}`,
        };
      case 'symptom':
        return {
          title: e.tags.map((tag) => t(SYMPTOM_KEY[tag])).join(' · '),
          sub: fmtTime(e.ts, lang),
          value: t(e.severity === 1 ? 'mild' : e.severity === 2 ? 'moderate' : 'strong'),
        };
      default:
        return { title: e.type, sub: fmtTime(e.ts, lang), value: '' };
    }
  };

  return (
    <>
      <header className="appbar">
        <div>
          <h1 className="appbar-title display">{t('navHistory')}</h1>
          <p className="appbar-sub">{t('daysCovered', { a: num(groups.length, lang) })}</p>
        </div>
        <button className="avatar" onClick={onSwitch} aria-label={t('switchProfile')}>{profile.emoji}</button>
      </header>

      <input
        className="input"
        placeholder={t('searchLog')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="scroll-x">
        {types.map((ty) => (
          <button
            key={ty}
            className="chip chip-sm"
            aria-pressed={filter === ty}
            onClick={() => setFilter(ty)}
            type="button"
          >
            {ty === 'all' ? t('all') : t(TYPE_KEY[ty])}
          </button>
        ))}
      </div>

      {groups.length === 0 && <Empty icon={<IconList size={20} />} title={t('noMatches')} />}

      {groups.map(([key, list]) => (
        <section className="card" key={key}>
          <div className="card-head">
            <h3 className="card-title">
              {sameDay(list[0].ts, Date.now()) ? t('today') : fmtLongDate(list[0].ts, lang)}
            </h3>
            <span className="small faint">{num(list.length, lang)}</span>
          </div>
          <div className="list">
            {[...list]
              .sort((a, b) => b.ts - a.ts)
              .map((e) =>
                e.type === 'meal' ? (
                  <MealRow
                    key={e.id}
                    meal={e}
                    score={profile.role === 'mom' ? scoreMeal(e, budget, outcomes, profile.role).score : undefined}
                    onClick={() => setDetail(e)}
                  />
                ) : (
                  (() => {
                    const d = describe(e);
                    return (
                      <button key={e.id} className="item" onClick={() => setDetail(e)}>
                        <span className="item-icon">{ICONS[e.type]}</span>
                        <span className="item-main">
                          <span className="item-title">{d.title}</span>
                          <span className="item-sub">{d.sub}{e.note ? ` · ${e.note}` : ''}</span>
                        </span>
                        <span className={d.tone ? `tag tag-${d.tone}` : 'item-value'}>{d.value}</span>
                      </button>
                    );
                  })()
                ),
              )}
          </div>
        </section>
      ))}

      <Sheet
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail?.type === 'meal' ? detail.name : detail ? t(TYPE_KEY[detail.type]) : ''}
        footer={
          <>
            <button className="btn btn-ghost grow" onClick={() => setDetail(null)}>{t('close')}</button>
            <button className="btn btn-danger" onClick={() => setConfirming(true)}>
              <IconTrash size={17} /> {t('delete')}
            </button>
          </>
        }
      >
        {detail && (
          <div className="col">
            {photo && (
              <div className="photo-frame">
                <img src={photo} alt="" />
              </div>
            )}
            <div className="row-between">
              <span className="muted">{t('time')}</span>
              <span>{fmtLongDate(detail.ts, lang)} · {fmtTime(detail.ts, lang)}</span>
            </div>
            {detail.type === 'meal' && (
              <>
                <div className="row-between">
                  <span className="muted">{t('meal')}</span>
                  <span>{t(SLOT_KEY[detail.slot])}</span>
                </div>
                <div className="stat-grid">
                  <div className="stat">
                    <div className="stat-value">{num(detail.calories, lang)}</div>
                    <div className="stat-label">{t('kcal')}</div>
                  </div>
                  <div className="stat">
                    <div className="stat-value">{detail.carbs ? num(detail.carbs, lang) : '—'}</div>
                    <div className="stat-label">{t('carbs')}</div>
                  </div>
                  <div className="stat">
                    <div className="stat-value">{detail.protein ? num(detail.protein, lang) : '—'}</div>
                    <div className="stat-label">{t('protein')}</div>
                  </div>
                </div>
              </>
            )}
            {detail.type !== 'meal' && (
              <div className="row-between">
                <span className="muted">{describe(detail).title}</span>
                <span className="item-value">{describe(detail).value}</span>
              </div>
            )}
            {detail.note && <p className="muted">{detail.note}</p>}
          </div>
        )}
      </Sheet>

      <Confirm
        open={confirming}
        title={t('deleteEntryQ')}
        body={t('deleteEntryBody')}
        confirmLabel={t('delete')}
        cancelLabel={t('cancel')}
        danger
        onCancel={() => setConfirming(false)}
        onConfirm={async () => {
          if (detail) await deleteEntry(detail.id);
          setConfirming(false);
          setDetail(null);
        }}
      />
    </>
  );
}
