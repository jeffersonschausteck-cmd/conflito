// Tipagem compartilhada do binding do Worker — usada pelas duas
// Durable Objects (`AccountsRoom`, `GameRoom`) para chamadas DO-a-DO.
export interface Env {
  ACCOUNTS: DurableObjectNamespace;
  ROOM: DurableObjectNamespace;
}
