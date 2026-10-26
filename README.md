# Influencer Platform

Next.js 16 (App Router) + Firebase Auth + Firestore + Framer Motion.

## Run it

```bash
npm install
cp .env.local.example .env.local   # fill in the Firebase web-app keys
npm run dev
```

In the Firebase console:
1. **Authentication → Sign-in method →** enable **Email/Password**, and under **Advanced** enable
   **SMS Multi-factor Authentication** (needs the free "Identity Platform" upgrade, already done).
   - **Settings → Authorized domains:** add every domain the site runs on (e.g. your Vercel / Netlify domain).
     `localhost` is there by default.
   - **Phone numbers for testing** (in the SMS MFA dialog): add e.g. `+91 99999 00001` with code `123456`
     to test without real SMS.
   - Real SMS needs the project on the **Blaze** (pay-as-you-go) plan. On Spark, only test numbers work
     (the app shows "SMS sending isn't switched on…" if billing is missing).
2. **Firestore Database →** create a database, then paste `firestore.rules` into the **Rules** tab and publish
   (or `firebase deploy --only firestore:rules`). Re-publish whenever `firestore.rules` changes (**re-publish now**: the brand/`campaigns` rules were removed, sign-up only allows the `creator` role, and ads accept the new `format` + `mediaUrl` fields).

## Pages

There are only two kinds of user: **creators** (sign up themselves) and **admins** (set by hand).
The brand/promoter side has been removed. Admins post ads and videos; creators see the ones that fit their follower count.

| Route | Who | What |
|---|---|---|
| `/` | everyone | animated landing page + explainer video section (`#video`) |
| `/auth` | everyone | sign-up (email → password) and log in, forgot password. Sign-up creates the user as a **creator**, sends a verification email and goes to `/verify-email`. Log in asks for the **SMS code** when the account has a phone second factor |
| `/verify-email` | new creators | "Check your inbox". Polls every 4 s and moves on once the link is clicked; resend button |
| `/verify-phone` | creators without SMS 2-step | enter mobile → 6-digit SMS code → the number is enrolled as a second factor (every later login asks for a code) |
| `/role` | fallback only | if a signed-in user has no profile yet, sets them up as a creator and sends them to `/enrol` (no choice screen any more) |
| `/enrol` | creators not yet enrolled | 3 steps: about you (mobile pre-filled & locked from SMS) → socials & followers → review → **Submit for approval** |
| `/pending` | creators waiting for an admin | "Waiting for approval" with their submitted details. Live: jumps to `/creator` the moment an admin approves. If sent back, shows the admin's reason + **Edit and resubmit** |
| `/creator` | **approved** creators | tier, linked accounts, and **Ads & videos for you**: tiles for every live ad, "Matched for me / All live ads" tabs, **follower-range filter** (Nano / Micro / Mid-tier / Macro, your own range marked "you"), platform filter, "You qualify" / "Need X more followers" on each tile; click a tile for the brief, video and requirements |
| `/admin` | admins | Left sidebar. **Approvals**: creators waiting for review (details, mobile, linked accounts with links and follower counts) → **Approve** or **Reject** with a reason; tabs for sent back / approved (revoke). **Dashboard**: overview stats, recent sign-ups, ads ending this week, creators by tier. **Creators**: filter + search table. **Ads & Videos**: post, edit, pause/resume, filter; each ad can carry a content format and a video / sample link (YouTube links play on the creator's tile). **Social Accounts**: verify follower counts. **Settings** |

After login everyone is sent to the right place automatically (see `homeFor` in `lib/session.js`):
admin → `/admin`; creator → `/verify-email` → `/verify-phone` → `/enrol` → `/pending` → `/creator`
(the first step not yet done); no profile → `/role` (auto-fix).

**Existing creators** (signed up before this change) have no `status`, so they land on `/pending`
(after adding their mobile) until an admin approves them in **Approvals**.
Every protected page uses `useSession({ allow: [...] })`, so typing a URL you shouldn't see sends you home.

## Explainer video (homepage)

Set `EXPLAINER_VIDEO_URL` in `lib/config.js`, or `NEXT_PUBLIC_EXPLAINER_VIDEO_URL` in `.env.local`, to a YouTube link
or an `.mp4` placed in `public/` (e.g. `/explainer.mp4`). Empty = "coming soon" placeholder.

## Making someone an admin

Admins can't be picked on the sign-up screen (and the Firestore rules stop users changing their own role).
1. Have the person sign up normally (they start as a creator).
2. Firebase console → Firestore → `users` → their document → set `role` to `admin`.
3. They log in again and land on `/admin`.

## Changing the name

Edit `APP_NAME` in `lib/config.js` once the name is picked.

See `docs/DATA_MODEL.md` for the collections and fields.
