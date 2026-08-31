# Calnow

A private calorie and blood-sugar log for two people — a mother managing
gestational diabetes, and her son eating alongside her.

The log lives in one shared Supabase project, so a reading she takes on her
phone appears on his. One family login, two profiles. It installs to the home
screen like an app.

## What it does

**Two profiles, two different apps.** Mom's profile is a warm, unhurried
pregnancy-and-diabetes log — blood sugar, insulin, meals with photos, weight,
blood pressure, symptoms, water, movement. The son's is a dark, compact
calorie log with no medical tracking anywhere in it, framed around eating
alongside her: it notices when you both logged on the same day.

**Doctor Mode.** A read-only, large-type view of the log, one week per screen,
that opens *without* the PIN — so the phone can be handed across a desk. Every
reading is flagged against her targets, and it prints cleanly.

**One login, a profile per phone.** Both phones sign into the same family
account. Each phone picks its profile once and stays on it — the choice is
remembered until you sign out. Changes appear on the other phone live.

**A PIN that doesn't get in the way.** Optional per profile, asked once per app
open. Doctor Mode never asks for it.

**Photos of meals.** Taken with the camera and downscaled to ~150 KB, kept on
the phone that took them. The entry records that a photo exists, so the other
phone shows a camera marker rather than a broken image.

**Arabic and English**, with a full right-to-left layout and Arabic-Indic
digits.

## The algorithm

All of it runs on the device, over her own history. Nothing is uploaded and
nothing is a population average.

1. **Daily budget** — Mifflin-St Jeor from her pre-pregnancy weight, an
   activity factor, and a trimester allowance (derived from the due date).
   Carbs are ~42% of calories with a 175 g/day pregnancy floor, then split
   across breakfast, lunch, dinner and snacks. *The split adapts*: any meal
   whose post-meal readings land high more than 40% of the time over the last
   three weeks gets its carbs trimmed and redistributed to snacks.

2. **Pattern insights** — time in range, per-context averages, an estimated
   A1c, and plain-language findings pulled from her data: which meal of the
   day runs hottest, whether walking measurably lowers her next reading, the
   carb threshold above which she goes out of range, week-over-week fasting
   drift, and low readings worth mentioning to a doctor.

3. **Meal scoring** — each meal scored 0–100 on portion against its slot
   budget, carb load, and whether protein came with the carbs — then adjusted
   by how *that specific dish* has historically treated her. The Insights
   screen ranks her own meals into the kindest ones and the ones that spiked
   her.

4. **Predictive alerts** — a test reminder timed off the last meal, a walk
   nudge when a heavy meal is still absorbing, a warning when three readings
   of the same kind climb in a row, and immediate flags on high or low
   readings.

## Setting up the cloud

1. **Run the schema.** Open the Supabase dashboard → **SQL Editor** → paste all
   of [`supabase/schema.sql`](supabase/schema.sql) → **Run**. It creates three
   tables, turns on Row Level Security, and enables realtime. Re-running it is
   safe.

2. **Create the one shared user.** **Authentication → Users → Add user**, tick
   *Auto Confirm User*, and give it an email and password you will both use.
   There is no sign-up screen in the app on purpose — it means nobody else can
   create an account on your project.

3. **Turn off public sign-ups** (belt and braces). **Authentication → Sign In /
   Providers → Email**, disable *Allow new users to sign up*.

4. **Add the anon key.** Copy **Settings → API Keys → `anon` `public`** into
   `SUPABASE_ANON_KEY` in [`src/lib/config.ts`](src/lib/config.ts), then push.
   That key is public by design: it identifies the project, and Row Level
   Security is what actually protects the rows. The *database password* is a
   different credential and must never go in this repo.

### How the data is laid out

Three tables, kept deliberately small. `profiles` holds two rows (`mom`,
`son`). `entries` holds one row per logged thing, with the type-specific
fields in a `jsonb` payload rather than thirty mostly-empty columns. `foods`
is the personal shortcut library. Every row carries `user_id`, defaulted to
`auth.uid()`, and every policy requires it to match the signed-in user — so
the anon key on its own reads nothing. Empty fields are stripped client-side
before writing, and photos never leave the phone.

## Running it

```bash
npm install
npm run dev        # http://localhost:5173/calnow/
npm run build      # typecheck + production build into dist/
npm run icons      # regenerate PWA icons from the logo source
```

## Deploying

**Set the Pages source to GitHub Actions once**, under
**Settings → Pages → Build and deployment → Source**. If it is left on
*Deploy from a branch*, GitHub serves the repo root — which is the un-built
Vite source — and the page loads blank.

After that, every push to `main` or the active working branch builds and
publishes via `.github/workflows/deploy.yml`.

The build assumes the app is served from `/calnow/`. For a root domain
(Netlify, Vercel, a custom domain) build with `BASE_PATH=/ npm run build`.

Then, on each phone: open the URL, and **Add to Home Screen** (on iPhone it is
under the Share menu). After the first load it works fully offline.

## Backups

Supabase is the source of truth and is backed up by them, so a lost phone loses
nothing but its photos. Settings → *Back up to a file* still exports the whole
log as JSON if you want a copy of your own.

If a phone logged entries before the cloud existed, Settings offers a one-time
*Move this phone's older log up*.

## Notes

- Blood sugar is in **mg/dL** throughout.
- The app needs internet. With no signal it says so plainly instead of showing
  an empty day, and logging is disabled until the connection returns.
- Default targets follow common gestational-diabetes guidance (fasting < 95,
  1 hr < 140, 2 hrs < 120). They are editable in Settings — use whatever the
  doctor gave.
- Calnow is a personal log, not medical advice.

## Layout

```
src/
  lib/
    algorithm.ts   budget, insights, meal scoring, alerts
    cloud.ts       Supabase reads and writes, row <-> app mapping
    supabase.ts    client, session kept in localStorage
    config.ts      project URL and anon key
    db.ts          IndexedDB, now only for meal photos
    store.tsx      app state, auth, realtime, theme and language wiring
    i18n.ts        the English and Arabic copy deck
    backup.ts      export / import
    photos.ts      capture, downscale, store
  components/      shared UI, charts, the log sheet
  pages/           sign-in, today (per profile), insights, history, settings, doctor
supabase/
  schema.sql       tables, RLS policies, realtime
  styles/          design tokens for the two themes
```
