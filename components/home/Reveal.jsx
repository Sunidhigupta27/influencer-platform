"use client";

import { motion } from "framer-motion";
import { useStill } from "@/lib/motion";

export const EASE = [0.22, 1, 0.36, 1];

/* Fades + lifts its children into view once, when scrolled to. */
export default function Reveal({ children, delay = 0, y = 32, className, as = "div", ...rest }) {
  const still = useStill();
  const M = motion[as];
  return (
    <M
      className={className}
      initial={still ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.8, delay, ease: EASE }}
      {...rest}
    >
      {children}
    </M>
  );
}

/* Splits text into words that rise up one after another. */
export function SplitWords({ text, delay = 0, className = "" }) {
  const still = useStill();
  return (
    <span className={`split ${className}`} aria-hidden="true">
      {text.split(" ").map((w, i) => (
        <span key={i} className="split-mask">
          <motion.span
            className="split-word"
            initial={still ? false : { y: "110%", rotate: 6 }}
            animate={{ y: "0%", rotate: 0 }}
            transition={{ delay: delay + i * 0.08, duration: 0.9, ease: EASE }}
          >
            {w}
          </motion.span>
        </span>
      ))}
    </span>
  );
}
