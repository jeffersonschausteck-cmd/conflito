/**
 * Design System - Animations
 * Defines transition speeds and reusable keyframe animation properties.
 */
export const animations = {
  duration: {
    fast: "150ms",
    normal: "250ms",
    slow: "350ms",
  },
  easing: {
    standard: "ease-out",
    smooth: "ease-in-out",
    bounce: "cubic-bezier(0.175, 0.885, 0.32, 1.275)",
  },
  classes: {
    transition: "transition-all duration-200 ease-out",
    pulseGlow: "animate-pulse-glow",
    flicker: "animate-flicker",
    scanline: "relative before:absolute before:inset-0 before:bg-scanline before:pointer-events-none",
    glitch: "animate-glitch",
  },
};
