import { ParticleField } from "./ParticleField";

export function CyberBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Deep gradient base */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, color-mix(in oklab, var(--primary) 22%, transparent), transparent 70%), radial-gradient(ellipse 60% 50% at 50% 100%, color-mix(in oklab, var(--accent) 12%, transparent), transparent 70%)",
        }}
      />
      {/* Animated grid */}
      <div className="cyber-grid absolute inset-0 opacity-60" />
      {/* Particles */}
      <ParticleField />
      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 50%, var(--background) 100%)",
        }}
      />
      {/* Scanline subtle */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(255,255,255,0.6) 0 1px, transparent 1px 3px)",
        }}
      />
    </div>
  );
}
