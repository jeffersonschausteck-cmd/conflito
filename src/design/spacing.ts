/**
 * Design System — Spacing
 * Pixel-based scale exported as rem values.
 * Keys match the px value for easy reference: spacing[8] → "0.5rem" (8px).
 */
export const spacing = {
  2: "0.125rem",   //  2px
  4: "0.25rem",    //  4px
  8: "0.5rem",     //  8px
  12: "0.75rem",   // 12px
  16: "1rem",      // 16px
  24: "1.5rem",    // 24px
  32: "2rem",      // 32px
  48: "3rem",      // 48px
  64: "4rem",      // 64px

  // Semantic aliases for ergonomic usage
  xs: "0.25rem",   //  4px
  sm: "0.5rem",    //  8px
  md: "0.75rem",   // 12px
  base: "1rem",    // 16px
  lg: "1.25rem",   // 20px
  xl: "1.5rem",    // 24px
  xxl: "2rem",     // 32px

  layout: {
    padding: "1.5rem",
    gap: "1rem",
    maxWidth: "80rem", // 1280px
  },
};
