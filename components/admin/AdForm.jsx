"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useStill } from "@/lib/motion";
import {
  AD_FORMATS,
  BRAND_CATEGORIES,
  FOLLOWER_RANGES,
  PLATFORMS,
  formatINR,
  formatRange,
  isVideoFile,
  youTubeEmbed,
} from "@/lib/config";
import { todayISO } from "@/lib/ads";

const EMPTY = {
  brand: "",
  title: "",
  category: "",
  platforms: [],
  minFollowers: 5000,
  maxFollowers: 10000,
  brief: "",
  budget: "",
  deadline: "",
  format: "",
  mediaUrl: "",
};

const BRIEF_MAX = 1500;

function rangeIdFor(min, max) {
  const hit = FOLLOWER_RANGES.find(
    (r) => r.min === Number(min || 0) && r.max === (max === "" || max == null ? null : Number(max))
  );
  return hit ? hit.id : "custom";
}

function validate(v, isNew) {
  const e = {};
  if (!v.brand.trim()) e.brand = "Enter the brand or sponsor name.";
  if (!v.title.trim()) e.title = "Give the ad a short title.";
  if (!v.category) e.category = "Pick a brand category.";
  if (!v.platforms.length) e.platforms = "Pick at least one platform.";
  const min = Number(v.minFollowers);
  const max = v.maxFollowers === "" || v.maxFollowers == null ? null : Number(v.maxFollowers);
  if (!Number.isFinite(min) || min < 0) e.range = "Minimum followers must be 0 or more.";
  else if (max != null && (!Number.isFinite(max) || max <= min))
    e.range = "Maximum must be bigger than minimum (or leave it empty for no limit).";
  if (v.brief.trim().length < 20) e.brief = "Write a brief of at least 20 characters.";
  const budget = Number(v.budget);
  if (!v.budget || !Number.isFinite(budget) || budget <= 0) e.budget = "Enter a budget in rupees.";
  if (!v.deadline) e.deadline = "Pick a deadline.";
  else if (isNew && v.deadline < todayISO()) e.deadline = "Deadline can't be in the past.";
  const url = (v.mediaUrl || "").trim();
  if (url && !/^https?:\/\/\S+$/i.test(url)) e.mediaUrl = "Paste a full link starting with https://";
  else if (url.length > 500) e.mediaUrl = "Link is too long.";
  return e;
}

/**
 * Post-an-ad / edit-ad form, shown in a dialog.
 *   initial  – an existing ad to edit, or null for a new one
 *   onSave(values) – async; throw to show an error
 */
