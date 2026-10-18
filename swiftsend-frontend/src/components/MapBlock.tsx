import React from "react";

interface Props {
  routeColor?: string;
  badge?: string;
  height?: number;
  flat?: boolean;
  children?: React.ReactNode;
}

export const MapBlock: React.FC<Props> = ({ routeColor = "#16A34A", badge, height, flat, children }) => {
  const vLines = Array.from({ length: 9 });
  const hLines = Array.from({ length: 6 });

  return (
    <div className={`map-block ${flat ? "flat" : ""}`} style={height ? { height } : undefined}>
      <svg viewBox="0 0 400 230" preserveAspectRatio="xMidYMid slice">
        <rect width={400} height={230} fill="#EAF3ED" />
        <g stroke="#CFE3D6" strokeWidth={1}>
          {vLines.map((_, i) => (
            <line key={`v${i}`} x1={i * 45} y1={0} x2={i * 45} y2={230} />
          ))}
          {hLines.map((_, i) => (
            <line key={`h${i}`} x1={0} y1={i * 45} x2={400} y2={i * 45} />
          ))}
        </g>
        <path
          d="M60 190 C140 150, 160 90, 240 70 S 330 40, 340 45"
          stroke={routeColor}
          strokeWidth={4}
          fill="none"
          strokeLinecap="round"
          strokeDasharray="1 10"
        />
      </svg>
      {badge && <div className="map-badge">{badge}</div>}
      {children}
    </div>
  );
};

export const MapPin: React.FC<{ color: string; style?: React.CSSProperties }> = ({ color, style }) => (
  <div className="map-pin" style={{ background: color, ...style }} />
);
