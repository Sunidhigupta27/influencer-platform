"use client";

import {
  EmailAuthProvider,
  PhoneAuthProvider,
  PhoneMultiFactorGenerator,
  RecaptchaVerifier,
  getMultiFactorResolver,
  multiFactor,
  reauthenticateWithCredential,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { PHONE_COUNTRY_CODE } from "@/lib/config";

/*
 * SMS multi-factor authentication (Firebase Auth with Identity Platform).
 *
 *   Creators add their mobile as a second factor on /verify-phone
 *   (startEnrollment -> finishEnrollment). From then on, logging in with
 *   email + password throws "auth/multi-factor-auth-required" and AuthForm
 *   asks for the SMS code (startSignIn -> finishSignIn).
 *
 * Every SMS needs an invisible reCAPTCHA. Each call makes a fresh one in a new
 * child element of `host`, so retries never hit "reCAPTCHA has already been
 * rendered in this element".
 */

/** "9876543210" -> "+919876543210". Already-international numbers pass through. */
export function toE164(phone) {
  const raw = String(phone || "").trim();
  if (raw.startsWith("+")) return `+${raw.replace(/\D/g, "")}`;
  const digits = raw.replace(/\D/g, "").slice(-10);
  return `${PHONE_COUNTRY_CODE}${digits}`;
}

/** "+919876543210" -> "+91 ••••••3210" */
export function maskPhone(phone) {
  const p = String(phone || "");
  if (p.length < 4) return p;
  return `${p.startsWith(PHONE_COUNTRY_CODE) ? PHONE_COUNTRY_CODE + " " : ""}••••••${p.slice(-4)}`;
}

export function makeRecaptcha(host) {
  const el = document.createElement("div");
  host.appendChild(el);
  const verifier = new RecaptchaVerifier(auth, el, { size: "invisible" });
  return {
    verifier,
    clear() {
      try {
        verifier.clear();
      } catch {
        /* already cleared */
      }
      el.remove();
    },
  };
}

async function withRecaptcha(host, fn) {
  const rc = makeRecaptcha(host);
  try {
    return await fn(rc.verifier);
  } finally {
    rc.clear();
  }
}

// ---------- Enrolment (signed-in user adds their phone) ----------

/*
 * Firebase only lets a user add a second factor if they signed in within the
 * last ~5 minutes. Creators usually reach /verify-phone later than that (sign
 * up -> open the email link -> come back), so getSession() fails with
 * "auth/requires-recent-login" and no SMS is ever sent. Re-confirming the
 * password in place refreshes the sign-in time without leaving the page.
 */
export async function reauthWithPassword(user, password) {
  const cred = EmailAuthProvider.credential(user.email, password);
  await reauthenticateWithCredential(user, cred);
}

/** Sends the SMS. Returns a verificationId for finishEnrollment. */
export async function startEnrollment(user, phone, host) {
  const session = await multiFactor(user).getSession();
  return withRecaptcha(host, (verifier) =>
    new PhoneAuthProvider(auth).verifyPhoneNumber({ phoneNumber: toE164(phone), session }, verifier)
  );
}

export async function finishEnrollment(user, verificationId, code) {
  const cred = PhoneAuthProvider.credential(verificationId, code.trim());
  const assertion = PhoneMultiFactorGenerator.assertion(cred);
  await multiFactor(user).enroll(assertion, "Mobile");
}

// ---------- Sign-in (password was right, now the SMS code) ----------

/** From the "auth/multi-factor-auth-required" error -> { resolver, hint } */
export function resolverFrom(error) {
  const resolver = getMultiFactorResolver(auth, error);
  const hint =
    resolver.hints.find((h) => h.factorId === PhoneMultiFactorGenerator.FACTOR_ID) || resolver.hints[0];
  return { resolver, hint };
}

export async function startSignIn(resolver, hint, host) {
  return withRecaptcha(host, (verifier) =>
    new PhoneAuthProvider(auth).verifyPhoneNumber({ multiFactorHint: hint, session: resolver.session }, verifier)
  );
}

export async function finishSignIn(resolver, verificationId, code) {
  const cred = PhoneAuthProvider.credential(verificationId, code.trim());
  return resolver.resolveSignIn(PhoneMultiFactorGenerator.assertion(cred));
}

// ---------- Messages ----------

export function smsError(err) {
  // Look at the browser console for the raw code when something is unclear.
  if (err?.code) console.warn("SMS auth error:", err.code, err.message);
  switch (err?.code) {
    case "auth/invalid-verification-code":
      return "That code isn't right. Check the SMS and try again.";
    case "auth/code-expired":
      return "That code has expired. Send a new one.";
    case "auth/invalid-phone-number":
      return "That mobile number isn't valid.";
    case "auth/missing-phone-number":
      return "Enter your mobile number.";
    case "auth/second-factor-already-in-use":
      return "This number is already set up on your account.";
    case "auth/unverified-email":
      return "Verify your email first, then add your mobile.";
    case "auth/requires-recent-login":
      return "For your security, confirm your password to continue.";
    case "auth/wrong-password":
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
      return "That password isn't right.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a few minutes and try again.";
    case "auth/quota-exceeded":
      return "We've hit today's SMS limit. Try again later.";
    case "auth/billing-not-enabled":
      return "SMS sending isn't switched on for this project yet (Firebase billing). Ask the admin.";
    case "auth/operation-not-allowed":
      if (/region/i.test(err?.message || ""))
        return "SMS to this country isn't allowed yet. Admin: Firebase → Authentication → Settings → SMS region policy → allow India.";
      return "SMS verification isn't enabled in Firebase yet. Ask the admin.";
    case "auth/unauthorized-domain":
      return "This website's domain isn't authorised in Firebase. Ask the admin.";
    case "auth/captcha-check-failed":
      return "The security check failed. Refresh the page and try again.";
    case "auth/network-request-failed":
      return "No connection. Check your internet and try again.";
    case "auth/maximum-second-factor-count-exceeded":
      return "This account already has the maximum number of phones.";
    default:
      return "Couldn't send or check the code. Try again.";
  }
}