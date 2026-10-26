"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useStill } from "@/lib/motion";
import { TIERS, formatCount, formatINR, formatRange } from "@/lib/config";
import { adState } from "@/lib/ads";
import { isAwaiting } from "@/components/admin/ApprovalsList";

function daysLeft(iso) {
  if (!iso) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((new Date(`${iso}T00:00:00`) - today) / 86400000);
}

function ago(ts) {
  const d = ts?.toDate?.();
  if (!d) return "";
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function Card({ title, action, onAction, children, className = "", delay = 0 }) {
  const still = useStill();
  return (
    <motion.section
      className={`dcard ov-card ${className}`}
      initial={still ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <div className="ov-head">
        <h2>{title}</h2>
        {action && (
          <button type="button" className="clear-btn" onClick={onAction}>
            {action}
          </button>
        )}
      </div>
      {children}
    </motion.section>
  );
}

/**
 *   users, ads, accounts – arrays (or null while loading)
 *   onGo(section)        – jump to a sidebar section
 *   onNewAd()            – open the "Post an ad" form
 */
export default function DashboardOverview({ users, ads, accounts, onGo, onNewAd }) {
  const data = useMemo(() => {
    const u = users || [];
    const a = ads || [];
    const s = accounts || [];
    const creators = u.filter((x) => x.role === "creator");
    const enrolled = creators.filter((x) => x.enrolled);
    const live = a.filter((x) => adState(x) === "active");

    const tiers = TIERS.map((t) => ({
      name: t.name,
      min: t.min,
      count: enrolled.filter((c) => (c.tier || "Starter") === t.name).length,
    }));
    const maxTier = Math.max(1, ...tiers.map((t) => t.count));

    return {
      recent: [...u].sort((x, y) => (y.createdAt?.seconds || 0) - (x.createdAt?.seconds || 0)).slice(0, 5),
      ending: live
        .map((x) => ({ ...x, left: daysLeft(x.deadline) }))
        .filter((x) => x.left != null && x.left <= 7)
        .sort((x, y) => x.left - y.left)
        .slice(0, 5),
      tiers,
      maxTier,
      reach: enrolled.reduce((sum, c) => sum + (c.totalFollowers || 0), 0),
      unverified: s.filter((x) => !x.verified).length,
      verified: s.filter((x) => x.verified).length,
      linked: s.length,
      pending: creators.length - enrolled.length,
      awaiting: u.filter(isAwaiting).length,
      liveBudget: live.reduce((sum, x) => sum + (x.budget || 0), 0),
    };
  }, [users, ads, accounts]);

  const loading = users === null || ads === null;

  return (
    <div className="ov-grid">
      <Card title="Quick actions" className="ov-actions" delay={0.05}>
        <div className="ov-btns">
          {data.awaiting > 0 && (
            <button type="button" className="act act-go" onClick={() => onGo("approvals")}>
              Approve creators ({data.awaiting})
            </button>
          )}
          <button type="button" className={`act ${data.awaiting ? "" : "act-go"}`} onClick={onNewAd}>+ Post ad / video</button>
          <button type="button" className="act" onClick={() => onGo("social")}>
            Review social accounts{data.unverified ? ` (${data.unverified})` : ""}
          </button>
          <button type="button" className="act" onClick={() => onGo("users")}>Browse creators</button>
        </div>
        <ul className="ov-facts">
          <li><strong>{loading ? "…" : formatCount(data.reach)}</strong><span>combined reach of enrolled creators</span></li>
          <li><strong>{loading ? "…" : data.pending}</strong><span>creators haven&apos;t finished enrolment</span></li>
          <li><strong>{accounts === null ? "…" : `${data.verified}/${data.linked}`}</strong><span>social accounts verified</span></li>
        </ul>
      </Card>

      <Card title="Recent sign-ups" action="View all creators" onAction={() => onGo("users")} delay={0.1}>
        {users === null ? (
          <p className="caption">Loading…</p>
        ) : data.recent.length === 0 ? (
          <p className="caption">No users yet.</p>
        ) : (
          <ul className="ov-list">
            {data.recent.map((u) => (
              <li key={u.id}>
                <span className="side-avatar ov-avatar" aria-hidden="true">
                  {(u.name || u.email || "?")[0].toUpperCase()}
                </span>
                <span className="ov-main">
                  <strong>{u.name || u.email || "—"}</strong>
                  <span className="sub-cell">{u.name ? u.email : ago(u.createdAt)}</span>
                </span>
                <span className={`role-tag rt-${u.role || "none"}`}>{u.role || "no role"}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Ads ending this week" action="Manage ads" onAction={() => onGo("ads")} delay={0.15}>
        {ads === null ? (
          <p className="caption">Loading…</p>
        ) : data.ending.length === 0 ? (
          <p className="caption">No live ads end in the next 7 days.</p>
        ) : (
          <ul className="ov-list">
            {data.ending.map((a) => (
              <li key={a.id}>
                <span className="ov-main">
                  <strong>{a.title}</strong>
                  <span className="sub-cell">
                    {a.brand} · {formatRange(a.minFollowers, a.maxFollowers)} · {formatINR(a.budget)}
                  </span>
                </span>
                <span className={`sub-cell ${a.left <= 2 ? "soon" : ""}`}>
                  {a.left === 0 ? "ends today" : a.left === 1 ? "1 day left" : `${a.left} days left`}
                </span>
              </li>
            ))}
          </ul>
        )}
        {ads && <p className="table-foot">Live budget across all active ads: {formatINR(data.liveBudget)}</p>}
      </Card>

      <Card title="Enrolled creators by tier" action="Social accounts" onAction={() => onGo("social")} delay={0.2}>
        {users === null ? (
          <p className="caption">Loading…</p>
        ) : (
          <ul className="ov-bars">
            {data.tiers.map((t) => (
              <li key={t.name}>
                <span className="ov-bar-label">
                  {t.name}
                  <span className="sub-cell">{t.min ? `${formatCount(t.min)}+` : "under 5K"}</span>
                </span>
                <span className="ov-bar-track">
                  <span className="ov-bar-fill" style={{ width: `${(t.count / data.maxTier) * 100}%` }} />
                </span>
                <strong className="ov-bar-num">{t.count}</strong>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
