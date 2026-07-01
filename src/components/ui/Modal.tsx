import { ReactNode, useEffect } from "react";
import { cn } from "@/lib/utils";
import { GameButton } from "./GameButton";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  className,
}: ModalProps) {
  // Prevent scrolling behind the modal when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-game-bg/85 backdrop-blur-[4px] transition-opacity duration-300"
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative z-10 w-full max-w-lg border border-game-blue/40 bg-game-panel p-6 shadow-[0_0_50px_rgba(0,212,255,0.25)] text-left transition-all duration-300",
          className
        )}
        style={{
          clipPath: "polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px)",
          animation: "modal-scale-in 250ms cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards",
        }}
      >
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes modal-scale-in {
            0% { opacity: 0; transform: scale(0.92); }
            100% { opacity: 1; transform: scale(1); }
          }
        `}} />

        {/* Tactical corners */}
        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-game-blue" />
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-game-blue" />

        {/* Header */}
        <div className="flex justify-between items-center border-b border-border/40 pb-3 mb-4">
          {title && (
            <h2 className="font-display text-base font-bold uppercase tracking-[0.18em] text-game-blue">
              {title}
            </h2>
          )}
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-game-red transition-colors font-display text-sm tracking-[0.2em] uppercase font-bold"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="text-sm leading-relaxed text-game-text mb-6">
          {children}
        </div>

        {/* Footer actions */}
        <div className="flex justify-end gap-3">
          <GameButton variant="secondary" size="sm" onClick={onClose}>
            Close
          </GameButton>
        </div>
      </div>
    </div>
  );
}
