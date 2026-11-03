import type { FinishKey } from "@/lib/content";

/**
 * Procedural SVG previews of the decorative finishes (fractal noise filters).
 * Illustrative only — real samples come from uploaded project photos.
 */
type Noise = { base: string; ink: string; freq: string; octaves: number; gain: number; offset: number; type?: "fractalNoise" | "turbulence" };

const NOISE: Partial<Record<FinishKey, Noise[]>> = {
  venetian: [
    { base: "#d9c7ae", ink: "#8a6f52", freq: "0.006", octaves: 4, gain: 1.6, offset: -0.55 },
    { base: "", ink: "#fffaf2", freq: "0.02", octaves: 3, gain: 1.4, offset: -0.6 },
  ],
  munich: [{ base: "#ece7df", ink: "#8f8578", freq: "0.035 0.45", octaves: 2, gain: 2.4, offset: -1.25 }],
  spanish: [{ base: "#efe3d1", ink: "#a88d6b", freq: "0.018", octaves: 4, gain: 2.2, offset: -0.95 }],
  splatter: [
    { base: "#ddd5ca", ink: "#7a7066", freq: "0.09", octaves: 2, gain: 9, offset: -5.1 },
    { base: "", ink: "#fbf8f3", freq: "0.13", octaves: 2, gain: 9, offset: -5.3 },
  ],
  scratched: [{ base: "#e8e3db", ink: "#857a6d", freq: "0.9 0.012", octaves: 2, gain: 2.6, offset: -1.35 }],
  travertine: [
    { base: "#e3d4bb", ink: "#a4875f", freq: "0.004 0.09", octaves: 3, gain: 1.8, offset: -0.75 },
    { base: "", ink: "#6b5a43", freq: "0.3", octaves: 1, gain: 5, offset: -3.6, type: "turbulence" },
  ],
};

function NoiseLayer({ id, layer }: { id: string; layer: Noise }) {
  const hex = layer.ink.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  return (
    <>
      <filter id={id} x="0" y="0" width="100%" height="100%">
        <feTurbulence type={layer.type ?? "fractalNoise"} baseFrequency={layer.freq} numOctaves={layer.octaves} seed="7" />
        <feColorMatrix
          type="matrix"
          values={`0 0 0 0 ${r} 0 0 0 0 ${g} 0 0 0 0 ${b} ${layer.gain} 0 0 0 ${layer.offset}`}
        />
      </filter>
      <rect width="100%" height="100%" filter={`url(#${id})`} />
    </>
  );
}

export function TextureSwatch({ finish, className }: { finish: FinishKey; className?: string }) {
  const id = `tx-${finish}`;

  if (finish === "brick") {
    return (
      <svg className={className} aria-hidden preserveAspectRatio="none">
        <defs>
          <pattern id={id} width="64" height="32" patternUnits="userSpaceOnUse">
            <rect width="64" height="32" fill="#b4532a" />
            <rect x="2" y="2" width="28" height="12" fill="#c2643a" />
            <rect x="34" y="18" width="28" height="12" fill="#a64a25" />
            <path d="M0 0H64M0 16H64M32 0V16M0 16V32M64 16V32" stroke="#e7ddd0" strokeWidth="3" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${id})`} />
      </svg>
    );
  }

  if (finish === "stencil") {
    return (
      <svg className={className} aria-hidden preserveAspectRatio="none">
        <defs>
          <pattern id={id} width="44" height="44" patternUnits="userSpaceOnUse">
            <rect width="44" height="44" fill="#ebe3d6" />
            <path d="M22 6 38 22 22 38 6 22Z" fill="none" stroke="#c9a77f" strokeWidth="2" />
            <circle cx="22" cy="22" r="4" fill="#f26b1d" opacity="0.75" />
            <circle cx="0" cy="0" r="3" fill="#c9a77f" />
            <circle cx="44" cy="44" r="3" fill="#c9a77f" />
            <circle cx="44" cy="0" r="3" fill="#c9a77f" />
            <circle cx="0" cy="44" r="3" fill="#c9a77f" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${id})`} />
      </svg>
    );
  }

  const layers = NOISE[finish] ?? [];
  return (
    <svg className={className} aria-hidden preserveAspectRatio="none">
      <rect width="100%" height="100%" fill={layers[0]?.base || "#e7e5e4"} />
      {layers.map((layer, i) => (
        <NoiseLayer key={i} id={`${id}-${i}`} layer={layer} />
      ))}
      {finish === "venetian" && (
        <>
          <defs>
            <linearGradient id={`${id}-sheen`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0.2" stopColor="#fff" stopOpacity="0" />
              <stop offset="0.5" stopColor="#fff" stopOpacity="0.35" />
              <stop offset="0.8" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill={`url(#${id}-sheen)`} />
        </>
      )}
    </svg>
  );
}
