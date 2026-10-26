// Replace APP_NAME once management picks the company name (due 8 Oct).
export const APP_NAME = "Influencer Platform";
export const TAGLINE = "Connect to brands directly";

// Where each role lands after sign-in.
// "admin" is never chosen by a user: set role = "admin" on the user's
// document in Firestore (see README > Making someone an admin).
// Only two roles: creators sign up themselves, admins are set by hand.
export const ROLE_HOME = {
  admin: "/admin",
  creator: "/creator",
};

// Creator sign-up path, in order (see homeFor in lib/session.js):
// verify email -> verify mobile by SMS (second factor) -> enrolment form
// -> wait for admin approval -> dashboard.
export const VERIFY_EMAIL_PATH = "/verify-email";
export const VERIFY_PHONE_PATH = "/verify-phone";
export const ENROL_PATH = "/enrol";
export const PENDING_PATH = "/pending";

// Country code added in front of the 10-digit mobile number for SMS.
export const PHONE_COUNTRY_CODE = "+91";

export const NICHES = [
  "Beauty",
  "Fashion",
  "Travel",
  "Food",
  "Fitness",
  "Gaming",
  "Tech",
  "Education",
  "Comedy",
  "Music",
  "Lifestyle",
  "Parenting",
];

export const MAX_NICHES = 3;

export const PLATFORMS = [
  { id: "instagram", label: "Instagram", placeholder: "@yourhandle" },
  { id: "facebook", label: "Facebook", placeholder: "facebook.com/yourpage" },
  { id: "youtube", label: "YouTube", placeholder: "@yourchannel" },
];

// Follower-count APIs used on /enrol (components/SocialFollowers.jsx).
// Each is called as GET <url>?url=<profile link> and should return JSON with a
// count, e.g. { "followersCount": 1234 } (also accepted: subscriberCount,
// followers, subscribers, fan_count; an array wrapping the object is fine).
// Set the NEXT_PUBLIC_* variables in .env.local to override without editing code.
const WEBHOOK_BASE = "https://primary-production-cff3.up.railway.app/webhook";
export const FOLLOWER_APIS = {
  instagram: process.env.NEXT_PUBLIC_INSTAGRAM_FOLLOWERS_API || `${WEBHOOK_BASE}/insta`,
  facebook: process.env.NEXT_PUBLIC_FACEBOOK_FOLLOWERS_API || `${WEBHOOK_BASE}/facebook`,
  youtube: process.env.NEXT_PUBLIC_YOUTUBE_FOLLOWERS_API || `${WEBHOOK_BASE}/youtube`,
};

// Follower tiers used for matching ads.
export const TIERS = [
  { min: 0, name: "Starter" },
  { min: 5000, name: "Nano" },
  { min: 10000, name: "Micro" },
  { min: 50000, name: "Mid-tier" },
  { min: 100000, name: "Macro" },
];

export function tierFor(followers = 0) {
  let tier = TIERS[0];
  for (const t of TIERS) if (followers >= t.min) tier = t;
  return tier;
}

export function formatCount(n = 0) {
  if (n >= 1000000) return `${+(n / 1000000).toFixed(1)}M`;
  if (n >= 10000) return `${Math.round(n / 1000)}K`;
  if (n >= 1000) return `${+(n / 1000).toFixed(1)}K`;
  return String(n);
}

// ---------- Ads (admin panel) ----------

// Category picked for each ad on the admin "Post an ad" form
// (the product category of the brand being promoted).
export const BRAND_CATEGORIES = [
  "Beauty & Personal Care",
  "Fashion & Apparel",
  "Food & Beverage",
  "Health & Fitness",
  "Tech & Gadgets",
  "Travel & Hospitality",
  "Education",
  "Finance & Fintech",
  "Gaming & Entertainment",
  "Home & Lifestyle",
  "Parenting & Kids",
  "Automotive",
  "Other",
];

// Follower-range presets on the ad form. max: null means "no upper limit".
// They line up with TIERS above; admins can also type a custom range.
export const FOLLOWER_RANGES = [
  { id: "nano", label: "Nano · 5K–10K", min: 5000, max: 10000 },
  { id: "micro", label: "Micro · 10K–50K", min: 10000, max: 50000 },
  { id: "mid", label: "Mid-tier · 50K–100K", min: 50000, max: 100000 },
  { id: "macro", label: "Macro · 100K+", min: 100000, max: null },
  { id: "any", label: "Any size", min: 0, max: null },
];

export function formatRange(min = 0, max = null) {
  if (!min && max == null) return "Any size";
  if (max == null) return `${formatCount(min)}+`;
  return `${formatCount(min)}–${formatCount(max)}`;
}

export function formatINR(n = 0) {
  return `₹${Number(n || 0).toLocaleString("en-IN")}`;
}

// What the creator is asked to make (shown on the ad tile).
export const AD_FORMATS = [
  "Instagram Reel",
  "Instagram Story",
  "Instagram Post",
  "YouTube Video",
  "YouTube Short",
  "Facebook Post",
  "Facebook Reel",
];

// Explainer video on the homepage (Thu 15 Oct).
// Paste a YouTube link (watch, youtu.be or shorts) or a direct .mp4 URL.
// Leave empty to show the "video coming soon" placeholder.
export const EXPLAINER_VIDEO_URL = process.env.NEXT_PUBLIC_EXPLAINER_VIDEO_URL || "";

/** YouTube link -> embed URL, otherwise null. */
export function youTubeEmbed(url = "") {
  const m = String(url).match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/
  );
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

/** YouTube link -> thumbnail image, otherwise null. */
export function youTubeThumb(url = "") {
  const m = String(url).match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/
  );
  return m ? `https://i.ytimg.com/vi/${m[1]}/hqdefault.jpg` : null;
}

export function isVideoFile(url = "") {
  return /\.(mp4|webm|mov)(\?|$)/i.test(String(url));
}
