import { useEffect, useState } from 'react';
import { IconChart, IconGear, IconHome, IconList, IconPlus } from './components/Icons';
import { LogSheet, type LogIntent } from './components/LogSheet';
import { Logo } from './components/Logo';
import { useStore } from './lib/store';
import { Doctor } from './pages/Doctor';
import { History } from './pages/History';
import { Insights } from './pages/Insights';
import { Lock } from './pages/Lock';
import { Onboarding } from './pages/Onboarding';
import { Settings } from './pages/Settings';
import { Today } from './pages/Today';
import { TodaySon } from './pages/TodaySon';

type Tab = 'today' | 'insights' | 'history' | 'settings';

export function App() {
  const { ready, profile, onboarded, setActive, t } = useStore();
  const [tab, setTab] = useState<Tab>('today');
  const [logOpen, setLogOpen] = useState(false);
  const [intent, setIntent] = useState<LogIntent | undefined>();
  const [doctorFor, setDoctorFor] = useState<string | null>(null);

  /* a new view always starts at the top */
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tab, doctorFor, profile?.id]);

  const openLog = (next?: LogIntent) => {
    setIntent(next);
    setLogOpen(true);
  };

  if (!ready) {
    return (
      <div className="picker" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Logo size={56} />
      </div>
    );
  }

  if (doctorFor) return <Doctor profileId={doctorFor} onExit={() => setDoctorFor(null)} />;
  if (!onboarded) return <Onboarding />;
  if (!profile) return <Lock onDoctorMode={setDoctorFor} />;

  const switchProfile = () => {
    setTab('today');
    setActive(undefined);
  };

  const tabs: { id: Tab; label: string; icon: JSX.Element }[] = [
    { id: 'today', label: t('navToday'), icon: <IconHome /> },
    { id: 'insights', label: t('navInsights'), icon: <IconChart /> },
    { id: 'history', label: t('navHistory'), icon: <IconList /> },
    { id: 'settings', label: t('navSettings'), icon: <IconGear /> },
  ];

  return (
    <div className="app">
      <main className="screen" key={tab}>
        {tab === 'today' &&
          (profile.role === 'mom' ? (
            <Today onLog={openLog} onSwitch={switchProfile} />
          ) : (
            <TodaySon onLog={openLog} onSwitch={switchProfile} />
          ))}
        {tab === 'insights' && <Insights onSwitch={switchProfile} />}
        {tab === 'history' && <History onSwitch={switchProfile} />}
        {tab === 'settings' && (
          <Settings onSwitch={switchProfile} onDoctorMode={() => setDoctorFor(profile.id)} />
        )}
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
          <button className="fab" onClick={() => openLog()} aria-label={t('quickAdd')}>
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
