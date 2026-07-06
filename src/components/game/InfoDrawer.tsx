import { Modal } from "@/components/ui/Modal";
import { TacticalGuide } from "@/components/game/TacticalGuide";
import { RevealLogPanel } from "@/components/game/RevealLogPanel";

export interface InfoDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Agrupa o Guia Tático e o Registro de Inteligência num modal sob
 * demanda, para deixar o tabuleiro como foco principal da tela em vez
 * de ocupar uma coluna fixa (doc 11 — "o foco principal deverá
 * permanecer no tabuleiro"). Nenhum dos dois painéis muda de lógica.
 */
export function InfoDrawer({ isOpen, onClose }: InfoDrawerProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="CENTRAL DE INFORMAÇÕES" maxWidth="max-w-4xl">
      <div className="grid gap-6 sm:grid-cols-2">
        <TacticalGuide />
        <RevealLogPanel />
      </div>
    </Modal>
  );
}
