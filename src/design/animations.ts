/**
 * Design System — Animations
 * Transition presets and reusable keyframe helpers for Shadow Command's UI.
 */
export const animations = {
  /** Duration presets (ms strings) */
  duration: {
    fast: "150ms",
    normal: "250ms",
    slow: "400ms",
  },

  /** Easing curves */
  easing: {
    easeOut: "ease-out",
    easeInOut: "ease-in-out",
    // Aliases
    standard: "ease-out",
    smooth: "ease-in-out",
    bounce: "cubic-bezier(0.175, 0.885, 0.32, 1.275)",
  },

  /**
   * Glow pulse — ready-to-use CSS animation shorthand string.
   * Pair with a @keyframes glowPulse defined in global CSS.
   *
   * Usage: element.style.animation = animations.glowPulse
   */
  glowPulse: "glowPulse 2s ease-in-out infinite",

  /** Convenience transition helper strings */
  transition: {
    fast: "all 150ms ease-out",
    normal: "all 250ms ease-out",
    slow: "all 400ms ease-in-out",
  },

  /** Tailwind animation class references (requires corresponding keyframes in CSS) */
  classes: {
    transition: "transition-all duration-200 ease-out",
    pulseGlow: "animate-pulse-glow",
    flicker: "animate-flicker",
    scanline: "relative before:absolute before:inset-0 before:bg-scanline before:pointer-events-none",
    glitch: "animate-glitch",
  },
};
