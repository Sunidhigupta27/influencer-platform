"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useStill } from "@/lib/motion";
import { Timestamp, collection, collectionGroup, doc, getDocs, serverTimestamp, updateDoc } from "firebase/firestore";
import TopBar from "@/components/TopBar";
import SetupNotice from "@/components/SetupNotice";
import AdminSidebar, { ADMIN_SECTIONS } from "@/components/admin/AdminSidebar";
import DashboardOverview from "@/components/admin/DashboardOverview";
import AdForm from "@/components/admin/AdForm";
import AdList from "@/components/admin/AdList";
import UsersTable from "@/components/admin/UsersTable";
import ApprovalsList, { isAwaiting } from "@/components/admin/ApprovalsList";
import SocialAccountsTable, { fromApi } from "@/components/admin/SocialAccountsTable";
import AdminSettings from "@/components/admin/AdminSettings";
import UserDetail from "@/components/admin/UserDetail";
import AdDetail from "@/components/creator/AdDetail";
import { db } from "@/lib/firebase";
import { formatCount, formatINR } from "@/lib/config";
import { adState, createAd, listAds, setAdStatus, updateAd } from "@/lib/ads";
import { useSession } from "@/lib/session";

const IDS = ADMIN_SECTIONS.map((s) => s.id);
const PREFS_KEY = "admin-prefs";
const DEFAULT_PREFS = { startSection: "dashboard", collapsed: false };

function readPrefs() {
  try {
    return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(PREFS_KEY) || "{}") };
  } catch {
    return DEFAULT_PREFS;
  }
}

function hashSection() {
  if (typeof window === "undefined") return "";
  const h = window.location.hash.replace("#", "");
  return IDS.includes(h) ? h : "";
}

const RULES_HINT = "Check that firestore.rules from this project is deployed.";

