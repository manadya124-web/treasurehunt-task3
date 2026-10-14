# Task 3 – Treasure Hunt Registration: what was changed and how

## Problem (verified in code)
- `/events/treasurehunt` sent logged-out users to `/auth/login` with no memory of where they came from.
- Login always ended on `/` (or `/profile` if already logged in); email verification always ended on `/profile`.
  So a student had to find their way back to Treasure Hunt registration manually after every auth step.
- `/api/teamhunt/myteam` failures (401 / 5xx / network) were swallowed and the forms were shown as if "no team".

## Approach (frontend only, no backend change, no new dependency)
The destination travels in a `?next=` query parameter (the game page already used this convention, but login ignored it).

| File | Change |
|---|---|
| `lib/postAuthRedirect.ts` (new) | `getSafeRedirectPath` validates `next` (internal paths only; rejects `https://…`, `//…`, backslashes, whitespace/control chars, auth pages → no open redirect / loops). `withNext`, `readNextFromLocation` helpers. |
| `app/events/treasurehunt/page.tsx` | Logged out → `/auth/login?next=/events/treasurehunt`. `myteam`: 200+teamId → game page; **404 (backend JSON) → show forms**; 401 → silent refresh, else clear stale tokens + login; other errors → message with **Try again** (forms not shown). Create/Join: both buttons disabled while either request runs, names trimmed, 401 handled, friendly network error, debug `console.log`s removed. Endpoints/payload keys unchanged. |
| `app/auth/login/page.tsx` | After login → `next` (default `/`, unchanged). Already-logged-in → `next` (default `/profile`, unchanged). Unverified email → verify page keeps `next`. "Sign up" link keeps `next`. |
| `app/auth/signup/page.tsx` | After signup → verify page keeps `next`. "Sign in" link keeps `next`. |
| `app/auth/verify-email/page.tsx` | After verify → `next` (default `/profile`, unchanged). |
| `tests/postAuthRedirect.test.mjs` (new) | 7 unit tests for the redirect validator. |

Token storage (`accessToken` / `refreshToken` in localStorage) is untouched.

## Tested
- Redirect helper unit tests: 7/7 pass (`node --experimental-strip-types --test tests/postAuthRedirect.test.mjs`).
- Scripted walk of the URL chain (treasure → login → signup → verify) and fallbacks: correct.
- TypeScript check of the edited files: no new errors vs. the original (only errors from missing installed packages in the sandbox).

## NOT tested (honest limits)
- `npm install`, `npm run lint`, `npm run build`, and any in-browser run: sandbox had no network / no running backend.
- Create team / join team / refresh-token against the real main backend.

## Open questions for seniors
1. Main backend (`/api/teams/registerTeam`, `/joinExistingTeam`, `/api/auth/refresh-token`) was not provided; contracts were taken from existing frontend code only.
2. Does the Treasure Hunt backend verify tokens with the same secret as the main backend? (If not, a valid login would still get 401 from `/myteam`.)
3. Should a team member see the game page during "Upcoming" (current behaviour kept)?
