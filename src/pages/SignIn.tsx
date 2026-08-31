import { useState } from 'react';
import { Logo } from '../components/Logo';
import { Field } from '../components/UI';
import { useStore } from '../lib/store';

export function SignIn() {
  const { t, signIn, online } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setBusy(true);
    setError(undefined);
    const message = await signIn(email, password);
    if (message) setError(message);
    setBusy(false);
  };

  return (
    <form className="picker" onSubmit={submit}>
      <div className="col" style={{ alignItems: 'center', gap: 12 }}>
        <Logo size={62} />
        <h1 className="display" style={{ fontSize: 29 }}>{t('appName')}</h1>
        <p className="muted small center">{t('signInSub')}</p>
      </div>

      {!online && (
        <div className="banner banner-warn">
          <span className="banner-dot" />
          <span className="grow">
            <b>{t('offlineTitle')}</b>
            <div className="small muted">{t('offlineBody')}</div>
          </span>
        </div>
      )}

      <div className="card col">
        <Field label={t('email')}>
          <input
            className="input"
            type="email"
            autoComplete="email"
            inputMode="email"
            autoCapitalize="none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label={t('password')}>
          <input
            className="input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        {error && <p className="small" style={{ color: 'var(--bad)' }}>{error}</p>}
        <button className="btn btn-brand btn-lg btn-block" type="submit" disabled={busy || !online}>
          {busy ? t('signingIn') : t('signIn')}
        </button>
      </div>

      <p className="center tiny faint">{t('medicalNote')}</p>
    </form>
  );
}
