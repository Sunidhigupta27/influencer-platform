"use client";

import { useEffect, useRef, useState } from "react";
import { FOLLOWER_APIS, formatCount } from "@/lib/config";

// Per-platform rules: which links are accepted, how they're cleaned up,
// and what the count is called.
const SOURCES = {
  instagram: {
    label: "Instagram profile URL",
    placeholder: "instagram.com/username",
    example: "instagram.com/yourname",
    unit: "followers",
    hosts: ["instagram.com", "www.instagram.com", "m.instagram.com"],
    parse(url) {
      const m = url.pathname.match(/^\/([A-Za-z0-9._]{1,30})\/?$/);
      if (!m) return null;
      return { handle: `@${m[1]}`, url: `https://www.instagram.com/${m[1]}/` };
    },
  },
  facebook: {
    label: "Facebook page URL",
    placeholder: "facebook.com/yourpage",
    example: "facebook.com/yourpage",
    unit: "followers",
    hosts: ["facebook.com", "www.facebook.com", "m.facebook.com", "web.facebook.com", "fb.com", "www.fb.com"],
    parse(url) {
      // facebook.com/profile.php?id=123456
      if (/^\/profile\.php\/?$/.test(url.pathname)) {
        const id = url.searchParams.get("id");
        if (!id || !/^\d+$/.test(id)) return null;
        return { handle: id, url: `https://www.facebook.com/profile.php?id=${id}` };
      }
      // facebook.com/pagename  (also /people/Name/1234 and /pg/pagename)
      const people = url.pathname.match(/^\/people\/([^/]+)\/(\d+)\/?$/);
      if (people) {
        return { handle: decodeURIComponent(people[1]), url: `https://www.facebook.com/people/${people[1]}/${people[2]}/` };
      }
      const m = url.pathname.match(/^\/(?:pg\/)?([A-Za-z0-9.\-]{2,80})\/?$/);
      const reserved = ["groups", "watch", "events", "marketplace", "gaming", "login", "share", "sharer", "home.php"];
      if (!m || reserved.includes(m[1].toLowerCase())) return null;
      return { handle: m[1], url: `https://www.facebook.com/${m[1]}` };
    },
  },
  youtube: {
    label: "YouTube channel URL",
    placeholder: "youtube.com/@yourchannel",
    example: "youtube.com/@yourchannel",
    unit: "subscribers",
    hosts: ["youtube.com", "www.youtube.com", "m.youtube.com"],
    parse(url) {
      // Trailing tabs like /videos or /featured are dropped.
      const handle = url.pathname.match(/^\/@([A-Za-z0-9._\-]{3,100})(?:\/[a-z]+)?\/?$/);
      if (handle) return { handle: `@${handle[1]}`, url: `https://www.youtube.com/@${handle[1]}` };
      const channel = url.pathname.match(/^\/channel\/(UC[A-Za-z0-9_\-]{22})(?:\/[a-z]+)?\/?$/);
      if (channel) return { handle: channel[1], url: `https://www.youtube.com/channel/${channel[1]}` };
      const legacy = url.pathname.match(/^\/(c|user)\/([A-Za-z0-9._\-]{1,100})(?:\/[a-z]+)?\/?$/);
      if (legacy) return { handle: legacy[2], url: `https://www.youtube.com/${legacy[1]}/${legacy[2]}` };
      return null;
    },
  },
};

// Turns any profile link into a clean, canonical one. Share-link junk like
// ?igsh=…, ?utm_…, ?si=… is dropped instead of rejected.
function parseProfile(platform, raw) {
  const source = SOURCES[platform];
  let value = raw.trim();
  if (!value || !source) return null;
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
  try {
    const url = new URL(value);
    if (!source.hosts.includes(url.hostname.toLowerCase())) return null;
    return source.parse(url);
  } catch {
    return null;
  }
}

const COUNT_KEYS = ["followersCount", "subscriberCount", "followers", "subscribers", "fan_count"];

function readCount(data) {
  const payload = Array.isArray(data) ? data[0] : data;
  for (const key of COUNT_KEYS) {
    const raw = payload?.[key];
    if (raw === undefined || raw === null || raw === "") continue;
    const count = Number(String(raw).replace(/,/g, ""));
    if (Number.isFinite(count) && count >= 0) return Math.round(count);
  }
  return null;
}

// Wait this long after the last keystroke before fetching (pastes fetch at once).
const TYPE_DELAY = 800;

