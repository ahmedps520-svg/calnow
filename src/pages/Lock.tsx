import { useState } from 'react';
import { Logo } from '../components/Logo';
import { IconBack, IconStethoscope } from '../components/Icons';
import { useStore } from '../lib/store';
import type { Profile } from '../lib/types';

export function Lock({ onDoctorMode }: { onDoctorMode: (profileId: string) => void }) {
  const { profiles, setActive, t, lang } = useStore();
  const [pending, setPending] = useState<Profile | null>(null);
  const [pin, setPin] = useState('');
  const [wrong, setWrong] = useState(false);

  const choose = (p: Profile) => {
    if (p.pin) {
      setPending(p);
      setPin('');
      setWrong(false);
    } else {
      setActive(p.id);
    }
  };

  const press = (digit: string) => {
    if (!pending) return;
    const next = (pin + digit).slice(0, 4);
    setPin(next);
    setWrong(false);
    if (next.length === 4) {
      if (next === pending.pin) {
        setActive(pending.id);
      } else {
        setWrong(true);
        window.setTimeout(() => {
          setPin('');
          setWrong(false);
        }, 500);
      }
    }
  };

  if (pending) {
    return (
      <div className="picker">
        <div className="col center" style={{ alignItems: 'center', gap: 10 }}>
          <div className="avatar avatar-lg">{pending.emoji}</div>
          <h1 className="display" style={{ fontSize: 22 }}>{pending.name}</h1>
          <p className="muted small">{t('enterPin')}</p>
        </div>

        <div className={`pindots${wrong ? ' shake' : ''}`}>
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={`pindot${i < pin.length ? ' on' : ''}`} />
          ))}
        </div>
        {wrong && <p className="center small" style={{ color: 'var(--bad)' }}>{t('wrongPin')}</p>}

        <div className="pinpad">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button key={d} className="pinkey" onClick={() => press(d)}>
              {lang === 'ar' ? '٠١٢٣٤٥٦٧٨٩'[Number(d)] : d}
            </button>
          ))}
          <button className="pinkey" style={{ visibility: 'hidden' }} aria-hidden tabIndex={-1} />
          <button className="pinkey" onClick={() => press('0')}>{lang === 'ar' ? '٠' : '0'}</button>
          <button className="pinkey" onClick={() => setPin((p) => p.slice(0, -1))} aria-label={t('back')}>
            <IconBack size={20} />
          </button>
        </div>

        <div className="col" style={{ gap: 8 }}>
          {pending.role === 'mom' && (
            <button className="btn btn-ghost btn-block" onClick={() => onDoctorMode(pending.id)}>
              <IconStethoscope size={18} /> {t('openDoctorMode')}
            </button>
          )}
          <button className="btn btn-quiet btn-block" onClick={() => setPending(null)}>{t('back')}</button>
          <p className="center tiny faint">{t('doctorModeNoPin')}</p>
        </div>
      </div>
    );
  }

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
            onClick={() => choose(p)}
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
        <p className="center tiny faint">{t('medicalNote')}</p>
      </div>
    </div>
  );
}
