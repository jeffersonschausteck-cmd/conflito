import { cn } from "@/lib/utils";

/**
 * Cabeçalho único de todos os cartões e painéis de menu (docs/08-Interface.md, "Estilo dos Menus"):
 * uma linha pequena em cima (tipo ou seção) e o nome grande em destaque, sempre com a mesma fonte,
 * tamanho e cor, e a barrinha dourada embaixo. Usado pelos cartões do Centro de Operações e da escolha
 * de modo e pelo cabeçalho de todo `GamePanel`.
 */
const clean = (t: string) => t.replace(/^\/\/\s*/, "");

export function MenuTitle({ eyebrow, title, className }: { eyebrow?: string; title?: string; className?: string }) {
  if (!eyebrow && !title) return null;
  return (
    <div className={cn("text-left", className)}>
      {eyebrow && (
        <div className="font-display text-[10px] font-bold uppercase tracking-[0.35em] text-amber-200/80 [@media(min-height:480px)]:text-xs">
          {clean(eyebrow)}
        </div>
      )}
      {title && (
        <>
          <h3 className="mt-1 font-display text-[clamp(1.25rem,2.4vw,1.9rem)] font-black uppercase leading-none tracking-[0.06em] text-amber-100 [text-shadow:0_0_14px_rgba(251,191,36,0.55),0_2px_0_rgba(0,0,0,0.65)]">
            {clean(title)}
          </h3>
          <div className="mt-1 h-[3px] w-14 rounded bg-gradient-to-r from-amber-300 to-transparent" />
        </>
      )}
    </div>
  );
}
