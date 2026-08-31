import { useEffect, useMemo, useState } from 'react';
import { computeBudget, mealOutcomes, scoreMeal } from '../lib/algorithm';
import { uid } from '../lib/db';
import { glucoseStatus, num } from '../lib/format';
import {
  ACTIVITY_KEY, ACTIVITY_KINDS, CONTEXTS, CONTEXT_KEY, INSULIN_KEY, INSULIN_KINDS,
  SLOTS, SLOT_KEY, SYMPTOMS, SYMPTOM_KEY, guessContext, guessSlot,
} from '../lib/labels';
import { cancelReminder, notificationState, scheduleReminder } from '../lib/notify';
import { useStore } from '../lib/store';
import type {
  ActivityKind, Entry, EntryType, GlucoseContext, InsulinKind, MealSlot, SymptomTag,
} from '../lib/types';
import { IconDroplet, IconHeart, IconMeal, IconScale, IconSmile, IconSyringe, IconWalk, IconWater } from './Icons';
import { PhotoField } from './PhotoField';
import { TimePicker } from './TimePicker';
import { Field, Sheet, useToast } from './UI';

export interface LogIntent {
  type: EntryType;
  context?: GlucoseContext;
  mealId?: string;
}

const MOM_TYPES: EntryType[] = ['meal', 'glucose', 'insulin', 'water', 'activity', 'weight', 'bp', 'symptom'];
const SON_TYPES: EntryType[] = ['meal', 'water', 'activity', 'weight'];

const TYPE_ICON: Record<EntryType, JSX.Element> = {
  meal: <IconMeal size={19} />,
  glucose: <IconDroplet size={19} />,
  insulin: <IconSyringe size={19} />,
  water: <IconWater size={19} />,
  activity: <IconWalk size={19} />,
  weight: <IconScale size={19} />,
  bp: <IconHeart size={19} />,
  symptom: <IconSmile size={19} />,
};

