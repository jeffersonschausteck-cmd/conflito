import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "@/pages/HomePage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Conflito — Turn-Based Strategy" },
      {
        name: "description",
        content:
          "A modern turn-based strategy board game where every move matters. Command your forces on the battlefield.",
      },
      { property: "og:title", content: "Conflito" },
      {
        property: "og:description",
        content:
          "A modern turn-based strategy board game where every move matters.",
      },
    ],
  }),
  component: HomePage,
});
