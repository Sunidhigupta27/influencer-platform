"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useStill } from "@/lib/motion";
import { PLATFORMS, formatCount } from "@/lib/config";

const STATUS = [
  { id: "all", label: "All" },
  { id: "unverified", label: "Unverified" },
  { id: "verified", label: "Verified" },
];

function fmtDate(ts) {
  const d = ts?.toDate?.();
  return d ? d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
}

// enrol saves "instagram-fetch" etc. when the follower API filled the count
export function fromApi(acc) {
  return acc.source === "api" || /-fetch$/.test(acc.source || "");
}

/**
 *   accounts  – array of { id, uid, platform, handle, followers, verified, source, profileUrl, updatedAt } or null while loading
 *   usersById – { [uid]: user } to show the creator's name and email
 *   onVerify(acc) – flips verified; busyId is the account being changed
 */
export default function SocialAccountsTable({ accounts, usersById = {}, loadError, onVerify, busyId }) {
  const still = useStill();
  const [status, setStatus] = useState("all");
  const [platform, setPlatform] = useState("");
  const [q, setQ] = useState("");

  const counts = useMemo(() => {
    const c = { all: 0, verified: 0, unverified: 0 };
    for (const a of accounts || []) {
      c.all += 1;
      c[a.verified ? "verified" : "unverified"] += 1;
    }
    return c;
  }, [accounts]);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (accounts || [])
      .filter((a) => status === "all" || (status === "verified") === Boolean(a.verified))
      .filter((a) => !platform || a.platform === platform)
      .filter((a) => {
        if (!term) return true;
        const u = usersById[a.uid] || {};
        return [a.handle, u.name, u.email, u.city].filter(Boolean).some((v) => v.toLowerCase().includes(term));
      })
      .sort((a, b) => (b.followers || 0) - (a.followers || 0));
  }, [accounts, usersById, status, platform, q]);

  return (
    <section className="dcard admin-card">
      <div className="admin-tools">
        <div className="tabs" role="tablist" aria-label="Filter by verification">
          {STATUS.map((s) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={status === s.id}
              className={status === s.id ? "on" : ""}
              onClick={() => setStatus(s.id)}
            >
              {status === s.id && !still && <motion.span layoutId="social-pill" className="tab-pill" />}
              <span className="tab-txt">
                {s.label}
                {accounts && <em className="tab-count">{counts[s.id]}</em>}
              </span>
            </button>
          ))}
        </div>
        <div className="ad-filters" style={{ marginBottom: 0 }}>
          <select className="dsel" value={platform} onChange={(e) => setPlatform(e.target.value)} aria-label="Platform">
            <option value="">All platforms</option>
            {PLATFORMS.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
          <input
            className="search"
            type="search"
            placeholder="Search handle, name, email"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search social accounts"
          />
        </div>
      </div>

      {loadError && <p className="error">{loadError}</p>}

      <div className="table-wrap">
        <table className="utable adtable">
          <thead>
            <tr>
              <th>Creator</th>
              <th>Platform</th>
              <th>Handle</th>
              <th className="num">Followers</th>
              <th>Count from</th>
              <th>Status</th>
              <th>Updated</th>
              <th className="act-col"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {accounts === null && (
              <tr><td colSpan={8} className="muted-cell">Loading social accounts…</td></tr>
            )}
            {accounts && rows.length === 0 && (
              <tr>
                <td colSpan={8} className="muted-cell">
                  {accounts.length ? "No accounts match." : "No creator has linked a social account yet."}
                </td>
              </tr>
            )}
            {rows.map((a) => {
              const u = usersById[a.uid] || {};
              const pl = PLATFORMS.find((p) => p.id === a.platform);
              return (
                <tr key={`${a.uid}-${a.id}`}>
                  <td>
                    <strong>{u.name || "—"}</strong>
                    <span className="sub-cell">{u.email || a.uid}</span>
                  </td>
                  <td>
                    <span className="plat-name">
                      <span className={`mini-badge sb-${a.platform}`} aria-hidden="true">
                        {(pl?.label || a.platform || "?")[0]}
                      </span>
                      {pl?.label || a.platform}
                    </span>
                  </td>
                  <td>
                    {a.profileUrl ? (
                      <a className="ext-link" href={a.profileUrl} target="_blank" rel="noopener noreferrer">
                        {a.handle || "Open profile"}
                      </a>
                    ) : (
                      a.handle || "—"
                    )}
                  </td>
                  <td className="num">
                    <strong>{formatCount(a.followers || 0)}</strong>
                    <span className="sub-cell">{(a.followers || 0).toLocaleString("en-IN")}</span>
                  </td>
                  <td>
                    <span className={`role-tag ${fromApi(a) ? "src-api" : "src-self"}`}>
                      {fromApi(a) ? "Follower API" : "Self-reported"}
                    </span>
                  </td>
                  <td>
                    <span className={`role-tag ${a.verified ? "st-active" : "st-paused"}`}>
                      {a.verified ? "Verified" : "Unverified"}
                    </span>
                  </td>
                  <td>{fmtDate(a.updatedAt)}</td>
                  <td className="act-col">
                    <button
                      type="button"
                      className={`act ${a.verified ? "" : "act-go"}`}
                      disabled={busyId === `${a.uid}/${a.id}`}
                      onClick={() => onVerify(a)}
                    >
                      {a.verified ? "Unverify" : "Verify"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {accounts && accounts.length > 0 && (
        <p className="table-foot">
          Showing {rows.length} of {accounts.length}. Counts are saved by the follower API at enrolment. Verify an account after checking the profile.
        </p>
      )}
    </section>
  );
}
