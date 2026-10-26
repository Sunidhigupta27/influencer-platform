"use client";

import { motion } from "framer-motion";
import { useStill } from "@/lib/motion";
import Reveal from "./Reveal";

const creators = [
  { initial: "M", name: "Meera", note: "Beauty, 24K followers", y: 16 },
  { initial: "A", name: "Aarav", note: "Travel, 8K followers", y: 50 },
  { initial: "K", name: "Kabir", note: "Gaming, 61K followers", y: 84 },
];

const brands = [ // ads posted by our team (sample, fictional)
  { initial: "G", name: "Glow Skincare", note: "Needs 10K+ followers", y: 16 },
  { initial: "T", name: "Trail Gear", note: "Needs 5K+ followers", y: 50 },
  { initial: "P", name: "PixelPlay", note: "Needs 50K+ followers", y: 84 },
];

function Chip({ side, item, index, still }) {
  const drift = index % 2 === 0 ? -7 : 7;
  const delay = 0.5 + index * 0.15;

  return (
    <div className={`chip-slot ${side}`} style={{ top: `${item.y}%` }}>
      <motion.div
        className={`chip ${side === "left" ? "chip-creator" : "chip-brand"}`}
        initial={still ? false : { opacity: 0, x: side === "left" ? -40 : 40 }}
        whileInView={{ opacity: 1, x: 0, y: still ? 0 : [0, drift, 0] }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{
          opacity: { delay, duration: 0.5 },
          x: { delay, duration: 0.6 },
          y: still ? { duration: 0 } : { delay, duration: 4 + index, repeat: Infinity, ease: "easeInOut" },
        }}
      >
        <span className="avatar">{item.initial}</span>
        <span className="chip-text">
          <strong>{item.name}</strong>
          <span>{item.note}</span>
        </span>
      </motion.div>
    </div>
  );
}

export default function MatchStage() {
  const still = useStill();

  return (
    <section className="match">
      <Reveal className="sec-head">
        <span className="kicker">The match</span>
        <h2>
          Creators on one side. Ads on the other.{" "}
          <span className="grad-text">Matched by followers.</span>
        </h2>
      </Reveal>

      <div className="stage" role="img" aria-label="Creators and brand ads are matched by follower count">
        <svg className="lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="flow" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="100" y2="0">
              <stop offset="0" stopColor="#FF3D8B" />
              <stop offset="0.5" stopColor="#B58CFF" />
              <stop offset="1" stopColor="#FF3D8B" />
            </linearGradient>
          </defs>
          {[16, 50, 84].map((y) => (
            <path key={`l${y}`} className="line" d={`M0 ${y} C28 ${y} 22 50 50 50`} />
          ))}
          {[16, 50, 84].map((y) => (
            <path key={`r${y}`} className="line" d={`M100 ${y} C72 ${y} 78 50 50 50`} />
          ))}
        </svg>

        {creators.map((c, i) => (
          <Chip key={c.name} side="left" item={c} index={i} still={still} />
        ))}
        {brands.map((b, i) => (
          <Chip key={b.name} side="right" item={b} index={i} still={still} />
        ))}

        <motion.div
          className="hub"
          initial={still ? false : { opacity: 0, scale: 0.6 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, type: "spring", stiffness: 180, damping: 14 }}
        >
          <div className="hub-core">
            <strong>Match</strong>
            <span>by followers</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
