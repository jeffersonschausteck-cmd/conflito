// ── Game-specific UI components ──────────────────────────────────────────────
export * from "./GameButton";
export * from "./GameCard";
export * from "./GamePanel";
export * from "./Modal";
export * from "./GameTooltip";   // custom futuristic tooltip
export * from "./StatusBadge";

// ── Extended game UI panels / decorators ─────────────────────────────────────
export * from "./PieceCard";
export * from "./GlowBorder";
export * from "./HUDPanel";

// NOTE: tooltip.tsx (shadcn/Radix) is NOT re-exported here because it conflicts
// with the game design system TooltipProps shape. Import it directly via:
// import { Tooltip, TooltipContent, ... } from "@/components/ui/tooltip"
