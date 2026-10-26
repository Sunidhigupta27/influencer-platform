"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, onSnapshot, serverTimestamp, updateDoc } from "firebase/firestore";
import { motion } from "framer-motion";
import { useStill } from "@/lib/motion";
import TopBar from "@/components/TopBar";
import SetupNotice from "@/components/SetupNotice";
import { db } from "@/lib/firebase";
import { ENROL_PATH, PENDING_PATH, ROLE_HOME, formatCount } from "@/lib/config";
import { approvalStatus, useSession } from "@/lib/session";

function fmtDate(ts) {
  const d = ts?.toDate?.();
  return d ? d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "";
}

/*
 * Where a creator waits after submitting the enrolment form, until an admin
 * approves them (admin -> Approvals). Listens to the creator's own user doc,
 * so the moment the admin approves, this page moves on to the dashboard.
 * If the admin rejects, the reason is shown with a button to fix and resubmit.
 */
export default function PendingPage() {
  const router = useRouter();
  const still = useStill();
  const { user, profile: first, ready, notConfigured } = useSession({ page: PENDING_PATH });
  const [profile, setProfile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    return onSnapshot(
      doc(db, "users", user.uid),
      (snap) => {
        const p = snap.exists() ? { id: snap.id, ...snap.data() } : null;
        setProfile(p);
        if (approvalStatus(p) === "approved") router.replace(ROLE_HOME.creator);
      },
      () => {
        /* keep showing the last known state */
      }
    );
  }, [user, router]);

  async function editAndResubmit() {
    setBusy(true);
    setError("");
    try {
      // Re-opens the enrolment form (prefilled). Submitting it sets status back to "pending".
      await updateDoc(doc(db, "users", user.uid), { enrolled: false, updatedAt: serverTimestamp() });
      router.replace(ENROL_PATH);
    } catch {
      setError("Couldn't open the form. Check your connection and try again.");
      setBusy(false);
    }
  }

  if (notConfigured) {
    return (
      <main className="page">
        <TopBar />
        <SetupNotice />
      </main>
    );
  }

  if (!ready) {
    return (
      <main className="page">
        <TopBar />
        <p className="caption">Loading…</p>
      </main>
    );
  }

  const p = profile || first || {};
  const status = approvalStatus(p);
  const rejected = status === "rejected";
  const first_name = (p.name || "").split(" ")[0] || "there";

  return (
    <main className="page">
      <TopBar signOut label="Approval" />
      <div className="auth-wrap">
        <motion.section
          className="panel panel-wide pending-panel"
          initial={still ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <ol className="gate-steps" aria-label="Sign-up progress">
            <li className="done">Email</li>
            <li className="done">Mobile</li>
            <li className="done">Details</li>
            <li className={rejected ? "bad" : "now"}>Approval</li>
          </ol>

          <div className={`pending-badge ${rejected ? "is-rejected" : ""}`} aria-hidden="true">
            {rejected ? "!" : <span className="pending-spin" />}
          </div>

          {rejected ? (
            <>
              <h1>Your profile needs changes</h1>
              <p className="sub">
                Hi {first_name}, our team couldn&apos;t approve your profile yet.
                {p.reviewNote ? " Here's what they said:" : " Please check your details and submit again."}
              </p>
              {p.reviewNote && <blockquote className="review-note">{p.reviewNote}</blockquote>}
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              <button type="button" className="btn btn-violet btn-block" onClick={editAndResubmit} disabled={busy}>
                {busy ? "Opening…" : "Edit and resubmit"}
              </button>
            </>
          ) : (
            <>
              <h1>Waiting for approval</h1>
              <p className="sub">
                Thanks, {first_name}! Your profile is with our team for review. This page updates by itself
                the moment you&apos;re approved, so you can leave it open or come back later.
              </p>
            </>
          )}

          <dl className="review">
            {[
              ["Name", p.name],
              ["Email", p.email || user.email],
              ["Mobile", p.phone ? `${p.phone}${p.phoneVerified ? " ✓" : ""}` : ""],
              ["City", p.city],
              ["Niche", p.niches?.join(", ")],
              ["Platforms", p.platforms?.join(", ")],
              ["Followers", p.totalFollowers != null ? `${formatCount(p.totalFollowers)} total · ${p.tier || "—"} tier` : ""],
              ["Submitted", fmtDate(p.submittedAt || p.enrolledAt)],
            ]
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} className="review-row">
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
          </dl>
        </motion.section>
      </div>
    </main>
  );
}
