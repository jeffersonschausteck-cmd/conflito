import type { FactionId } from "@/services/flowState";

interface Props {
  faction: FactionId;
  color: string;
  size?: number;
}

export function FactionIcon({ faction, color, size = 72 }: Props) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 64 64",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    style: { filter: `drop-shadow(0 0 12px ${color})` },
  } as const;

  switch (faction) {
    case "atlas":
      return (
        <svg {...common} aria-hidden>
          <path
            d="M32 4 L56 14 V32 C56 46 32 60 32 60 C32 60 8 46 8 32 V14 Z"
            stroke={color}
            strokeWidth="2"
            fill={`${color}1A`}
          />
          <path d="M32 18 V46 M20 32 H44" stroke={color} strokeWidth="2" />
        </svg>
      );
    case "novatech":
      return (
        <svg {...common} aria-hidden>
          <circle cx="32" cy="32" r="22" stroke={color} strokeWidth="2" fill={`${color}1A`} />
          <path
            d="M32 10 L32 54 M10 32 L54 32 M16 16 L48 48 M48 16 L16 48"
            stroke={color}
            strokeWidth="1.2"
            opacity="0.6"
          />
          <circle cx="32" cy="32" r="6" fill={color} />
        </svg>
      );
    case "phantom":
      return (
        <svg {...common} aria-hidden>
          <polygon
            points="32,4 60,32 32,60 4,32"
            stroke={color}
            strokeWidth="2"
            fill={`${color}1A`}
          />
          <polygon
            points="32,16 48,32 32,48 16,32"
            stroke={color}
            strokeWidth="1.5"
            fill="none"
          />
          <circle cx="32" cy="32" r="3" fill={color} />
        </svg>
      );
    case "helix":
      return (
        <svg {...common} aria-hidden>
          <path
            d="M16 8 C 48 24, 16 40, 48 56"
            stroke={color}
            strokeWidth="2"
            fill="none"
          />
          <path
            d="M48 8 C 16 24, 48 40, 16 56"
            stroke={color}
            strokeWidth="2"
            fill="none"
          />
          <circle cx="32" cy="32" r="4" fill={color} />
        </svg>
      );
  }
}
