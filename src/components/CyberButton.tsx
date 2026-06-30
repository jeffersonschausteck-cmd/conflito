import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export const CyberButton = forwardRef<HTMLButtonElement, Props>(
  ({ className, variant = "primary", children, ...props }, ref) => {
    const base =
      "group relative inline-flex h-12 min-w-[200px] items-center justify-center px-8 font-display text-sm uppercase tracking-[0.25em] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50";

    const variants: Record<Variant, string> = {
      primary:
        "text-primary-foreground hover:scale-[1.02] active:scale-[0.99]",
      secondary:
        "border border-primary/40 bg-primary/5 text-foreground hover:border-primary hover:bg-primary/10 hover:text-primary-foreground hover:scale-[1.02]",
      ghost:
        "border border-border/60 bg-transparent text-muted-foreground hover:border-primary/60 hover:text-foreground",
    };

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], className)}
        style={
          variant === "primary"
            ? {
                background:
                  "linear-gradient(135deg, var(--primary), var(--primary-glow))",
                boxShadow:
                  "0 0 0 1px color-mix(in oklab, var(--primary) 60%, transparent), 0 10px 40px -10px color-mix(in oklab, var(--primary) 70%, transparent)",
                clipPath:
                  "polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)",
              }
            : {
                clipPath:
                  "polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)",
              }
        }
        {...props}
      >
        <span className="relative z-10 flex items-center gap-2">{children}</span>
        {variant === "primary" && (
          <span
            aria-hidden
            className="absolute inset-0 -z-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{
              background:
                "linear-gradient(135deg, var(--primary-glow), var(--primary))",
            }}
          />
        )}
      </button>
    );
  },
);
CyberButton.displayName = "CyberButton";