export default function AdForm({ initial, onSave, onClose }) {
  const still = useStill();
  const isNew = !initial;
  const [v, setV] = useState(() =>
    initial
      ? {
          ...EMPTY,
          ...initial,
          maxFollowers: initial.maxFollowers ?? "",
          budget: String(initial.budget ?? ""),
        }
      : EMPTY
  );
  const [rangeId, setRangeId] = useState(() => rangeIdFor(v.minFollowers, v.maxFollowers));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const firstRef = useRef(null);

  useEffect(() => {
    firstRef.current?.focus();
    const onKey = (e) => e.key === "Escape" && !saving && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, saving]);

  const set = (key) => (e) => setV((s) => ({ ...s, [key]: e.target.value }));

  const togglePlatform = (id) =>
    setV((s) => ({
      ...s,
      platforms: s.platforms.includes(id)
        ? s.platforms.filter((p) => p !== id)
        : [...s.platforms, id],
    }));

  const pickRange = (r) => {
    setRangeId(r.id);
    if (r.id !== "custom") setV((s) => ({ ...s, minFollowers: r.min, maxFollowers: r.max ?? "" }));
  };

  async function submit(e) {
    e.preventDefault();
    const errs = validate(v, isNew);
    setErrors(errs);
    if (Object.keys(errs).length) {
      const first = document.querySelector(`[data-err="${Object.keys(errs)[0]}"]`);
      first?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setSaving(true);
    setSaveError("");
    try {
      await onSave(v);
    } catch {
      setSaveError("Couldn't save the ad. Check your connection and that firestore.rules is deployed.");
      setSaving(false);
    }
  }

  const err = (k) =>
    errors[k] ? (
      <span className="ad-err" role="alert">
        {errors[k]}
      </span>
    ) : null;

  return (
    <motion.div
      className="ad-scrim"
      initial={still ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(e) => e.target === e.currentTarget && !saving && onClose()}
    >
      <motion.form
        className="ad-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ad-form-title"
        onSubmit={submit}
        noValidate
        initial={still ? false : { opacity: 0, y: 40, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.98 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        <header className="ad-sheet-head">
          <div>
            <h2 id="ad-form-title">{isNew ? "Post an ad or video" : "Edit ad"}</h2>
            <p className="sub">
              {isNew
                ? "Creators whose follower count and platforms match will see it."
                : "Changes show up for creators straight away."}
            </p>
          </div>
          <button type="button" className="ad-x" onClick={onClose} aria-label="Close" disabled={saving}>
            ×
          </button>
        </header>

        <div className="ad-sheet-body">
          <div className="field-row">
            <div className="field" data-err="brand">
              <label htmlFor="ad-brand">Brand / sponsor</label>
              <input id="ad-brand" ref={firstRef} value={v.brand} onChange={set("brand")} placeholder="e.g. Glow Botanicals" maxLength={80} />
              {err("brand")}
            </div>
            <div className="field" data-err="category">
              <label htmlFor="ad-cat">Category</label>
              <select id="ad-cat" value={v.category} onChange={set("category")}>
                <option value="">Choose…</option>
                {BRAND_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {err("category")}
            </div>
          </div>

          <div className="field-row">
            <div className="field" data-err="title">
              <label htmlFor="ad-title">Ad title</label>
              <input id="ad-title" value={v.title} onChange={set("title")} placeholder="e.g. Monsoon skincare reel" maxLength={100} />
              {err("title")}
            </div>
            <div className="field">
              <label htmlFor="ad-format">Content format</label>
              <select id="ad-format" value={v.format} onChange={set("format")}>
                <option value="">Any format</option>
                {AD_FORMATS.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="field" data-err="mediaUrl">
            <label htmlFor="ad-media">Video or sample link (optional)</label>
            <input
              id="ad-media"
              type="url"
              inputMode="url"
              value={v.mediaUrl}
              onChange={set("mediaUrl")}
              placeholder="https://youtube.com/watch?v=… or an Instagram / .mp4 link"
              maxLength={500}
            />
            {!errors.mediaUrl && (
              <span className="ad-hint">
                A reference video, product demo or sample post. YouTube links play right on the creator&apos;s ad tile.
              </span>
            )}
            {err("mediaUrl")}
            {youTubeEmbed(v.mediaUrl) && (
              <div className="ad-media-preview">
                <iframe
                  src={youTubeEmbed(v.mediaUrl)}
                  title="Video preview"
                  allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}
            {!youTubeEmbed(v.mediaUrl) && isVideoFile(v.mediaUrl) && (
              <div className="ad-media-preview">
                <video src={v.mediaUrl} controls preload="metadata" />
              </div>
            )}
          </div>

          <fieldset className="niches" data-err="platforms">
            <legend>Platforms</legend>
            <div className="niche-grid">
              {PLATFORMS.map((p) => {
                const on = v.platforms.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    className={`niche plat-chip ${on ? "on" : ""}`}
                    aria-pressed={on}
                    onClick={() => togglePlatform(p.id)}
                  >
                    <span className={`plat-dot sb-${p.id}`} aria-hidden="true" />
                    {p.label}
                  </button>
                );
              })}
            </div>
            {err("platforms")}
          </fieldset>

          <fieldset className="niches" data-err="range">
            <legend>Follower range</legend>
            <div className="niche-grid">
              {[...FOLLOWER_RANGES, { id: "custom", label: "Custom" }].map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className={`niche ${rangeId === r.id ? "on" : ""}`}
                  aria-pressed={rangeId === r.id}
                  onClick={() => pickRange(r)}
                >
                  {r.label}
                </button>
              ))}
            </div>
            {rangeId === "custom" && (
              <div className="field-row ad-range">
                <div className="field">
                  <label htmlFor="ad-min">Min followers</label>
                  <input id="ad-min" type="number" inputMode="numeric" min="0" step="500" value={v.minFollowers} onChange={set("minFollowers")} />
                </div>
                <div className="field">
                  <label htmlFor="ad-max">Max followers</label>
                  <input id="ad-max" type="number" inputMode="numeric" min="0" step="500" value={v.maxFollowers} onChange={set("maxFollowers")} placeholder="No limit" />
                </div>
              </div>
            )}
            {!errors.range && (
              <span className="ad-hint">
                Shown to creators with {formatRange(Number(v.minFollowers) || 0, v.maxFollowers === "" ? null : Number(v.maxFollowers))} followers on their top account.
              </span>
            )}
            {err("range")}
          </fieldset>

          <div className="field" data-err="brief">
            <label htmlFor="ad-brief">Content brief</label>
            <textarea
              id="ad-brief"
              rows={5}
              value={v.brief}
              onChange={set("brief")}
              maxLength={BRIEF_MAX}
              placeholder="What should creators make? Format, key messages, hashtags, do's and don'ts."
            />
            <span className="ad-hint ad-count">{v.brief.length}/{BRIEF_MAX}</span>
            {err("brief")}
          </div>

          <div className="field-row">
            <div className="field" data-err="budget">
              <label htmlFor="ad-budget">Budget (₹)</label>
              <input id="ad-budget" type="number" inputMode="numeric" min="1" step="500" value={v.budget} onChange={set("budget")} placeholder="25000" />
              {v.budget && !errors.budget && <span className="ad-hint">{formatINR(v.budget)}</span>}
              {err("budget")}
            </div>
            <div className="field" data-err="deadline">
              <label htmlFor="ad-deadline">Deadline</label>
              <input id="ad-deadline" type="date" min={isNew ? todayISO() : undefined} value={v.deadline} onChange={set("deadline")} />
              {err("deadline")}
            </div>
          </div>

          {saveError && <p className="error">{saveError}</p>}
        </div>

        <footer className="ad-sheet-foot">
          <button type="button" className="btn btn-soft" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn btn-pink" disabled={saving}>
            {saving ? "Saving…" : isNew ? "Post to creators" : "Save changes"}
          </button>
        </footer>
      </motion.form>
    </motion.div>
  );
}
