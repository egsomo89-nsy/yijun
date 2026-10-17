# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

유이준 디지털 앨범 — a family baby-album PWA. React 18 + Tailwind loaded from CDN with **no build step, no package manager, no tests, no linter**. Firebase project `yijun-3757c` (Google auth, Firestore, Storage); deployed via GitHub → Vercel. All UI strings, code comments, README, and commit messages are in Korean — keep it that way.

## Running locally

```bash
python -m http.server 5173 --directory public
```

Open http://localhost:5173 (`file://` does not work). Click "로그인 없이 체험 모드로 둘러보기" to use demo mode, which needs no Firebase. The `/api/autofill` function does not exist under this local server; it only works on Vercel (needs `GEMINI_API_KEY`, optional `GEMINI_MODEL`).

There is nothing to build: Vercel serves `public/` as-is (`vercel.json`), and `public/app.jsx` is compiled in the browser by `@babel/standalone`. That means:
- No `import`/`export` in `app.jsx`. It is one big script that reads `React`/`ReactDOM` globals and calls `ReactDOM.createRoot` at the bottom.
- Tailwind classes are compiled at runtime by the CDN script. Custom theme tokens (`peach-*`, `cream`, `ink`, `shadow-soft`/`card`, `font-display`) are defined inline in `public/index.html`.

## Architecture

**Backend abstraction.** `public/firebase.js` is an ES module that sets `window.AlbumFirebase` (`mode: 'firebase'`). `public/app.jsx` defines `demoBackend` (`mode: 'demo'`), which has the same function shape but is backed by `DemoStore`, a LocalStorage store with a subscribe/patch API seeded by `seedDemo()`. `App` picks one of the two with `const backend = mode === 'demo' ? demoBackend : FB`, and every component receives `backend` as a prop. **When you add a data operation, add it to both `window.AlbumFirebase` in firebase.js and `demoBackend` in app.jsx.** Auth functions (`signInGoogle`, `watchAuth`, `ensureUserProfile`, …) exist only on the Firebase side; demo mode fakes auth through `DemoStore.currentUid`.

**Data model (Firestore).**
- `records/{id}`: `{ date:'YYYY-MM-DD', title, memo, category, milestone, tags[], media:[{url,type,path,view?,viewPath?}], visibility, authorUid, authorName, createdAt }`. Media files are stored in Storage at `records/{uid}/{ts}_{name}`; photos also get a ~2048px JPEG display copy at `{path}.view.jpg` (`view`/`viewPath`). The UI shows `viewSrc(m)` (view, falling back to url) — always delete both paths.
- `users/{uid}`: `status` (`pending`/`approved`), `role` (`admin`/`family`), `permission` (`view`/`edit`), `group` (`parents`/`grandparents`/`relatives`…), `relation`, `requestNote`.
- `meta/app` holds `adminUid` and is write-once: the first user to sign in becomes admin (see `ensureUserProfile`). `meta/baby` holds the baby's profile photo (admin only).

**Permissions live in two layers.**
- `firestore.rules` and `storage.rules` enforce only "approved family member" plus write permission (`admin` or `permission == 'edit'`; you can only edit your own records unless you are admin).
- Visibility (`all` / grandparents / parents) is **client-side filtering only**, done by `canSee()` in app.jsx. Admins can preview the app as another member through `viewAs`.
- Rule files are **pasted into the Firebase console manually**; deploying to Vercel does not apply them. `firebase.json`/`.firebaserc` are only for the optional Firebase CLI. If you change the rules, tell the user they must publish them.

**Autofill (`api/autofill.js`).** A Vercel serverless function (CommonJS, 60s `maxDuration`). The client sends images: resized data URLs, frames extracted from videos, or Firebase Storage URLs, which the server fetches itself and which are restricted to `firebasestorage.googleapis.com`. Requests carry `Authorization: Bearer <Firebase ID token>`. The server does not verify the token itself. It reads `users/{uid}` through the Firestore REST API using that token, so the security rules do the verification, and then checks writer permission. It tries the `MODELS` list in order, retrying 5xx once and moving to the next model on 404/5xx, all under a self-imposed ~50s deadline so it can return a Korean error message before Vercel kills the function. Errors are `HttpError(status, koreanMessage)` and are returned as `{ error }`.

**PWA / service worker (`public/sw.js`).** App-shell files are fetched network-first; CDN hosts and gstatic `firebasejs` are cache-first with background refresh; `/__/` (Firebase auth) passes through. **Bump `VERSION` in `public/sw.js` whenever you change any file in `public/`** so installed apps pick up the new files. If you add a new CDN host, add it to `CDN_HOSTS`.

**app.jsx layout.** Numbered sections listed in the header comment (constants → date/permission utils → LocalStorage → shared components → timeline → record form → search → family/settings → login/pending → `App`). Shared Tailwind class strings (`BTN_PRIMARY`, `CARD`, `INPUT`, …) and `cx()` are defined near the top; reuse them instead of writing new class strings. Icons are inline SVG paths in `ICONS`.

## Gotchas

- Vercel preview URLs are not Firebase authorized domains, so Google sign-in only works on the production URL. Use demo mode to check UI changes.
- The Storage upload limit is 300MB per file, image/video only (`storage.rules`).
- Baby facts (name, birth date/time, parents) are hardcoded in both `BABY` in app.jsx and `BABY` in `api/autofill.js`.
