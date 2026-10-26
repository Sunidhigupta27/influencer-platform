"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useStill } from "@/lib/motion";
import { PLATFORMS, formatCount } from "@/lib/config";

/** Creator who finished the form and is waiting on an admin. */
export function isAwaiting(u) {
  return u?.role === "creator" && u.enrolled && u.status !== "approved" && u.status !== "rejected";
}

const TABS = [
  { id: "pending", label: "Waiting" },
  { id: "rejected", label: "Sent back" },
  { id: "approved", label: "Approved" },
];

function fmtDate(ts) {
  const d = ts?.toDate?.();
  return d
    ? d.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })
    : "—";
}

function when(u) {
  return (u.submittedAt || u.enrolledAt || u.createdAt)?.seconds || 0;
}

/**
 *   users, accounts        – arrays (or null while loading)
 *   onApprove(user)        – approve
 *   onReject(user, note)   – send back with a reason the creator will see
 *   onOpen(user)           – open the full details dialog
 *   busyId                 – "review/<uid>" while saving
 */
export default function ApprovalsList({ users, accounts, loadError, onApprove, onReject, onOpen, busyId }) {
  const still = useStill();
  const [tab, setTab] = useState("pending");
  const [rejecting, setRejecting] = useState(""); // uid with the reason box open
  const [note, setNote] = useState("");

  const groups = useMemo(() => {
    const creators = (users || []).filter((u) => u.role === "creator" && u.enrolled);
    return {
      pending: creators.filter(isAwaiting).sort((a, b) => when(a) - when(b)), // oldest first
      rejected: creators.filter((u) => u.status === "rejected").sort((a, b) => when(b) - when(a)),
      approved: creators
        .filter((u) => u.status === "approved")
        .sort((a, b) => (b.reviewedAt?.seconds || 0) - (a.reviewedAt?.seconds || 0)),
    };
  }, [users]);

  const byUid = useMemo(() => {
    const m = {};
    for (const a of accounts || []) (m[a.uid] ||= []).push(a);
    return m;
  }, [accounts]);

  const rows = groups[tab];

  return (
    <section className="dcard admin-card">
      <div className="admin-tools">
        <div className="tabs" role="tablist" aria-label="Approval status">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={tab === t.id ? "on" : ""}
              onClick={() => setTab(t.id)}
            >
              {tab === t.id && !still && <motion.span layoutId="appr-pill" className="tab-pill" />}
              <span className="tab-txt">
                {t.label} {users ? `(${groups[t.id].length})` : ""}
              </span>
            </button>
          ))}
        </div>
      </div>

      {loadError && <p className="error">{loadError}</p>}

      {users === null && <p className="muted-cell">Loading…</p>}
      {users && rows.length === 0 && (
        <p className="muted-cell appr-empty">
          {tab === "pending" ? "Nobody is waiting. New sign-ups appear here once they finish the form." : "None yet."}
        </p>
      )}

      <ul className="appr-list">
        <AnimatePresence initial={false}>
          {rows.map((u) => {
            const accs = byUid[u.id] || [];
            const busy = busyId === `review/${u.id}`;
            const open = rejecting === u.id;
            return (
              <motion.li
                key={u.id}
                className="appr-card"
                layout={!still}
                initial={still ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={still ? undefined : { opacity: 0, x: 40 }}
              >
                <div className="appr-top">
                  <span className="side-avatar appr-ava" aria-hidden="true">
                    {(u.name || u.email || "?")[0].toUpperCase()}
                  </span>
                  <div className="appr-who">
                    <strong>{u.name || "—"}</strong>
                    <span>{u.email}</span>
                  </div>
                  <span className="appr-when">
                    {tab === "pending" ? "Submitted" : "Reviewed"}{" "}
                    {fmtDate(tab === "pending" ? u.submittedAt || u.enrolledAt : u.reviewedAt)}
                  </span>
                </div>

                <dl className="appr-facts">
                  <div>
                    <dt>Mobile</dt>
                    <dd>
                      {u.phone || "—"}
                      {u.phoneVerified && <em className="appr-ok"> ✓ SMS verified</em>}
                    </dd>
                  </div>
                  <div><dt>City</dt><dd>{u.city || "—"}</dd></div>
                  <div><dt>Niche</dt><dd>{u.niches?.join(", ") || "—"}</dd></div>
                  <div>
                    <dt>Reach</dt>
                    <dd>
                      {formatCount(u.totalFollowers || 0)} total · {u.tier || "Starter"}
                    </dd>
                  </div>
                </dl>

                {accs.length > 0 && (
                  <ul className="appr-accs">
                    {accs.map((a) => {
                      const pl = PLATFORMS.find((x) => x.id === a.platform);
                      return (
                        <li key={a.id}>
                          <span className={`mini-badge sb-${a.platform}`} aria-hidden="true">{pl?.label[0]}</span>
                          {a.profileUrl ? (
                            <a href={a.profileUrl} target="_blank" rel="noopener noreferrer">
                              {a.handle || pl?.label} ↗
                            </a>
                          ) : (
                            <span>{a.handle || pl?.label}</span>
                          )}
                          <b>{formatCount(a.followers || 0)}</b>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {tab === "rejected" && u.reviewNote && (
                  <p className="appr-note">
                    <span>Reason sent:</span> {u.reviewNote}
                  </p>
                )}

                {open && (
                  <div className="appr-reject">
                    <label htmlFor={`note-${u.id}`}>What should they fix? (the creator sees this)</label>
                    <textarea
                      id={`note-${u.id}`}
                      rows={3}
                      maxLength={500}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="e.g. Instagram link doesn't open; please add your real profile."
                      autoFocus
                    />
                  </div>
                )}

                <div className="appr-acts">
                  <button type="button" className="act" onClick={() => onOpen(u)}>
                    Full details
                  </button>
                  <span className="appr-gap" />
                  {open ? (
                    <>
                      <button
                        type="button"
                        className="act"
                        onClick={() => {
                          setRejecting("");
                          setNote("");
                        }}
                        disabled={busy}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="act act-bad"
                        disabled={busy}
                        onClick={async () => {
                          await onReject(u, note);
                          setRejecting("");
                          setNote("");
                        }}
                      >
                        {busy ? "…" : "Send back"}
                      </button>
                    </>
                  ) : (
                    <>
                      {u.status !== "rejected" && (
                        <button
                          type="button"
                          className="act"
                          onClick={() => {
                            setRejecting(u.id);
                            setNote("");
                          }}
                          disabled={busy}
                        >
                          {u.status === "approved" ? "Revoke" : "Reject"}
                        </button>
                      )}
                      {u.status !== "approved" && (
                        <button type="button" className="act act-go" onClick={() => onApprove(u)} disabled={busy}>
                          {busy ? "…" : "Approve"}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
    </section>
  );
}
