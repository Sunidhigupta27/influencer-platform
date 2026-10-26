"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db, firebaseReady } from "@/lib/firebase";
import { VERIFY_EMAIL_PATH } from "@/lib/config";
import SetupNotice from "@/components/SetupNotice";
import { homeFor, loadProfile } from "@/lib/session";
import { finishSignIn, maskPhone, resolverFrom, smsError, startSignIn } from "@/lib/mfa";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

function friendlyError(code) {
  switch (code) {
    case "auth/email-already-in-use":
      return "This email already has an account. Log in instead.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/weak-password":
      return `Use at least ${MIN_PASSWORD} characters for your password.`;
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Email or password is incorrect.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a few minutes and try again.";
    case "auth/network-request-failed":
      return "No connection. Check your internet and try again.";
    default:
      return "Something went wrong. Try again.";
  }
}

export default function AuthForm() {
  const router = useRouter();
  const params = useSearchParams();

  const [mode, setMode] = useState(
    params.get("mode") === "login" ? "login" : "signup"
  );
  const [step, setStep] = useState(1); // sign-up only: 1 = email, 2 = password
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  // Login with SMS second factor: { resolver, hint, verificationId }
  const [mfa, setMfa] = useState(null);
  const [code, setCode] = useState("");
  const recaptchaHost = useRef(null);
  // While sign-up / login is running, this form does the redirect itself.
  const handling = useRef(false);

  // Already signed in? Skip the form and go where this user belongs.
  useEffect(() => {
    if (!firebaseReady) return;
    return onAuthStateChanged(auth, async (u) => {
      if (!u || handling.current) return;
      try {
        router.replace(homeFor(await loadProfile(u.uid), u));
      } catch {
        /* stay on the form */
      }
    });
  }, [router]);

  async function goHome(user) {
    router.replace(homeFor(await loadProfile(user.uid), user));
  }

  // Password was right; the account has SMS 2-step on. Send the code.
  async function sendLoginCode(state) {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const verificationId = await startSignIn(state.resolver, state.hint, recaptchaHost.current);
      setMfa({ ...state, verificationId });
      setCode("");
      setNotice(`We sent a 6-digit code to ${maskPhone(state.hint.phoneNumber)}.`);
    } catch (err) {
      setMfa({ ...state, verificationId: null });
      setError(smsError(err));
    } finally {
      setBusy(false);
    }
  }

  async function submitCode(e) {
    e.preventDefault();
    if (busy) return;
    setError("");
    if (!/^\d{6}$/.test(code.trim())) {
      setError("Enter the 6-digit code from the SMS.");
      return;
    }
    setBusy(true);
    try {
      const cred = await finishSignIn(mfa.resolver, mfa.verificationId, code);
      await goHome(cred.user);
    } catch (err) {
      setError(smsError(err));
      setBusy(false);
    }
  }

  function cancelMfa() {
    handling.current = false;
    setMfa(null);
    setCode("");
    setPassword("");
    setError("");
    setNotice("");
  }

  async function resetPassword() {
    setError("");
    setNotice("");
    if (!checkEmail()) return;
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setNotice(`If ${email.trim()} has an account, a reset link is on its way.`);
    } catch (err) {
      setError(friendlyError(err.code));
    }
  }

  const isSignup = mode === "signup";
  const onEmailStep = isSignup && step === 1;
  const onPasswordStep = isSignup && step === 2;

  function switchMode() {
    setMode(isSignup ? "login" : "signup");
    setStep(1);
    setPassword("");
    setConfirm("");
    setError("");
    setNotice("");
  }

  function checkEmail() {
    if (!EMAIL_RE.test(email.trim())) {
      setError("Enter a valid email address.");
      return false;
    }
    return true;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (busy) return;
    setError("");
    setNotice("");

    // Sign-up, step 1: keep the email, ask for the password next.
    if (onEmailStep) {
      if (checkEmail()) setStep(2);
      return;
    }

    if (password.length < MIN_PASSWORD) {
      setError(`Use at least ${MIN_PASSWORD} characters for your password.`);
      return;
    }

    // Sign-up, step 2: create the account.
    if (onPasswordStep) {
      if (password !== confirm) {
        setError("The two passwords don't match.");
        return;
      }
      setBusy(true);
      handling.current = true;
      try {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        // Firebase only lets a user add an SMS second factor once their email
        // is verified, so the verification email goes out straight away.
        try {
          await sendEmailVerification(cred.user);
        } catch {
          /* /verify-email has a "Resend" button */
        }
        // Everyone who signs up is a creator (admins are set by hand in Firestore).
        try {
          await setDoc(
            doc(db, "users", cred.user.uid),
            {
              email: cred.user.email,
              role: "creator",
              enrolled: false,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
          router.push(VERIFY_EMAIL_PATH);
        } catch {
          // Profile couldn't be written yet: /role retries it.
          router.push("/role");
        }
      } catch (err) {
        handling.current = false;
        setError(friendlyError(err.code));
        if (err.code === "auth/email-already-in-use") setStep(1);
        setBusy(false);
      }
      return;
    }

    // Log in.
    if (!checkEmail()) return;
    setBusy(true);
    handling.current = true;
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      // Role-based redirect: admin -> /admin, creator -> next step or /creator
      await goHome(cred.user);
    } catch (err) {
      if (err.code === "auth/multi-factor-auth-required") {
        setBusy(false);
        await sendLoginCode(resolverFrom(err));
        return;
      }
      handling.current = false;
      setError(friendlyError(err.code));
      setBusy(false);
    }
  }

  const title = !isSignup
    ? "Welcome back"
    : onEmailStep
    ? "Create your account"
    : "Create a password";
  const sub = !isSignup
    ? "Log in with your email and password."
    : onEmailStep
    ? "Start with your email address."
    : "You'll use it to log in next time.";
  const buttonLabel = !isSignup
    ? "Log in"
    : onEmailStep
    ? "Continue"
    : "Create account";

  if (!firebaseReady) return <SetupNotice />;

  // ---- Login step 2: SMS code ----
  if (mfa) {
    return (
      <div className="auth-wrap">
        <section className="panel">
          <h1>Enter the SMS code</h1>
          <p className="sub">
            Your account has 2-step verification on. We text a code to{" "}
            {maskPhone(mfa.hint?.phoneNumber)} every time you log in.
          </p>
          <form onSubmit={submitCode} noValidate>
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
            <button type="submit" className="btn btn-violet btn-block" disabled={busy || !mfa.verificationId}>
              {busy ? "Please wait..." : "Verify and log in"}
            </button>
          </form>
          <p className="switch">
            <button type="button" className="link-btn" onClick={() => sendLoginCode(mfa)} disabled={busy}>
              Resend code
            </button>
            {" · "}
            <button type="button" className="link-btn" onClick={cancelMfa} disabled={busy}>
              Back to log in
            </button>
          </p>
          <div ref={recaptchaHost} />
        </section>
      </div>
    );
  }

  return (
    <div className="auth-wrap">
      <section className="panel">
        {isSignup && (
          <div className="steps" role="img" aria-label={`Step ${step} of 2`}>
            <i className="on" />
            <i className={step === 2 ? "on" : ""} />
          </div>
        )}

        <h1>{title}</h1>
        <p className="sub">{sub}</p>

        <form onSubmit={handleSubmit} noValidate>
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

          {onPasswordStep ? (
            <div className="email-line">
              <span>{email}</span>
              <button
                type="button"
                className="link-btn"
                onClick={() => {
                  setStep(1);
                  setError("");
                }}
              >
                Change
              </button>
            </div>
          ) : (
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                required
              />
            </div>
          )}

          {!onEmailStep && (
            <>
              <div className="field">
                <label htmlFor="password">
                  {onPasswordStep ? "New password" : "Password"}
                </label>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={onPasswordStep ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus={onPasswordStep}
                  required
                />
                {onPasswordStep && (
                  <small className="hint">At least {MIN_PASSWORD} characters.</small>
                )}
              </div>

              {onPasswordStep && (
                <div className="field">
                  <label htmlFor="confirm">Confirm password</label>
                  <input
                    id="confirm"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                  />
                </div>
              )}

              {!isSignup && (
                <button type="button" className="link-btn forgot" onClick={resetPassword}>
                  Forgot password?
                </button>
              )}

              <label className="check">
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                />
                Show password
              </label>
            </>
          )}

          <button type="submit" className="btn btn-violet btn-block" disabled={busy}>
            {busy ? "Please wait..." : buttonLabel}
          </button>
        </form>

        <p className="switch">
          {isSignup ? "Already have an account?" : "New here?"}{" "}
          <button type="button" className="link-btn" onClick={switchMode}>
            {isSignup ? "Log in" : "Create an account"}
          </button>
        </p>
        {/* invisible reCAPTCHA for the SMS code lives here */}
        <div ref={recaptchaHost} />
      </section>
    </div>
  );
}
