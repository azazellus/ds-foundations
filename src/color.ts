// OKLCH, sRGB, and WCAG contrast helpers. Pure functions, no Figma API.
// Implements foundations-spec.md section 5.5 (gamut clamp) and section 5.7 (contrast).

export type Lch = { L: number; C: number; H: number };

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

export function isValidHex(hex: string): boolean {
  return HEX_RE.test(hex);
}

export function hexToRgb255(hex: string): [number, number, number] {
  if (!HEX_RE.test(hex)) throw new Error(`invalid_hex: ${hex}`);
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function rgb255ToHex(rgb: number[]): string {
  return "#" + rgb.map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();
}

// sRGB transfer functions (section 5.7 steps 5 and 6).
function srgbToLinear(v: number): number {
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function linearToSrgb(c: number): number {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

// HEX -> OKLCH, using the Oklab matrices.
export function hexToOklch(hex: string): Lch {
  const [r8, g8, b8] = hexToRgb255(hex);
  const r = srgbToLinear(r8 / 255);
  const g = srgbToLinear(g8 / 255);
  const b = srgbToLinear(b8 / 255);

  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  const lp = Math.cbrt(l);
  const mp = Math.cbrt(m);
  const sp = Math.cbrt(s);

  const L = 0.2104542553 * lp + 0.793617785 * mp - 0.0040720468 * sp;
  const a = 1.9779984951 * lp - 2.428592205 * mp + 0.4505937099 * sp;
  const bb = 0.0259040371 * lp + 0.7827717662 * mp - 0.808675766 * sp;

  const C = Math.hypot(a, bb);
  let H = (Math.atan2(bb, a) * 180) / Math.PI;
  if (H < 0) H += 360;
  return { L, C, H };
}

// OKLCH -> linear sRGB, unclamped (section 5.7 steps 1 to 3).
function oklchToLinear({ L, C, H }: Lch): [number, number, number] {
  const a = C * Math.cos((H * Math.PI) / 180);
  const b = C * Math.sin((H * Math.PI) / 180);

  const lp = L + 0.3963377774 * a + 0.2158037573 * b;
  const mp = L - 0.1055613458 * a - 0.0638541728 * b;
  const sp = L - 0.0894841775 * a - 1.291485548 * b;

  const l = lp * lp * lp;
  const m = mp * mp * mp;
  const s = sp * sp * sp;

  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

const GAMUT_EPS = 1e-9;

export function inGamut(lch: Lch): boolean {
  return oklchToLinear(lch).every((c) => c >= -GAMUT_EPS && c <= 1 + GAMUT_EPS);
}

// Largest chroma inside sRGB at this L and H. Fixed-count binary search, so the result is deterministic.
export function maxChroma(L: number, H: number): number {
  let lo = 0;
  let hi = 0.5;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut({ L, C: mid, H })) lo = mid;
    else hi = mid;
  }
  return lo;
}

// Section 5.5 step 5: reduce chroma at fixed L and H until the color is inside sRGB.
export function clampChroma(lch: Lch): Lch {
  if (inGamut(lch)) return lch;
  return { L: lch.L, C: maxChroma(lch.L, lch.H), H: lch.H };
}

// OKLCH -> HEX, rounded to 8 bits. Call on in-gamut colors only (clamp first).
export function oklchToHex(lch: Lch): string {
  const lin = oklchToLinear(lch).map((c) => Math.min(1, Math.max(0, c)));
  return rgb255ToHex(lin.map((c) => Math.round(linearToSrgb(c) * 255)));
}

// WCAG relative luminance from the rounded HEX value (section 5.7 step 6).
export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb255(hex).map((v) => srgbToLinear(v / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// WCAG contrast ratio between two HEX colors (section 5.7 step 7).
export function contrast(hexA: string, hexB: string): number {
  const ya = relativeLuminance(hexA);
  const yb = relativeLuminance(hexB);
  const hi = Math.max(ya, yb);
  const lo = Math.min(ya, yb);
  return (hi + 0.05) / (lo + 0.05);
}
