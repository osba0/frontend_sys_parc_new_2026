/**
 * PlaqueSN — Composant plaque d'immatriculation sénégalaise
 *
 * Police : Oswald 700 (Google Fonts) — la plus proche de la FE-Schrift
 * officielle utilisée sur les vraies plaques minéralogiques.
 *
 * Deux styles :
 * - "nouvelle" : plaque blanche actuelle (depuis ~2000)
 * - "ancienne" : plaque bleue (avant 2000)
 */

// Police plaque — Oswald Bold, fallback Arial Narrow / Arial Black
const FONT_PLAQUE =
  "'Oswald', 'Arial Narrow', 'Arial Black', Arial, sans-serif";

interface PlaqueSNProps {
  immatriculation: string;
  style?: "nouvelle" | "ancienne";
  ville?: string; // ex: "DK", "TH", "STL"
  codeVille?: string; // ex: "01", "02"
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

// Drapeau sénégalais SVG inline (tricolore vert/jaune/rouge avec étoile verte)
function DrapeauSN({ h = 20 }: { h?: number }) {
  const w = Math.round(h * 1.5);
  const s = Math.round(h / 3); // largeur bande
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      style={{ display: "block", flexShrink: 0 }}
    >
      {/* Bandes */}
      <rect x={0} y={0} width={s} height={h} fill="#00853F" />
      <rect x={s} y={0} width={s} height={h} fill="#FDEF42" />
      <rect x={s * 2} y={0} width={s} height={h} fill="#E31B23" />
      {/* Étoile verte au centre */}
      <text
        x={w / 2}
        y={h / 2 + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={h * 0.45}
        fill="#00853F"
        fontFamily="serif"
      >
        ★
      </text>
    </svg>
  );
}

const SIZES = {
  xs: {
    plate: "h-7",
    text: "text-sm",
    mono: "text-xs",
    gap: "gap-1",
    px: "px-1.5",
  },
  sm: {
    plate: "h-9",
    text: "text-base",
    mono: "text-xs",
    gap: "gap-1.5",
    px: "px-2",
  },
  md: {
    plate: "h-11",
    text: "text-lg",
    mono: "text-xs",
    gap: "gap-2",
    px: "px-2.5",
  },
  lg: {
    plate: "h-14",
    text: "text-2xl",
    mono: "text-xs",
    gap: "gap-3",
    px: "px-3",
  },
};

export default function PlaqueSN({
  immatriculation,
  style = "nouvelle",
  ville = "",
  codeVille = "",
  size = "md",
  className = "",
}: PlaqueSNProps) {
  const sz = SIZES[size];
  const immat = immatriculation.toUpperCase();

  if (style === "ancienne") {
    return (
      <div
        className={`
          inline-flex items-center justify-center relative
          ${sz.plate} ${sz.px} rounded-lg
          bg-blue-700 border-2 border-white
          shadow-[inset_0_1px_3px_rgba(255,255,255,0.2),0_2px_4px_rgba(0,0,0,0.4)]
          ${className}
        `}
        style={{ minWidth: "fit-content" }}
      >
        {/* Vis gauche */}
        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-blue-300 border border-white/60 shadow-sm" />

        {/* Texte */}
        <span
          className={`font-black tracking-widest text-white ${sz.text} mx-4`}
          style={{ fontFamily: FONT_PLAQUE, letterSpacing: "0.12em" }}
        >
          {immat}
        </span>

        {/* Vis droite */}
        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-blue-300 border border-white/60 shadow-sm" />
      </div>
    );
  }

  // ── Nouvelle plaque (blanche) ────────────────────────────
  return (
    <div
      className={`
        inline-flex items-center
        ${sz.plate} rounded
        bg-white border-2 border-black
        shadow-sm overflow-hidden
        ${className}
      `}
      style={{ minWidth: "fit-content" }}
    >
      {/* Bande gauche bleue : drapeau + SN */}
      <div
        className="flex flex-col items-center justify-between h-full bg-blue-700 px-1 py-1 flex-shrink-0"
        style={{ minWidth: 28 }}
      >
        <DrapeauSN
          h={size === "xs" ? 10 : size === "sm" ? 12 : size === "lg" ? 18 : 14}
        />
        <span
          className="text-white font-bold leading-none"
          style={{
            fontSize: size === "xs" ? 7 : size === "sm" ? 8 : 9,
            letterSpacing: "0.05em",
          }}
        >
          SN
        </span>
      </div>

      {/* Numéro d'immatriculation */}
      <span
        className={`
          flex-1 text-center font-black text-black tracking-widest
          ${sz.text} px-2
        `}
        style={{ fontFamily: FONT_PLAQUE, letterSpacing: "0.1em" }}
      >
        {immat}
      </span>

      {/* Bande droite : code ville / département */}
      {(ville || codeVille) && (
        <div className="flex flex-col items-center justify-between h-full border-l border-gray-200 px-1.5 py-1 flex-shrink-0">
          <span
            className="font-bold text-black leading-none"
            style={{ fontSize: size === "xs" ? 8 : size === "sm" ? 9 : 10 }}
          >
            {ville}
          </span>
          {codeVille && (
            <span
              className="text-black leading-none"
              style={{ fontSize: size === "xs" ? 7 : size === "sm" ? 8 : 9 }}
            >
              {codeVille}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