export default function SocialFollowers({
  platform = "instagram",
  defaultUrl = "",
  defaultFollowers = null,
  onFetched,
  onClear,
}) {
  const source = SOURCES[platform];
  const inputId = `${platform}Url`;
  const statusId = `${platform}Url-status`;

  const [profileUrl, setProfileUrl] = useState(defaultUrl);
  const [followers, setFollowers] = useState(defaultFollowers);
  const [handle, setHandle] = useState(() => parseProfile(platform, defaultUrl)?.handle || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  // "<canonical link>#<retry>" we last tried (or loaded with a saved count),
  // so the listener never fetches the same profile twice by itself.
  const lastTry = useRef(defaultFollowers !== null ? `${parseProfile(platform, defaultUrl)?.url || ""}#0` : "");
  const pasted = useRef(false);
  const cbs = useRef({ onFetched, onClear });
  useEffect(() => {
    cbs.current = { onFetched, onClear };
  });

  function handleChange(e) {
    setProfileUrl(e.target.value);
    setError("");
    lastTry.current = "";
    if (followers !== null) {
      setFollowers(null);
      setHandle("");
      cbs.current.onClear?.();
    }
  }

  // Listener: whenever the link changes, check it and fetch the count by itself.
  useEffect(() => {
    const raw = profileUrl.trim();
    if (!raw) return;
    const profile = parseProfile(platform, raw);

    const wait = pasted.current ? 0 : TYPE_DELAY;
    pasted.current = false;

    if (!profile) {
      // Only complain once they've stopped typing.
      const t = setTimeout(() => setError(`Enter a valid link, like ${source.example}`), TYPE_DELAY + 400);
      return () => clearTimeout(t);
    }
    const key = `${profile.url}#${retry}`;
    if (key === lastTry.current) return;

    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      lastTry.current = key;
      setError("");
      setLoading(true);
      try {
        const apiUrl = new URL(FOLLOWER_APIS[platform]);
        apiUrl.searchParams.set("url", profile.url);
        const response = await fetch(apiUrl.toString(), { signal: ctrl.signal });
        if (!response.ok) throw new Error(`Couldn't fetch the count right now (${response.status}).`);
        const count = readCount(await response.json());
        if (count === null) throw new Error(`We couldn't read the ${source.unit} count for this link.`);

        lastTry.current = `${profile.url}#${retry}`;
        setProfileUrl(profile.url);
        setFollowers(count);
        setHandle(profile.handle);
        cbs.current.onFetched?.({ platform, profileUrl: profile.url, handle: profile.handle, followers: count });
      } catch (err) {
        if (err.name === "AbortError") return;
        const offline = err instanceof TypeError; // network / CORS failure
        setError(offline ? "Couldn't reach the server. Check your connection." : err.message);
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, wait);

    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [profileUrl, platform, source, retry]);

  const done = followers !== null && !loading;

  return (
    <div className="sf-fetch">
      <label htmlFor={inputId} className="sf-label">
        {source.label}
      </label>

      <div className={`sf-group ${error ? "has-error" : ""} ${done ? "is-done" : ""}`}>
        <input
          id={inputId}
          type="url"
          inputMode="url"
          autoComplete="url"
          spellCheck={false}
          value={profileUrl}
          onChange={handleChange}
          onPaste={() => (pasted.current = true)}
          // The field sits inside a <form>; Enter shouldn't submit it.
          onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
          placeholder={source.placeholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={statusId}
        />
        {loading && (
          <span className="sf-state sf-state-busy" aria-hidden="true">
            <span className="sf-spinner" />
            Reading…
          </span>
        )}
        {done && (
          <span className="sf-state sf-state-ok" aria-hidden="true">
            ✓ {formatCount(followers)}
          </span>
        )}
      </div>

      <div id={statusId} aria-live="polite">
        {done && (
          <p className="sf-result">
            <span className="sf-check" aria-hidden="true">✓</span>
            <span>
              <strong>{followers.toLocaleString("en-IN")}</strong> {source.unit}
              {handle && <span className="sf-user"> · {handle}</span>}
            </span>
          </p>
        )}
        {loading && <p className="sf-help">Reading your {source.unit} count…</p>}
        {error && !loading && (
          <p role="alert" className="sf-error">
            {error}
            {parseProfile(platform, profileUrl) && (
              <>
                {" "}
                <button type="button" className="link-btn sf-retry" onClick={() => setRetry((n) => n + 1)}>
                  Try again
                </button>
              </>
            )}
          </p>
        )}
        {!done && !error && !loading && (
          <p className="sf-help">Paste your link. We&apos;ll read your {source.unit} count automatically.</p>
        )}
      </div>
    </div>
  );
}
