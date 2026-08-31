import { useEffect, useMemo, useRef, useState } from 'react';
import { IconDownload, IconLock, IconSpark, IconUpload } from '../components/Icons';
import { Logo } from '../components/Logo';
import { Confirm, Field, Sheet, Toggle, useToast } from '../components/UI';
import { computeBudget } from '../lib/algorithm';
import { downloadBlob, exportBackup, importBackup } from '../lib/backup';
import { db, storageEstimate } from '../lib/db';
import { dayKey, num } from '../lib/format';
import { notificationState, requestNotifications } from '../lib/notify';
import { useStore } from '../lib/store';
import type { Lang, Profile } from '../lib/types';

const EMOJIS = ['🌸', '🌿', '💗', '🌺', '⚡', '🔥', '🌊', '🍀', '☀️', '🫐'];

export function Settings({ onSwitch, onDoctorMode }: { onSwitch: () => void; onDoctorMode: () => void }) {
  const { t, profile, entries, saveProfile, lang, reload } = useStore();
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [storage, setStorage] = useState<string>();
  const [pinSheet, setPinSheet] = useState(false);
  const [pinDraft, setPinDraft] = useState('');
  const [erasing, setErasing] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [notify, setNotify] = useState(notificationState());
  const [installEvent, setInstallEvent] = useState<Event | null>(null);

  useEffect(() => {
    storageEstimate().then((e) => e && setStorage(e.usedMb.toFixed(1)));
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  const budget = useMemo(() => (profile ? computeBudget(profile, entries) : null), [profile, entries]);

  if (!profile || !budget) return null;
  const isMom = profile.role === 'mom';

  const patch = (changes: Partial<Profile>) => saveProfile({ ...profile, ...changes });
  const patchTargets = (changes: Partial<Profile['targets']>) =>
    saveProfile({ ...profile, targets: { ...profile.targets, ...changes } });

  const numberField = (
    label: string,
    value: number | undefined,
    onChange: (v: number | undefined) => void,
    placeholder = '—',
  ) => (
    <Field label={label}>
      <input
        className="input"
        inputMode="decimal"
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^\d.]/g, '');
          onChange(raw === '' ? undefined : Number(raw));
        }}
      />
    </Field>
  );

  return (
    <>
      <header className="appbar">
        <div>
          <h1 className="appbar-title display">{t('settings')}</h1>
          <p className="appbar-sub">{profile.name}</p>
        </div>
        <button className="avatar" onClick={onSwitch} aria-label={t('switchProfile')}>{profile.emoji}</button>
      </header>

      {/* ------------------------------ profile ------------------------------ */}
      <p className="section-title">{t('profileSection')}</p>
      <div className="card col">
        <Field label={t('name')}>
          <input className="input" value={profile.name} onChange={(e) => patch({ name: e.target.value })} />
        </Field>
        <div className="stack-2">
          <span className="label">{profile.emoji}</span>
          <div className="scroll-x">
            {EMOJIS.map((e) => (
              <button
                key={e}
                className="chip"
                aria-pressed={profile.emoji === e}
                onClick={() => patch({ emoji: e })}
                type="button"
              >
                {e}
              </button>
            ))}
          </div>
        </div>
        <div className="stack-2">
          <span className="label">{t('language')}</span>
          <div className="chips">
            {(['en', 'ar'] as Lang[]).map((l) => (
              <button
                key={l}
                className="chip"
                aria-pressed={profile.lang === l}
                onClick={() => patch({ lang: l })}
                type="button"
              >
                {t(l === 'en' ? 'english' : 'arabic')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ------------------------------ body --------------------------------- */}
      <p className="section-title">{t('bodySection')}</p>
      <div className="card col">
        <Field label={t('birthDate')}>
          <input
            className="input"
            type="date"
            value={profile.dob ?? ''}
            onChange={(e) => patch({ dob: e.target.value || undefined })}
          />
        </Field>
        {numberField(t('height'), profile.heightCm, (v) => patch({ heightCm: v }))}
        {numberField(t('currentWeight'), profile.weightKg, (v) => patch({ weightKg: v }))}
        {isMom && (
          <>
            {numberField(t('prePregnancyWeight'), profile.prePregnancyWeightKg, (v) =>
              patch({ prePregnancyWeightKg: v }),
            )}
            <Field label={t('dueDate')}>
              <input
                className="input"
                type="date"
                value={profile.dueDate ?? ''}
                onChange={(e) => patch({ dueDate: e.target.value || undefined })}
              />
            </Field>
          </>
        )}
        <div className="stack-2">
          <span className="label">{t('activityLevel')}</span>
          <div className="chips">
            {([1, 2, 3, 4, 5] as const).map((a) => (
              <button
                key={a}
                className="chip chip-sm"
                aria-pressed={profile.activity === a}
                onClick={() => patch({ activity: a })}
                type="button"
              >
                {t(`act${a}` as 'act1')}
              </button>
            ))}
          </div>
        </div>

        <div className="banner banner-info">
          <IconSpark size={18} />
          <span className="small">
            {t('autoTargetsOn')} — <b>{num(budget.calories, lang)} {t('kcal')}</b>
            {isMom && <> · <b>{num(budget.carbs, lang)} {t('gramsShort')} {t('carbs')}</b></>}
            {budget.week ? <> · {t('week')} {num(budget.week, lang)}</> : null}
          </span>
        </div>
      </div>

      {/* ------------------------------ targets ------------------------------ */}
      <p className="section-title">{t('targetsSection')}</p>
      <div className="card col">
        {numberField(t('calorieTarget'), profile.targets.calories, (v) => patchTargets({ calories: v }),
          `${budget.calories} (${t('autoTargets')})`)}
        {isMom &&
          numberField(t('carbTarget'), profile.targets.carbs, (v) => patchTargets({ carbs: v }),
            `${budget.carbs} (${t('autoTargets')})`)}
        {isMom && (
          <>
            <div className="grid-2">
              {numberField(t('fastingTarget'), profile.targets.fastingMax, (v) =>
                patchTargets({ fastingMax: v ?? 95 }))}
              {numberField(t('post1Target'), profile.targets.post1Max, (v) =>
                patchTargets({ post1Max: v ?? 140 }))}
              {numberField(t('post2Target'), profile.targets.post2Max, (v) =>
                patchTargets({ post2Max: v ?? 120 }))}
              {numberField(t('lowTarget'), profile.targets.lowMin, (v) => patchTargets({ lowMin: v ?? 70 }))}
            </div>
            <p className="tiny faint">{t('targetsHint')}</p>
          </>
        )}
        <div className="grid-2">
          {numberField(t('waterTarget'), profile.targets.waterMl, (v) => patchTargets({ waterMl: v ?? 2300 }))}
          {numberField(t('activityTarget'), profile.targets.activityMin, (v) =>
            patchTargets({ activityMin: v ?? 30 }))}
        </div>
      </div>

      {/* ---------------------------- reminders ------------------------------ */}
      {isMom && (
        <>
          <p className="section-title">{t('remindersSection')}</p>
          <div className="settings-group">
            <div className="settings-row">
              <span className="grow">{t('postMealReminder')}</span>
              <Toggle
                checked={profile.reminders.postMealTest}
                label={t('postMealReminder')}
                onChange={(v) => patch({ reminders: { ...profile.reminders, postMealTest: v } })}
              />
            </div>
            <div className="settings-row" style={{ flexWrap: 'wrap' }}>
              <span className="grow">{t('testAfter')}</span>
              <div className="chips">
                {[60, 90, 120].map((m) => (
                  <button
                    key={m}
                    className="chip chip-sm"
                    aria-pressed={profile.reminders.testAfterMin === m}
                    onClick={() => patch({ reminders: { ...profile.reminders, testAfterMin: m } })}
                    type="button"
                  >
                    {num(m, lang)} {t('minutes')}
                  </button>
                ))}
              </div>
            </div>
            <div className="settings-row">
              <span className="grow">{t('walkNudge')}</span>
              <Toggle
                checked={profile.reminders.walkNudge}
                label={t('walkNudge')}
                onChange={(v) => patch({ reminders: { ...profile.reminders, walkNudge: v } })}
              />
            </div>
            <button
              className="settings-row"
              onClick={async () => setNotify(await requestNotifications())}
              disabled={notify === 'granted'}
            >
              <span className="grow">
                {notify === 'granted'
                  ? t('notificationsOn')
                  : notify === 'denied'
                    ? t('notificationsBlocked')
                    : t('enableNotifications')}
              </span>
              <span className="settings-value">{notify === 'granted' ? '✓' : ''}</span>
            </button>
          </div>
        </>
      )}

      {/* ----------------------------- privacy -------------------------------- */}
      <p className="section-title">{t('privacySection')}</p>
      <div className="settings-group">
        <button className="settings-row" onClick={() => { setPinDraft(''); setPinSheet(true); }}>
          <IconLock size={18} />
          <span className="grow">{profile.pin ? t('changePin') : t('setPin')}</span>
          <span className="settings-value">{profile.pin ? '••••' : ''}</span>
        </button>
        {profile.pin && (
          <button className="settings-row" onClick={() => patch({ pin: undefined })}>
            <span className="grow" style={{ color: 'var(--bad)' }}>{t('removePin')}</span>
          </button>
        )}
        {isMom && (
          <button className="settings-row" onClick={onDoctorMode}>
            <span className="grow">{t('openDoctorMode')}</span>
            <span className="settings-value">→</span>
          </button>
        )}
      </div>
      <p className="tiny faint">{t('pinHint')}</p>

      {/* ------------------------------- data --------------------------------- */}
      <p className="section-title">{t('dataSection')}</p>
      <div className="settings-group">
        <button
          className="settings-row"
          onClick={async () => {
            downloadBlob(await exportBackup(), `calnow-${dayKey(Date.now())}.json`);
            toast(t('done'));
          }}
        >
          <IconDownload size={18} />
          <span className="grow">
            {t('backup')}
            <div className="tiny faint">{t('backupHint')}</div>
          </span>
        </button>
        <button className="settings-row" onClick={() => fileInput.current?.click()}>
          <IconUpload size={18} />
          <span className="grow">
            {t('restore')}
            <div className="tiny faint">{t('restoreWarn')}</div>
          </span>
        </button>
        {storage && (
          <div className="settings-row">
            <span className="grow">{t('storageUsed', { a: storage })}</span>
          </div>
        )}
        <button className="settings-row" onClick={() => setErasing(true)}>
          <span className="grow" style={{ color: 'var(--bad)' }}>{t('eraseAll')}</span>
        </button>
      </div>
      <input
        ref={fileInput}
        type="file"
        accept="application/json"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setRestoring(await file.text());
          e.target.value = '';
        }}
      />

      {/* ------------------------------ about --------------------------------- */}
      <p className="section-title">{t('aboutSection')}</p>
      <div className="card col" style={{ alignItems: 'center', textAlign: 'center' }}>
        <Logo size={44} />
        <div className="display" style={{ fontSize: 18 }}>{t('appName')}</div>
        <p className="tiny faint">{t('version')} 1.0 · {t('offlineReady')}</p>
        {installEvent ? (
          <button
            className="btn btn-brand btn-block"
            onClick={async () => {
              const ev = installEvent as Event & { prompt?: () => Promise<void> };
              await ev.prompt?.();
              setInstallEvent(null);
            }}
          >
            {t('installApp')}
          </button>
        ) : (
          <p className="tiny faint">{t('installIos')}</p>
        )}
        <p className="tiny faint">{t('medicalNote')}</p>
      </div>

      {/* ------------------------------ sheets -------------------------------- */}
      <Sheet
        open={pinSheet}
        onClose={() => setPinSheet(false)}
        title={t('setPin')}
        footer={
          <>
            <button className="btn btn-ghost grow" onClick={() => setPinSheet(false)}>{t('cancel')}</button>
            <button
              className="btn btn-primary grow"
              disabled={pinDraft.length !== 4}
              onClick={() => {
                patch({ pin: pinDraft });
                setPinSheet(false);
                toast(t('done'));
              }}
            >
              {t('save')}
            </button>
          </>
        }
      >
        <input
          className="input input-hero"
          inputMode="numeric"
          maxLength={4}
          value={pinDraft}
          placeholder="••••"
          onChange={(e) => setPinDraft(e.target.value.replace(/\D/g, '').slice(0, 4))}
        />
        <p className="tiny faint center">{t('pinHint')}</p>
      </Sheet>

      <Confirm
        open={!!restoring}
        title={t('restore')}
        body={t('restoreWarn')}
        confirmLabel={t('confirm')}
        cancelLabel={t('cancel')}
        danger
        onCancel={() => setRestoring(null)}
        onConfirm={async () => {
          try {
            const result = await importBackup(restoring!);
            await reload();
            toast(`${t('done')} · ${result.entries}`);
          } catch {
            toast(t('noMatches'));
          }
          setRestoring(null);
        }}
      />

      <Confirm
        open={erasing}
        title={t('eraseAll')}
        body={t('eraseWarn')}
        confirmLabel={t('delete')}
        cancelLabel={t('cancel')}
        danger
        onCancel={() => setErasing(false)}
        onConfirm={async () => {
          await db.clearAll();
          setErasing(false);
          window.location.reload();
        }}
      />
    </>
  );
}
