import { CommandCenter } from "./CommandCenter";
import { BattleStatus } from "./BattleStatus";
import { RevealLogPanel } from "./RevealLogPanel";

export function RightSidebar() {
    return (

        <aside
            className="
                grid
                h-full
                grid-cols-2
                gap-4
            "
        >

            {/* COLUNA ESQUERDA */}

            <div className="flex flex-col gap-4">

                <CommandCenter />

                <RevealLogPanel />

            </div>

            {/* COLUNA DIREITA */}

            <div className="flex flex-col gap-4">

                <BattleStatus />

            </div>

        </aside>

    );
}