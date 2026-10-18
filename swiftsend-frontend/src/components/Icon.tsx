import React from "react";

export type IconName = "home" | "orders" | "wallet" | "profile" | "earnings";

interface Props {
  name: IconName;
  size?: number;
  color?: string;
}

/**
 * Self-contained stroke icons (no external icon package) so the bottom nav has
 * real, recognizable icons instead of a placeholder dot. All use currentColor-style
 * explicit stroke={color} so the active/inactive nav state controls their color.
 */
export const Icon: React.FC<Props> = ({ name, size = 20, color = "currentColor" }) => {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (name) {
    case "home":
      return (
        <svg {...common}>
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5.5 9.5V20a1 1 0 0 0 1 1H9a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h2.5a1 1 0 0 0 1-1V9.5" />
        </svg>
      );
    case "orders":
      return (
        <svg {...common}>
          <path d="M6 3h9l3 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
          <path d="M9 8h6M9 12h6M9 16h3.5" />
        </svg>
      );
    case "wallet":
      return (
        <svg {...common}>
          <rect x="3" y="6.5" width="18" height="12" rx="2" />
          <path d="M3 10h18" />
          <circle cx="16.5" cy="14.5" r="1" fill={color} stroke="none" />
        </svg>
      );
    case "profile":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M4.5 20c1.4-3.6 4.6-5.5 7.5-5.5s6.1 1.9 7.5 5.5" />
        </svg>
      );
    case "earnings":
      return (
        <svg {...common}>
          <circle cx="8.5" cy="8.5" r="5.5" />
          <circle cx="15" cy="15" r="5.5" />
        </svg>
      );
    default:
      return null;
  }
};
