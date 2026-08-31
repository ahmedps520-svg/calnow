# Calnow

A private calorie and blood-sugar log for two people — a mother managing
gestational diabetes, and her son eating alongside her.

Everything lives on the phone it was typed into. No account, no server, no
analytics. It installs to the home screen and works with no internet.

## What it does

**Two profiles, two different apps.** Mom's profile is a warm, unhurried
pregnancy-and-diabetes log — blood sugar, insulin, meals with photos, weight,
blood pressure, symptoms, water, movement. The son's is a dark, compact
calorie log with no medical tracking anywhere in it, framed around eating
alongside her: it notices when you both logged on the same day.

**Doctor Mode.** A read-only, large-type view of the log, one week per screen,
that opens *without* the PIN — so the phone can be handed across a desk. Every
reading is flagged against her targets, and it prints cleanly.

**A PIN that doesn't get in the way.** Optional per profile. Editing needs it;
Doctor Mode never does.

**Photos of meals.** Taken with the camera, downscaled to ~150 KB, stored in
IndexedDB beside the entry.

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

The data lives only on that phone — clearing the browser's site data erases it.
Settings → *Back up to a file* writes everything, photos included, to one JSON
file. *Restore from a file* reads it back on any phone, which is also how you
move the log to a new device.

## Notes

- Blood sugar is in **mg/dL** throughout.
- Default targets follow common gestational-diabetes guidance (fasting < 95,
  1 hr < 140, 2 hrs < 120). They are editable in Settings — use whatever the
  doctor gave.
- Calnow is a personal log, not medical advice.

## Layout

```
src/
  lib/
    algorithm.ts   budget, insights, meal scoring, alerts
    db.ts          IndexedDB wrapper
    store.tsx      app state, theme and language wiring
    i18n.ts        the English and Arabic copy deck
    backup.ts      export / import
    photos.ts      capture, downscale, store
  components/      shared UI, charts, the log sheet
  pages/           today (per profile), insights, history, settings, doctor
  styles/          design tokens for the two themes
```
