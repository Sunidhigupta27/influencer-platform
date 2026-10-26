"use client";

import { useState } from "react";
import { APP_NAME, FOLLOWER_APIS, PLATFORMS, TIERS, formatCount } from "@/lib/config";
import { ADMIN_SECTIONS } from "@/components/admin/AdminSidebar";

/**
 *   profile, uid           – signed-in admin
 *   prefs / onPrefs(patch) – { startSection, collapsed } saved in this browser
 *   onRefresh()            – reload users, ads and social accounts
 */
export default function AdminSettings({ profile, uid, prefs, onPrefs, onRefresh, refreshing }) {
  const [copied, setCopied] = useState(false);

  async function copyUid() {
    try {
      await navigator.clipboard.writeText(uid);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked: the id is still visible to select by hand */
    }
  }

  return (
    <div className="set-grid">
      <section className="dcard set-card">
        <h2>Your admin account</h2>
        <dl className="set-dl">
          <div><dt>Email</dt><dd>{profile.email}</dd></div>
          <div><dt>Role</dt><dd><span className="role-tag rt-admin">admin</span></dd></div>
          <div>
            <dt>User ID</dt>
            <dd className="set-uid">
              <code>{uid}</code>
              <button type="button" className="clear-btn" onClick={copyUid}>{copied ? "Copied" : "Copy"}</button>
            </dd>
          </div>
        </dl>
        <p className="set-note">
          To add another admin: have them sign up, then in Firebase console → Firestore → <code>users</code> → their
          document, set <code>role</code> to <code>admin</code>.
        </p>
      </section>

      <section className="dcard set-card">
        <h2>Preferences</h2>
        <p className="set-note">Saved in this browser only.</p>
        <label className="set-row">
          <span>
            <strong>Open the admin panel on</strong>
            <span className="sub-cell">Section shown after you sign in</span>
          </span>
          <select
            className="dsel"
            value={prefs.startSection}
            onChange={(e) => onPrefs({ startSection: e.target.value })}
          >
            {ADMIN_SECTIONS.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </label>
        <label className="set-row">
          <span>
            <strong>Compact sidebar</strong>
            <span className="sub-cell">Icons only, on wide screens</span>
          </span>
          <input
            type="checkbox"
            className="set-switch"
            checked={prefs.collapsed}
            onChange={(e) => onPrefs({ collapsed: e.target.checked })}
          />
        </label>
        <div className="set-row">
          <span>
            <strong>Reload data</strong>
            <span className="sub-cell">Fetch users, ads and social accounts again</span>
          </span>
          <button type="button" className="act" onClick={onRefresh} disabled={refreshing}>
            {refreshing ? "Reloading…" : "Reload"}
          </button>
        </div>
      </section>

      <section className="dcard set-card">
        <h2>Follower-count APIs</h2>
        <p className="set-note">
          Used on the enrolment page to fetch follower counts. To change one, set the matching{" "}
          <code>NEXT_PUBLIC_*_FOLLOWERS_API</code> variable in <code>.env.local</code> and redeploy.
        </p>
        <ul className="set-apis">
          {PLATFORMS.map((p) => (
            <li key={p.id}>
              <span className={`mini-badge sb-${p.id}`} aria-hidden="true">{p.label[0]}</span>
              <span>
                <strong>{p.label}</strong>
                <code className="sub-cell">{FOLLOWER_APIS[p.id]}</code>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="dcard set-card">
        <h2>Follower tiers</h2>
        <p className="set-note">
          A creator&apos;s tier comes from their biggest account. Edit <code>TIERS</code> in{" "}
          <code>lib/config.js</code> to change them.
        </p>
        <ul className="set-tiers">
          {TIERS.map((t, i) => {
            const next = TIERS[i + 1];
            return (
              <li key={t.name}>
                <strong>{t.name}</strong>
                <span>{next ? `${formatCount(t.min)} – ${formatCount(next.min - 1)}` : `${formatCount(t.min)}+`}</span>
              </li>
            );
          })}
        </ul>
        <p className="set-note">App name shown in the sidebar: <strong>{APP_NAME}</strong> (<code>APP_NAME</code> in <code>lib/config.js</code>).</p>
      </section>
    </div>
  );
}
