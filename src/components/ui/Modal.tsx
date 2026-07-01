import React, { ReactNode, useEffect } from "react";
import { cn } from "@/lib/utils";
import { theme } from "@/design/theme";
import { GameButton } from "./GameButton";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Heading shown in the modal header bar */
  title?: string;
  /** Optional footer slot — replaces the default Close button when provided */
  footer?: ReactNode;
  /** Modal body content */
  children: ReactNode;
  className?: string;
  /** Maximum width (Tailwind class, e.g. "max-w-lg") */
  maxWidth?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function Modal({
  isOpen,
  onClose,
  title,
  footer,
  children,
  className,
  maxWidth = "max-w-lg",
}: ModalProps) {
  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* ── Backdrop ─────────────────────────────────────────────────────── */}
      <div
        onClick={onClose}
        className="absolute inset-0 backdrop-blur-[4px] transition-opacity duration-300"
        style={{ backgroundColor: theme.colors.overlayBg }}
        aria-hidden="true"
      />

      {/* ── Dialog ───────────────────────────────────────────────────────── */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-title" : undefined}
        className={cn(
          "relative z-10 w-full border text-left",
          "border-game-blue/40 bg-game-panel",
          maxWidth,
          className
        )}
        style={{
          padding: theme.spacing[24],          // 1.5rem = 24px
          clipPath:
            "polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px)",
          boxShadow: theme.shadows.blueGlowStrong,
          animation: `modal-scale-in ${theme.animations.duration.normal} ${theme.animations.easing.bounce} forwards`,
        }}
      >
        {/* Inline keyframe — scoped, does not pollute global CSS */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              @keyframes modal-scale-in {
                0%   { opacity: 0; transform: scale(0.92); }
                100% { opacity: 1; transform: scale(1); }
              }
            `,
          }}
        />

        {/* Corner accents */}
        <div
          aria-hidden="true"
          className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-game-blue"
        />
        <div
          aria-hidden="true"
          className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-game-blue"
        />

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div className="flex justify-between items-center border-b border-border/40 pb-3 mb-4">
          {title ? (
            <h2
              id="modal-title"
              className="font-display text-base font-bold uppercase tracking-[0.18em] text-game-blue"
            >
              {title}
            </h2>
          ) : (
            <span />
          )}
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-game-red transition-colors font-display text-sm tracking-[0.2em] uppercase font-bold"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* ── Body ─────────────────────────────────────────────────────────── */}
        <div
          className="text-sm leading-relaxed mb-6"
          style={{ color: theme.colors.textPrimary }}
        >
          {children}
        </div>

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <div className="flex justify-end gap-3">
          {footer ?? (
            <GameButton variant="secondary" size="sm" onClick={onClose}>
              Close
            </GameButton>
          )}
        </div>
      </div>
    </div>
  );
}
