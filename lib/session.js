"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { multiFactor, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db, firebaseReady } from "@/lib/firebase";
import {
  ENROL_PATH,
  PENDING_PATH,
  ROLE_HOME,
  VERIFY_EMAIL_PATH,
  VERIFY_PHONE_PATH,
} from "@/lib/config";

export async function loadProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/** True when this Firebase user has an SMS second factor enrolled. */
export function hasPhoneFactor(user) {
  if (!user) return false;
  try {
    return multiFactor(user).enrolledFactors.some((f) => f.factorId === "phone");
  } catch {
    return false;
  }
}

/** The enrolled (verified) mobile number, e.g. "+919876543210", or "". */
export function phoneFactorNumber(user) {
  if (!user) return "";
  try {
    const f = multiFactor(user).enrolledFactors.find((x) => x.factorId === "phone");
    return f?.phoneNumber || "";
  } catch {
    return "";
  }
}

/** Approval status of a creator: "pending" | "approved" | "rejected". */
export function approvalStatus(profile) {
  const s = profile?.status;
  return s === "approved" || s === "rejected" ? s : "pending";
}

/**
 * The one place that decides where a signed-in user belongs.
 *   no role yet                         -> /role
 *   admin                               -> /admin
 *   creator, email not verified         -> /verify-email
 *   creator, no SMS second factor yet   -> /verify-phone
 *   creator, enrolment form not done    -> /enrol
 *   creator, waiting for / refused by admin -> /pending
 *   creator, approved                   -> /creator
 *
 * Pass the Firebase user as the second argument so the email / phone
 * checks can run. Without it those two steps are skipped.
 */
export function homeFor(profile, user) {
  const role = profile?.role;
  if (!role || !ROLE_HOME[role]) return "/role";
  if (role !== "creator") return ROLE_HOME[role];

  if (user && !user.emailVerified) return VERIFY_EMAIL_PATH;
  if (user && !hasPhoneFactor(user)) return VERIFY_PHONE_PATH;
  if (!profile.enrolled) return ENROL_PATH;
  if (approvalStatus(profile) !== "approved") return PENDING_PATH;
  return ROLE_HOME.creator;
}

/**
 * Guard a page.
 *   useSession()                      any signed-in user
 *   useSession({ allow: ["admin"] })  only these roles, on their home page
 *   useSession({ page: "/pending" })  only users whose next step is this page
 *   useSession({ enrolPage: true })   same as page: "/enrol" (kept for old code)
 *   useSession({ noRole: true })      users with no valid role yet (/role)
 *
 * Returns { user, profile, ready, notConfigured }. Render a loader until ready,
 * and <SetupNotice /> when notConfigured (no Firebase keys in .env.local).
 */
export function useSession({ allow, enrolPage = false, noRole = false, page = "" } = {}) {
  const router = useRouter();
  const [state, setState] = useState({ user: null, profile: null, ready: false });
  const allowKey = allow ? allow.join(",") : "";
  const onlyPage = page || (enrolPage ? ENROL_PATH : "");

  useEffect(() => {
    if (!firebaseReady) return;
    let alive = true;
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/auth?mode=login");
        return;
      }
      let profile = null;
      try {
        profile = await loadProfile(user.uid);
      } catch {
        profile = null;
      }
      if (!alive) return;

      const home = homeFor(profile, user);
      const roles = allowKey ? allowKey.split(",") : null;

      let ok = true;
      // No role, or an old role that no longer exists (e.g. "brand").
      if (noRole) ok = !profile?.role || !ROLE_HOME[profile.role];
      else if (onlyPage) ok = home === onlyPage;
      else if (roles) ok = roles.includes(profile?.role) && home === ROLE_HOME[profile.role];

      if (!ok) {
        router.replace(home);
        return;
      }
      setState({ user, profile, ready: true });
    });
    return () => {
      alive = false;
      unsub();
    };
  }, [router, allowKey, onlyPage, noRole]);

  return firebaseReady ? state : { ...state, notConfigured: true };
}
