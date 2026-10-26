"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useStill } from "@/lib/motion";
import { APP_NAME } from "@/lib/config";
import Reveal from "./Reveal";

const SPARKS = [
  { l: "8%", t: "20%", d: 0 },
  { l: "18%", t: "78%", d: 0.8 },
  { l: "88%", t: "18%", d: 0.4 },
  { l: "82%", t: "74%", d: 1.2 },
  { l: "50%", t: "8%", d: 1.6 },
  { l: "64%", t: "90%", d: 2 },
];

export function FinalCta() {
  const still = useStill();
  return (
    <section id="pricing" className="cta-wrap">
      <Reveal className="cta">
        <div className="cta-inner">
          {!still &&
            SPARKS.map((s, i) => (
              <motion.i
                key={i}
                className="spark"
                style={{ left: s.l, top: s.t }}
                animate={{ scale: [0, 1, 0], opacity: [0, 1, 0], rotate: [0, 90] }}
                transition={{ duration: 2.4, delay: s.d, repeat: Infinity, ease: "easeInOut" }}
                aria-hidden="true"
              />
            ))}
          <span className="kicker">Pricing</span>
          <h2>
            Free to start. <span className="grad-text">Free to stay.</span>
          </h2>
          <p>
            Creating an account, enrolling and seeing matched brand ads costs
            nothing.
          </p>
          <Link href="/auth" className="btn btn-light">
            Create my free account
          </Link>
        </div>
      </Reveal>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="foot">
      <span className="grad-text foot-brand">{APP_NAME}</span>
      <nav aria-label="Footer">
        <a href="#how">How it works</a>
        <a href="#pricing">Pricing</a>
        <Link href="/auth?mode=login">Log in</Link>
      </nav>
      <small>© {new Date().getFullYear()} {APP_NAME}</small>
    </footer>
  );
}
