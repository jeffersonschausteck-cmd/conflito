/**
 * Design System — Typography
 * Fonts, sizes, weights, and letter-spacing for Shadow Command's futuristic UI.
 */
export const typography = {
  fonts: {
    primary: '"Orbitron", "Inter", sans-serif',
    fallback: '"Inter", sans-serif',
  },

  /** Named scale (xs → xl) matching the design spec */
  sizes: {
    xs: "0.75rem",    // 12px
    sm: "0.875rem",   // 14px
    md: "1rem",       // 16px
    lg: "1.125rem",   // 18px
    xl: "1.25rem",    // 20px
    // Extended heading scale kept for convenience
    h3: "1.5rem",     // 24px
    h2: "1.875rem",   // 30px
    h1: "2.25rem",    // 36px
    huge: "3.75rem",  // 60px
  },

  weights: {
    light: "300",
    normal: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
    black: "900",
  },

  /** Futuristic letter-spacing presets */
  letterSpacing: {
    tight: "-0.02em",
    normal: "0em",
    wide: "0.05em",
    widest: "0.15em",
    cyber: "0.3em",
    cyberWide: "0.4em",
  },
};
