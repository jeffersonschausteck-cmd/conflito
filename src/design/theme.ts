import { colors } from "./colors";
import { typography } from "./typography";
import { spacing } from "./spacing";
import { animations } from "./animations";
import { shadows } from "./shadows";

/**
 * Main Design System Theme Export
 */
export const theme = {
  colors,
  typography,
  spacing,
  animations,
  shadows,
};

export type Theme = typeof theme;
