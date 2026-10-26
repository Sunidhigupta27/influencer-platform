// "use client";

// import { useEffect, useState } from "react";
// import { useRouter } from "next/navigation";
// import { doc, setDoc, serverTimestamp } from "firebase/firestore";
// import TopBar from "@/components/TopBar";
// import SetupNotice from "@/components/SetupNotice";
// import { db } from "@/lib/firebase";
// import { ENROL_PATH } from "@/lib/config";
// import { useSession } from "@/lib/session";

// /*
//  * Fallback for signed-in users who have no profile/role yet (e.g. the profile
//  * write failed during sign-up). There's no choice to make any more: everyone
//  * who signs up is a creator, so this sets role = "creator" and moves on to
//  * enrolment. Admins never land here (useSession sends them to /admin).
//  */
// export default function RolePage() {
//   const router = useRouter();
//   const { user, ready, notConfigured } = useSession({ noRole: true });
//   const [error, setError] = useState("");
//   const [attempt, setAttempt] = useState(0);

//   useEffect(() => {
//     if (!ready || !user) return;
//     let alive = true;
//     setDoc(
//       doc(db, "users", user.uid),
//       {
//         email: user.email,
//         role: "creator",
//         enrolled: false,
//         createdAt: serverTimestamp(),
//         updatedAt: serverTimestamp(),
//       },
//       { merge: true }
//     )
//       .then(() => alive && router.replace(ENROL_PATH))
//       .catch(() => alive && setError("We couldn't set up your account. Check your connection and try again."));
//     return () => {
//       alive = false;
//     };
//   }, [ready, user, router, attempt]);

//   if (notConfigured) {
//     return (
//       <main className="page">
//         <TopBar />
//         <SetupNotice />
//       </main>
//     );
//   }

//   return (
//     <main className="page">
//       <TopBar signOut={ready} />
//       <div className="role-wrap">
//         {error ? (
//           <>
//             <p className="error role-error" role="alert">{error}</p>
//             <button
//               type="button"
//               className="btn btn-pink"
//               onClick={() => {
//                 setError("");
//                 setAttempt((n) => n + 1);
//               }}
//             >
//               Try again
//             </button>
//           </>
//         ) : (
//           <p className="caption">Setting up your creator account…</p>
//         )}
//       </div>
//     </main>
//   );
// }

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import TopBar from "@/components/TopBar";
import SetupNotice from "@/components/SetupNotice";
import { db } from "@/lib/firebase";
import { useSession, homeFor } from "@/lib/session";

/*
 * Fallback for signed-in users who have no profile/role yet (e.g. the profile
 * write failed during sign-up). There's no choice to make any more: everyone
 * who signs up is a creator, so this sets role = "creator" and moves on to
 * enrolment. Admins never land here (useSession sends them to /admin).
 */
export default function RolePage() {
  const router = useRouter();
  const { user, ready, notConfigured } = useSession({ noRole: true });
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!ready || !user) return;
    let alive = true;

    async function setup() {
      try {
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);

        // A profile with a valid role already exists (e.g. an admin): never
        // overwrite it, just send the person where they belong.
        if (snap.exists()) {
          const dest = homeFor({ id: snap.id, ...snap.data() }, user);
          if (dest !== "/role") {
            if (alive) router.replace(dest);
            return;
          }
        }

        // No profile yet: create it as a creator.
        await setDoc(
          ref,
          {
            email: user.email,
            role: "creator",
            enrolled: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
        if (alive) router.replace(homeFor({ role: "creator", enrolled: false }, user));
      } catch (err) {
        // Look at the browser console: err.code says the real reason
        // (permission-denied, not-found, unavailable ...).
        console.error("Role setup failed:", err.code, err.message);
        if (alive) {
          setError(
            err.code === "permission-denied"
              ? "Firestore refused access (permission-denied). Publish firestore.rules in the Firebase console."
              : "We couldn't set up your account. Check your connection and try again."
          );
        }
      }
    }

    setup();
    return () => {
      alive = false;
    };
  }, [ready, user, router, attempt]);

  if (notConfigured) {
    return (
      <main className="page">
        <TopBar />
        <SetupNotice />
      </main>
    );
  }

  return (
    <main className="page">
      <TopBar signOut={ready} />
      <div className="role-wrap">
        {error ? (
          <>
            <p className="error role-error" role="alert">{error}</p>
            <button
              type="button"
              className="btn btn-pink"
              onClick={() => {
                setError("");
                setAttempt((n) => n + 1);
              }}
            >
              Try again
            </button>
          </>
        ) : (
          <p className="caption">Setting up your creator account…</p>
        )}
      </div>
    </main>
  );
}