// Camada de abstração para hash/verificação de senha (Sprint MP-04).
//
// Único ponto do projeto que sabe COMO uma senha é transformada em
// hash. Toda a aplicação (Bun local e Cloudflare Workers) usa apenas
// `CryptoService` — nunca chama uma API de criptografia diretamente.
// Trocar de algoritmo/infra no futuro (ex.: bcrypt via binding nativo,
// argon2) significa mudar só este arquivo.
//
// Implementado com Web Crypto (`crypto.subtle`), disponível tanto no
// Bun quanto no runtime de Cloudflare Workers — evita qualquer API
// específica de um único ambiente (ex.: `Bun.password`).

const PBKDF2_ITERATIONS = 100_000;
const HASH_ALGORITHM = "SHA-256";
const KEY_LENGTH_BITS = 256;
const SALT_LENGTH_BYTES = 16;

function toHex(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string): Uint8Array {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < arr.length; i++) {
    arr[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return arr;
}

async function derive(password: string, salt: Uint8Array): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const derived = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: HASH_ALGORITHM,
    },
    keyMaterial,
    KEY_LENGTH_BITS,
  );
  return toHex(derived);
}

export const CryptoService = {
  /** Gera um hash único (salt embutido) pronto para persistir junto da conta. */
  async hash(password: string): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH_BYTES));
    const derived = await derive(password, salt);
    return `${toHex(salt)}:${derived}`;
  },

  /** Confere uma senha em texto puro contra um hash gerado por `hash()`. */
  async verify(password: string, storedHash: string): Promise<boolean> {
    const [saltHex, expectedHex] = storedHash.split(":");
    if (!saltHex || !expectedHex) return false;
    const derived = await derive(password, fromHex(saltHex));
    return derived === expectedHex;
  },
};
