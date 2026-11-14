// Tira uma foto de cada mapa pelo mesmo caminho da partida (docs/19-Mapas.md), com um navegador invisível.
// Antes: deixe o servidor de desenvolvimento rodando (bun run dev --port 3001).
// Rode com: bun run scripts/preview-maps.ts --out <pasta> [--maps vale-rapid,bosque-rapid | --pace rapid | --all] [--w 1280] [--h 720]

import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { MAPS } from "../src/maps";

const arg = (name: string, def = "") => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : def;
};
const has = (name: string) => process.argv.includes(`--${name}`);
const OUT = resolve(arg("out", join(tmpdir(), "previas-mapas")));
const W = Number(arg("w", "1280"));
const H = Number(arg("h", "720"));
const APP = process.env.APP_URL ?? "http://localhost:3001";
const EDGE = process.env.BROWSER_EXE ?? "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9337;

const ids = has("all")
  ? Object.keys(MAPS)
  : arg("maps")
    ? arg("maps").split(",")
    : arg("pace")
      ? Object.keys(MAPS).filter((id) => id.endsWith("-" + arg("pace")))
      : ["planicie-rapid"];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function waitJson(path: string) {
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}${path}`);
      if (r.ok) return r.json();
    } catch {
      /* ainda abrindo */
    }
    await sleep(250);
  }
  throw new Error("o Edge não respondeu na porta de depuração");
}

const profile = mkdtempSync(join(tmpdir(), "edge-prev-"));
const proc = spawn(EDGE, ["--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, `--window-size=${W},${H}`, "--no-first-run", "--disable-extensions", "--hide-scrollbars", "--mute-audio", "about:blank"], { stdio: "ignore" });
try {
  const page = ((await waitJson("/json/list")) as any[]).find((t) => t.type === "page");
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener("open", r));
  let id = 0;
  const pending = new Map<number, (v: any) => void>();
  ws.addEventListener("message", (e: any) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) pending.get(m.id)!(m);
  });
  const call = (method: string, params: any = {}) =>
    new Promise<any>((resolve) => {
      const i = ++id;
      pending.set(i, resolve);
      ws.send(JSON.stringify({ id: i, method, params }));
    });
  const evalJs = async (expression: string) => (await call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result?.result?.value;
  await call("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  mkdirSync(OUT, { recursive: true });
  for (const mapId of ids) {
    const t0 = Date.now();
    await call("Page.navigate", { url: `${APP}/mapa-preview?map=${mapId}&w=${W}&h=${H}` });
    for (;;) {
      await sleep(1000);
      const raw = (await evalJs("JSON.stringify(window.__png||null)")) as string;
      const p = raw ? JSON.parse(raw) : null;
      if (p?.status === "erro") throw new Error(`${mapId}: ${p.message}`);
      if (p?.status === "pronto") {
        const file = join(OUT, `${mapId}.png`);
        writeFileSync(file, Buffer.from(p.base64, "base64"));
        console.log(`  ${mapId} → ${file} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
        break;
      }
      if (Date.now() - t0 > 240_000) throw new Error(`${mapId}: demorou mais de 4 minutos`);
    }
  }
  ws.close();
} finally {
  proc.kill();
  await sleep(700);
  try {
    rmSync(profile, { recursive: true, force: true });
  } catch {
    /* o Windows pode segurar a pasta um instante */
  }
}
console.log("TUDO OK");
process.exit(0);
