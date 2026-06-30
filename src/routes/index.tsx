import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "@/pages/HomePage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Project Shadow Command — Turn-Based Strategy" },
      {
        name: "description",
        content:
          "A modern turn-based strategy board game where every move matters. Command your forces in the shadows.",
      },
      { property: "og:title", content: "Project Shadow Command" },
      {
        property: "og:description",
        content:
          "A modern turn-based strategy board game where every move matters.",
      },
    ],
  }),
  component: HomePage,
});
