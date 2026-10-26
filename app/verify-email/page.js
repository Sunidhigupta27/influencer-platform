"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { sendEmailVerification } from "firebase/auth";
import TopBar from "@/components/TopBar";
import SetupNotice from "@/components/SetupNotice";
import { VERIFY_EMAIL_PATH } from "@/lib/config";
import { homeFor, useSession } from "@/lib/session";

/*
 * Step 1 after sign-up. Firebase only allows an SMS second factor on accounts
 * with a verified email, so creators confirm their email here first.
 * The page checks every few seconds, so clicking the link in the email (in any
 * tab) moves this page on by itself.
 */
export default function VerifyEmailPage() {
  const router = useRouter();
  const { user, profile, ready, notConfigured } = useSession({ page: VERIFY_EMAIL_PATH });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [cooldown, setCooldown] = useState(0);

  const check = useCallback(
    async (manual) => {
      if (!user) return;
      try {
        await user.reload();
        if (user.emailVerified) {
          // Refresh the token so Firebase sees email_verified = true.
          await user.getIdToken(true);
          router.replace(homeFor(profile, user));
        } else if (manual) {
          setError("Not verified yet. Click the link in the email, then try again.");
        }
      } catch {
        if (manual) setError("Couldn't check right now. Check your connection and try again.");
      }
    },
    [user, profile, router]
  );

  useEffect(() => {
    if (!ready) return;
    const t = setInterval(() => check(false), 4000);
    return () => clearInterval(t);
  }, [ready, check]);

  useEffect(() => {
    if (!cooldown) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function resend() {
    setError("");
    setNotice("");
    try {
      await sendEmailVerification(user);
      setNotice(`A new link is on its way to ${user.email}.`);
      setCooldown(60);
    } catch (err) {
      setError(
        err.code === "auth/too-many-requests"
          ? "Too many emails sent. Wait a few minutes and try again."
          : "Couldn't send the email. Try again."
      );
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
      <TopBar signOut label="Verify email" />
      <div className="auth-wrap">
        <section className="panel">
          <ol className="gate-steps" aria-label="Sign-up progress">
            <li className="now">Email</li>
            <li>Mobile</li>
            <li>Details</li>
            <li>Approval</li>
          </ol>
          <h1>Check your inbox</h1>
          <p className="sub">
            We sent a verification link to <strong>{user.email}</strong>. Click it, then come back here.
            Can&apos;t see it? Check your spam folder.
          </p>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="notice" role="status">
              {notice}
            </p>
          )}
          <button
            type="button"
            className="btn btn-violet btn-block"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              await check(true);
              setBusy(false);
            }}
          >
            {busy ? "Checking…" : "I've verified my email"}
          </button>
          <p className="switch">
            <button type="button" className="link-btn" onClick={resend} disabled={cooldown > 0}>
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend the email"}
            </button>
          </p>
        </section>
      </div>
    </main>
  );
}
