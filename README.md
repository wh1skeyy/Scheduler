# Personal Editorial Booking Page

A static, dependency-free front end for a personal booking page — monospace
editorial design, four booking types, timezone-aware week scheduling, and a
Google Apps Script backend. No build step, no framework, no secrets in the
front end.

## Quick start

```bash
# 1. Configure
#    Edit src/config.js (see below)

# 2. Add media (optional — the page works without it)
#    Drop poster images into assets/img/ and looping videos into assets/video/

# 3. Serve locally (ES modules need HTTP, not file://)
npm start          # → http://localhost:8000
# or: python -m http.server 8000

# 4. Test (optional)
npm test           # node --test (or run the files in tests/ directly)
```

## 1. Set `API_URL`

Open [`src/config.js`](src/config.js):

```js
export const API_URL = "";
```

- **Empty string (default)** → demo mode. The page renders with generic
  sample data and in-memory bookings; nothing leaves the browser.
- **Google Apps Script web-app URL** → live mode. Example:
  `https://script.google.com/macros/s/XXXXXXXX/exec`

The URL is the single backend constant. No API keys, no build-time secrets.

## 2. Fill in the config

All personal information lives in one file — [`src/config.js`](src/config.js).
Replace every placeholder before deploying:

| Constant       | Purpose                                        |
| -------------- | ---------------------------------------------- |
| `BRAND_NAME`   | Display name in the brand card                 |
| `CONTACT`      | `NAME`, `ROLE`, `EMAIL`, `GITHUB`, `BASED` rows in the contact panel |
| `TIMEZONE`     | IANA zone used for every date/time (e.g. `Asia/Saigon`) |
| `CLOCK_LABEL`  | Short label shown beside times (e.g. `ICT`)     |

Do not put student codes, passwords, or any other secret in this file —
credentials are entered by visitors, verified by the backend `check`
endpoint, and never stored in the front end or browser storage.

## 3. Add assets

### Poster images (recommended)

```
assets/img/work.jpg
assets/img/lesson.jpg
assets/img/meetings.jpg
assets/img/priority.jpg
```

### Background videos (optional)

```
assets/video/work-16x9.mp4      assets/video/work-9x16.mp4
assets/video/lesson-16x9.mp4    assets/video/lesson-9x16.mp4
assets/video/meetings-16x9.mp4  assets/video/meetings-9x16.mp4
assets/video/priority-16x9.mp4  assets/video/priority-9x16.mp4
```

Landscape (`16x9`) plays on desktop (≥ 1024 px), portrait (`9x16`) on mobile.
Videos must be muted, seamless 6–8 s loops with no audio track. If a video is
missing, its poster is shown with a slow zoom-and-drift animation, so the
page is fully functional without any videos.

## 4. Build

There is no build step. The site is plain HTML/CSS and native ES modules.
`npm test` runs the scheduling test-suite with Node's built-in test runner.

## 5. Deploy to GitHub Pages

1. Push this folder to a GitHub repository (the reference screenshots in
   `stitch_editorial_monospace_booking_page/` can be excluded).
2. In the repository: **Settings → Pages → Build and deployment**.
3. Set **Source** to *Deploy from a branch*, pick your branch and `/ (root)`.
4. Save. The site is served at `https://<user>.github.io/<repo>/`.

Included `.nojekyll` ensures `assets/` and `src/` are served as-is. All paths
are relative, so the site also works from a project subpath.

> After configuring `API_URL`, redeploy — the constant is baked into the
> deployed `src/config.js`.

## How it works

### Screens

| Module                          | Screen |
| ------------------------------- | ------ |
| `src/screens/home.js`           | Booking index — desktop hover/focus inversion + background crossfade; mobile full-screen snap pages, left rail indicator, hamburger menu |
| `src/screens/intro.js`          | Rules, approval note, student-code / password verification |
| `src/screens/week.js`           | Week view — arrows, seven 24-hour day bars (hatched occupied, dashed pending, lead-window mask) |
| `src/screens/time.js`           | Start-time stepper (30-min steps), duration stepper / fixed choices, live slot status, next-free-start |
| `src/screens/details.js`        | Contact fields per type + hidden `hp` honeypot |
| `src/screens/result.js`         | Pending / confirmed ticket with link back |

Shared shell: `src/screens/booking-shell.js`. Corner widgets (live date,
contact, current status, visual toggle) live in the home module; on mobile
they are reachable from the hamburger menu.

### Backend contract (Google Apps Script)

The app expects exactly this API — see `src/api.js`:

| Call | Returns |
| ---- | ------- |
| `GET ?action=config` | `{types:{work,lesson,hangout,priority:{label,fixed,min,max,approval,auth}}, step, leadHours, horizonDays}` |
| `GET ?action=week&from=YYYY-MM-DD` | `{days:[{date, blocks:[{s,e,kind,pending}]}]}` (`s`/`e` = minutes from midnight) |
| `GET ?action=check&type=lesson&code=…` | `{ok:true,name}` or `{err}` |
| `GET ?action=check&type=priority&pw=…` | `{ok:true}` or `{err}` |
| `POST` body `text/plain` JSON | `{ok:true,status:"pending"\|"confirmed"}` or `{err}` |

The POST payload is `{type, date, start, dur, code?, pw?, name, email, note, hp}`
with `start`/`dur` in minutes. `Content-Type: text/plain` avoids a CORS
preflight. All rules (durations, step, lead window, horizon, approval mode)
come from the backend `config` — nothing is hard-coded in the front end.

### Design tokens

Colors, typography, spacing, and shapes are reused from `DESIGN.md`
(Monospace Editorial Calendar): JetBrains Mono, high-key white glass surfaces
at 90 % opacity with 12 px blur, hairline borders, 2–4 px radii, inversion on
hover/focus, 48 px minimum touch targets, and visible 2 px focus rings.

### Accessibility

- Full keyboard operation: skip link, focus-visible rings, focus trapping in
  the mobile sheet, focus returned after dialogs close, Escape to dismiss.
- Timeline bars expose an `aria-label` summary of every block.
- Live regions announce clock, status, and result changes.
- `prefers-reduced-motion` pauses background media by default and disables
  the drift animation, smooth scrolling, and transitions.

## Project structure

```
index.html                 Entry point
styles.css                 All styling (design tokens in :root)
src/config.js              ← EDIT: API_URL + personal details + timezone
src/api.js                 Backend adapter (demo/live)
src/demo-data.js           Generic sample data for demo mode
src/time.js                Timezone-aware scheduling helpers
src/media.js               Background video/image controller
src/ui.js                  Rendering helpers, icons, timeline markup
src/app.js                 Application state machine
src/screens/*.js           One module per screen
tests/*.test.mjs           Scheduling and demo-adapter tests
assets/img/                Poster/fallback images
assets/video/              Optional looping background videos
```
