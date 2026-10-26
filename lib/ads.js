import {
  addDoc,
  collection,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

// ads/{adId} — see docs/DATA_MODEL.md. Only admins can write (firestore.rules).

export function todayISO() {
  const d = new Date();
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d - off).toISOString().slice(0, 10);
}

/** "active" | "paused" | "expired" (an active ad whose deadline has passed). */
export function adState(ad) {
  if (ad.status === "paused") return "paused";
  if (ad.deadline && ad.deadline < todayISO()) return "expired";
  return "active";
}

export async function listAds() {
  const snap = await getDocs(collection(db, "ads"));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
}

// Turn form values into the stored shape.
function clean(values) {
  return {
    brand: values.brand.trim(),
    title: values.title.trim(),
    category: values.category,
    platforms: values.platforms,
    minFollowers: Number(values.minFollowers) || 0,
    maxFollowers:
      values.maxFollowers === "" || values.maxFollowers == null ? null : Number(values.maxFollowers),
    brief: values.brief.trim(),
    budget: Number(values.budget) || 0,
    deadline: values.deadline, // "YYYY-MM-DD"
    format: values.format || "",
    // Optional reference/sample video or post link shown on the creator's tile.
    mediaUrl: (values.mediaUrl || "").trim(),
  };
}

export async function createAd(values, uid) {
  const data = {
    ...clean(values),
    status: "active",
    createdBy: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, "ads"), data);
  return { id: ref.id, ...data, createdAt: { seconds: Date.now() / 1000 } };
}

export async function updateAd(id, values) {
  const data = { ...clean(values), updatedAt: serverTimestamp() };
  await updateDoc(doc(db, "ads", id), data);
  return data;
}

export async function setAdStatus(id, status) {
  await updateDoc(doc(db, "ads", id), { status, updatedAt: serverTimestamp() });
}

/** Ads a creator can see: active and not past the deadline (paused/expired hidden). */
export async function listLiveAds() {
  const all = await listAds();
  return all.filter((a) => adState(a) === "active");
}

/** Does the creator's top follower count sit inside the ad's range? */
export function inRange(ad, followers = 0) {
  if (followers < (ad.minFollowers || 0)) return false;
  if (ad.maxFollowers != null && followers > ad.maxFollowers) return false;
  return true;
}

/** Does this ad fit a creator? Used on /creator. */
export function adMatchesCreator(ad, creator) {
  if (adState(ad) !== "active") return false;
  const f = creator.topFollowers || 0;
  if (f < (ad.minFollowers || 0)) return false;
  if (ad.maxFollowers != null && f > ad.maxFollowers) return false;
  const mine = creator.platforms || [];
  return !ad.platforms?.length || ad.platforms.some((p) => mine.includes(p));
}
