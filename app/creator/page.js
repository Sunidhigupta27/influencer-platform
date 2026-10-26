"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useStill } from "@/lib/motion";
import { collection, getDocs } from "firebase/firestore";
import TopBar from "@/components/TopBar";
import SetupNotice from "@/components/SetupNotice";
import AdTile, { eligibility } from "@/components/creator/AdTile";
import AdDetail from "@/components/creator/AdDetail";
import { db } from "@/lib/firebase";
import { FOLLOWER_RANGES, PLATFORMS, TIERS, formatCount, tierFor } from "@/lib/config";
import { listLiveAds } from "@/lib/ads";
import { useSession } from "@/lib/session";

export default function CreatorHome() {
  const still = useStill();
  const { user, profile, ready, notConfigured } = useSession({ allow: ["creator"] });
  const [accounts, setAccounts] = useState([]);
  const [ads, setAds] = useState(null);
  const [adsError, setAdsError] = useState("");
  const [view, setView] = useState("matched"); // "matched" | "all"
  const [range, setRange] = useState(""); // "" = every range, or a FOLLOWER_RANGES id
  const [platform, setPlatform] = useState("");
  const [open, setOpen] = useState(null);

  useEffect(() => {
    if (!user) return;
    getDocs(collection(db, "users", user.uid, "socialAccounts"))
      .then((snap) => setAccounts(snap.docs.map((d) => ({ platform: d.id, ...d.data() }))))
      .catch(() => setAccounts([]));
    listLiveAds()
      .then((list) => {
        setAds(list);
        setAdsError("");
      })
      .catch(() => {
        setAds([]);
        setAdsError("Couldn't load ads. Check your connection, then refresh.");
      });
  }, [user]);

  const closeAd = useCallback(() => setOpen(null), []);

  // Which preset range is "mine" (by top account).
  const myRange = useMemo(() => {
    const top = profile?.topFollowers || 0;
    return FOLLOWER_RANGES.find((r) => r.id !== "any" && top >= r.min && (r.max == null || top < r.max))?.id || "";
  }, [profile]);

  const board = useMemo(() => {
    const list = ads || [];
    const me = profile || {};
    const matched = list.filter((a) => eligibility(a, me).ok);
    const r = FOLLOWER_RANGES.find((x) => x.id === range);
    const base = view === "matched" ? matched : list;
    const shown = base
      .filter((a) => {
        if (platform && !a.platforms?.includes(platform)) return false;
        if (!r || r.id === "any") return true;
        // ad's follower range overlaps the chosen preset
        const aMin = a.minFollowers || 0;
        const aMax = a.maxFollowers ?? Infinity;
        return aMin < (r.max ?? Infinity) && aMax > r.min;
      })
      // ones you qualify for first, then soonest deadline
      .sort((x, y) => {
        const ex = eligibility(x, me).ok ? 0 : 1;
        const ey = eligibility(y, me).ok ? 0 : 1;
        return ex - ey || (x.deadline || "").localeCompare(y.deadline || "");
      });
    return { matched: matched.length, all: list.length, shown };
  }, [ads, profile, view, range, platform]);

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

  const top = profile.topFollowers || 0;
  const tier = tierFor(top);
  const nextTier = TIERS.find((t) => t.min > top);
  const progress = nextTier ? Math.min(100, (top / nextTier.min) * 100) : 100;
  const first = (profile.name || "").split(" ")[0] || "there";

  const rise = (i) =>
    still
      ? {}
      : {
          initial: { opacity: 0, y: 24 },
          animate: { opacity: 1, y: 0 },
          transition: { delay: 0.08 * i, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
        };

  return (
    <main className="page">
      <TopBar signOut label="Creator" />
      <div className="dash">
        <motion.header className="dash-head" {...rise(0)}>
          <h1 className="role-title">Hi {first}</h1>
          <p className="role-sub">
            {profile.niches?.join(" · ")} · {profile.city}
          </p>
        </motion.header>

        <div className="dash-grid">
          <motion.section className="dcard dcard-hero" {...rise(1)}>
            <span className="dlabel">Your tier</span>
            <strong className="dbig">{tier.name}</strong>
            <span className="dmeta">{formatCount(profile.totalFollowers || 0)} followers across your accounts</span>
            {nextTier && (
              <div className="meter" aria-label={`${Math.round(progress)}% of the way to ${nextTier.name}`}>
                <motion.i
                  initial={still ? false : { width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ delay: 0.4, duration: 1.1, ease: "easeOut" }}
                />
                <span>
                  {formatCount(nextTier.min - top)} more on your top account to reach {nextTier.name}
                </span>
              </div>
            )}
          </motion.section>

          <motion.section className="dcard" {...rise(2)}>
            <span className="dlabel">Linked accounts</span>
            <ul className="acc-list">
              {PLATFORMS.map((p) => {
                const a = accounts.find((x) => x.platform === p.id);
                return (
                  <li key={p.id} className={a ? "" : "empty"}>
                    <span className={`social-badge sb-${p.id}`} aria-hidden="true">{p.label[0]}</span>
                    <span className="acc-text">
                      <strong>{p.label}</strong>
                      <span>{a ? a.handle : "Not added"}</span>
                    </span>
                    {a && (
                      <span className="acc-count">
                        {formatCount(a.followers)}
                        <em>{a.verified ? "Verified" : "Self-reported"}</em>
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </motion.section>

          <motion.section className="dcard dcard-wide" {...rise(3)}>
            <div className="board-head">
              <span className="dlabel">Ads &amp; videos for you</span>
              <div className="tabs" role="tablist" aria-label="Which ads to show">
                {[
                  { id: "matched", label: "Matched for me", n: board.matched },
                  { id: "all", label: "All live ads", n: board.all },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={view === t.id}
                    className={view === t.id ? "on" : ""}
                    onClick={() => setView(t.id)}
                  >
                    {view === t.id && !still && <motion.span layoutId="creator-tab-pill" className="tab-pill" />}
                    <span className="tab-txt">
                      {t.label} <em className="tab-count">{ads ? t.n : "…"}</em>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="board-filters">
              <div className="range-chips" role="group" aria-label="Filter by follower range">
                <button
                  type="button"
                  className={`niche ${range === "" ? "on" : ""}`}
                  aria-pressed={range === ""}
                  onClick={() => setRange("")}
                >
                  All ranges
                </button>
                {FOLLOWER_RANGES.filter((r) => r.id !== "any").map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className={`niche ${range === r.id ? "on" : ""}`}
                    aria-pressed={range === r.id}
                    onClick={() => setRange(r.id)}
                  >
                    {r.label}
                    {r.id === myRange && <span className="you-dot">you</span>}
                  </button>
                ))}
              </div>
              <select
                className="dsel"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                aria-label="Platform"
              >
                <option value="">All platforms</option>
                {PLATFORMS.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </div>

            {adsError && <p className="error">{adsError}</p>}

            {ads === null ? (
              <div className="atile-grid" aria-busy="true">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="atile atile-skel" />
                ))}
              </div>
            ) : board.shown.length === 0 ? (
              <div className="empty-ads">
                <div className="radar" aria-hidden="true">
                  <i /><i /><i />
                </div>
                <p>
                  {ads.length === 0 || (view === "matched" && board.matched === 0 && !range && !platform) ? (
                    <>
                      <strong>Looking for {tier.name}-tier campaigns…</strong>
                      <br />
                      Ads and videos that fit your follower count appear here as soon as our
                      team posts them.
                      {view === "matched" && ads.length > 0 && (
                        <>
                          {" "}
                          <button type="button" className="clear-btn" onClick={() => setView("all")}>
                            See all {ads.length} live ads
                          </button>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      <strong>No ads match these filters.</strong>{" "}
                      <button
                        type="button"
                        className="clear-btn"
                        onClick={() => {
                          setRange("");
                          setPlatform("");
                        }}
                      >
                        Clear filters
                      </button>
                    </>
                  )}
                </p>
              </div>
            ) : (
              <motion.div className="atile-grid" layout={!still}>
                <AnimatePresence mode="popLayout">
                  {board.shown.map((ad, i) => (
                    <AdTile key={ad.id} ad={ad} creator={profile} index={i} onOpen={setOpen} />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </motion.section>
        </div>
      </div>

      <AnimatePresence>
        {open && <AdDetail ad={open} creator={profile} onClose={closeAd} />}
      </AnimatePresence>
    </main>
  );
}
