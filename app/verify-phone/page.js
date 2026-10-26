"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import TopBar from "@/components/TopBar";
import SetupNotice from "@/components/SetupNotice";
import { auth } from "@/lib/firebase";
import { PHONE_COUNTRY_CODE, VERIFY_PHONE_PATH } from "@/lib/config";
import { finishEnrollment, maskPhone, smsError, startEnrollment, toE164 } from "@/lib/mfa";
import { homeFor, useSession } from "@/lib/session";

const PHONE_RE = /^[6-9]\d{9}$/;

/*
 * Step 2 after sign-up: add the creator's mobile as an SMS second factor.
 * From now on every login asks for a code sent to this number, and the
 * enrolment form uses it as the creator's (verified) mobile number.
 */
export default function VerifyPhonePage() {
  const router = useRouter();
  const { user, profile, ready, notConfigured } = useSession({ page: VERIFY_PHONE_PATH });
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [verificationId, setVerificationId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const recaptchaHost = useRef(null);

  // Existing creators who already gave a number on the old form: prefill it.
  const [prefilled, setPrefilled] = useState(false);
  if (ready && !prefilled) {
    setPrefilled(true);
    if (profile?.phone) setPhone(String(profile.phone).replace(/\D/g, "").slice(-10));
  }

  useEffect(() => {
    if (!cooldown) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function sendCode(e) {
    e?.preventDefault();
    if (busy) return;
    setError("");
    if (!PHONE_RE.test(phone)) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }
    setBusy(true);
    try {
      const id = await startEnrollment(user, phone, recaptchaHost.current);
      setVerificationId(id);
      setCode("");
      setCooldown(30);
    } catch (err) {
      setError(smsError(err));
      setNeedsLogin(err.code === "auth/requires-recent-login");
    } finally {
      setBusy(false);
    }
  }

  async function confirm(e) {
    e.preventDefault();
    if (busy) return;
    setError("");
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code from the SMS.");
      return;
    }
    setBusy(true);
    try {
      await finishEnrollment(user, verificationId, code);
      await user.reload();
      router.replace(homeFor(profile, auth.currentUser));
    } catch (err) {
      setError(smsError(err));
      setNeedsLogin(err.code === "auth/requires-recent-login");
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

  return (
    <main className="page">
      <TopBar signOut label="Verify mobile" />
      <div className="auth-wrap">
        <section className="panel">
          <ol className="gate-steps" aria-label="Sign-up progress">
            <li className="done">Email</li>
            <li className="now">Mobile</li>
            <li>Details</li>
            <li>Approval</li>
          </ol>

          {!verificationId ? (
            <form onSubmit={sendCode} noValidate>
              <h1>Verify your mobile</h1>
              <p className="sub">
                We&apos;ll text a code to this number now, and every time you log in. It keeps your account
                safe even if someone learns your password.
              </p>
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              <div className="field">
                <label htmlFor="phone">Mobile number</label>
                <div className="phone-input">
                  <span>{PHONE_COUNTRY_CODE}</span>
                  <input
                    id="phone"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    maxLength={10}
                    placeholder="10 digits"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                    autoFocus
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-violet btn-block" disabled={busy}>
                {busy ? "Sending…" : "Send code"}
              </button>
            </form>
          ) : (
            <form onSubmit={confirm} noValidate>
              <h1>Enter the code</h1>
              <p className="sub">
                Sent to {maskPhone(toE164(phone))}.{" "}
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => {
                    setVerificationId(null);
                    setError("");
                  }}
                >
                  Change number
                </button>
              </p>
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              <div className="field">
                <label htmlFor="otp">6-digit code</label>
                <input
                  id="otp"
                  className="otp-input"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  autoFocus
                />
              </div>
              <button type="submit" className="btn btn-violet btn-block" disabled={busy}>
                {busy ? "Checking…" : "Verify mobile"}
              </button>
              <p className="switch">
                <button type="button" className="link-btn" onClick={sendCode} disabled={busy || cooldown > 0}>
                  {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
                </button>
              </p>
            </form>
          )}

          {needsLogin && (
            <button
              type="button"
              className="btn btn-soft btn-block"
              onClick={async () => {
                await signOut(auth);
                router.replace("/auth?mode=login");
              }}
            >
              Log in again
            </button>
          )}

          {/* invisible reCAPTCHA for the SMS lives here */}
          <div ref={recaptchaHost} />
        </section>
      </div>
    </main>
  );
}
