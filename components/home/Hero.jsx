"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import { useStill } from "@/lib/motion";
import { TAGLINE } from "@/lib/config";
import { EASE, SplitWords } from "./Reveal";
import PhoneDemo from "./PhoneDemo";

const WORDS = ["brands", "sponsors", "campaigns", "collabs"];

function RotatingWord({ still }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (still) return;
    const t = setInterval(() => setI((v) => (v + 1) % WORDS.length), 2400);
    return () => clearInterval(t);
  }, [still]);

  return (
    <span className="rot" aria-hidden="true">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={WORDS[i]}
          className="rot-word"
          initial={{ y: "105%", opacity: 0, filter: "blur(8px)" }}
          animate={{ y: "0%", opacity: 1, filter: "blur(0px)" }}
          exit={{ y: "-105%", opacity: 0, filter: "blur(8px)" }}
          transition={{ duration: 0.7, ease: EASE }}
        >
          {WORDS[i]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/* Button that leans toward the cursor. */
function Magnetic({ children, className, href }) {
  const still = useStill();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 260, damping: 18 });
  const sy = useSpring(y, { stiffness: 260, damping: 18 });

  function move(e) {
    if (still) return;
    const r = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - r.left - r.width / 2) * 0.3);
    y.set((e.clientY - r.top - r.height / 2) * 0.4);
  }

  return (
    <motion.span style={{ x: sx, y: sy, display: "inline-flex" }} onMouseMove={move} onMouseLeave={() => { x.set(0); y.set(0); }}>
      <Link href={href} className={className}>
        {children}
      </Link>
    </motion.span>
  );
}

export default function Hero() {
  const still = useStill();
  const ref = useRef(null);
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rotY = useSpring(useTransform(mx, [0, 1], [-14, 14]), { stiffness: 120, damping: 20 });
  const rotX = useSpring(useTransform(my, [0, 1], [10, -10]), { stiffness: 120, damping: 20 });

  function track(e) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.setProperty("--mx", `${px * 100}%`);
    el.style.setProperty("--my", `${py * 100}%`);
    if (!still) {
      mx.set(px);
      my.set(py);
    }
  }

  return (
    <section ref={ref} className="h-hero" onMouseMove={track}>
      <div className="h-aurora" aria-hidden="true">
        <i className="a1" />
        <i className="a2" />
        <i className="a3" />
      </div>
      <div className="h-grid" aria-hidden="true" />
      <div className="h-spot" aria-hidden="true" />

      <div className="h-inner">
        <div className="h-copy">
          <motion.span
            className="eyebrow"
            initial={still ? false : { opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <i className="live-dot" /> Now enrolling creators · Free
          </motion.span>

          <h1 className="h-title">
            <span className="sr-only">{TAGLINE}</span>
            <SplitWords text="Connect to" delay={0.15} />
            <RotatingWord still={still} />
            <SplitWords text="directly." delay={0.45} className="h-light" />
          </h1>

          <motion.p
            className="h-sub"
            initial={still ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75, duration: 0.7, ease: EASE }}
          >
            Link your Instagram, Facebook and YouTube once. We show you only the
            brand ads that fit your follower count, so every pitch is one you can win.
          </motion.p>

          <motion.div
            className="h-ctas"
            initial={still ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.7, ease: EASE }}
          >
            <Magnetic href="/auth" className="btn btn-pink btn-shine">
              Get started free
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Magnetic>
            <Link href="#how" className="btn btn-outline">
              See how it works
            </Link>
          </motion.div>

          <motion.ul
            className="h-platforms"
            initial={still ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.15, duration: 0.6 }}
          >
            <li><span className="social-badge sb-instagram">I</span>Instagram</li>
            <li><span className="social-badge sb-facebook">F</span>Facebook</li>
            <li><span className="social-badge sb-youtube">Y</span>YouTube</li>
          </motion.ul>
        </div>

        <motion.div
          className="h-visual"
          style={{ rotateX: rotX, rotateY: rotY }}
          initial={still ? false : { opacity: 0, scale: 0.85, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 1, ease: EASE }}
        >
          <PhoneDemo still={still} />
        </motion.div>
      </div>

      <motion.a
        href="#how"
        className="scroll-cue"
        aria-label="Scroll down"
        initial={still ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6 }}
      >
        <span />
      </motion.a>
    </section>
  );
}
