import { createFileRoute } from "@tanstack/react-router";
import { Board } from "@/components/Board";
import { CyberBackground } from "@/components/CyberBackground";

export const Route = createFileRoute("/game")({
  head: () => ({
    meta: [
      { title: "Shadow Command — Tactical Grid" },
      {
        name: "description",
        content:
          "10x10 tactical grid for Project Shadow Command. Engine preview.",
      },
    ],
  }),
  component: GamePage,
});

function GamePage() {
  return (
    <main className="relative min-h-screen w-full overflow-hidden text-cyan-100">
      <CyberBackground />
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-10">
        <header className="text-center">
          <p className="text-xs tracking-[0.4em] text-cyan-300/70">
            TACTICAL GRID // 10 × 10
          </p>
          <h1 className="mt-1 font-[Orbitron,sans-serif] text-2xl md:text-3xl text-cyan-200">
            Operations Board
          </h1>
        </header>
        <Board />
        <p className="text-xs text-cyan-200/50">
          Engine preview. No pieces, no rules — selection only.
        </p>
      </div>
    </main>
  );
}
