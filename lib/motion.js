"use client";

import { useReducedMotion } from "framer-motion";

// Animations play for everyone, even if the computer has "reduce motion" /
// "animation effects" switched off (common on Windows laptops).
// Set this to true if you'd rather respect that setting and show a still page.
export const RESPECT_REDUCED_MOTION = false;

export function useStill() {
  const reduce = useReducedMotion();
  return RESPECT_REDUCED_MOTION ? Boolean(reduce) : false;
}
