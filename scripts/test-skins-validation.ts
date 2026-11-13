// Teste da validação do visual (Oficina do Exército, etapa 4) — a MESMA função que o
// servidor (GameRoom, evento SetSkins) usa. Rode com: bun run scripts/test-skins-validation.ts
import { sanitizeSkins, DEFAULT_SKINS, SKINNABLE_PIECES, SKIN_MODELS, SKIN_PRESETS, randomSkins } from "../src/config/skinCatalog";

let fails = 0;
function check(label: string, cond: boolean) {
  console.log(`${cond ? "  ✔" : "  ✘"} ${label}`);
  if (!cond) fails++;
}
const isDefault = (t: any, k: string) => JSON.stringify(t[k]) === JSON.stringify((DEFAULT_SKINS as any)[k]);

// 1. lixo total -> padrão
for (const junk of [null, undefined, 42, "x", [], true, { skins: 1 }]) {
  const out = sanitizeSkins(junk);
  check(`entrada ${JSON.stringify(junk)} vira o padrão`, SKINNABLE_PIECES.every((k) => isDefault(out, k)));
}

// 2. valores fora do catálogo caem no padrão (campo a campo)
const evil = sanitizeSkins({
  commander: { model: "Hacker", color: "neon", hat: "<script>", weapon: "nuke", shield: 123 },
  officer: { model: "Skeleton_Mage", color: "roxo", hat: "quepe", weapon: "cajado", shield: "redondo" },
});
check("modelo inventado vira o padrão do Rei", evil.commander.model === DEFAULT_SKINS.commander.model);
check("cor, chapéu, arma e escudo inválidos viram padrão", evil.commander.color === "time" && evil.commander.hat === "padrao" && evil.commander.weapon === "nenhuma" && evil.commander.shield === "nenhum");
check("valores válidos do Duque passam intactos", evil.officer.model === "Skeleton_Mage" && evil.officer.color === "roxo" && evil.officer.hat === "quepe" && evil.officer.weapon === "cajado" && evil.officer.shield === "redondo");
check("peças não enviadas ficam no padrão", isDefault(evil, "spy") && isDefault(evil, "scout"));

// 3. campos extras e chaves perigosas são descartados
const polluted = sanitizeSkins(JSON.parse('{"__proto__":{"admin":true},"constructor":{"x":1},"infantry":{"model":"Knight","extra":"x","__proto__":{"y":1}},"bomb":{"model":"Knight"}}'));
check("só as 7 peças existem no resultado", Object.keys(polluted).sort().join() === [...SKINNABLE_PIECES].sort().join());
check("chaves extras não vazam", !("bomb" in polluted) && !("admin" in polluted) && !(("extra" in (polluted.infantry as any))));
check("o protótipo global não foi poluído", ({} as any).admin === undefined && ({} as any).y === undefined);
check("Guarda Real com Cavaleiro válido passa", polluted.infantry.model === "Knight");

// 4. todo modelo do catálogo é aceito
check("os " + SKIN_MODELS.length + " modelos do catálogo são aceitos", SKIN_MODELS.every((m) => sanitizeSkins({ sniper: { model: m.id } }).sniper.model === m.id));

// 5. resultado é sempre completo e serializável
const round = JSON.parse(JSON.stringify(sanitizeSkins(evil)));
check("resultado completo e estável após JSON", SKINNABLE_PIECES.every((k) => typeof round[k].model === "string"));

// 6. string gigante não passa
const huge = sanitizeSkins({ sniper: { model: "A".repeat(1_000_000) } });
check("string de 1 MB no modelo vira padrão", huge.sniper.model === DEFAULT_SKINS.sniper.model);

// 7. conjuntos prontos e aleatório (etapa 5) passam pela validação sem perder nada
for (const pr of SKIN_PRESETS) {
  check(`conjunto "${pr.label}" é válido e completo`, JSON.stringify(sanitizeSkins(pr.skins)) === JSON.stringify(pr.skins) && SKINNABLE_PIECES.every((k) => typeof pr.skins[k].model === "string"));
}
check("o conjunto Padrão é igual ao visual de fábrica", JSON.stringify(SKIN_PRESETS[0].skins) === JSON.stringify(DEFAULT_SKINS));
let seed = 7;
const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
let allValid = true;
for (let i = 0; i < 200; i++) {
  const r = randomSkins(rng);
  if (JSON.stringify(sanitizeSkins(r)) !== JSON.stringify(r)) allValid = false;
}
check("200 sorteios aleatórios são sempre válidos", allValid);
check("dois sorteios seguidos são diferentes", JSON.stringify(randomSkins(rng)) !== JSON.stringify(randomSkins(rng)));

console.log(fails === 0 ? "\nTUDO OK" : `\n${fails} FALHA(S)`);
process.exit(fails === 0 ? 0 : 1);
