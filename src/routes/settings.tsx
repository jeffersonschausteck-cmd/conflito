import { createFileRoute } from "@tanstack/react-router";
import { ScreenShell } from "@/components/ScreenShell";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — Shadow Command" }] }),
  component: SettingsPage,
});

interface Row {
  label: string;
  value: number;
  toggle?: boolean;
}
const SECTIONS: Array<{ title: string; rows: Row[] }> = [
  {
    title: "Audio",
    rows: [
      { label: "Master Volume", value: 80 },
      { label: "Music", value: 60 },
      { label: "SFX", value: 80 },
    ],
  },
  {
    title: "Display",
    rows: [
      { label: "High Contrast", value: 0, toggle: true },
      { label: "Reduce Motion", value: 0, toggle: true },
    ],
  },
];

function SettingsPage() {
  return (
    <ScreenShell
      eyebrow="// SYSTEM"
      title="Settings"
      subtitle="Calibrate your interface."
      backTo="/"
      backLabel="← Home"
    >
      <div className="mx-auto grid max-w-2xl gap-6 text-left">
        {SECTIONS.map((s) => (
          <div
            key={s.title}
            className="border border-primary/30 bg-card/40 p-6"
            style={{
              clipPath:
                "polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)",
            }}
          >
            <h3 className="font-display text-xs uppercase tracking-[0.4em] text-primary">
              {s.title}
            </h3>
            <div className="mt-4 space-y-4">
              {s.rows.map((r) => (
                <div
                  key={r.label}
                  className="flex items-center justify-between gap-4"
                >
                  <span className="font-display text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    {r.label}
                  </span>
                  {r.toggle ? (
                    <div className="h-5 w-10 border border-primary/40 bg-primary/5">
                      <div className="h-full w-1/2 bg-primary/40" />
                    </div>
                  ) : (
                    <div className="relative h-1.5 w-48 bg-primary/10">
                      <div
                        className="absolute inset-y-0 left-0 bg-primary"
                        style={{
                          width: `${r.value}%`,
                          boxShadow: "0 0 10px var(--primary)",
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </ScreenShell>
  );
}
