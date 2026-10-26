"use client";

import SocialFollowers from "@/components/SocialFollowers";

// Kept for existing imports; the shared logic lives in SocialFollowers.jsx.
export default function InstagramFollowers({ onFetched, ...props }) {
  return (
    <SocialFollowers
      {...props}
      platform="instagram"
      onFetched={(d) =>
        onFetched?.({ ...d, instagramUrl: d.profileUrl, username: d.handle.replace(/^@/, "") })
      }
    />
  );
}
