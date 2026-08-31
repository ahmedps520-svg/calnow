import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  fetchEntries, fetchFoods, fetchProfiles, insertEntries, insertEntry, removeEntry,
  removeFood, upsertFood, upsertProfile,
} from './cloud';
import { isConfigured } from './config';
import { db, uid } from './db';
import { translate, type Params, type TKey } from './i18n';
import { normalizeName } from './algorithm';
import { supabase } from './supabase';
import type { Entry, Food, Lang, Profile, Role } from './types';
import { DEFAULT_TARGETS } from './types';

const ACTIVE_KEY = 'calnow.activeProfile';

const readStored = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const writeStored = (key: string, value: string | null) => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* private mode — the choice just won't stick */
  }
};

export function makeProfile(role: Role, name: string, lang: Lang = 'en'): Profile {
  return {
    id: role,
    role,
    name,
    emoji: role === 'mom' ? '🌸' : '⚡',
    lang,
    activity: role === 'mom' ? 2 : 3,
    targets: { ...DEFAULT_TARGETS },
    reminders: { postMealTest: role === 'mom', testAfterMin: 120, walkNudge: role === 'mom' },
    createdAt: Date.now(),
  };
}

interface StoreValue {
  ready: boolean;
  configured: boolean;
  session: Session | null;
  online: boolean;
  busy: boolean;
  cloudError?: string;

  profiles: Profile[];
  profile?: Profile;
  activeId?: string;
  /** the chosen profile has a PIN and this app open has not cleared it yet */
  locked: boolean;
  entries: Entry[];
  allEntries: Entry[];
  foods: Food[];
  lang: Lang;
  onboarded: boolean;
  /** entries still sitting in this phone's old on-device database */
  localCount: number;

  t: (key: TKey, params?: Params) => string;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  setActive: (id?: string) => void;
  unlock: () => void;
  saveProfile: (p: Profile) => Promise<void>;
  addEntry: (e: Entry) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  rememberFood: (f: Omit<Food, 'id' | 'uses' | 'lastUsed'>) => Promise<void>;
  forgetFood: (id: string) => Promise<void>;
  setOnboarded: (v: boolean) => Promise<void>;
  uploadLocal: () => Promise<number>;
  reload: () => Promise<void>;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [allEntries, setAllEntries] = useState<Entry[]>([]);
  const [foods, setFoods] = useState<Food[]>([]);
  const [activeId, setActiveId] = useState<string | undefined>(() => readStored(ACTIVE_KEY) ?? undefined);
  const [unlocked, setUnlocked] = useState(false);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [busy, setBusy] = useState(false);
  const [cloudError, setCloudError] = useState<string>();
  const [localCount, setLocalCount] = useState(0);

  /* ----------------------------- session ---------------------------------- */
  useEffect(() => {
    if (!isConfigured) {
      setReady(true);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (!next) {
        setProfiles([]);
        setAllEntries([]);
        setFoods([]);
        setReady(true);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  /* --------------------------- connection --------------------------------- */
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  /* ------------------------------- load ----------------------------------- */
  const load = useCallback(async () => {
    if (!session) return;
    setBusy(true);
    try {
      let list = await fetchProfiles();
      if (!list.length) {
        // First sign-in for this household — create the two profiles.
        const seeded = [makeProfile('mom', 'Mom'), makeProfile('son', 'Me')];
        for (const p of seeded) await upsertProfile(p);
        list = seeded;
      }
      const [entries, allFoods] = await Promise.all([fetchEntries(), fetchFoods()]);
      setProfiles(list.sort((a) => (a.role === 'mom' ? -1 : 1)));
      setAllEntries(entries);
      setFoods(allFoods);
      setCloudError(undefined);
    } catch (err) {
      setCloudError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
      setReady(true);
    }
  }, [session]);

  useEffect(() => {
    void load();
  }, [load]);

  /* count anything left in the old on-device database, once, for the offer to
     move it up to the cloud */
  useEffect(() => {
    if (!session) return;
    db.allEntries()
      .then((list) => setLocalCount(list.length))
      .catch(() => setLocalCount(0));
  }, [session]);

  /* ----------------------------- realtime --------------------------------- */
  useEffect(() => {
    if (!session) return;
    let timer: number | undefined;
    const refresh = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void load(), 400);
    };
    const channel = supabase
      .channel('calnow-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'entries' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, refresh)
      .subscribe();

    /* realtime can drop on mobile, so also catch up whenever the app is
       brought back to the foreground */
    const onFocus = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener('online', onFocus);
    return () => {
      window.clearTimeout(timer);
      void supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('online', onFocus);
    };
  }, [session, load]);

  const profile = useMemo(() => profiles.find((p) => p.id === activeId), [profiles, activeId]);
  const lang: Lang = profile?.lang ?? profiles[0]?.lang ?? 'en';

  const entries = useMemo(
    () => (profile ? allEntries.filter((e) => e.profileId === profile.id) : []),
    [allEntries, profile],
  );

  /* theme and direction follow whoever is signed in on this phone */
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = profile?.role ?? 'mom';
    root.lang = lang;
    root.dir = lang === 'ar' ? 'rtl' : 'ltr';
    const color = profile?.role === 'son' ? '#0B0C0F' : '#FBF6F1';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color);
  }, [profile?.role, lang]);

