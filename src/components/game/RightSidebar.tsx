import { CommandCenter } from "./CommandCenter";
import { RevealLogPanel } from "./RevealLogPanel";
import { TacticalGuide } from "./TacticalGuide";

export function RightSidebar() {
    return (
        <aside
            className="
                flex
                h-full
                w-[340px]
                shrink-0
                flex-col
                gap-5
            "
        >
            {/* CENTRO DE COMANDO */}
            <div className="flex-[1.2] min-h-0">
                <CommandCenter />
            </div>

            {/* REGISTRO DE INTELIGÊNCIA */}
            <div className="flex-1 min-h-0 overflow-hidden">
                <RevealLogPanel />
            </div>

            {/* GUIA TÁTICO */}
            <div className="flex-1 min-h-0 overflow-hidden">
                <TacticalGuide />
            </div>

        </aside>
    );
}