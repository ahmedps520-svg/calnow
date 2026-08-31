import { useState } from 'react';
import { Logo } from '../components/Logo';
import { Field } from '../components/UI';
import { useStore } from '../lib/store';
import type { Lang, Profile } from '../lib/types';

const EMOJIS = ['🌸', '🌿', '💗', '🌺', '⚡', '🔥', '🌊', '🍀'];

export function Onboarding() {
  const { profiles, saveProfile, setOnboarded, t } = useStore();
  const [step, setStep] = useState(0);
  const mom = profiles.find((p) => p.role === 'mom');
  const son = profiles.find((p) => p.role === 'son');
  const [draft, setDraft] = useState<Record<string, Profile>>({});

  const current = step === 1 ? mom : step === 2 ? son : undefined;
  const working = current ? draft[current.id] ?? current : undefined;

  const update = (changes: Partial<Profile>) => {
    if (!working) return;
    setDraft((d) => ({ ...d, [working.id]: { ...working, ...changes } }));
  };

  const commit = async () => {
    for (const p of Object.values(draft)) await saveProfile(p);
  };

  const finish = async () => {
    await commit();
    await setOnboarded(true);
  };

  if (step === 0) {
    return (
      <div className="picker">
        <div className="col" style={{ alignItems: 'center', gap: 14 }}>
          <Logo size={72} />
          <h1 className="display" style={{ fontSize: 30 }}>{t('welcome')}</h1>
          <p className="muted center">{t('welcomeBody')}</p>
        </div>
        <div className="chips" style={{ justifyContent: 'center' }}>
          {(['en', 'ar'] as Lang[]).map((l) => (
            <button
              key={l}
              className="chip"
              aria-pressed={profiles.every((p) => p.lang === l)}
              onClick={() => profiles.forEach((p) => saveProfile({ ...p, lang: l }))}
              type="button"
            >
              {t(l === 'en' ? 'english' : 'arabic')}
            </button>
          ))}
        </div>
        <div className="col">
          <button className="btn btn-brand btn-lg btn-block" onClick={() => setStep(1)}>{t('getStarted')}</button>
          <button className="btn btn-quiet btn-block" onClick={finish}>{t('skipForNow')}</button>
        </div>
        <p className="center tiny faint">{t('medicalNote')}</p>
      </div>
    );
  }

  if (!working) return null;
  const isMom = working.role === 'mom';

  return (
    <div className="picker">
      <div className="col" style={{ alignItems: 'center', gap: 8 }}>
        <div className="avatar avatar-lg">{working.emoji}</div>
        <h1 className="display" style={{ fontSize: 24 }}>{t(isMom ? 'setUpMom' : 'setUpSon')}</h1>
        <p className="muted small center">{t('onboardWhy')}</p>
      </div>

      <div className="card col">
        <Field label={t('name')}>
          <input className="input" value={working.name} onChange={(e) => update({ name: e.target.value })} />
        </Field>
        <div className="scroll-x">
          {EMOJIS.map((e) => (
            <button key={e} className="chip" aria-pressed={working.emoji === e} onClick={() => update({ emoji: e })} type="button">
              {e}
            </button>
          ))}
        </div>
        <Field label={t('birthDate')}>
          <input className="input" type="date" value={working.dob ?? ''} onChange={(e) => update({ dob: e.target.value || undefined })} />
        </Field>
        <div className="grid-2">
          <Field label={t('height')}>
            <input className="input" inputMode="numeric" value={working.heightCm ?? ''}
              onChange={(e) => update({ heightCm: e.target.value ? Number(e.target.value.replace(/\D/g, '')) : undefined })} />
          </Field>
          <Field label={t('currentWeight')}>
            <input className="input" inputMode="decimal" value={working.weightKg ?? ''}
              onChange={(e) => update({ weightKg: e.target.value ? Number(e.target.value.replace(/[^\d.]/g, '')) : undefined })} />
          </Field>
        </div>
        {isMom && (
          <div className="grid-2">
            <Field label={t('prePregnancyWeight')}>
              <input className="input" inputMode="decimal" value={working.prePregnancyWeightKg ?? ''}
                onChange={(e) => update({ prePregnancyWeightKg: e.target.value ? Number(e.target.value.replace(/[^\d.]/g, '')) : undefined })} />
            </Field>
            <Field label={t('dueDate')}>
              <input className="input" type="date" value={working.dueDate ?? ''}
                onChange={(e) => update({ dueDate: e.target.value || undefined })} />
            </Field>
          </div>
        )}
        <div className="stack-2">
          <span className="label">{t('activityLevel')}</span>
          <div className="chips">
            {([1, 2, 3, 4, 5] as const).map((a) => (
              <button key={a} className="chip chip-sm" aria-pressed={working.activity === a}
                onClick={() => update({ activity: a })} type="button">
                {t(`act${a}` as 'act1')}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="col">
        <button
          className="btn btn-brand btn-lg btn-block"
          onClick={async () => {
            if (step === 1) {
              await commit();
              setStep(2);
            } else {
              await finish();
            }
          }}
        >
          {step === 1 ? t('setUpSon') : t('done')}
        </button>
        <button className="btn btn-quiet btn-block" onClick={finish}>{t('skipForNow')}</button>
      </div>
    </div>
  );
}
