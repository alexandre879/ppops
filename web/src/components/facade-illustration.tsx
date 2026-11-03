/** Hero artwork: a modern façade with cladding panels, insulation layers and scaffolding. */

const FLOORS = 8;
const FLOOR_H = 50;
const TOP = 70;

export function FacadeIllustration({ className, label }: { className?: string; label: string }) {
  const floors = Array.from({ length: FLOORS }, (_, i) => i);
  const scaffoldLevels = Array.from({ length: FLOORS + 1 }, (_, i) => TOP + i * FLOOR_H);

  return (
    <svg viewBox="0 0 520 540" className={className} role="img" aria-label={label}>
      <defs>
        <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#57534e" />
          <stop offset="1" stopColor="#1c1917" />
        </linearGradient>
        <linearGradient id="panel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fd8237" />
          <stop offset="1" stopColor="#e3530c" />
        </linearGradient>
        <linearGradient id="wall" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#e7e5e4" />
          <stop offset="1" stopColor="#d6d3d1" />
        </linearGradient>
      </defs>

      {/* Building body */}
      <rect x="150" y={TOP - 14} width="300" height={FLOORS * FLOOR_H + 14} fill="url(#wall)" />
      <rect x="140" y={TOP - 24} width="320" height="12" fill="#a8a29e" />

      {/* Windows */}
      {floors.map((floor) =>
        [0, 1, 2].map((col) => (
          <rect
            key={`${floor}-${col}`}
            x={168 + col * 68}
            y={TOP + floor * FLOOR_H + 10}
            width="50"
            height="30"
            rx="2"
            fill="url(#glass)"
          />
        )),
      )}

      {/* Cladding panel column */}
      {floors.map((floor) => (
        <g key={`panel-${floor}`}>
          <rect x="372" y={TOP + floor * FLOOR_H + 2} width="70" height={FLOOR_H - 4} fill="url(#panel)" opacity={floor % 2 ? 0.92 : 1} />
          <line x1="407" x2="407" y1={TOP + floor * FLOOR_H + 2} y2={TOP + floor * FLOOR_H + FLOOR_H - 2} stroke="#bc3e0c" strokeWidth="1" />
        </g>
      ))}

      {/* Insulation / plaster layers peeking at the left edge */}
      <rect x="150" y={TOP + 4 * FLOOR_H} width="10" height={4 * FLOOR_H} fill="#fafaf9" />
      <rect x="160" y={TOP + 4 * FLOOR_H} width="4" height={4 * FLOOR_H} fill="#fde68a" opacity="0.7" />

      {/* Scaffolding */}
      <g stroke="#a8a29e" strokeWidth="2.5" strokeLinecap="round">
        {[70, 104, 138].map((x) => (
          <line key={x} x1={x} x2={x} y1={TOP - 10} y2={TOP + FLOORS * FLOOR_H} />
        ))}
        {scaffoldLevels.map((y) => (
          <line key={y} x1="66" x2="146" y1={y} y2={y} />
        ))}
        {scaffoldLevels.slice(0, -1).map((y, i) => (
          <line key={`d-${y}`} x1={i % 2 ? 70 : 104} x2={i % 2 ? 104 : 70} y1={y} y2={y + FLOOR_H} strokeWidth="1.5" />
        ))}
      </g>
      {scaffoldLevels.slice(1).map((y) => (
        <rect key={`deck-${y}`} x="66" y={y - 5} width="80" height="5" fill="#f26b1d" />
      ))}

      {/* Ground */}
      <rect x="20" y={TOP + FLOORS * FLOOR_H} width="480" height="6" rx="3" fill="#44403c" />
      <rect x="40" y={TOP + FLOORS * FLOOR_H + 14} width="440" height="3" rx="1.5" fill="#292524" />
    </svg>
  );
}
