# Data model (Firestore)

## `users/{uid}`
| Field | Type | Notes |
|---|---|---|
| email | string | from Firebase Auth |
| role | `"creator"` \| `"admin"` | set to `creator` at sign-up; admin is set by hand in the console |
| enrolled | boolean | creators only; `false` until `/enrol` is finished |
| status | `"pending"` \| `"approved"` \| `"rejected"` | creators only. Set to `pending` when the enrolment form is submitted; only an admin can set `approved` / `rejected` (rules). Missing = pending |
| reviewNote | string | admin's reason when sending a profile back (creator sees it on `/pending`); admin-only |
| reviewedBy, reviewedAt | string, timestamp | admin uid + time of the last approve / reject; admin-only |
| submittedAt | timestamp | last time the creator submitted the enrolment form |
| phoneVerified | boolean | `true` when `phone` is the number verified by SMS (the MFA factor) |
| name, phone, city | string | from enrolment |
| niches | string[] | up to 3, from `NICHES` in `lib/config.js` |
| platforms | string[] | e.g. `["instagram","youtube"]` |
| totalFollowers | number | sum across accounts |
| topFollowers | number | biggest single account; decides the tier |
| tier | string | Starter / Nano / Micro / Mid-tier / Macro |
| createdAt, enrolledAt, updatedAt | timestamp | |

## `users/{uid}/socialAccounts/{platform}`
`platform` is `instagram`, `facebook` or `youtube`.

| Field | Type | Notes |
|---|---|---|
| handle | string | |
| followers | number | |
| verified | boolean | `false` until YouTube API / Meta app linking is live; only admins can set `true` |
| source | `"self-reported"` \| `"api"` | |
| profileUrl | string | set when the follower API filled the count |
| updatedAt | timestamp | |

Admins list every account on `/admin#social` with a collection-group query (`collectionGroup(db, "socialAccounts")`), allowed by the `/{path=**}/socialAccounts/{platform}` rule, and toggle `verified` there.
`source` is `"<platform>-fetch"` when the count came from the follower API.

## `ads/{adId}`
Posted, edited and paused by admins on `/admin` → **Ads & Videos**. Signed-in users can read. Rules check the shape (`validAd` in `firestore.rules`).

| Field | Type | Notes |
|---|---|---|
| brand | string | brand name, ≤ 80 chars |
| title | string | short ad title, ≤ 100 chars |
| category | string | one of `BRAND_CATEGORIES` in `lib/config.js` |
| platforms | string[] | any of `instagram`, `facebook`, `youtube` (at least one) |
| minFollowers | number | creator's top account must have at least this |
| maxFollowers | number \| null | upper limit; `null` = no limit. Presets in `FOLLOWER_RANGES` |
| brief | string | content brief, ≤ 1500 chars |
| budget | number | rupees |
| deadline | string | `YYYY-MM-DD`; after this date the ad shows as **expired** |
| format | string | optional, one of `AD_FORMATS` in `lib/config.js` (e.g. "Instagram Reel"); `""` = any |
| mediaUrl | string | optional video / sample link, max 500 chars. YouTube links show a thumbnail and play in the ad dialog; `.mp4` plays inline |
| status | `"active"` \| `"paused"` | paused ads are hidden from creators |
| createdBy | string | admin uid |
| createdAt, updatedAt | timestamp | |

"Expired" isn't stored: it's worked out from `deadline` (`adState` in `lib/ads.js`).
A creator matches an ad when the ad is active, their `topFollowers` is inside the range and they have at least one of its platforms (`adMatchesCreator` in `lib/ads.js`).

Ads can only be read by admins and **approved** creators (`isApprovedCreator` in `firestore.rules`).

## Redirect rules (`homeFor` in `lib/session.js`)
| User | Goes to |
|---|---|
| No role yet | `/role` |
| admin | `/admin` |
| creator, email not verified | `/verify-email` |
| creator, no SMS second factor | `/verify-phone` |
| creator, not enrolled | `/enrol` |
| creator, enrolled, not approved | `/pending` |
| creator, approved | `/creator` |

The SMS second factor lives in Firebase Auth (not Firestore): `multiFactor(user).enrolledFactors`.
