"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useStill } from "@/lib/motion";
import { PLATFORMS, TIERS, formatCount, formatINR, formatRange, tierFor } from "@/lib/config";
import { adMatchesCreator, adState } from "@/lib/ads";

function fmtDate(ts) {
  const d = ts?.toDate?.();
  return d
    ? d.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })
    : "—";
}

/**
 * Full details of one user, in a dialog (admin → Creators → click a row).
 *   user      – users/{uid} doc
 *   accounts  – every socialAccounts doc (filtered here by uid)
 *   ads       – every ad (to show which live ads this creator qualifies for)
 *   onVerify(acc), busyId – reuse the Social Accounts verify toggle
 */
const STATUS_LABEL = {
  pending: "Waiting for approval",
  approved: "Approved",
  rejected: "Sent back for changes",
};

export default function UserDetail({ user, accounts, ads, onVerify, onApprove, onReject, busyId, onClose }) {
  const still = useStill();
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const status = user.status === "approved" || user.status === "rejected" ? user.status : "pending";
  const reviewBusy = busyId === `review/${user.id}`;
  const canReview = user.role === "creator" && user.enrolled && onApprove && onReject;
  const mine = (accounts || []).filter((a) => a.uid === user.id);
  const top = user.topFollowers || 0;
  const tier = tierFor(top);
  const nextTier = TIERS.find((t) => t.min > top);
  const live = (ads || []).filter((a) => adState(a) === "active");
  const matched = user.role === "creator" && user.enrolled ? live.filter((a) => adMatchesCreator(a, user)) : [];

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const legacyBrand = user.role === "brand";

  return (
    <motion.div
      className="ad-scrim"
      initial={still ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        className="ad-sheet udetail"
        role="dialog"
        aria-modal="true"
        aria-labelledby="udetail-title"
        initial={still ? false : { opacity: 0, y: 40, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.98 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        <header className="ad-sheet-head">
          <div className="udetail-who">
            <span className="side-avatar udetail-ava" aria-hidden="true">
              {(user.name || user.email || "?")[0].toUpperCase()}
            </span>
            <div>
              <h2 id="udetail-title">{user.name || user.email || "—"}</h2>
              <p className="sub">
                <span className={`role-tag rt-${user.role || "none"}`}>
                  {legacyBrand ? "old brand account" : user.role || "no role"}
                </span>{" "}
                {user.role === "creator" &&
                  (user.enrolled ? (
                    <span className={`role-tag ap-${status}`}>{STATUS_LABEL[status]}</span>
                  ) : (
                    "Hasn't finished enrolment"
                  ))}
              </p>
            </div>
          </div>
          <button type="button" className="ad-x" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <div className="ad-sheet-body">
          {legacyBrand && (
            <p className="udetail-note">
              Signed up as a brand before the brand side was removed. It becomes a creator account the next time
              this person logs in.
            </p>
          )}

          {status === "rejected" && user.reviewNote && (
            <p className="udetail-note">
              <strong>Reason sent to creator:</strong> {user.reviewNote}
            </p>
          )}

          <h3 className="adetail-h">Contact</h3>
          <dl className="adetail-facts">
            <div><dt>Email</dt><dd className="udetail-wrap">{user.email || "—"}</dd></div>
            <div>
              <dt>Mobile</dt>
              <dd>
                {user.phone ? <a href={`tel:${user.phone}`}>{user.phone}</a> : "—"}
                {user.phoneVerified ? " ✓ SMS verified" : ""}
              </dd>
            </div>
            <div><dt>City</dt><dd>{user.city || "—"}</dd></div>
            <div><dt>Niches</dt><dd>{user.niches?.join(", ") || "—"}</dd></div>
          </dl>

          {user.role === "creator" && (
            <>
              <h3 className="adetail-h">Reach</h3>
              <dl className="adetail-facts">
                <div><dt>Tier</dt><dd>{user.enrolled ? tier.name : "—"}</dd></div>
                <div><dt>Top account</dt><dd>{formatCount(top)}</dd></div>
                <div><dt>Total followers</dt><dd>{formatCount(user.totalFollowers || 0)}</dd></div>
                <div>
                  <dt>Next tier</dt>
                  <dd>{nextTier ? `${nextTier.name} at ${formatCount(nextTier.min)}` : "Top tier"}</dd>
                </div>
              </dl>
            </>
          )}

          <h3 className="adetail-h">Linked accounts ({mine.length})</h3>
          {accounts === null ? (
            <p className="adetail-note">Loading…</p>
          ) : mine.length === 0 ? (
            <p className="adetail-note">No social accounts linked yet.</p>
          ) : (
            <ul className="udetail-accs">
              {mine.map((a) => {
                const pl = PLATFORMS.find((x) => x.id === a.platform);
                const key = `${a.uid}/${a.id}`;
                return (
                  <li key={a.id}>
                    <span className={`social-badge sb-${a.platform}`} aria-hidden="true">{pl?.label[0]}</span>
                    <span className="udetail-acc-main">
                      <strong>{pl?.label || a.platform}</strong>
                      {a.profileUrl ? (
                        <a href={a.profileUrl} target="_blank" rel="noopener noreferrer">
                          {a.handle || a.profileUrl} ↗
                        </a>
                      ) : (
                        <span>{a.handle || "—"}</span>
                      )}
                      <small>
                        {String(a.source || "").endsWith("-fetch") || a.source === "api" ? "Count read from profile" : "Self-reported"}
                        {a.updatedAt ? ` · ${fmtDate(a.updatedAt)}` : ""}
                      </small>
                    </span>
                    <span className="udetail-acc-count">
                      {formatCount(a.followers || 0)}
                      <em>{a.platform === "youtube" ? "subscribers" : "followers"}</em>
                    </span>
                    {onVerify && (
                      <button
                        type="button"
                        className={`act ${a.verified ? "" : "act-go"}`}
                        onClick={() => onVerify(a)}
                        disabled={busyId === key}
                      >
                        {busyId === key ? "…" : a.verified ? "Verified ✓" : "Verify"}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {user.role === "creator" && user.enrolled && (
            <>
              <h3 className="adetail-h">Live ads they qualify for ({matched.length})</h3>
              {matched.length === 0 ? (
                <p className="adetail-note">None right now.</p>
              ) : (
                <ul className="udetail-ads">
                  {matched.map((a) => (
                    <li key={a.id}>
                      <strong>{a.title}</strong>
                      <span>
                        {a.brand} · {formatRange(a.minFollowers, a.maxFollowers)} · {formatINR(a.budget)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          <dl className="udetail-meta">
            <div><dt>Joined</dt><dd>{fmtDate(user.createdAt)}</dd></div>
            {user.enrolledAt && <div><dt>Enrolled</dt><dd>{fmtDate(user.enrolledAt)}</dd></div>}
            {user.reviewedAt && <div><dt>Reviewed</dt><dd>{fmtDate(user.reviewedAt)}</dd></div>}
            <div><dt>User ID</dt><dd className="udetail-wrap"><code>{user.id}</code></dd></div>
          </dl>
        </div>

        {canReview && rejecting && (
          <div className="udetail-reject">
            <label htmlFor="udetail-note">What should they fix? (the creator sees this)</label>
            <textarea
              id="udetail-note"
              rows={3}
              maxLength={500}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              autoFocus
            />
          </div>
        )}

        <footer className="ad-sheet-foot">
          {canReview && !rejecting && status !== "rejected" && (
            <button type="button" className="btn btn-soft" onClick={() => setRejecting(true)} disabled={reviewBusy}>
              {status === "approved" ? "Revoke approval" : "Reject"}
            </button>
          )}
          {canReview && rejecting && (
            <>
              <button type="button" className="btn btn-soft" onClick={() => setRejecting(false)} disabled={reviewBusy}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={reviewBusy}
                onClick={async () => {
                  await onReject(user, note);
                  if (note.trim()) setRejecting(false);
                }}
              >
                {reviewBusy ? "Saving…" : "Send back"}
              </button>
            </>
          )}
          {canReview && !rejecting && status !== "approved" && (
            <button type="button" className="btn btn-violet" onClick={() => onApprove(user)} disabled={reviewBusy}>
              {reviewBusy ? "Saving…" : "Approve"}
            </button>
          )}
          <button type="button" className="btn btn-pink" onClick={onClose}>
            Close
          </button>
        </footer>
      </motion.div>
    </motion.div>
  );
}
