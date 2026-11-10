// Tipagem compartilhada do binding do Worker — usada pelas duas
// Durable Objects (`AccountsRoom`, `GameRoom`) para chamadas DO-a-DO.
export interface Env {
  ACCOUNTS: DurableObjectNamespace;
  ROOM: DurableObjectNamespace;
  /** Chave do provedor de e-mail (Resend). Segredo: `wrangler secret put RESEND_API_KEY`. */
  RESEND_API_KEY?: string;
  /** Remetente dos e-mails de confirmação, ex.: "Conflito <no-reply@conflito.online>". */
  EMAIL_FROM?: string;
  /** Só desenvolvimento local (`.dev.vars`): "1" mostra o código na tela e no log em vez de enviar e-mail. */
  DEV_SHOW_CODE?: string;
}
