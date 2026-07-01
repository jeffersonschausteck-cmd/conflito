/**
 * Design System — Shadows
 * Neon glow and ambient drop-shadow strings for Shadow Command's UI.
 */
export const shadows = {
  /** Neon glow — Blue */
  blueGlow: "0 0 15px rgba(0, 212, 255, 0.35), 0 0 30px rgba(0, 212, 255, 0.15)",
  blueGlowStrong: "0 0 30px rgba(0, 212, 255, 0.6)",

  /** Neon glow — Red */
  redGlow: "0 0 15px rgba(255, 75, 92, 0.35), 0 0 30px rgba(255, 75, 92, 0.15)",
  redGlowStrong: "0 0 30px rgba(255, 75, 92, 0.6)",

  /** Neon glow — Green */
  green: "0 0 15px rgba(44, 234, 163, 0.35)",
  greenStrong: "0 0 30px rgba(44, 234, 163, 0.6)",

  /** Neon glow — Yellow */
  yellow: "0 0 15px rgba(255, 200, 87, 0.35)",
  yellowStrong: "0 0 30px rgba(255, 200, 87, 0.6)",

  // Shorthand aliases to match old keys
  blue: "0 0 15px rgba(0, 212, 255, 0.35)",
  blueStrong: "0 0 30px rgba(0, 212, 255, 0.6)",
  red: "0 0 15px rgba(255, 75, 92, 0.35)",
  redStrong: "0 0 30px rgba(255, 75, 92, 0.6)",

  /** Text glow helpers */
  textGlowBlue: "0 0 8px rgba(0, 212, 255, 0.5)",
  textGlowRed: "0 0 8px rgba(255, 75, 92, 0.5)",

  /** Panel depth shadow */
  panelShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3)",

  /** Soft ambient shadow for subtle depth */
  softAmbient: "0 2px 12px rgba(0, 0, 0, 0.4)",
};
