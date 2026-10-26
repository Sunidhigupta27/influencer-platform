"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

// Sample brands for the demo only (fictional).
const ADS = [
  { brand: "Glow Skincare", title: "Summer glow reel", fmt: "Reel · 30s", need: "10K+", hue: "pink" },
  { brand: "Trail Gear", title: "Weekend trek story", fmt: "Story · 3 frames", need: "5K+", hue: "mint" },
  { brand: "Kettle & Co.", title: "Morning chai ritual", fmt: "Reel · 20s", need: "10K+", hue: "peach" },
  { brand: "Urban Thread", title: "Festive lookbook", fmt: "Carousel · 5", need: "20K+", hue: "lilac" },
  { brand: "FitFuel", title: "7-day protein challenge", fmt: "YouTube · 8 min", need: "15K+", hue: "sky" },
];

export default function PhoneDemo({ still }) {
  const [head, setHead] = useState(0);
  const [followers, setFollowers] = useState(24180);

  useEffect(() => {
    if (still) return;
    const a = setInterval(() => setHead((h) => (h + 1) % ADS.length), 2600);
    const b = setInterval(() => setFollowers((f) => f + 3 + Math.floor(Math.random() * 14)), 900);
    return () => {
      clearInterval(a);
      clearInterval(b);
    };
  }, [still]);

  const visible = [0, 1, 2].map((k) => ADS[(head + k) % ADS.length]);

  return (
    <div className="phone-stage" aria-hidden="true">
      <div className="phone-glow" />

      <div className="phone">
        <div className="phone-notch" />
        <div className="phone-screen">
          <div className="p-head">
            <span className="p-ava">M</span>
            <div>
              <strong>@meera.makes</strong>
              <span>Beauty · Bhubaneswar</span>
            </div>
          </div>

          <div className="p-stats">
            <div>
              <strong className="tick">{followers.toLocaleString("en-IN")}</strong>
              <span>followers</span>
            </div>
            <div>
              <strong>Micro</strong>
              <span>tier</span>
            </div>
          </div>

          <div className="p-label">
            <span>Matched for you</span>
            <i className="live-dot" />
          </div>

          <ul className="p-feed">
            <AnimatePresence initial={false} mode="popLayout">
              {visible.map((ad, i) => (
                <motion.li
                  key={ad.brand}
                  layout
                  className={`p-ad hue-${ad.hue}`}
                  initial={{ opacity: 0, y: -30, scale: 0.9 }}
                  animate={{ opacity: 1 - i * 0.18, y: 0, scale: 1 - i * 0.03 }}
                  exit={{ opacity: 0, x: 80, rotate: 6 }}
                  transition={{ type: "spring", stiffness: 300, damping: 28 }}
                >
                  <span className="p-logo">{ad.brand[0]}</span>
                  <span className="p-ad-txt">
                    <strong>{ad.brand}</strong>
                    <span>{ad.title}</span>
                    <em>{ad.fmt}</em>
                  </span>
                  <span className="p-need">{ad.need}</span>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </div>
      </div>

      <motion.div
        className="float-badge fb-1"
        style={{ z: 90 }}
        animate={still ? undefined : { y: [0, -12, 0], rotate: [-4, -2, -4] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      >
        <span className="fb-ico fb-pink">★</span>
        <span>
          <strong>New match</strong>
          <em>Glow Skincare</em>
        </span>
      </motion.div>

      <motion.div
        className="float-badge fb-2"
        style={{ z: 90 }}
        animate={still ? undefined : { y: [0, 14, 0], rotate: [3, 5, 3] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
      >
        <span className="fb-ico fb-green">✓</span>
        <span>
          <strong>Instagram linked</strong>
          <em>24K followers</em>
        </span>
      </motion.div>

      <motion.div
        className="float-badge fb-3"
        style={{ z: 90 }}
        animate={still ? undefined : { y: [0, -10, 0] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
      >
        <span className="fb-ico fb-violet">↑</span>
        <span>
          <strong>10K tier unlocked</strong>
          <em>3 more ads for you</em>
        </span>
      </motion.div>

      <div className="orbit" />
      <div className="orbit o2" />
    </div>
  );
}
