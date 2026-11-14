// Nome de usuário sorteado para o adversário do computador da fila ranqueada (docs/16 - Sistema de Contas).
// Parece o nickname de um jogador comum: palavra + palavra/número, sem espaços.

const FIRST = [
  "Sombra", "Falcao", "Lobo", "Trovao", "Aguia", "Raio", "Dragao", "Ferro", "Tempestade", "Cavaleiro",
  "Escudo", "Lamina", "Corvo", "Titan", "Noturno", "Bravo", "Estrategista", "Guardiao", "Furia", "Mestre",
  "Pantera", "Vigia", "Fenix", "Rochedo", "Atlas", "Zeus", "Viking", "Legiao", "Cometa", "Gladiador",
];
const SECOND = [
  "Real", "Negro", "Veloz", "Frio", "Alto", "Livre", "Antigo", "Cinza", "Rubro", "Azul",
  "Forte", "Calmo", "Astuto", "Firme", "Norte", "Sul", "Leal", "Audaz", "Mudo", "Solar",
];

/** Sorteia um nome como "SombraReal27" ou "lobo_82" (`rand` é injetável para teste). */
export function randomBotName(rand: () => number = Math.random): string {
  const pick = <T,>(a: T[]) => a[Math.floor(rand() * a.length)];
  const num = Math.floor(rand() * 99) + 1;
  switch (Math.floor(rand() * 4)) {
    case 0:
      return `${pick(FIRST)}${pick(SECOND)}${num}`;
    case 1:
      return `${pick(FIRST).toLowerCase()}_${num}`;
    case 2:
      return `${pick(FIRST)}${num}`;
    default:
      return `${pick(SECOND)}${pick(FIRST)}${Math.floor(rand() * 999) + 1}`;
  }
}