export default function AdminPanel() {
  const still = useStill();
  const { user, profile, ready, notConfigured } = useSession({ allow: ["admin"] });

  // The panel only renders after sign-in is confirmed (never during the
  // server render), so reading the browser here is safe.
  const [prefs, setPrefsState] = useState(() => (typeof window === "undefined" ? DEFAULT_PREFS : readPrefs()));
  const [section, setSectionState] = useState(() => {
    if (typeof window === "undefined") return "dashboard";
    const start = readPrefs().startSection;
    return hashSection() || (IDS.includes(start) ? start : "dashboard");
  });
  const [drawer, setDrawer] = useState(false);

  const [users, setUsers] = useState(null);
  const [usersError, setUsersError] = useState("");
  const [ads, setAds] = useState(null);
  const [adsError, setAdsError] = useState("");
  const [accounts, setAccounts] = useState(null);
  const [accountsError, setAccountsError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // null = closed, "new" = posting, or the ad being edited
  const [editing, setEditing] = useState(null);
  const [busyId, setBusyId] = useState("");
  const [viewUser, setViewUser] = useState(null); // user whose details are open
  const [viewAd, setViewAd] = useState(null); // ad open in the preview / video dialog
  const closeUser = useCallback(() => setViewUser(null), []);
  const closeAd = useCallback(() => setViewAd(null), []);
  const [toast, setToast] = useState("");

  // Back/forward or a pasted /admin#ads link switches section.
  useEffect(() => {
    const onHash = () => {
      const h = hashSection();
      if (h) setSectionState(h);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const setSection = useCallback((id) => {
    setSectionState(id);
    try {
      window.history.replaceState(null, "", `#${id}`);
    } catch {
      /* ignore */
    }
    window.scrollTo({ top: 0 });
  }, []);

  const setPrefs = useCallback((patch) => {
    setPrefsState((p) => {
      const next = { ...p, ...patch };
      try {
        localStorage.setItem(PREFS_KEY, JSON.stringify(next));
      } catch {
        /* storage blocked: keep it for this visit only */
      }
      return next;
    });
  }, []);

  const loadAll = useCallback(async () => {
    const jobs = [
      getDocs(collection(db, "users"))
        .then((snap) => {
          setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
          setUsersError("");
        })
        .catch(() => {
          setUsersError(`Couldn't load users. ${RULES_HINT}`);
          setUsers((u) => u || []);
        }),
      listAds()
        .then((list) => {
          setAds(list);
          setAdsError("");
        })
        .catch(() => {
          setAdsError(`Couldn't load ads. ${RULES_HINT}`);
          setAds((a) => a || []);
        }),
      // Every users/{uid}/socialAccounts/{platform} doc in one query.
      getDocs(collectionGroup(db, "socialAccounts"))
        .then((snap) => {
          setAccounts(
            snap.docs.map((d) => ({
              id: d.id,
              uid: d.ref.parent.parent?.id,
              platform: d.data().platform || d.id,
              ...d.data(),
            }))
          );
          setAccountsError("");
        })
        .catch(() => {
          setAccountsError(
            `Couldn't load social accounts. ${RULES_HINT} (It needs the socialAccounts collection-group rule added with the sidebar.)`
          );
          setAccounts((a) => a || []);
        }),
    ];
    await Promise.all(jobs);
  }, []);

  useEffect(() => {
    if (ready) loadAll();
  }, [ready, loadAll]);

  async function refresh() {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
    setToast("Data reloaded");
  }

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const usersById = useMemo(() => Object.fromEntries((users || []).map((u) => [u.id, u])), [users]);

  const counts = useMemo(
    () => ({
      approvals: users ? users.filter(isAwaiting).length : undefined,
      users: users?.length,
      ads: ads ? ads.filter((a) => adState(a) === "active").length : undefined,
      social: accounts ? accounts.filter((a) => !a.verified).length : undefined,
    }),
    [users, ads, accounts]
  );

  const stats = useMemo(() => {
    const u = users || [];
    const a = ads || [];
    const s = accounts || [];
    const creators = u.filter((x) => x.role === "creator");
    const live = a.filter((x) => adState(x) === "active");
    const liveBudget = formatINR(live.reduce((sum, x) => sum + (x.budget || 0), 0));

    switch (section) {
      case "dashboard":
        return {
          loaded: users !== null && ads !== null,
          items: [
            { label: "Total users", value: u.length },
            { label: "Awaiting approval", value: u.filter(isAwaiting).length },
            { label: "Live ads", value: live.length },
            { label: "Live budget", value: liveBudget },
          ],
        };
      case "ads":
        return {
          loaded: ads !== null,
          items: [
            { label: "Total ads", value: a.length },
            { label: "Active", value: live.length },
            { label: "Paused", value: a.filter((x) => x.status === "paused").length },
            { label: "Live budget", value: liveBudget },
          ],
        };
      case "approvals":
        return {
          loaded: users !== null,
          items: [
            { label: "Waiting", value: u.filter(isAwaiting).length },
            { label: "Approved", value: creators.filter((x) => x.status === "approved").length },
            { label: "Sent back", value: creators.filter((x) => x.status === "rejected").length },
            { label: "Not finished form", value: creators.filter((x) => !x.enrolled).length },
          ],
        };
      case "users":
        return {
          loaded: users !== null,
          items: [
            { label: "Total users", value: u.length },
            { label: "Creators", value: creators.length },
            { label: "Enrolled", value: creators.filter((x) => x.enrolled).length },
            { label: "Not enrolled", value: creators.filter((x) => !x.enrolled).length },
          ],
        };
      case "social":
        return {
          loaded: accounts !== null,
          items: [
            { label: "Linked accounts", value: s.length },
            { label: "Verified", value: s.filter((x) => x.verified).length },
            { label: "Counts from API", value: s.filter(fromApi).length },
            { label: "Total followers", value: formatCount(s.reduce((sum, x) => sum + (x.followers || 0), 0)) },
          ],
        };
      default:
        return null;
    }
  }, [section, users, ads, accounts]);

  const closeForm = useCallback(() => setEditing(null), []);

  async function saveAd(values) {
    if (editing === "new") {
      const ad = await createAd(values, user.uid);
      setAds((list) => [ad, ...(list || [])]);
      setToast("Ad posted. Matching creators can see it now.");
    } else {
      const patch = await updateAd(editing.id, values);
      setAds((list) => list.map((a) => (a.id === editing.id ? { ...a, ...patch } : a)));
      setToast("Ad updated");
    }
    setEditing(null);
  }

  async function toggleAd(ad) {
    const next = ad.status === "paused" ? "active" : "paused";
    setBusyId(ad.id);
    try {
      await setAdStatus(ad.id, next);
      setAds((list) => list.map((a) => (a.id === ad.id ? { ...a, status: next } : a)));
      setToast(next === "paused" ? "Ad paused, creators won't see it" : "Ad is live again");
    } catch {
      setToast("Couldn't change the status. Try again.");
    } finally {
      setBusyId("");
    }
  }

  // Approve or send back a creator. The creator's /pending page is listening
  // to their user doc and moves on (or shows the reason) straight away.
  async function review(target, decision, note = "") {
    if (decision === "rejected" && !note.trim()) {
      setToast("Add a short reason so the creator knows what to fix.");
      return;
    }
    setBusyId(`review/${target.id}`);
    const patch = {
      status: decision,
      reviewNote: decision === "rejected" ? note.trim().slice(0, 500) : "",
      reviewedBy: user.uid,
      reviewedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    try {
      await updateDoc(doc(db, "users", target.id), patch);
      const local = { ...patch, reviewedAt: Timestamp.now(), updatedAt: Timestamp.now() };
      setUsers((list) => list.map((x) => (x.id === target.id ? { ...x, ...local } : x)));
      setViewUser((v) => (v && v.id === target.id ? { ...v, ...local } : v));
      setToast(
        decision === "approved"
          ? `${target.name || target.email} approved. They can see ads now.`
          : `Sent back to ${target.name || target.email} with your note.`
      );
    } catch {
      setToast(`Couldn't save. ${RULES_HINT}`);
    } finally {
      setBusyId("");
    }
  }

  async function toggleVerified(acc) {
    const key = `${acc.uid}/${acc.id}`;
    const next = !acc.verified;
    setBusyId(key);
    try {
      await updateDoc(doc(db, "users", acc.uid, "socialAccounts", acc.id), {
        verified: next,
        updatedAt: serverTimestamp(),
      });
      setAccounts((list) =>
        list.map((a) => (a.uid === acc.uid && a.id === acc.id ? { ...a, verified: next } : a))
      );
      setToast(next ? "Account marked verified" : "Verification removed");
    } catch {
      setToast("Couldn't update verification. Try again.");
    } finally {
      setBusyId("");
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

  const meta = ADMIN_SECTIONS.find((s) => s.id === section);

  return (
    <main className={`admin-shell ${prefs.collapsed ? "is-collapsed" : ""}`}>
      <AdminSidebar
        section={section}
        onSelect={setSection}
        counts={counts}
        email={profile.email || ""}
        collapsed={prefs.collapsed}
        onCollapse={(c) => setPrefs({ collapsed: c })}
        open={drawer}
        onOpen={setDrawer}
      />

      <div className="admin-main">
        <div className="dash">
          <header className="dash-head admin-head">
            <div>
              <h1 className="role-title">{section === "dashboard" ? "Dashboard" : meta?.label}</h1>
              <p className="role-sub">
                {section === "dashboard" ? `Signed in as ${profile.email}` : meta?.hint}
              </p>
            </div>
          </header>

          {stats && (
            <div className="stat-row">
              {stats.items.map((s, i) => (
                <motion.div
                  key={`${section}-${s.label}`}
                  className="stat"
                  initial={still ? false : { opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                >
                  <strong>{stats.loaded ? s.value : "…"}</strong>
                  <span>{s.label}</span>
                </motion.div>
              ))}
            </div>
          )}

          {section === "dashboard" && (
            <DashboardOverview
              users={users}
              ads={ads}
              accounts={accounts}
              onGo={setSection}
              onNewAd={() => setEditing("new")}
            />
          )}

          {section === "approvals" && (
            <ApprovalsList
              users={users}
              accounts={accounts}
              loadError={usersError}
              busyId={busyId}
              onApprove={(u) => review(u, "approved")}
              onReject={(u, note) => review(u, "rejected", note)}
              onOpen={setViewUser}
            />
          )}

          {section === "users" && <UsersTable users={users} loadError={usersError} onOpen={setViewUser} />}

          {section === "ads" && (
            <>
              {adsError && <p className="error">{adsError}</p>}
              <AdList
                ads={ads}
                busyId={busyId}
                onNew={() => setEditing("new")}
                onEdit={(ad) => setEditing(ad)}
                onView={setViewAd}
                onToggle={toggleAd}
              />
            </>
          )}

          {section === "social" && (
            <SocialAccountsTable
              accounts={accounts}
              usersById={usersById}
              loadError={accountsError}
              onVerify={toggleVerified}
              busyId={busyId}
            />
          )}

          {section === "settings" && (
            <AdminSettings
              profile={profile}
              uid={user.uid}
              prefs={prefs}
              onPrefs={setPrefs}
              onRefresh={refresh}
              refreshing={refreshing}
            />
          )}
        </div>
      </div>

      <AnimatePresence>
        {editing && (
          <AdForm
            key={editing === "new" ? "new" : editing.id}
            initial={editing === "new" ? null : editing}
            onSave={saveAd}
            onClose={closeForm}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewUser && (
          <UserDetail
            user={viewUser}
            accounts={accounts}
            ads={ads}
            onVerify={toggleVerified}
            onApprove={(u) => review(u, "approved")}
            onReject={(u, note) => review(u, "rejected", note)}
            busyId={busyId}
            onClose={closeUser}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>{viewAd && <AdDetail ad={viewAd} onClose={closeAd} />}</AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            className="toast"
            role="status"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
