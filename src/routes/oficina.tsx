import { createFileRoute } from "@tanstack/react-router";
import { OficinaScreen } from "@/components/kay/OficinaScreen";

export const Route = createFileRoute("/oficina")({
  head: () => ({ meta: [{ title: "Conflito — Oficina do Exército" }] }),
  component: OficinaScreen,
});
