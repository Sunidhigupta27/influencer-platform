"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useStill } from "@/lib/motion";
import {
  BRAND_CATEGORIES,
  FOLLOWER_RANGES,
  PLATFORMS,
  formatINR,
  formatRange,
} from "@/lib/config";
import { adState } from "@/lib/ads";

const STATUS_TABS = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "paused", label: "Paused" },
  { id: "expired", label: "Expired" },
];

const SORTS = [
  { id: "new", label: "Newest first" },
  { id: "deadline", label: "Deadline soonest" },
  { id: "budget", label: "Budget high → low" },
];

const NO_FILTERS = { status: "all", platform: "", category: "", range: "", q: "", sort: "new" };

function fmtDeadline(iso) {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function daysLeft(iso) {
  if (!iso) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((new Date(`${iso}T00:00:00`) - today) / 86400000);
}

// Does the ad's follower range overlap the chosen preset?
function overlaps(ad, r) {
  const aMin = ad.minFollowers || 0;
  const aMax = ad.maxFollowers ?? Infinity;
  const rMax = r.max ?? Infinity;
  if (r.id === "any") return true;
  return aMin < rMax && aMax > r.min;
}

/**
 *   ads       – array or null while loading
 *   onEdit(ad), onToggle(ad) – pause/resume
 *   busyId    – id of the ad whose status is being changed
 */
export default function AdList({ ads, onEdit, onToggle, onNew, onView, busyId }) {
  const still = useStill();
  const [f, setF] = useState(NO_FILTERS);
  const set = (key) => (e) => setF((s) => ({ ...s, [key]: e.target ? e.target.value : e }));

  const counts = useMemo(() => {
    const c = { all: 0, active: 0, paused: 0, expired: 0 };
    for (const a of ads || []) {
      c.all += 1;
      c[adState(a)] += 1;
    }
    return c;
  }, [ads]);

  const rows = useMemo(() => {
    const term = f.q.trim().toLowerCase();
    const range = FOLLOWER_RANGES.find((r) => r.id === f.range);
    const list = (ads || []).filter((a) => {
      if (f.status !== "all" && adState(a) !== f.status) return false;
      if (f.platform && !a.platforms?.includes(f.platform)) return false;
      if (f.category && a.category !== f.category) return false;
      if (range && !overlaps(a, range)) return false;
      if (term && ![a.brand, a.title, a.brief, a.format].some((x) => x?.toLowerCase().includes(term))) return false;
      return true;
    });
    if (f.sort === "deadline") list.sort((a, b) => (a.deadline || "").localeCompare(b.deadline || ""));
    else if (f.sort === "budget") list.sort((a, b) => (b.budget || 0) - (a.budget || 0));
    return list;
  }, [ads, f]);

  const filtered =
    f.platform || f.category || f.range || f.q.trim() || f.status !== "all";

  return (
    <section className="dcard admin-card">
      <div className="admin-tools">
        <div className="tabs" role="tablist" aria-label="Filter ads by status">
          {STATUS_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={f.status === t.id}
              className={f.status === t.id ? "on" : ""}
              onClick={() => setF((s) => ({ ...s, status: t.id }))}
            >
              {f.status === t.id && !still && (
                <motion.span layoutId="ad-tab-pill" className="tab-pill" />
              )}
              <span className="tab-txt">
                {t.label} <em className="tab-count">{ads ? counts[t.id] : "…"}</em>
              </span>
            </button>
          ))}
        </div>
        <button type="button" className="btn btn-pink ad-new" onClick={onNew}>
          + Post ad / video
        </button>
      </div>

      <div className="ad-filters">
        <input
          className="search"
          type="search"
          placeholder="Search brand, title, brief"
          value={f.q}
          onChange={set("q")}
          aria-label="Search ads"
        />
        <select className="dsel" value={f.platform} onChange={set("platform")} aria-label="Platform">
          <option value="">All platforms</option>
          {PLATFORMS.map((p) => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>
        <select className="dsel" value={f.category} onChange={set("category")} aria-label="Category">
          <option value="">All categories</option>
          {BRAND_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select className="dsel" value={f.range} onChange={set("range")} aria-label="Follower range">
          <option value="">All follower ranges</option>
          {FOLLOWER_RANGES.filter((r) => r.id !== "any").map((r) => (
            <option key={r.id} value={r.id}>{r.label}</option>
          ))}
        </select>
        <select className="dsel" value={f.sort} onChange={set("sort")} aria-label="Sort">
          {SORTS.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
        {filtered && (
          <button type="button" className="clear-btn" onClick={() => setF(NO_FILTERS)}>
            Clear filters
          </button>
        )}
      </div>

      <div className="table-wrap">
        <table className="utable adtable">
          <thead>
            <tr>
              <th>Ad</th>
              <th>Category</th>
              <th>Platforms</th>
              <th>Followers</th>
              <th className="num">Budget</th>
              <th>Deadline</th>
              <th>Status</th>
              <th className="act-col"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {ads === null && (
              <tr><td colSpan={8} className="muted-cell">Loading ads…</td></tr>
            )}
            {ads && ads.length === 0 && (
              <tr>
                <td colSpan={8} className="muted-cell">
                  No ads yet.{" "}
                  <button type="button" className="clear-btn" onClick={onNew}>Post the first one</button>
                </td>
              </tr>
            )}
            {ads && ads.length > 0 && rows.length === 0 && (
              <tr><td colSpan={8} className="muted-cell">No ads match these filters.</td></tr>
            )}
            {rows.map((a) => {
              const st = adState(a);
              const left = daysLeft(a.deadline);
              return (
                <tr key={a.id} className={st !== "active" ? "dim" : ""}>
                  <td>
                    <strong>
                      {a.title}
                      {a.mediaUrl && (
                        <button type="button" className="vid-flag" title="Watch the video" onClick={() => onView?.(a)}>
                          ▶ video
                        </button>
                      )}
                    </strong>
                    <span className="sub-cell">
                      {a.brand}
                      {a.format ? ` · ${a.format}` : ""}
                    </span>
                  </td>
                  <td>{a.category}</td>
                  <td>
                    <span className="plat-row">
                      {a.platforms?.map((p) => {
                        const pl = PLATFORMS.find((x) => x.id === p);
                        return (
                          <span key={p} className={`mini-badge sb-${p}`} title={pl?.label}>
                            {pl?.label[0]}
                          </span>
                        );
                      })}
                    </span>
                  </td>
                  <td>{formatRange(a.minFollowers, a.maxFollowers)}</td>
                  <td className="num">{formatINR(a.budget)}</td>
                  <td>
                    {fmtDeadline(a.deadline)}
                    {st === "active" && left != null && (
                      <span className={`sub-cell ${left <= 3 ? "soon" : ""}`}>
                        {left === 0 ? "Today" : `${left} day${left === 1 ? "" : "s"} left`}
                      </span>
                    )}
                  </td>
                  <td>
                    <span className={`role-tag st-${st}`}>{st}</span>
                  </td>
                  <td className="act-col">
                    <div className="row-acts">
                      <button type="button" className="act act-go" onClick={() => onView?.(a)}>
                        {a.mediaUrl ? "▶ View" : "View"}
                      </button>
                      <button type="button" className="act" onClick={() => onEdit(a)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className={`act ${a.status === "paused" ? "act-go" : ""}`}
                        onClick={() => onToggle(a)}
                        disabled={busyId === a.id}
                      >
                        {busyId === a.id ? "…" : a.status === "paused" ? "Resume" : "Pause"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {ads && ads.length > 0 && (
        <p className="table-foot">
          Showing {rows.length} of {ads.length} ads
        </p>
      )}
    </section>
  );
}
