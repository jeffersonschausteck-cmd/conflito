export function GameLogo() {
  return (
    <div className="flex flex-col items-center gap-4">
      {/* Emblem */}
      <div className="relative animate-pulse-glow">
        <svg
          width="120"
          height="120"
          viewBox="0 0 120 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-[0_0_24px_var(--primary)]"
          aria-hidden
        >
          <defs>
            <linearGradient id="logo-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--primary-glow)" />
              <stop offset="100%" stopColor="var(--primary)" />
            </linearGradient>
          </defs>
          {/* Outer hex */}
          <polygon
            points="60,6 108,33 108,87 60,114 12,87 12,33"
            stroke="url(#logo-grad)"
            strokeWidth="2"
            fill="none"
          />
          {/* Inner hex */}
          <polygon
            points="60,22 94,42 94,78 60,98 26,78 26,42"
            stroke="url(#logo-grad)"
            strokeWidth="1"
            fill="color-mix(in oklab, var(--primary) 8%, transparent)"
          />
          {/* Crosshair */}
          <line x1="60" y1="6" x2="60" y2="114" stroke="url(#logo-grad)" strokeWidth="0.5" opacity="0.5" />
          <line x1="12" y1="60" x2="108" y2="60" stroke="url(#logo-grad)" strokeWidth="0.5" opacity="0.5" />
          {/* Core */}
          <circle cx="60" cy="60" r="14" fill="url(#logo-grad)" />
          <circle cx="60" cy="60" r="6" fill="var(--background)" />
          <circle cx="60" cy="60" r="2.5" fill="url(#logo-grad)" />
        </svg>
      </div>

      {/* Wordmark */}
      <div className="text-center">
        <div className="font-display text-xs uppercase tracking-[0.6em] text-primary/70 animate-flicker">
          // Project
        </div>
        <h1 className="font-display text-5xl font-black uppercase tracking-[0.15em] text-foreground text-glow sm:text-6xl md:text-7xl">
          Shadow
          <span className="ml-3 bg-gradient-to-r from-primary-glow to-primary bg-clip-text text-transparent">
            Command
          </span>
        </h1>
      </div>
    </div>
  );
}
