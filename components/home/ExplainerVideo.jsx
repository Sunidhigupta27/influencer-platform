"use client";

import { EXPLAINER_VIDEO_URL, isVideoFile, youTubeEmbed } from "@/lib/config";
import Reveal from "./Reveal";

/*
 * 60–90 second explainer video (schedule: Thu 15 Oct).
 * Set EXPLAINER_VIDEO_URL in lib/config.js (or NEXT_PUBLIC_EXPLAINER_VIDEO_URL
 * in .env.local) to a YouTube link or an .mp4 in /public, e.g. "/explainer.mp4".
 */
export default function ExplainerVideo() {
  const url = EXPLAINER_VIDEO_URL;
  const embed = youTubeEmbed(url);
  const file = !embed && (isVideoFile(url) || url.startsWith("/"));

  return (
    <section id="video" className="xv">
      <Reveal className="sec-head">
        <span className="kicker">Watch</span>
        <h2>
          See it in <span className="grad-text">90 seconds.</span>
        </h2>
      </Reveal>

      <Reveal className="xv-frame" delay={0.1}>
        {embed ? (
          <iframe
            src={embed}
            title="How it works – explainer video"
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
          />
        ) : file && url ? (
          <video src={url} controls preload="metadata" playsInline />
        ) : (
          <div className="xv-soon">
            <span className="xv-play" aria-hidden="true">▶</span>
            <strong>Explainer video coming soon</strong>
            <span>Sign up, link your socials, get ads that fit your follower count.</span>
          </div>
        )}
      </Reveal>
    </section>
  );
}
