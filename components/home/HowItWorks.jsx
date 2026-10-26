"use client";

import { useRef } from "react";
import { motion, useScroll, useSpring } from "framer-motion";
import { useStill } from "@/lib/motion";
import Reveal, { EASE } from "./Reveal";

const STEPS = [
  {
    n: "01",
    title: "Sign up in a minute",
    body: "Email and password, then a short enrolment: your name, city and the niches you create in.",
    tone: "pink",
  },
  {
    n: "02",
    title: "Add your socials",
    body: "Instagram, Facebook and YouTube. We read your follower counts and place you in a tier.",
    tone: "violet",
  },
  {
    n: "03",
    title: "Get ads that fit",
    body: "Our team posts brand campaigns with a follower range. You only see the ones you qualify for.",
    tone: "mint",
  },
];

export default function HowItWorks() {
  const still = useStill();
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 75%", "end 55%"] });
  const grow = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });

  return (
    <section id="how" className="how">
      <Reveal className="sec-head">
        <span className="kicker">How it works</span>
        <h2>
          Three steps from <span className="grad-text">sign-up to sponsor.</span>
        </h2>
      </Reveal>

      <div ref={ref} className="tl">
        <div className="tl-rail" aria-hidden="true">
          <motion.i style={{ scaleY: still ? 1 : grow }} />
        </div>
        <ol className="tl-list">
          {STEPS.map((s, i) => (
            <motion.li
              key={s.n}
              className={`tl-item ${i % 2 ? "right" : "left"}`}
              initial={still ? false : { opacity: 0, x: i % 2 ? 60 : -60 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.8, ease: EASE }}
            >
              <span className={`tl-dot tone-${s.tone}`}>{s.n}</span>
              <div className="tl-card">
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </div>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}
