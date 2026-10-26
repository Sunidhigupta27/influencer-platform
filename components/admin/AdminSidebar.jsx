"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useStill } from "@/lib/motion";
import { APP_NAME } from "@/lib/config";

/* Sidebar menu. `id` is also the URL hash (/admin#users), so a refresh
   or a shared link opens the same section. */
export const ADMIN_SECTIONS = [
  { id: "dashboard", label: "Dashboard", icon: "grid", hint: "Overview and statistics" },
  { id: "approvals", label: "Approvals", icon: "inbox", hint: "New creators waiting for your approval" },
  { id: "users", label: "Creators", icon: "users", hint: "Every creator who has signed up" },
  { id: "ads", label: "Ads & Videos", icon: "megaphone", hint: "Post ads and videos for creators; edit or pause them" },
  { id: "social", label: "Social Accounts", icon: "link", hint: "Follower counts and verification" },
  { id: "settings", label: "Settings", icon: "gear", hint: "Admin preferences" },
];

const ICONS = {
  grid: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="2" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="2" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="2" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="2" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
      <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.4c1.9.8 3 2.7 3 5.6" />
    </>
  ),
  inbox: (
    <>
      <path d="M3 13l2.5-8h13L21 13v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6z" />
      <path d="M3 13h5l1.5 2.5h5L16 13h5" />
    </>
  ),
  megaphone: (
    <>
      <path d="M3 10v4h3l7 4V6L6 10H3z" />
      <path d="M16.5 9.5a4 4 0 0 1 0 5" />
    </>
  ),
  link: (
    <>
      <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
      <path d="M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 18.7l1-1" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </>
  ),
  out: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </>
  ),
  collapse: <path d="M15 6l-6 6 6 6" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
};

export function AdminIcon({ name, size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[name]}
    </svg>
  );
}

function Logo({ onClick }) {
  return (
    <Link href="/" className="brand side-brand" aria-label={`${APP_NAME} home`} onClick={onClick}>
      <span className="brand-mark" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
          <path d="M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 18.7l1-1" />
        </svg>
      </span>
      <span className="grad-text side-label">{APP_NAME}</span>
    </Link>
  );
}

/**
 *   section / onSelect(id)  – the open section
 *   counts                  – { users, ads, social } small badges (optional)
 *   email                   – signed-in admin
 *   collapsed / onCollapse  – icon-only rail on desktop
 *   open / onOpen(bool)     – drawer state on phones and tablets
 */
export default function AdminSidebar({
  section,
  onSelect,
  counts = {},
  email = "",
  collapsed = false,
  onCollapse,
  open = false,
  onOpen,
}) {
  const still = useStill();
  const router = useRouter();
  const current = ADMIN_SECTIONS.find((s) => s.id === section);

  // Esc closes the drawer; lock page scroll while it's open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.classList.add("no-scroll");
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.classList.remove("no-scroll");
    };
  }, [open, onOpen]);

  async function signOut() {
    const [{ signOut: fbSignOut }, { auth }] = await Promise.all([
      import("firebase/auth"),
      import("@/lib/firebase"),
    ]);
    await fbSignOut(auth);
    router.replace("/");
  }

  return (
    <>
      {/* Phone / tablet bar: burger + current section */}
      <header className="side-mobilebar">
        <button
          type="button"
          className="side-burger"
          aria-label="Open admin menu"
          aria-expanded={open}
          aria-controls="admin-sidebar"
          onClick={() => onOpen(true)}
        >
          <AdminIcon name="menu" size={22} />
        </button>
        <Logo />
        <span className="side-mobile-title">{current?.label}</span>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            className="side-scrim"
            onClick={() => onOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        )}
      </AnimatePresence>

      <aside
        id="admin-sidebar"
        className={`side ${collapsed ? "side-collapsed" : ""} ${open ? "side-open" : ""}`}
        aria-label="Admin navigation"
      >
        <div className="side-top">
          <Logo onClick={() => onOpen(false)} />
          <button
            type="button"
            className="side-x"
            aria-label="Close admin menu"
            onClick={() => onOpen(false)}
          >
            <AdminIcon name="close" />
          </button>
        </div>

        <p className="side-kicker side-label">Admin</p>

        <nav className="side-nav">
          <ul>
            {ADMIN_SECTIONS.map((s) => {
              const on = s.id === section;
              const badge = counts[s.id];
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    className={`side-item ${on ? "on" : ""}`}
                    aria-current={on ? "page" : undefined}
                    title={collapsed ? s.label : s.hint}
                    onClick={() => {
                      onSelect(s.id);
                      onOpen(false);
                    }}
                  >
                    {on && !still && (
                      <motion.span layoutId="side-pill" className="side-pill" transition={{ type: "spring", stiffness: 500, damping: 40 }} />
                    )}
                    {on && still && <span className="side-pill" />}
                    <span className="side-ico">
                      <AdminIcon name={s.icon} />
                    </span>
                    <span className="side-txt side-label">{s.label}</span>
                    {badge != null && badge !== 0 && (
                      <span className="side-badge">{badge}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="side-foot">
          <div className="side-user" title={email}>
            <span className="side-avatar" aria-hidden="true">
              {(email[0] || "A").toUpperCase()}
            </span>
            <span className="side-user-txt side-label">
              <strong>Admin</strong>
              <span>{email}</span>
            </span>
          </div>
          <button type="button" className="side-item side-out" onClick={signOut} title="Sign out">
            <span className="side-ico">
              <AdminIcon name="out" />
            </span>
            <span className="side-txt side-label">Sign out</span>
          </button>
          {onCollapse && (
            <button
              type="button"
              className="side-collapse"
              onClick={() => onCollapse(!collapsed)}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <AdminIcon name="collapse" size={18} />
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
