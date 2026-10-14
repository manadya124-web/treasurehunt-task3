# Task 3 – Treasure Hunt registration (ready-made changes)

Frontend only. Repo: site_frontend_new-main (Next.js). 6 files changed.

## Apply (pick one)
A) Copy everything inside `changed_files/` into the repo root, keeping folders (overwrite when asked).
B) Or in the repo root: `git apply treasurehunt-registration.patch`

## Then
1. Create a personal branch (do NOT push to main/dev):  `git checkout -b task3-treasurehunt-<name>`
2. `npm install` then `npm run build` then `npm run dev`
3. Quick test: logged out -> open /events/treasurehunt -> should go to /auth/login?next=%2Fevents%2Ftreasurehunt -> after login you return to /events/treasurehunt.
   Normal login at /auth/login (no next) should still go to "/".
4. `git add .` (check no .env files are included), commit, `git push -u origin <branch>`

## Status
- Redirect helper unit tests pass (7/7).
- NOT yet run: npm install / build / lint / browser test / create-join team against real backend
  (author's sandbox had no network). Please run the build before merging.

See `Task3_Implementation_Notes.md` for details and open questions.
