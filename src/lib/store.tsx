import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode,
} from 'react';
import { db, uid } from './db';
import { translate, type Params, type TKey } from './i18n';
import { normalizeName } from './algorithm';
import type { AppState, Entry, Food, Lang, Profile } from './types';
import { DEFAULT_TARGETS } from './types';

export function makeProfile(role: 'mom' | 'son', name: string, lang: Lang = 'en'): Profile {
  return {
    id: role,
    role,
    name,
    emoji: role === 'mom' ? '🌸' : '⚡',
    lang,
    activity: role === 'mom' ? 2 : 3,
    targets: { ...DEFAULT_TARGETS },
    reminders: {
      postMealTest: role === 'mom',
      testAfterMin: 120,
      walkNudge: role === 'mom',
    },
    createdAt: Date.now(),
  };
}

interface StoreValue {
  ready: boolean;
  profiles: Profile[];
  profile?: Profile;
  activeId?: string;
  /** entries for the active profile, newest first */
  entries: Entry[];
  /** every profile's entries — the son's home screen checks whether Mom logged */
  allEntries: Entry[];
  foods: Food[];
  lang: Lang;
  onboarded: boolean;
  t: (key: TKey, params?: Params) => string;
  setActive: (id?: string) => Promise<void>;
  saveProfile: (p: Profile) => Promise<void>;
  deleteProfile: (id: string) => Promise<void>;
  addEntry: (e: Entry) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  rememberFood: (f: Omit<Food, 'id' | 'uses' | 'lastUsed'>) => Promise<void>;
  forgetFood: (id: string) => Promise<void>;
  setOnboarded: (v: boolean) => Promise<void>;
  reload: () => Promise<void>;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [allEntries, setAllEntries] = useState<Entry[]>([]);
  const [foods, setFoods] = useState<Food[]>([]);
  const [app, setAppState] = useState<AppState>({});
  /* Session-only: every fresh open lands on the picker, so a PIN still means
     something. Persisting it would also race the initial load. */
  const [activeId, setActiveId] = useState<string | undefined>();

  const load = useCallback(async () => {
    let list = await db.allProfiles();
    if (!list.length) {
      // First run — two profiles exist from the start; onboarding fills in the details.
      const seeded = [makeProfile('mom', 'Mom'), makeProfile('son', 'Me')];
      for (const p of seeded) await db.putProfile(p);
      list = seeded;
    }
    const [entries, allFoods, state] = await Promise.all([db.allEntries(), db.allFoods(), db.getApp()]);
    setProfiles(list.sort((a, b) => (a.role === 'mom' ? -1 : 1) - (b.role === 'mom' ? -1 : 1)));
    setAllEntries(entries.sort((a, b) => b.ts - a.ts));
    setFoods(allFoods);
    setAppState(state ?? {});
    setReady(true);
  }, []);

  useEffect(() => {
    load().catch((err) => {
      console.error('Calnow failed to open its database', err);
      setReady(true);
    });
  }, [load]);

  const profile = useMemo(() => profiles.find((p) => p.id === activeId), [profiles, activeId]);
  const lang: Lang = profile?.lang ?? 'en';

  const entries = useMemo(
    () => (profile ? allEntries.filter((e) => e.profileId === profile.id) : []),
    [allEntries, profile],
  );

  /* theme + direction follow whoever is signed in */
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = profile?.role ?? 'mom';
    root.lang = lang;
    root.dir = lang === 'ar' ? 'rtl' : 'ltr';
    const color = profile?.role === 'son' ? '#0B0C0F' : '#FBF6F1';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color);
  }, [profile?.role, lang]);

  const appRef = useRef<AppState>(app);
  appRef.current = app;

  const persistApp = useCallback(async (changes: Partial<AppState>) => {
    const next = { ...appRef.current, ...changes };
    setAppState(next);
    await db.setApp(next);
  }, []);

  const value: StoreValue = {
    ready,
    profiles,
    profile,
    activeId,
    entries,
    allEntries,
    foods: useMemo(() => foods.filter((f) => f.profileId === profile?.id), [foods, profile?.id]),
    lang,
    onboarded: !!app.onboarded,
    t: useCallback((key: TKey, params?: Params) => translate(lang, key, params), [lang]),

    setActive: useCallback(async (id?: string) => {
      setActiveId(id);
    }, []),

    saveProfile: useCallback(async (p: Profile) => {
      await db.putProfile(p);
      setProfiles((prev) => prev.map((x) => (x.id === p.id ? p : x)));
    }, []),

    deleteProfile: useCallback(async (id: string) => {
      await db.deleteProfile(id);
      setProfiles((prev) => prev.filter((p) => p.id !== id));
    }, []),

    addEntry: useCallback(async (e: Entry) => {
      await db.putEntry(e);
      setAllEntries((prev) => [e, ...prev.filter((x) => x.id !== e.id)].sort((a, b) => b.ts - a.ts));
    }, []),

    deleteEntry: useCallback(async (id: string) => {
      const entry = allEntries.find((e) => e.id === id);
      if (entry?.type === 'meal' && entry.photoId) await db.deletePhoto(entry.photoId);
      await db.deleteEntry(id);
      setAllEntries((prev) => prev.filter((e) => e.id !== id));
    }, [allEntries]),

    rememberFood: useCallback(
      async (f: Omit<Food, 'id' | 'uses' | 'lastUsed'>) => {
        const key = normalizeName(f.name);
        if (!key) return;
        const existing = foods.find((x) => x.profileId === f.profileId && normalizeName(x.name) === key);
        const next: Food = existing
          ? { ...existing, ...f, uses: existing.uses + 1, lastUsed: Date.now() }
          : { ...f, id: uid(), uses: 1, lastUsed: Date.now() };
        await db.putFood(next);
        setFoods((prev) => [next, ...prev.filter((x) => x.id !== next.id)]);
      },
      [foods],
    ),

    forgetFood: useCallback(async (id: string) => {
      await db.deleteFood(id);
      setFoods((prev) => prev.filter((f) => f.id !== id));
    }, []),

    setOnboarded: useCallback(async (v: boolean) => persistApp({ onboarded: v }), [persistApp]),

    reload: load,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
