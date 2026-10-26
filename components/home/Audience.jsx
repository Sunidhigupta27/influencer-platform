"use client";

import Link from "next/link";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import { useStill } from "@/lib/motion";
import Reveal from "./Reveal";

function TiltCard({ className, children }) {
  const still = useStill();
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rx = useSpring(useTransform(py, [0, 1], [8, -8]), { stiffness: 200, damping: 20 });
  const ry = useSpring(useTransform(px, [0, 1], [-10, 10]), { stiffness: 200, damping: 20 });
  const gx = useTransform(px, (v) => `${v * 100}%`);
  const gy = useTransform(py, (v) => `${v * 100}%`);
  const glare = useMotionTemplate`radial-gradient(circle at ${gx} ${gy}, rgba(255,255,255,0.28), transparent 45%)`;

  return (
    <motion.div
      className={`tilt ${className}`}
      style={still ? undefined : { rotateX: rx, rotateY: ry }}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        px.set((e.clientX - r.left) / r.width);
        py.set((e.clientY - r.top) / r.height);
      }}
      onMouseLeave={() => {
        px.set(0.5);
        py.set(0.5);
      }}
    >
      {!still && <motion.span className="tilt-glare" style={{ background: glare }} aria-hidden="true" />}
      {children}
    </motion.div>
  );
}

export default function Audience() {
  return (
    <section className="aud">
      <Reveal className="aud-col">
        <TiltCard className="aud-creator">
          <span className="aud-tag">For creators</span>
          <h3>Stop pitching blind.</h3>
          <ul>
            <li>One profile for all three platforms</li>
            <li>See only ads you qualify for</li>
            <li>Your tier grows as your audience does</li>
          </ul>
          <Link href="/auth" className="aud-link">
            Join as a creator →
          </Link>
        </TiltCard>
      </Reveal>
      <Reveal className="aud-col" delay={0.15}>
        <TiltCard className="aud-brand">
          <span className="aud-tag">From our team</span>
          <h3>Ads and videos, hand-picked.</h3>
          <ul>
            <li>Our team posts every ad and video</li>
            <li>Each one has a clear brief and budget</li>
            <li>Filter by follower range and platform</li>
          </ul>
          <Link href="/#video" className="aud-link">
            Watch how it works →
          </Link>
        </TiltCard>
      </Reveal>
    </section>
  );
}
