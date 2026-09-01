import { useEffect, useState } from 'react';
import { IconChart, IconGear, IconHome, IconList, IconPlus } from './components/Icons';
import { LogSheet, type LogIntent } from './components/LogSheet';
import { Logo } from './components/Logo';
import { useStore } from './lib/store';
import { Doctor } from './pages/Doctor';
import { History } from './pages/History';
import { Insights } from './pages/Insights';
import { Lock, PinGate } from './pages/Lock';
import { Onboarding } from './pages/Onboarding';
import { Settings } from './pages/Settings';
import { SignIn } from './pages/SignIn';
import { Today } from './pages/Today';
import { TodaySon } from './pages/TodaySon';

type Tab = 'today' | 'insights' | 'history' | 'settings';

/** Shown when the build has no Supabase key baked in. */
function Setup() {
  return (
    <div className="picker">
      <div className="col" style={{ alignItems: 'center', gap: 12 }}>
        <Logo size={58} />
        <h1 className="display" style={{ fontSize: 26 }}>One step left</h1>
        <p className="muted center">
          This build has no Supabase key, so Calnow cannot reach the cloud yet. Add the project&rsquo;s
          <b> anon public </b> key to <code>src/lib/config.ts</code> and deploy again.
        </p>
      </div>
    </div>
  );
}

export function App() {
  const {
    ready, configured, session, profile, profiles, activeId, locked, onboarded, online,
    cloudError, busy, reload, signOut, t,
  } = useStore();
  const [tab, setTab] = useState<Tab>('today');
  const [logOpen, setLogOpen] = useState(false);
  const [intent, setIntent] = useState<LogIntent | undefined>();
  const [doctorFor, setDoctorFor] = useState<string | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tab, doctorFor, profile?.id]);

  const openLog = (next?: LogIntent) => {
    setIntent(next);
    setLogOpen(true);
  };

  if (!configured) return <Setup />;

  if (!ready) {
    return (
      <div className="picker" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Logo size={56} />
        <p className="center muted small">{t('loadingLog')}</p>
      </div>
    );
  }

  if (!session) return <SignIn />;

  /* Signed in but the tables aren't reachable — usually schema.sql hasn't been
     run yet. Say that plainly instead of dropping into a setup flow whose
     saves would silently fail. */
  if (cloudError && !profiles.length) {
    return (
      <div className="picker">
        <div className="col" style={{ alignItems: 'center', gap: 12 }}>
          <Logo size={54} />
          <h1 className="display" style={{ fontSize: 24 }}>{t('cloudProblem')}</h1>
          <p className="muted small center">{cloudError}</p>
        </div>
        <div className="col">
          <button className="btn btn-primary btn-block" disabled={busy} onClick={() => void reload()}>
            {t('retry')}
          </button>
          <button className="btn btn-quiet btn-block" onClick={() => void signOut()}>{t('signOut')}</button>
        </div>
      </div>
    );
  }

  if (doctorFor) return <Doctor profileId={doctorFor} onExit={() => setDoctorFor(null)} />;
  if (!onboarded) return <Onboarding />;
  if (!activeId || !profile) return <Lock onDoctorMode={setDoctorFor} />;
  if (locked) return <PinGate onDoctorMode={setDoctorFor} />;

  const switchProfile = () => {
    setTab('today');
    window.scrollTo(0, 0);
  };

  const tabs: { id: Tab; label: string; icon: JSX.Element }[] = [
    { id: 'today', label: t('navToday'), icon: <IconHome /> },
    { id: 'insights', label: t('navInsights'), icon: <IconChart /> },
    { id: 'history', label: t('navHistory'), icon: <IconList /> },
    { id: 'settings', label: t('navSettings'), icon: <IconGear /> },
  ];

  const goSettings = () => {
    setTab('settings');
    switchProfile();
  };

  return (
    <div className="app">
      <main className="screen" key={tab}>
        {!online && (
          <div className="banner banner-warn">
            <span className="banner-dot" />
            <span className="grow">
              <b>{t('offlineTitle')}</b>
              <div className="small muted">{t('offlineBody')}</div>
            </span>
          </div>
        )}
        {online && cloudError && (
          <div className="banner banner-bad">
            <span className="banner-dot" />
            <span className="grow">
              <b>{t('cloudProblem')}</b>
              <div className="small muted">{cloudError}</div>
            </span>
            <button className="btn btn-sm btn-ghost" disabled={busy} onClick={() => void reload()}>
              {t('retry')}
            </button>
          </div>
        )}

        {tab === 'today' &&
          (profile.role === 'mom' ? (
            <Today onLog={openLog} onSwitch={goSettings} />
          ) : (
            <TodaySon onLog={openLog} onSwitch={goSettings} />
          ))}
        {tab === 'insights' && <Insights onSwitch={goSettings} />}
        {tab === 'history' && <History onSwitch={goSettings} />}
        {tab === 'settings' && <Settings onDoctorMode={() => setDoctorFor(profile.id)} />}
      </main>

      <nav className="tabbar">
        {tabs.slice(0, 2).map((tb) => (
          <button
            key={tb.id}
            className="tab"
            aria-current={tab === tb.id ? 'page' : undefined}
            onClick={() => setTab(tb.id)}
          >
            {tb.icon}
            <span>{tb.label}</span>
          </button>
        ))}
        <div className="tab-fab">
          <button className="fab" onClick={() => openLog()} aria-label={t('quickAdd')} disabled={!online}>
            <IconPlus />
          </button>
        </div>
        {tabs.slice(2).map((tb) => (
          <button
            key={tb.id}
            className="tab"
            aria-current={tab === tb.id ? 'page' : undefined}
            onClick={() => setTab(tb.id)}
          >
            {tb.icon}
            <span>{tb.label}</span>
          </button>
        ))}
      </nav>

      <LogSheet open={logOpen} intent={intent} onClose={() => setLogOpen(false)} />
    </div>
  );
}
