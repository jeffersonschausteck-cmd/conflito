/**
 * Oficina do Exército — tela do menu onde o jogador monta o visual dos personagens e SALVA.
 * O visual salvo é o que as partidas usam. Não se altera durante a partida.
 * Só aparência: não muda força, movimento nem regras.
 */
import { Suspense, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { PIECES } from "@/config/pieces";
import {
  DEFAULT_SKINS,
  PieceSkins,
  SKINNABLE_PIECES,
  SKIN_COLORS,
  SKIN_PRESETS,
  randomSkins,
  SKIN_HATS,
  SKIN_MODELS,
  SKIN_SHIELDS,
  SKIN_WEAPONS,
  colorHex,
  modelInfo,
  sanitizeSkins,
  useSkins,
  type PieceSkin,
  type SkinTable,
  type SkinnablePiece,
} from "@/config/pieceSkins";
import { KayCharacter, SpinGroup, skinScale } from "./KayCharacters";

/** Prévia 3D do personagem: gira devagar sobre a base do time. */
function Preview({ type, skin }: { type: SkinnablePiece; skin: PieceSkin }) {
  return (
    <Canvas shadows camera={{ position: [0, 1.4, 5.6], fov: 34 }} gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.95 }}>
      <hemisphereLight args={["#dbe9ff", "#4c6b3a", 0.9]} />
      <directionalLight position={[3, 5, 4]} intensity={1.8} color="#ffe2b8" castShadow />
      <Suspense fallback={null}>
        <SpinGroup speed={0.6}>
          <group position={[0, -0.95, 0]}>
            <mesh position={[0, 0.03, 0]} receiveShadow>
              <cylinderGeometry args={[0.8, 0.86, 0.07, 6]} />
              <meshStandardMaterial color="#22d3ee" roughness={0.5} />
            </mesh>
            <KayCharacter
              file={skin.model}
              rotY={0}
              scale={skinScale(type, skin.model)}
              pieceType={type}
              owner="blue"
              accent={colorHex(skin.color)}
              hat={skin.hat}
              weapon={skin.weapon}
              shield={skin.shield}
            />
          </group>
        </SpinGroup>
      </Suspense>
    </Canvas>
  );
}

const same = (a: SkinTable, b: SkinTable) => JSON.stringify(a) === JSON.stringify(b);

export function OficinaScreen() {
  // Só monta no cliente: lê o armazenamento do navegador e usa WebGL.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="min-h-screen bg-slate-950" />;
  return <OficinaEditor />;
}

