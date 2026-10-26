"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { useStill } from "@/lib/motion";
import {
  PLATFORMS,
  formatINR,
  formatRange,
  isVideoFile,
  youTubeEmbed,
} from "@/lib/config";
import { daysLeft, eligibility } from "./AdTile";

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Full ad: video, brief and requirements, in a dialog.
 * Used on /creator (with `creator`) and in admin → Ads & Videos → View
 * (no creator: shows an admin preview instead of "you qualify").
 */
export default function AdDetail({ ad, creator = null, onClose }) {
  const still = useStill();
  const elig = creator ? eligibility(ad, creator) : null;
  const embed = youTubeEmbed(ad.mediaUrl);
  const file = !embed && isVideoFile(ad.mediaUrl);
  const left = daysLeft(ad.deadline);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <motion.div
      className="ad-scrim"
      initial={still ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        className="ad-sheet adetail"
        role="dialog"
        aria-modal="true"
        aria-labelledby="adetail-title"
        initial={still ? false : { opacity: 0, y: 40, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.98 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        <header className="ad-sheet-head">
          <div>
            <p className="adetail-brand">
              {ad.brand}
              {ad.category ? ` · ${ad.category}` : ""}
            </p>
            <h2 id="adetail-title">{ad.title}</h2>
          </div>
          <button type="button" className="ad-x" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <div className="ad-sheet-body">
          {embed && (
            <div className="ad-media-preview">
              <iframe
                src={embed}
                title={`${ad.title} video`}
                allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
          {file && (
            <div className="ad-media-preview">
              <video src={ad.mediaUrl} controls preload="metadata" />
            </div>
          )}
          {ad.mediaUrl && !embed && !file && (
            <a className="adetail-link" href={ad.mediaUrl} target="_blank" rel="noopener noreferrer">
              Open the sample / reference post ↗
            </a>
          )}

          {elig ? (
            <p className={`atile-elig adetail-elig ${elig.ok ? "ok" : "no"}`}>
              {elig.ok ? "✓ You qualify for this ad" : `🔒 ${elig.reason}`}
            </p>
          ) : (
            <p className="atile-elig adetail-elig no">
              Preview: this is how creators see it{ad.status === "paused" ? " (paused, hidden from creators)" : ""}
            </p>
          )}
          {!ad.mediaUrl && !elig && <p className="adetail-note">No video or sample link on this ad. Use Edit to add one.</p>}

          <dl className="adetail-facts">
            <div><dt>Budget</dt><dd>{formatINR(ad.budget)}</dd></div>
            <div><dt>Followers</dt><dd>{formatRange(ad.minFollowers, ad.maxFollowers)}</dd></div>
            <div><dt>Format</dt><dd>{ad.format || "Any"}</dd></div>
            <div>
              <dt>Deadline</dt>
              <dd>
                {fmtDate(ad.deadline)}
                {left != null && left >= 0 && <small> ({left === 0 ? "today" : `${left}d left`})</small>}
              </dd>
            </div>
            <div>
              <dt>Platforms</dt>
              <dd>{(ad.platforms || []).map((p) => PLATFORMS.find((x) => x.id === p)?.label || p).join(", ")}</dd>
            </div>
          </dl>

          <h3 className="adetail-h">Content brief</h3>
          <p className="adetail-brief">{ad.brief}</p>
        </div>

        <footer className="ad-sheet-foot">
          <span className="adetail-note">
            {!elig
              ? ad.mediaUrl
                ? <a href={ad.mediaUrl} target="_blank" rel="noopener noreferrer">Open video in a new tab ↗</a>
                : ""
              : elig.ok
              ? "Our team will contact qualifying creators for this campaign."
              : "Grow or link your accounts to unlock ads like this."}
          </span>
          <button type="button" className="btn btn-pink" onClick={onClose}>
            Close
          </button>
        </footer>
      </motion.div>
    </motion.div>
  );
}
