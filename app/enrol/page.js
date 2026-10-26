"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useStill } from "@/lib/motion";
import { doc, serverTimestamp, writeBatch } from "firebase/firestore";
import TopBar from "@/components/TopBar";
import SetupNotice from "@/components/SetupNotice";
import SocialFollowers from "@/components/SocialFollowers";
import { db } from "@/lib/firebase";
import {
  MAX_NICHES,
  ENROL_PATH,
  NICHES,
  PENDING_PATH,
  PLATFORMS,
  formatCount,
  tierFor,
} from "@/lib/config";
import { phoneFactorNumber, useSession } from "@/lib/session";

const STEPS = ["About you", "Your socials", "Review"];
const PHONE_RE = /^[6-9]\d{9}$/;

const emptySocials = Object.fromEntries(
  PLATFORMS.map((p) => [p.id, { handle: "", followers: "", url: "" }])
);

function toNumber(v) {
  const n = Number(String(v).replace(/[^\d]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export default function EnrolPage() {
  const router = useRouter();
  const still = useStill();
  const { user, profile, ready, notConfigured } = useSession({ page: ENROL_PATH });

  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [niches, setNiches] = useState([]);
  const [socials, setSocials] = useState(emptySocials);
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // The mobile was verified by SMS on /verify-phone: use that number, locked.
  const verifiedPhone = phoneFactorNumber(user).replace(/\D/g, "").slice(-10);

  // Fill in what we already know (e.g. a creator re-submitting after the
  // admin asked for changes). Runs once, when the profile arrives.
  const [prefilledFor, setPrefilledFor] = useState("");
  if (ready && user && prefilledFor !== user.uid) {
    setPrefilledFor(user.uid);
    if (profile?.name) setName(profile.name);
    if (profile?.city) setCity(profile.city);
    if (Array.isArray(profile?.niches)) setNiches(profile.niches.slice(0, MAX_NICHES));
    if (verifiedPhone) setPhone(verifiedPhone);
    else if (profile?.phone) setPhone(String(profile.phone));
  }

  const linked = PLATFORMS.filter((p) => socials[p.id].handle.trim());
  const total = linked.reduce((sum, p) => sum + toNumber(socials[p.id].followers), 0);
  const top = linked.reduce((m, p) => Math.max(m, toNumber(socials[p.id].followers)), 0);

  function toggleNiche(n) {
    setError("");
    setNiches((cur) =>
      cur.includes(n)
        ? cur.filter((x) => x !== n)
        : cur.length >= MAX_NICHES
        ? cur
        : [...cur, n]
    );
  }

  function validate(i) {
    if (i === 0) {
      if (name.trim().length < 2) return "Enter your full name.";
      if (!PHONE_RE.test(phone.trim())) return "Enter a valid 10-digit mobile number.";
      if (city.trim().length < 2) return "Enter your city.";
      if (niches.length === 0) return "Pick at least one niche.";
    }
    if (i === 1) {
      if (linked.length === 0) return "Paste a link to at least one account so we can read its followers.";
      for (const p of linked) {
        if (socials[p.id].followers === "")
          return `Wait for your ${p.label} count to load, or check the link.`;
      }
    }
    if (i === 2 && !agree) return "Please confirm your details are correct.";
    return "";
  }

  function go(next) {
    if (next > step) {
      const msg = validate(step);
      if (msg) {
        setError(msg);
        return;
      }
    }
    setError("");
    setDir(next > step ? 1 : -1);
    setStep(next);
  }

  async function submit(e) {
    e.preventDefault();
    if (step < 2) {
      go(step + 1);
      return;
    }
    const msg = validate(2);
    if (msg) {
      setError(msg);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const batch = writeBatch(db);
      batch.set(
        doc(db, "users", user.uid),
        {
          name: name.trim(),
          phone: phone.trim(),
          city: city.trim(),
          niches,
          platforms: linked.map((p) => p.id),
          totalFollowers: total,
          topFollowers: top,
          tier: tierFor(top).name,
          enrolled: true,
          phoneVerified: Boolean(verifiedPhone && phone.trim() === verifiedPhone),
          // Waits on /pending until an admin approves it (admin -> Approvals).
          status: "pending",
          submittedAt: serverTimestamp(),
          enrolledAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      for (const p of linked) {
        const fetched = Boolean(socials[p.id].url);
        batch.set(doc(db, "users", user.uid, "socialAccounts", p.id), {
          platform: p.id,
          handle: socials[p.id].handle.trim(),
          followers: toNumber(socials[p.id].followers),
          ...(fetched ? { profileUrl: socials[p.id].url } : {}),
          verified: false, // flips to true once API linking (YouTube / Meta) is live
          source: fetched ? `${p.id}-fetch` : "self-reported",
          updatedAt: serverTimestamp(),
        });
      }
      await batch.commit();
      router.replace(PENDING_PATH);
    } catch {
      setError("We couldn't save your details. Check your connection and try again.");
      setBusy(false);
    }
  }

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

  const slide = still
    ? {}
    : {
        initial: (d) => ({ opacity: 0, x: d * 60 }),
        animate: { opacity: 1, x: 0 },
        exit: (d) => ({ opacity: 0, x: d * -60 }),
      };

  return (
    <main className="page">
      <TopBar signOut label="Creator enrolment" />
      <div className="auth-wrap">
        <section className="panel panel-wide">
          <ol className="enrol-steps" aria-label="Progress">
            {STEPS.map((s, i) => (
              <li
                key={s}
                className={i === step ? "now" : i < step ? "done" : ""}
                aria-current={i === step ? "step" : undefined}
              >
                <span className="dot">{i < step ? "✓" : i + 1}</span>
                <span className="lbl">{s}</span>
              </li>
            ))}
          </ol>

          <form onSubmit={submit} noValidate>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}

            <AnimatePresence mode="wait" custom={dir} initial={false}>
              <motion.div
                key={step}
                custom={dir}
                {...slide}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              >
                {step === 0 && (
                  <>
                    <h1>Tell us about you</h1>
                    <p className="sub">
                      Signed in as {profile?.email || user.email}. Our team reviews these
                      details before approving your account.
                    </p>
                    <div className="field">
                      <label htmlFor="name">Full name</label>
                      <input id="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" autoFocus />
                    </div>
                    <div className="field-row">
                      <div className="field">
                        <label htmlFor="phone">Mobile number</label>
                        <input
                          id="phone"
                          inputMode="numeric"
                          maxLength={10}
                          value={phone}
                          onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                          autoComplete="tel-national"
                          placeholder="10 digits"
                          readOnly={Boolean(verifiedPhone)}
                          aria-describedby={verifiedPhone ? "phone-ok" : undefined}
                        />
                        {verifiedPhone && (
                          <small id="phone-ok" className="hint hint-ok">✓ Verified by SMS</small>
                        )}
                      </div>
                      <div className="field">
                        <label htmlFor="city">City</label>
                        <input id="city" value={city} onChange={(e) => setCity(e.target.value)} autoComplete="address-level2" />
                      </div>
                    </div>
                    <fieldset className="field niches">
                      <legend>
                        Your niche <small className="hint">(up to {MAX_NICHES})</small>
                      </legend>
                      <div className="niche-grid">
                        {NICHES.map((n) => {
                          const on = niches.includes(n);
                          return (
                            <motion.button
                              key={n}
                              type="button"
                              className={`niche ${on ? "on" : ""}`}
                              aria-pressed={on}
                              onClick={() => toggleNiche(n)}
                              whileTap={still ? undefined : { scale: 0.92 }}
                              layout={!still}
                            >
                              {n}
                            </motion.button>
                          );
                        })}
                      </div>
                    </fieldset>
                  </>
                )}

                {step === 1 && (
                  <>
                    <h1>Add your socials</h1>
                    <p className="sub">
                      Paste a link to at least one of your accounts. We automatically read
                      the public follower count straight from the profile.
                    </p>
                    <div className="social-list">
                      {PLATFORMS.map((p) => (
                        <div key={p.id} className={`social-row sf-row ${socials[p.id].url ? "filled" : ""}`}>
                          <span className={`social-badge sb-${p.id}`} aria-hidden="true">
                            {p.label[0]}
                          </span>
                          <SocialFollowers
                            platform={p.id}
                            defaultUrl={socials[p.id].url}
                            defaultFollowers={socials[p.id].url ? toNumber(socials[p.id].followers) : null}
                            onFetched={({ profileUrl, handle, followers }) =>
                              setSocials((s) => ({
                                ...s,
                                [p.id]: { handle, followers: String(followers), url: profileUrl },
                              }))
                            }
                            onClear={() =>
                              setSocials((s) => ({ ...s, [p.id]: { handle: "", followers: "", url: "" } }))
                            }
                          />
                        </div>
                      ))}
                    </div>
                    {top > 0 && (
                      <motion.p
                        className="tier-pill"
                        key={tierFor(top).name}
                        initial={still ? false : { scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                      >
                        You&apos;re in the <strong>{tierFor(top).name}</strong> tier ·{" "}
                        {formatCount(total)} total followers
                      </motion.p>
                    )}
                  </>
                )}

                {step === 2 && (
                  <>
                    <h1>Check and submit</h1>
                    <p className="sub">
                      Our team reviews every profile. You&apos;ll see ads as soon as an admin approves yours.
                    </p>
                    <dl className="review">
                      {[
                        ["Name", name],
                        ["Mobile", phone],
                        ["City", city],
                        ["Niche", niches.join(", ")],
                        ...linked.map((p) => [
                          p.label,
                          `${socials[p.id].handle} · ${formatCount(toNumber(socials[p.id].followers))} ${p.id === "youtube" ? "subscribers" : "followers"}`,
                        ]),
                        ["Tier", tierFor(top).name],
                      ].map(([k, v]) => (
                        <div key={k} className="review-row">
                          <dt>{k}</dt>
                          <dd>{v}</dd>
                        </div>
                      ))}
                    </dl>
                    <label className="check">
                      <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                      These details are correct and the accounts are mine.
                    </label>
                  </>
                )}
              </motion.div>
            </AnimatePresence>

            <div className="enrol-actions">
              {step > 0 && (
                <button type="button" className="btn btn-soft" onClick={() => go(step - 1)} disabled={busy}>
                  Back
                </button>
              )}
              <button type="submit" className="btn btn-violet" disabled={busy}>
                {busy ? "Saving…" : step < 2 ? "Continue" : "Submit for approval"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
