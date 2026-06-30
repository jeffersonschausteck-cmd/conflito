export function StatusBar() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between px-6 py-4 font-display text-[10px] uppercase tracking-[0.3em] text-muted-foreground sm:px-10">
      <div className="flex items-center gap-3">
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary shadow-[0_0_10px_var(--primary)]" />
        <span>NET // SECURE</span>
      </div>
      <div className="hidden items-center gap-6 sm:flex">
        <span>BUILD 0.1.0-ALPHA</span>
        <span>REGION: AURORA-7</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-primary">◆</span>
        <span>OPERATOR</span>
      </div>
    </div>
  );
}

export function StatusFooter() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-center justify-between px-6 py-4 font-display text-[10px] uppercase tracking-[0.3em] text-muted-foreground sm:px-10">
      <span>© 2049 SHADOWNET INDUSTRIES</span>
      <span className="hidden sm:inline">PRESS [ANY KEY] TO INITIATE</span>
      <span>V0.1.0</span>
    </div>
  );
}
