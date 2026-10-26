"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { APP_NAME } from "@/lib/config";

/* Edit this list to change the menu. Each dropdown item has an icon, title,
   short description, link and a colour tone (peach | pink | mint | lilac | sky). */
const NAV = [
  {
    label: "Features",
    items: [
      { icon: "target", tone: "peach", title: "Follower matching", desc: "Ads that fit your audience size", href: "/#how" },
      { icon: "users", tone: "lilac", title: "Link your socials", desc: "Facebook, Instagram and YouTube", href: "/auth" },
      { icon: "video", tone: "mint", title: "Ads & videos", desc: "Posted by our team, matched to you", href: "/#video" },
    ],
  },
  {
    label: "For Creators",
    items: [
      { icon: "spark", tone: "pink", title: "Grow your tier", desc: "Nano, Micro, Mid-tier and Macro", href: "/#how" },
      { icon: "megaphone", tone: "sky", title: "Get sponsored", desc: "Only see ads you qualify for", href: "/auth" },
    ],
  },
  { label: "Watch video", href: "/#video" },
  { label: "Pricing", href: "/#pricing" },
];

const ICONS = {
  video: (
    <>
      <rect x="3" y="6" width="12" height="12" rx="2.5" />
      <path d="M15 10.5l6-3.5v10l-6-3.5" />
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
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
      <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.4c1.9.8 3 2.7 3 5.6" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="0.8" />
    </>
  ),
  spark: <path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4L12 3zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16z" />,
};

function Icon({ name, size = 20 }) {
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

function Chevron() {
  return (
    <svg className="chev" width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Logo() {
  return (
    <Link href="/" className="brand" aria-label={`${APP_NAME} home`}>
      <span className="brand-mark" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
          <path d="M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 18.7l1-1" />
        </svg>
      </span>
      <span className="grad-text">{APP_NAME}</span>
    </Link>
  );
}

export default function TopBar({ showLogin = false, signOut = false, label = "" }) {
  const router = useRouter();
  const [open, setOpen] = useState(null); // which dropdown is open
  const [menu, setMenu] = useState(false); // mobile menu
  const navRef = useRef(null);

  // Close on outside click or Escape
  useEffect(() => {
    function onDown(e) {
      if (navRef.current && !navRef.current.contains(e.target)) setOpen(null);
    }
    function onKey(e) {
      if (e.key === "Escape") {
        setOpen(null);
        setMenu(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const canHover = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(min-width: 900px) and (hover: hover)").matches;

  function closeAll() {
    setOpen(null);
    setMenu(false);
  }

  // Simple bar (logo only) for pages where the user is already inside the app
  if (!showLogin) {
    return (
      <header className="topbar">
        <div className="topbar-inner">
          <Logo />
          {label && <span className="topbar-label">{label}</span>}
          {signOut && (
            <button
              type="button"
              className="btn-ghost topbar-out"
              onClick={async () => {
                // Loaded on demand so the public homepage doesn't ship Firebase.
                const [{ signOut: fbSignOut }, { auth }] = await Promise.all([
                  import("firebase/auth"),
                  import("@/lib/firebase"),
                ]);
                await fbSignOut(auth);
                router.replace("/");
              }}
            >
              Sign out
            </button>
          )}
        </div>
      </header>
    );
  }

  return (
    <header className="topbar">
      <div className="topbar-inner" ref={navRef}>
        <Logo />

        <nav
          id="main-nav"
          className={`nav ${menu ? "nav-open" : ""}`}
          aria-label="Main"
        >
          <ul className="nav-list">
            {NAV.map((entry) => (
              <li
                key={entry.label}
                className="nav-li"
                onMouseEnter={() => entry.items && canHover() && setOpen(entry.label)}
                onMouseLeave={() => entry.items && canHover() && setOpen(null)}
              >
                {entry.items ? (
                  <>
                    <button
                      type="button"
                      className={`nav-link ${open === entry.label ? "active" : ""}`}
                      aria-expanded={open === entry.label}
                      aria-haspopup="true"
                      onClick={() => setOpen(open === entry.label ? null : entry.label)}
                    >
                      {entry.label}
                      <Chevron />
                    </button>
                    <div className={`dd-panel ${open === entry.label ? "show" : ""}`}>
                      <ul className="dd-card">
                        {entry.items.map((it) => (
                          <li key={it.title}>
                            <Link href={it.href} className="dd-item" onClick={closeAll}>
                              <span className={`dd-icon tone-${it.tone}`}>
                                <Icon name={it.icon} />
                              </span>
                              <span className="dd-text">
                                <strong>{it.title}</strong>
                                <span>{it.desc}</span>
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                ) : (
                  <Link href={entry.href} className="nav-link" onClick={closeAll}>
                    {entry.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>

          {/* Shown inside the mobile menu only */}
          <div className="nav-cta nav-cta-mobile">
            <Link href="/auth?mode=login" className="btn-ghost" onClick={closeAll}>Log in</Link>
            <Link href="/auth" className="btn-grad" onClick={closeAll}>Sign Up</Link>
          </div>
        </nav>

        <div className="nav-cta nav-cta-desktop">
          <Link href="/auth?mode=login" className="btn-ghost">Log in</Link>
          <Link href="/auth" className="btn-grad">Sign Up</Link>
        </div>

        <button
          type="button"
          className="burger"
          aria-label={menu ? "Close menu" : "Open menu"}
          aria-expanded={menu}
          aria-controls="main-nav"
          onClick={() => setMenu((m) => !m)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>
    </header>
  );
}