function OficinaEditor() {
  const saved = useSkins();
  // Rascunho: o jogador mexe à vontade; só "Salvar" muda o que as partidas usam.
  const [draft, setDraft] = useState<SkinTable>(() => PieceSkins.get());
  const [type, setType] = useState<SkinnablePiece>("infantry");
  const [justSaved, setJustSaved] = useState(false);

  const dirty = !same(draft, saved);
  const skin = draft[type];
  const info = PIECES[type];

  const patch = (p: Partial<PieceSkin>) => {
    setJustSaved(false);
    setDraft((d) => sanitizeSkins({ ...d, [type]: { ...d[type], ...p } }));
  };

  const save = () => {
    PieceSkins.save(draft);
    setJustSaved(true);
  };

  const chip = (active: boolean) =>
    `rounded border px-2 py-1 ${active ? "border-amber-300 bg-amber-400/15 text-white" : "border-cyan-400/20 bg-slate-950/50 text-slate-300 hover:border-cyan-300/60"}`;

  return (
    <main className="flex min-h-screen flex-col bg-gradient-to-b from-[#16264a] via-[#0f1b36] to-[#0b1220] text-slate-100">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-400/25 bg-slate-950/60 px-4 py-3 backdrop-blur-sm">
        <div>
          <div className="relative inline-block px-6"><span className="absolute inset-x-0 top-1/2 h-[46%] -translate-y-1/2 bg-gradient-to-r from-rose-700 via-slate-900 to-sky-700 opacity-90 [clip-path:polygon(0_0,100%_0,97%_50%,100%_100%,0_100%,3%_50%)]" /><h1 className="relative font-display text-xl font-black uppercase tracking-[0.14em] text-white [-webkit-text-stroke:1px_rgba(10,20,40,0.7)] [text-shadow:0_2px_0_rgba(0,0,0,0.55)]">Oficina do Exército</h1></div>
          <p className="text-[11px] text-slate-400">Monte o visual das suas peças e salve. Só aparência: não muda força, movimento nem regras. Não dá para mudar durante a partida.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-widest text-slate-400">{dirty ? "Alterações não salvas" : justSaved ? "Salvo" : "Tudo salvo"}</span>
          <button
            disabled={!dirty}
            onClick={() => {
              setDraft(saved);
              setJustSaved(false);
            }}
            className="rounded border border-white/20 px-3 py-1.5 text-xs uppercase tracking-widest enabled:hover:bg-white/10 disabled:opacity-40"
          >
            Descartar
          </button>
          <button
            disabled={!dirty}
            onClick={save}
            className="rounded border border-amber-300 bg-gradient-to-b from-amber-500 to-amber-700 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-white enabled:hover:brightness-110 disabled:opacity-40"
          >
            Salvar
          </button>
          <Link to="/mode" className="rounded border border-cyan-400/50 bg-slate-950/70 px-3 py-1.5 text-xs uppercase tracking-widest text-sky-100 hover:border-cyan-300">
            Voltar ao Centro de Operações
          </Link>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 p-3 md:grid-cols-[180px_1fr_300px]">
        <div className="flex flex-row flex-wrap gap-1.5 md:flex-col">
          {SKINNABLE_PIECES.map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`flex items-center justify-between gap-2 rounded border px-2 py-2 text-left text-xs uppercase tracking-wider ${t === type ? "border-amber-300 bg-white/10" : "border-white/10 hover:bg-white/5"}`}
            >
              <span>{PIECES[t].nome}</span>
              <span className="text-slate-400">{PIECES[t].patente}</span>
            </button>
          ))}
          <div className="mt-2 text-[10px] uppercase tracking-widest text-slate-400">Conjuntos prontos</div>
          {SKIN_PRESETS.map((pr) => (
            <button
              key={pr.id}
              onClick={() => {
                setDraft(pr.skins);
                setJustSaved(false);
              }}
              className="rounded border border-white/15 px-2 py-2 text-left text-xs uppercase tracking-wider hover:bg-white/10"
            >
              {pr.label}
            </button>
          ))}
          <button
            onClick={() => {
              setDraft(randomSkins());
              setJustSaved(false);
            }}
            className="rounded border border-white/15 px-2 py-2 text-left text-xs uppercase tracking-wider hover:bg-white/10"
          >
            🎲 Aleatório
          </button>
          <button
            onClick={() => {
              setDraft(sanitizeSkins(DEFAULT_SKINS));
              setJustSaved(false);
            }}
            className="rounded border border-white/20 px-2 py-2 text-xs uppercase tracking-widest hover:bg-white/10"
          >
            Restaurar padrão
          </button>
        </div>

        <div className="relative h-[55vh] min-h-[280px] rounded border border-white/10 bg-gradient-to-b from-sky-900/40 to-emerald-950/60 md:h-auto">
          <Preview type={type} skin={skin} />
          <div className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-xs uppercase tracking-[0.2em] text-slate-200">
            {info.nome} · Força {info.patente} · {modelInfo(skin.model)?.label}
          </div>
        </div>

        <div className="flex flex-col gap-3 overflow-y-auto text-xs">
          <section>
            <div className="mb-1 uppercase tracking-widest text-slate-400">Modelo</div>
            <div className="flex flex-wrap gap-1.5">
              {SKIN_MODELS.map((m) => (
                <button key={m.id} onClick={() => patch({ model: m.id })} title={m.pack} className={chip(m.id === skin.model)}>
                  {m.label}
                </button>
              ))}
            </div>
          </section>
          <section>
            <div className="mb-1 uppercase tracking-widest text-slate-400">Cor da roupa</div>
            {type === "spy" ? (
              <div className="text-slate-400">O Espião é sempre todo preto.</div>
            ) : (
              <>
                <div className="flex flex-wrap gap-1.5">
                  {SKIN_COLORS.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => patch({ color: c.id })}
                      title={c.label}
                      className={`h-7 min-w-7 rounded border-2 px-1 text-[10px] font-bold uppercase ${c.id === skin.color ? "border-amber-300" : "border-white/20"}`}
                      style={{ background: c.hex ?? "linear-gradient(90deg,#2f6fe0 50%,#d8353a 50%)", color: "#fff" }}
                    >
                      {c.hex ? "" : "T"}
                    </button>
                  ))}
                </div>
                <div className="mt-1 text-[10px] text-slate-500">T = cor do time. A cor só muda a roupa principal do modelo.</div>
              </>
            )}
          </section>
          {(
            [
              ["Chapéu", "hat", SKIN_HATS, skin.hat],
              ["Arma (mão direita)", "weapon", SKIN_WEAPONS, skin.weapon],
              ["Escudo (mão esquerda)", "shield", SKIN_SHIELDS, skin.shield],
            ] as const
          ).map(([title, slot, list, current]) => (
            <section key={slot}>
              <div className="mb-1 uppercase tracking-widest text-slate-400">{title}</div>
              <div className="flex flex-wrap gap-1.5">
                {list.map((o) => (
                  <button key={o.id} onClick={() => patch({ [slot]: o.id })} className={chip(o.id === current)}>
                    {o.label}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
