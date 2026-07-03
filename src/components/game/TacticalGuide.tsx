import { GamePanel } from "@/components/ui/GamePanel";

export function TacticalGuide() {
    return (
        <GamePanel
            variant="default"
            className="h-full"
        >

            <h2 className="mb-3 text-center text-lg font-bold uppercase tracking-[0.35em] text-cyan-300">
                GUIA TÁTICO
            </h2>

            <div className="space-y-3 text-[13px]">

                {/* Objetivo */}
                <section>

                    <h3 className="mb-2 font-bold uppercase tracking-wider text-cyan-300">
                        🎯 Objetivo
                    </h3>

                    <p className="leading-5 text-slate-300">
                        Capture a <strong>Bandeira</strong> inimiga para vencer a partida.
                    </p>

                </section>

                <div className="border-b border-cyan-500/20" />

                {/* Movimento */}

                <section>

                    <h3 className="mb-2 font-bold uppercase tracking-wider text-cyan-300">
                        🚶 Movimento
                    </h3>

                    <ul className="space-y-0.5 text-slate-300">

                        <li>• Todas as unidades movem 1 casa.</li>

                        <li>• O Batedor move várias casas em linha reta.</li>

                        <li>• Bomba e Bandeira não se movem.</li>

                    </ul>

                </section>

                <div className="border-b border-cyan-500/20" />

                {/* Combate */}

                <section>

                    <h3 className="mb-2 font-bold uppercase tracking-wider text-cyan-300">
                        ⚔ Combate
                    </h3>

                    <ul className="space-y-1 text-slate-300">

                        <li>• Maior patente vence.</li>

                        <li>• Patentes iguais eliminam ambas.</li>

                        <li>• O Espião elimina o Comandante se atacar primeiro.</li>

                        <li>• O Engenheiro desarma Bombas.</li>

                    </ul>

                </section>

                <div className="border-b border-cyan-500/20" />

                {/* Fog */}

                <section>

                    <h3 className="mb-2 font-bold uppercase tracking-wider text-cyan-300">
                        👁 Inteligência
                    </h3>

                    <p className="leading-6 text-slate-300">
                        As unidades inimigas permanecem ocultas até entrarem em combate.
                    </p>

                </section>

            </div>

        </GamePanel>
    );
}