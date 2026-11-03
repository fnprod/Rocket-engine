import React from 'react';

interface EsportBrandLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export const EsportBrandLogo: React.FC<EsportBrandLogoProps> = ({
  className = '',
  size = 40,
  showText = false,
}) => {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* High-Precision SVG Esport Octane Supersonic Emblem */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 drop-shadow-[0_0_12px_rgba(6,182,212,0.4)]"
      >
        <defs>
          <linearGradient id="shieldGrad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#090d16" />
            <stop offset="50%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>
          <linearGradient id="glowCyan" x1="0" y1="0" x2="100" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
          <linearGradient id="boostFlame" x1="0" y1="100" x2="50" y2="50" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>
        </defs>

        {/* Shield Outer Hexagon Contour */}
        <polygon
          points="50,4 92,25 92,75 50,96 8,75 8,25"
          fill="url(#shieldGrad)"
          stroke="url(#glowCyan)"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />

        {/* Inner Carbon Accent Line */}
        <polygon
          points="50,11 85,29 85,71 50,89 15,71 15,29"
          fill="none"
          stroke="#1e293b"
          strokeWidth="1.5"
          strokeDasharray="4 2"
        />

        {/* Rocket Supersonic Flame Trails (2200 - 2300 uu/s) */}
        <path
          d="M32 78 C38 68, 44 60, 50 48 C56 60, 62 68, 68 78 C59 74, 50 82, 32 78 Z"
          fill="url(#boostFlame)"
          opacity="0.95"
        />

        {/* Octane Car Front Silhouette */}
        {/* Cab / Windshield */}
        <path
          d="M38 38 L62 38 L58 26 L42 26 Z"
          fill="#38bdf8"
          opacity="0.9"
        />
        {/* Hood & Front Bumper */}
        <path
          d="M32 46 L68 46 L65 38 L35 38 Z"
          fill="#0284c7"
        />
        {/* Wing / Spoiler */}
        <path
          d="M26 56 L74 56 L70 52 L30 52 Z"
          fill="#06b6d4"
        />
        {/* Headlight Left & Right */}
        <ellipse cx="36" cy="45" rx="3.5" ry="1.5" fill="#fef08a" />
        <ellipse cx="64" cy="45" rx="3.5" ry="1.5" fill="#fef08a" />

        {/* Esport Star / Diamond Crest */}
        <polygon
          points="50,14 54,22 62,22 56,27 58,35 50,30 42,35 44,27 38,22 46,22"
          fill="#f59e0b"
        />

        {/* 2300 uu/s Tech Gauge Arc */}
        <path
          d="M 22 75 A 36 36 0 0 1 78 75"
          fill="none"
          stroke="#06b6d4"
          strokeWidth="2"
          strokeDasharray="2 4"
        />
      </svg>

      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-extrabold tracking-tight text-white font-mono">
              ROCKET LEAGUE
            </span>
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40">
              ESPORTS
            </span>
          </div>
          <span className="text-[10px] font-mono text-cyan-400 font-semibold">
            MASTER ENGINE · 2300 uu/s CAP
          </span>
        </div>
      )}
    </div>
  );
};
