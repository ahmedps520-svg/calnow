import { useState } from 'react';
import { IconBack, IconStethoscope } from '../components/Icons';
import { Logo } from '../components/Logo';
import { Confirm } from '../components/UI';
import { useStore } from '../lib/store';

/** Pick who is logging on this phone. The choice sticks until you sign out. */
export function Lock({ onDoctorMode }: { onDoctorMode: (profileId: string) => void }) {
  const { profiles, setActive, signOut, t } = useStore();
  const [confirmOut, setConfirmOut] = useState(false);

  return (
    <div className="picker">
      <div className="col" style={{ alignItems: 'center', gap: 12 }}>
        <Logo size={54} />
        <h1 className="display" style={{ fontSize: 27 }}>{t('appName')}</h1>
        <p className="muted small center">{t('tagline')}</p>
      </div>

      <div className="col" style={{ gap: 14 }}>
        <p className="eyebrow center">{t('chooseProfile')}</p>
        {profiles.map((p) => (
          <button
            key={p.id}
            className="picker-card"
            onClick={() => setActive(p.id)}
            style={{ ['--tint' as string]: p.role === 'mom' ? 'rgba(177,76,99,.16)' : 'rgba(71,213,242,.16)' }}
          >
            <span className="avatar avatar-lg">{p.emoji}</span>
            <span className="grow">
              <span className="picker-name display" style={{ display: 'block' }}>{p.name}</span>
              <span className="picker-role">{t(p.role === 'mom' ? 'momRole' : 'sonRole')}</span>
            </span>
            {p.pin && <span className="tag">🔒</span>}
          </button>
        ))}
      </div>

      <div className="col" style={{ gap: 8 }}>
        {profiles
          .filter((p) => p.role === 'mom')
          .map((p) => (
            <button key={p.id} className="btn btn-ghost btn-block" onClick={() => onDoctorMode(p.id)}>
              <IconStethoscope size={18} /> {t('openDoctorMode')}
            </button>
          ))}
        <button className="btn btn-quiet btn-block" onClick={() => setConfirmOut(true)}>{t('signOut')}</button>
        <p className="center tiny faint">{t('medicalNote')}</p>
      </div>

      <Confirm
        open={confirmOut}
        title={t('signOutQ')}
        body={t('signOutBody')}
        confirmLabel={t('signOut')}
        cancelLabel={t('cancel')}
        onCancel={() => setConfirmOut(false)}
        onConfirm={() => {
          setConfirmOut(false);
          void signOut();
        }}
      />
    </div>
  );
}

/** Shown once per app open when the remembered profile has a PIN. */
export function PinGate({ onDoctorMode }: { onDoctorMode: (profileId: string) => void }) {
  const { profile, unlock, setActive, t, lang } = useStore();
  const [pin, setPin] = useState('');
  const [wrong, setWrong] = useState(false);

  if (!profile) return null;

  const press = (digit: string) => {
    const next = (pin + digit).slice(0, 4);
    setPin(next);
    setWrong(false);
    if (next.length === 4) {
      if (next === profile.pin) {
        unlock();
      } else {
        setWrong(true);
        window.setTimeout(() => {
          setPin('');
          setWrong(false);
        }, 500);
      }
    }
  };

  const digit = (d: string) => (lang === 'ar' ? '٠١٢٣٤٥٦٧٨٩'[Number(d)] : d);

  return (
    <div className="picker">
      <div className="col center" style={{ alignItems: 'center', gap: 10 }}>
        <div className="avatar avatar-lg">{profile.emoji}</div>
        <h1 className="display" style={{ fontSize: 22 }}>{profile.name}</h1>
        <p className="muted small">{t('lockedHint')}</p>
      </div>

      <div className={`pindots${wrong ? ' shake' : ''}`}>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`pindot${i < pin.length ? ' on' : ''}`} />
        ))}
      </div>
      {wrong && <p className="center small" style={{ color: 'var(--bad)' }}>{t('wrongPin')}</p>}

      <div className="pinpad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button key={d} className="pinkey" onClick={() => press(d)}>{digit(d)}</button>
        ))}
        <button className="pinkey" style={{ visibility: 'hidden' }} aria-hidden tabIndex={-1} />
        <button className="pinkey" onClick={() => press('0')}>{digit('0')}</button>
        <button className="pinkey" onClick={() => setPin((p) => p.slice(0, -1))} aria-label={t('back')}>
          <IconBack size={20} />
        </button>
      </div>

      <div className="col" style={{ gap: 8 }}>
        {profile.role === 'mom' && (
          <button className="btn btn-ghost btn-block" onClick={() => onDoctorMode(profile.id)}>
            <IconStethoscope size={18} /> {t('openDoctorMode')}
          </button>
        )}
        <button className="btn btn-quiet btn-block" onClick={() => setActive(undefined)}>{t('switchTo')}</button>
        <p className="center tiny faint">{t('doctorModeNoPin')}</p>
      </div>
    </div>
  );
}
