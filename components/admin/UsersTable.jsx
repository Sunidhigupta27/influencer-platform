"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useStill } from "@/lib/motion";
import { formatCount } from "@/lib/config";
import { isAwaiting } from "@/components/admin/ApprovalsList";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "creator", label: "Creators" },
  { id: "awaiting", label: "Awaiting approval" },
  { id: "pending", label: "Not enrolled" },
  { id: "admin", label: "Admins" },
];

function fmtDate(ts) {
  const d = ts?.toDate?.();
  return d ? d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
}

export default function UsersTable({ users, loadError, onOpen }) {
  const still = useStill();
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (users || [])
      .filter((u) => {
        if (filter === "pending") return u.role === "creator" && !u.enrolled;
        if (filter === "awaiting") return isAwaiting(u);
        if (filter !== "all") return u.role === filter;
        return true;
      })
      .filter(
        (u) =>
          !term ||
          [u.name, u.email, u.city, ...(u.niches || [])]
            .filter(Boolean)
            .some((v) => v.toLowerCase().includes(term))
      )
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  }, [users, filter, q]);

  return (
    <section className="dcard admin-card">
      <div className="admin-tools">
        <div className="tabs" role="tablist" aria-label="Filter users">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filter === f.id}
              className={filter === f.id ? "on" : ""}
              onClick={() => setFilter(f.id)}
            >
              {filter === f.id && !still && (
                <motion.span layoutId="tab-pill" className="tab-pill" />
              )}
              <span className="tab-txt">{f.label}</span>
            </button>
          ))}
        </div>
        <input
          className="search"
          type="search"
          placeholder="Search name, email, city, niche"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search users"
        />
      </div>

      {loadError && <p className="error">{loadError}</p>}

      <div className="table-wrap">
        <table className="utable">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Niche</th>
              <th>Platforms</th>
              <th className="num">Followers</th>
              <th>Joined</th>
              <th className="act-col"><span className="sr-only">Details</span></th>
            </tr>
          </thead>
          <tbody>
            {users === null && (
              <tr>
                <td colSpan={7} className="muted-cell">Loading users…</td>
              </tr>
            )}
            {users && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="muted-cell">No users match.</td>
              </tr>
            )}
            {rows.map((u) => (
              <tr
                key={u.id}
                className="row-click"
                onClick={() => onOpen?.(u)}
                title="Click to see full details"
              >
                <td>
                  <strong>{u.name || "—"}</strong>
                  <span className="sub-cell">{u.email}</span>
                </td>
                <td>
                  <span className={`role-tag rt-${u.role || "none"}`}>
                    {u.role === "brand" ? "old brand" : u.role || "no role"}
                    {u.role === "creator" && !u.enrolled ? " · form not done" : ""}
                    {isAwaiting(u) ? " · awaiting approval" : ""}
                    {u.role === "creator" && u.status === "rejected" ? " · sent back" : ""}
                  </span>
                </td>
                <td>{u.niches?.join(", ") || "—"}</td>
                <td>{u.platforms?.join(", ") || "—"}</td>
                <td className="num">
                  {u.totalFollowers ? formatCount(u.totalFollowers) : "—"}
                  {u.tier && <span className="sub-cell">{u.tier}</span>}
                </td>
                <td>{fmtDate(u.createdAt)}</td>
                <td className="act-col">
                  <button
                    type="button"
                    className="act"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpen?.(u);
                    }}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