export function LogSheet({
  open, intent, onClose,
}: {
  open: boolean;
  intent?: LogIntent;
  onClose: () => void;
}) {
  const { t, profile, entries, foods, addEntry, rememberFood, saveProfile, lang } = useStore();
  const toast = useToast();
  const isMom = profile?.role === 'mom';
  const types = isMom ? MOM_TYPES : SON_TYPES;

  const [type, setType] = useState<EntryType>('meal');
  const [ts, setTs] = useState(Date.now());

  /* meal */
  const [name, setName] = useState('');
  const [slot, setSlot] = useState<MealSlot>(guessSlot());
  const [calories, setCalories] = useState('');
  const [carbs, setCarbs] = useState('');
  const [protein, setProtein] = useState('');
  const [fat, setFat] = useState('');
  const [photoId, setPhotoId] = useState<string>();
  const [search, setSearch] = useState('');

  /* glucose */
  const [mgdl, setMgdl] = useState('');
  const [context, setContext] = useState<GlucoseContext>(guessContext());

  /* insulin */
  const [units, setUnits] = useState('');
  const [insulinKind, setInsulinKind] = useState<InsulinKind>('rapid');

  /* others */
  const [kg, setKg] = useState('');
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [pulse, setPulse] = useState('');
  const [ml, setMl] = useState('250');
  const [minutes, setMinutes] = useState('20');
  const [activityKind, setActivityKind] = useState<ActivityKind>('walk');
  const [tags, setTags] = useState<SymptomTag[]>([]);
  const [severity, setSeverity] = useState<1 | 2 | 3>(1);
  const [note, setNote] = useState('');

  const reset = () => {
    setTs(Date.now());
    setName(''); setSlot(guessSlot()); setCalories(''); setCarbs(''); setProtein(''); setFat('');
    setPhotoId(undefined); setSearch('');
    setMgdl(''); setContext(guessContext());
    setUnits(''); setKg(''); setSystolic(''); setDiastolic(''); setPulse('');
    setMl('250'); setMinutes('20'); setTags([]); setSeverity(1); setNote('');
  };

  useEffect(() => {
    if (!open) return;
    reset();
    setType(intent?.type ?? 'meal');
    if (intent?.context) setContext(intent.context);
  }, [open, intent]);

  const budget = useMemo(
    () => (profile ? computeBudget(profile, entries) : undefined),
    [profile, entries],
  );
  const outcomes = useMemo(
    () => (profile ? mealOutcomes(entries, profile.targets) : []),
    [entries, profile],
  );

  const liveScore = useMemo(() => {
    if (type !== 'meal' || !budget || !profile || !calories) return undefined;
    return scoreMeal(
      {
        slot,
        name,
        calories: Number(calories) || 0,
        carbs: carbs ? Number(carbs) : undefined,
        protein: protein ? Number(protein) : undefined,
        fat: fat ? Number(fat) : undefined,
      },
      budget,
      outcomes,
      profile.role,
    );
  }, [type, budget, profile, calories, carbs, protein, fat, slot, name, outcomes]);

  const matchingFoods = useMemo(() => {
    const q = search.trim().toLowerCase() || name.trim().toLowerCase();
    const list = [...foods].sort((a, b) => b.uses - a.uses || b.lastUsed - a.lastUsed);
    if (!q) return list.slice(0, 6);
    return list.filter((f) => f.name.toLowerCase().includes(q)).slice(0, 6);
  }, [foods, search, name]);

  if (!profile) return null;

  const readingStatus = mgdl ? glucoseStatus(Number(mgdl), context, profile.targets) : undefined;

  const canSave = (() => {
    switch (type) {
      case 'meal': return name.trim().length > 0 && Number(calories) >= 0 && calories !== '';
      case 'glucose': return Number(mgdl) > 0;
      case 'insulin': return Number(units) > 0;
      case 'weight': return Number(kg) > 0;
      case 'bp': return Number(systolic) > 0 && Number(diastolic) > 0;
      case 'water': return Number(ml) > 0;
      case 'activity': return Number(minutes) > 0;
      case 'symptom': return tags.length > 0;
      default: return false;
    }
  })();

  const save = async () => {
    const common = { id: uid(), profileId: profile.id, ts, createdAt: Date.now(), note: note.trim() || undefined };
    let entry: Entry;
    switch (type) {
      case 'meal':
        entry = {
          ...common, type: 'meal', slot, name: name.trim(),
          calories: Number(calories) || 0,
          carbs: carbs ? Number(carbs) : undefined,
          protein: protein ? Number(protein) : undefined,
          fat: fat ? Number(fat) : undefined,
          photoId,
        };
        await rememberFood({
          profileId: profile.id,
          name: name.trim(),
          calories: Number(calories) || 0,
          carbs: carbs ? Number(carbs) : undefined,
          protein: protein ? Number(protein) : undefined,
          fat: fat ? Number(fat) : undefined,
          slot,
        });
        break;
      case 'glucose':
        entry = { ...common, type: 'glucose', mgdl: Number(mgdl), context, mealId: intent?.mealId };
        break;
      case 'insulin':
        entry = { ...common, type: 'insulin', units: Number(units), kind: insulinKind };
        break;
      case 'weight':
        entry = { ...common, type: 'weight', kg: Number(kg) };
        break;
      case 'bp':
        entry = {
          ...common, type: 'bp', systolic: Number(systolic), diastolic: Number(diastolic),
          pulse: pulse ? Number(pulse) : undefined,
        };
        break;
      case 'water':
        entry = { ...common, type: 'water', ml: Number(ml) };
        break;
      case 'activity':
        entry = { ...common, type: 'activity', kind: activityKind, minutes: Number(minutes) };
        break;
      default:
        entry = { ...common, type: 'symptom', tags, severity };
    }

    await addEntry(entry);

    /* a meal schedules its own test reminder */
    if (entry.type === 'meal' && profile.reminders.postMealTest && notificationState() === 'granted') {
      scheduleReminder(
        `test-${entry.id}`,
        entry.ts + profile.reminders.testAfterMin * 60000,
        t('appName'),
        t('alertTestDue', { a: `${profile.reminders.testAfterMin}m`, b: t(SLOT_KEY[slot]) }),
      );
    }
    if (entry.type === 'glucose') cancelReminder(`test-${intent?.mealId ?? ''}`);

    // keep the profile weight current, so the calorie maths uses a real number
    if (entry.type === 'weight' && entry.kg > 0) {
      await saveProfile({ ...profile, weightKg: entry.kg });
    }

    toast(t('done'));
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('quickAdd')}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>{t('cancel')}</button>
          <button className="btn btn-primary grow" disabled={!canSave} onClick={save}>{t('save')}</button>
        </>
      }
    >
      <div className="scroll-x">
        {types.map((ty) => (
          <button
            key={ty}
            type="button"
            className="chip"
            aria-pressed={type === ty}
            onClick={() => setType(ty)}
          >
            <span className="row" style={{ gap: 6 }}>
              {TYPE_ICON[ty]}
              {t(ty === 'meal' ? 'meal' : ty === 'glucose' ? 'glucose' : ty === 'insulin' ? 'insulin'
                : ty === 'water' ? 'water' : ty === 'activity' ? 'activity' : ty === 'weight' ? 'weight'
                : ty === 'bp' ? 'bp' : 'symptom')}
            </span>
          </button>
        ))}
      </div>

      {type === 'meal' && (
        <>
          <Field label={t('whatDidYouEat')}>
            <input
              className="input"
              value={name}
              placeholder={t('mealNamePlaceholder')}
              onChange={(e) => { setName(e.target.value); setSearch(e.target.value); }}
            />
          </Field>

          {matchingFoods.length > 0 && (
            <div className="stack-2">
              <span className="label">{t('fromMyFoods')}</span>
              <div className="scroll-x">
                {matchingFoods.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className="chip chip-sm"
                    onClick={() => {
                      setName(f.name);
                      setCalories(String(f.calories));
                      setCarbs(f.carbs ? String(f.carbs) : '');
                      setProtein(f.protein ? String(f.protein) : '');
                      setFat(f.fat ? String(f.fat) : '');
                      if (f.slot) setSlot(f.slot);
                      setSearch('');
                    }}
                  >
                    {f.name} · {num(f.calories, lang)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="chips">
            {SLOTS.map((s) => (
              <button key={s} type="button" className="chip" aria-pressed={slot === s} onClick={() => setSlot(s)}>
                {t(SLOT_KEY[s])}
              </button>
            ))}
          </div>

          <div className="card card-flat card-tight">
            <span className="label">{t('calories')}</span>
            <input
              className="input-hero"
              inputMode="numeric"
              value={calories}
              placeholder="0"
              onChange={(e) => setCalories(e.target.value.replace(/\D/g, ''))}
            />
            <div className="macro-row">
              <Field label={t('carbs')}>
                <input className="input input-inline" inputMode="numeric" value={carbs}
                  onChange={(e) => setCarbs(e.target.value.replace(/\D/g, ''))} placeholder="—" />
              </Field>
              <Field label={t('protein')}>
                <input className="input input-inline" inputMode="numeric" value={protein}
                  onChange={(e) => setProtein(e.target.value.replace(/\D/g, ''))} placeholder="—" />
              </Field>
              <Field label={t('fat')}>
                <input className="input input-inline" inputMode="numeric" value={fat}
                  onChange={(e) => setFat(e.target.value.replace(/\D/g, ''))} placeholder="—" />
              </Field>
            </div>
          </div>

          {liveScore && (
            <div className="row-between card card-flat card-tight">
              <div>
                <div className="label">{t('mealScore')}</div>
                <div className="row wrap" style={{ gap: 6, marginTop: 4 }}>
                  {liveScore.flags.length ? (
                    liveScore.flags.map((f) => (
                      <span key={f.key} className={`tag tag-${f.tone === 'good' ? 'good' : 'warn'}`}>{t(f.key)}</span>
                    ))
                  ) : (
                    <span className="tag">{t(liveScore.score >= 75 ? 'scoreGood' : liveScore.score >= 50 ? 'scoreOk' : 'scoreWatch')}</span>
                  )}
                </div>
              </div>
              <div
                className="hero-num"
                style={{ fontSize: 30, color: liveScore.score >= 75 ? 'var(--good)' : liveScore.score >= 50 ? 'var(--warn)' : 'var(--bad)' }}
              >
                {num(liveScore.score, lang)}
              </div>
            </div>
          )}

          <PhotoField photoId={photoId} onChange={setPhotoId} />
        </>
      )}

      {type === 'glucose' && (
        <>
          <div className="card card-flat card-tight center">
            <span className="label">{t('reading')}</span>
            <input
              className="input-hero"
              inputMode="numeric"
              value={mgdl}
              placeholder="0"
              autoFocus
              onChange={(e) => setMgdl(e.target.value.replace(/\D/g, ''))}
            />
            <div className="row" style={{ justifyContent: 'center', gap: 8 }}>
              <span className="faint small">{t('mgdl')}</span>
              {readingStatus && (
                <span className={`tag tag-${readingStatus === 'in' ? 'good' : readingStatus === 'high' ? 'bad' : 'warn'}`}>
                  {t(readingStatus === 'in' ? 'inRange' : readingStatus === 'high' ? 'alertHighTitle' : 'alertLowTitle')}
                </span>
              )}
            </div>
          </div>
          <div className="stack-2">
            <span className="label">{t('when')}</span>
            <div className="chips">
              {CONTEXTS.map((c) => (
                <button key={c} type="button" className="chip" aria-pressed={context === c} onClick={() => setContext(c)}>
                  {t(CONTEXT_KEY[c])}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {type === 'insulin' && (
        <>
          <div className="card card-flat card-tight center">
            <span className="label">{t('insulin')}</span>
            <input
              className="input-hero"
              inputMode="decimal"
              value={units}
              placeholder="0"
              autoFocus
              onChange={(e) => setUnits(e.target.value.replace(/[^\d.]/g, ''))}
            />
            <span className="faint small">{t('units')}</span>
          </div>
          <div className="chips">
            {INSULIN_KINDS.map((k) => (
              <button key={k} type="button" className="chip" aria-pressed={insulinKind === k} onClick={() => setInsulinKind(k)}>
                {t(INSULIN_KEY[k])}
              </button>
            ))}
          </div>
        </>
      )}

      {type === 'water' && (
        <>
          <div className="chips">
            {[250, 500, 750].map((v) => (
              <button key={v} type="button" className="chip" aria-pressed={ml === String(v)} onClick={() => setMl(String(v))}>
                {num(v, lang)} {t('ml')}
              </button>
            ))}
          </div>
          <Field label={t('water')}>
            <div className="input-suffix">
              <input className="input" inputMode="numeric" value={ml} onChange={(e) => setMl(e.target.value.replace(/\D/g, ''))} />
              <span className="suffix">{t('ml')}</span>
            </div>
          </Field>
        </>
      )}

      {type === 'activity' && (
        <>
          <div className="chips">
            {ACTIVITY_KINDS.map((k) => (
              <button key={k} type="button" className="chip" aria-pressed={activityKind === k} onClick={() => setActivityKind(k)}>
                {t(ACTIVITY_KEY[k])}
              </button>
            ))}
          </div>
          <div className="chips">
            {[10, 15, 20, 30, 45, 60].map((v) => (
              <button key={v} type="button" className="chip chip-sm" aria-pressed={minutes === String(v)} onClick={() => setMinutes(String(v))}>
                {num(v, lang)} {t('minutes')}
              </button>
            ))}
          </div>
        </>
      )}

      {type === 'weight' && (
        <Field label={t('currentWeight')}>
          <div className="input-suffix">
            <input className="input" inputMode="decimal" value={kg} autoFocus
              onChange={(e) => setKg(e.target.value.replace(/[^\d.]/g, ''))} />
            <span className="suffix">{t('kg')}</span>
          </div>
        </Field>
      )}

      {type === 'bp' && (
        <div className="grid-2">
          <Field label="Systolic">
            <input className="input input-inline" inputMode="numeric" value={systolic} autoFocus
              onChange={(e) => setSystolic(e.target.value.replace(/\D/g, ''))} placeholder="120" />
          </Field>
          <Field label="Diastolic">
            <input className="input input-inline" inputMode="numeric" value={diastolic}
              onChange={(e) => setDiastolic(e.target.value.replace(/\D/g, ''))} placeholder="80" />
          </Field>
          <Field label="Pulse">
            <input className="input input-inline" inputMode="numeric" value={pulse}
              onChange={(e) => setPulse(e.target.value.replace(/\D/g, ''))} placeholder="—" />
          </Field>
        </div>
      )}

      {type === 'symptom' && (
        <>
          <div className="chips">
            {SYMPTOMS.map((s) => (
              <button
                key={s}
                type="button"
                className="chip"
                aria-pressed={tags.includes(s)}
                onClick={() => setTags((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))}
              >
                {t(SYMPTOM_KEY[s])}
              </button>
            ))}
          </div>
          <div className="stack-2">
            <span className="label">{t('severity')}</span>
            <div className="chips">
              {([1, 2, 3] as const).map((s) => (
                <button key={s} type="button" className="chip chip-sm" aria-pressed={severity === s} onClick={() => setSeverity(s)}>
                  {t(s === 1 ? 'mild' : s === 2 ? 'moderate' : 'strong')}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <TimePicker ts={ts} onChange={setTs} />

      <Field label={t('note')}>
        <textarea className="textarea" value={note} placeholder={t('notePlaceholder')} onChange={(e) => setNote(e.target.value)} />
      </Field>
    </Sheet>
  );
}