  /** Optimistic write: update the screen, push to the cloud, roll back on failure. */
  const withRollback = useCallback(
    async (apply: () => void, revert: () => void, push: () => Promise<void>) => {
      apply();
      try {
        await push();
        setCloudError(undefined);
      } catch (err) {
        revert();
        setCloudError(err instanceof Error ? err.message : String(err));
        throw err;
      }
    },
    [],
  );


  const value: StoreValue = {
    ready,
    configured: isConfigured,
    session,
    online,
    busy,
    cloudError,
    profiles,
    profile,
    activeId,
    locked: !!profile?.pin && !unlocked,
    entries,
    allEntries,
    foods: useMemo(() => foods.filter((f) => f.profileId === profile?.id), [foods, profile?.id]),
    lang,
    onboarded: profiles.some((p) => p.onboarded),
    localCount,

    t: useCallback((key: TKey, params?: Params) => translate(lang, key, params), [lang]),

    signIn: useCallback(async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      return error ? error.message : null;
    }, []),

    signOut: useCallback(async () => {
      writeStored(ACTIVE_KEY, null);
      setActiveId(undefined);
      setUnlocked(false);
      await supabase.auth.signOut();
    }, []),

    /* Choosing a PIN-protected profile must still ask for the PIN, otherwise
       "switch profile" on the lock screen would be a way straight past it. */
    setActive: useCallback(
      (id?: string) => {
        setActiveId(id);
        setUnlocked(!profiles.find((p) => p.id === id)?.pin);
        writeStored(ACTIVE_KEY, id ?? null);
      },
      [profiles],
    ),

    unlock: useCallback(() => setUnlocked(true), []),

    saveProfile: useCallback(
      async (p: Profile) => {
        const prev = profiles;
        await withRollback(
          () => setProfiles((list) => list.map((x) => (x.id === p.id ? p : x))),
          () => setProfiles(prev),
          () => upsertProfile(p),
        );
      },
      [profiles, withRollback],
    ),

    addEntry: useCallback(
      async (e: Entry) => {
        const prev = allEntries;
        await withRollback(
          () => setAllEntries((list) => [e, ...list.filter((x) => x.id !== e.id)].sort((a, b) => b.ts - a.ts)),
          () => setAllEntries(prev),
          () => insertEntry(e),
        );
      },
      [allEntries, withRollback],
    ),

    deleteEntry: useCallback(
      async (id: string) => {
        const prev = allEntries;
        const entry = allEntries.find((e) => e.id === id);
        await withRollback(
          () => setAllEntries((list) => list.filter((e) => e.id !== id)),
          () => setAllEntries(prev),
          () => removeEntry(id),
        );
        if (entry?.type === 'meal' && entry.photoId) await db.deletePhoto(entry.photoId).catch(() => undefined);
      },
      [allEntries, withRollback],
    ),

    rememberFood: useCallback(
      async (f: Omit<Food, 'id' | 'uses' | 'lastUsed'>) => {
        const key = normalizeName(f.name);
        if (!key) return;
        const existing = foods.find((x) => x.profileId === f.profileId && normalizeName(x.name) === key);
        const next: Food = existing
          ? { ...existing, ...f, uses: existing.uses + 1, lastUsed: Date.now() }
          : { ...f, id: uid(), uses: 1, lastUsed: Date.now() };
        setFoods((list) => [next, ...list.filter((x) => x.id !== next.id)]);
        await upsertFood(next).catch(() => undefined); // a missed shortcut is not worth an error
      },
      [foods],
    ),

    forgetFood: useCallback(async (id: string) => {
      setFoods((list) => list.filter((f) => f.id !== id));
      await removeFood(id).catch(() => undefined);
    }, []),

    setOnboarded: useCallback(
      async (v: boolean) => {
        const updated = profiles.map((p) => ({ ...p, onboarded: v }));
        setProfiles(updated);
        for (const p of updated) await upsertProfile(p);
      },
      [profiles],
    ),

    /** One-time move of whatever this phone logged before the cloud existed. */
    uploadLocal: useCallback(async () => {
      const list = await db.allEntries();
      if (!list.length) return 0;
      await insertEntries(list);
      setLocalCount(0);
      await load();
      return list.length;
    }, [load]),

    reload: load,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
