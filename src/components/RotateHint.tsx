import { useDeviceMode } from "@/components/kay/BoardWorld";

/** Celular em pé: o jogo é feito para jogar deitado. Cobre a tela com um pedido para girar o aparelho. */
export function RotateHint() {
  const { touch, portrait } = useDeviceMode();
  if (!touch || !portrait) return null;
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-5 bg-slate-950/95 px-8 text-center">
      <div className="text-6xl [animation:spin_3s_ease-in-out_infinite]" aria-hidden="true">
        📱
      </div>
      <div className="font-display text-xl font-black uppercase tracking-[0.14em] text-white">Gire o celular</div>
      <p className="max-w-xs font-display text-[11px] uppercase tracking-[0.2em] text-sky-100">O Conflito é jogado com o aparelho deitado.</p>
    </div>
  );
}
