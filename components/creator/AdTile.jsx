"use client";

import { motion } from "framer-motion";
import { useStill } from "@/lib/motion";
import {
  PLATFORMS,
  formatCount,
  formatINR,
  formatRange,
  isVideoFile,
  youTubeThumb,
} from "@/lib/config";
import { inRange } from "@/lib/ads";

const HUES = ["pink", "violet", "mint", "peach", "sky"];

function hueFor(text = "") {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return HUES[h % HUES.length];
}

export function daysLeft(iso) {
  if (!iso) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((new Date(`${iso}T00:00:00`) - today) / 86400000);
}

/**
 * Why a creator does / doesn't qualify for an ad.
 *   { ok: true }
 *   { ok: false, reason: "Need 2.4K more followers" }
 */
export function eligibility(ad, creator) {
  const top = creator.topFollowers || 0;
  if (!inRange(ad, top)) {
    if (top < (ad.minFollowers || 0)) {
      return { ok: false, reason: `Need ${formatCount((ad.minFollowers || 0) - top)} more followers` };
    }
    return { ok: false, reason: `For creators up to ${formatCount(ad.maxFollowers)}` };
  }
  const mine = creator.platforms || [];
  if (ad.platforms?.length && !ad.platforms.some((p) => mine.includes(p))) {
    const names = ad.platforms.map((p) => PLATFORMS.find((x) => x.id === p)?.label || p);
    return { ok: false, reason: `Link ${names.join(" or ")} to qualify` };
  }
  return { ok: true };
}

/** One ad / video card on the creator dashboard. */
export default function AdTile({ ad, creator, index = 0, onOpen }) {
  const still = useStill();
  const elig = eligibility(ad, creator);
  const left = daysLeft(ad.deadline);
  const thumb = youTubeThumb(ad.mediaUrl);
  const hasVideo = Boolean(thumb || isVideoFile(ad.mediaUrl));
  const hasLink = Boolean(ad.mediaUrl);

  return (
    <motion.article
      className={`atile hue-${hueFor(ad.brand)} ${elig.ok ? "" : "atile-locked"}`}
      layout={!still}
      initial={still ? false : { opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={still ? undefined : { opacity: 0, scale: 0.96 }}
      transition={{ delay: Math.min(index, 8) * 0.04, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <button type="button" className="atile-hit" onClick={() => onOpen(ad)} aria-label={`Open ${ad.title} by ${ad.brand}`}>
        <div className="atile-media">
          <span className="atile-mono" aria-hidden="true">{(ad.brand || "?")[0].toUpperCase()}</span>
          {thumb && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumb} alt="" loading="lazy" onError={(e) => (e.currentTarget.style.display = "none")} />
          )}
          {hasVideo && <span className="atile-play" aria-hidden="true">▶</span>}
          {!hasVideo && hasLink && <span className="atile-linkflag">Sample link</span>}
          <span className="atile-range">{formatRange(ad.minFollowers, ad.maxFollowers)}</span>
        </div>

        <div className="atile-body">
          <span className="atile-brand">
            {ad.brand}
            {ad.category && <em> · {ad.category}</em>}
          </span>
          <strong className="atile-title">{ad.title}</strong>

          <div className="atile-tags">
            {ad.format && <span className="atile-chip">{ad.format}</span>}
            <span className="plat-row">
              {ad.platforms?.map((p) => {
                const pl = PLATFORMS.find((x) => x.id === p);
                return (
                  <span key={p} className={`mini-badge sb-${p}`} title={pl?.label}>
                    {pl?.label[0]}
                  </span>
                );
              })}
            </span>
          </div>

          <div className="atile-foot">
            <span className="atile-budget">
              {formatINR(ad.budget)}
              <em>budget</em>
            </span>
            {left != null && (
              <span className={`atile-left ${left <= 3 ? "soon" : ""}`}>
                {left <= 0 ? "Ends today" : `${left} day${left === 1 ? "" : "s"} left`}
              </span>
            )}
          </div>

          <span className={`atile-elig ${elig.ok ? "ok" : "no"}`}>
            {elig.ok ? "✓ You qualify" : `🔒 ${elig.reason}`}
          </span>
        </div>
      </button>
    </motion.article>
  );
}
