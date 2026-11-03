// Palette generation and contrast adjustment (foundations-spec.md sections 5.2 to 5.5).
// Pure functions, no Figma API.

import type { Lch } from "./color.ts";
import { hexToOklch, oklchToHex, clampChroma, maxChroma, contrast } from "./color.ts";

export const STEPS = [950, 900, 850, 800, 700, 600, 500, 400, 300, 200, 150, 100, 50];

// Section 1.1.4: a smooth ease-in-out curve (tokens.json primitives.targetL)
export const TARGET_L: Record<number, number> = {
  950: 0.16, 900: 0.189, 850: 0.22, 800: 0.251, 700: 0.323, 600: 0.412,
  500: 0.519, 400: 0.638, 300: 0.754, 200: 0.852, 150: 0.892, 100: 0.928, 50: 0.96,
};

// Section 5.5 step 3: a smooth bell that peaks at 400 (tokens.json primitives.chromaMultiplier)
export const CHROMA_MULT: Record<number, number> = {
  50: 0.3, 100: 0.43, 150: 0.55, 200: 0.68, 300: 0.87, 400: 1.0,
  500: 0.93, 600: 0.76, 700: 0.56, 800: 0.38, 850: 0.32, 900: 0.28, 950: 0.27,
};

const MIN_CHROMA = 0.01;

// Section 5.5: the highest chroma a generated step may have, for every hue (tokens.json chromaCeiling).
export const CHROMA_CEILING: Record<number, number> = { 300: 0.14, 400: 0.18 };

// Section 5.5, status and custom palettes (tokens.json hueOnlyPalette).
export const REFERENCE_C400 = 0.16;
export const YELLOW_BOOST = { factor: 1.6, zeroBelow: 65, fullFrom: 85, fullTo: 105, zeroAbove: 125 };
export const SHIFT_NOTICE_DISTANCE = 0.06;
const MAX_ADJUSTMENTS = 50;

// Section 5.2 step 3: a brand that moved from 500 to 400 is darker than a normal 400. These steps sit at these
// fractions of the way from the brand to step 100 (tokens.json primitives.brandAnchor.respaceFrom500To400).
export const RESPACE_FROM_500_TO_400: Record<number, number> = { 300: 0.325, 200: 0.619, 150: 0.845 };

// Section 5.4 step 2
const L_SEARCH_LIMIT = 0.15;
const SEARCH_STEP = 0.001;

// Section 1.1.6. Gray is fixed and never generated.
export const GRAY_HEX: Record<number, string> = {
  950: "#0D0D0D", 900: "#141414", 850: "#1D1D1D", 800: "#242424", 700: "#303030",
  600: "#4D4D4D", 500: "#696969", 400: "#8C8C8C", 300: "#B1B1B1", 200: "#C7C7C7",
  150: "#DBDBDB", 100: "#EAEAEA", 50: "#F4F4F4",
};

// Section 1.1.9: a tinted neutral keeps Gray's lightness and gets this chroma at the neutral color's hue,
// faded toward the lightest and darkest steps (tokens.json primitives.neutralTint).
export const NEUTRAL_CHROMA = 0.015;
export const NEUTRAL_FADE: Record<number, number> = { 50: 0.55, 100: 0.75, 150: 0.9, 850: 0.9, 900: 0.75, 950: 0.55 };

// A neutral palette, step -> HEX: Color/Gray (GRAY_HEX) or a tinted neutral.
export type Neutral = Record<number, string>;

// Section 1.1.5. bgPalette "neutral" compares against the neutral of every theme that uses the palette
// (Color/Gray or a tinted neutral); "self" compares against the same palette.
export type ContrastPair = { text: number; bg: number; bgPalette: "neutral" | "self"; min: number; target: number };
export const CONTRAST_PAIRS: ContrastPair[] = [
  { text: 500, bg: 100, bgPalette: "neutral", min: 4.5, target: 4.7 },
  { text: 700, bg: 200, bgPalette: "neutral", min: 7.0, target: 8.0 },
  { text: 300, bg: 700, bgPalette: "neutral", min: 4.5, target: 6.0 },
  { text: 150, bg: 700, bgPalette: "neutral", min: 7.0, target: 9.5 },
  { text: 500, bg: 100, bgPalette: "self", min: 4.5, target: 4.5 },
];

// The lowest contrast of a color against several backgrounds: it must pass against all of them.
function minContrast(hex: string, backgrounds: string[]): number {
  return Math.min(...backgrounds.map((b) => contrast(hex, b)));
}

// expected and actual are filled in for contrast findings, so the report shows which pairing failed.
export type Finding = { check: string; step?: number; message: string; expected?: string; actual?: number };

export type Palette = {
  name: string;
  anchor: number; // -1 for status and custom palettes, which have no anchor (section 5.3)
  // Steps re-spaced around a brand that moved one step (section 5.2 step 3). They do not chase targets.
  respaced?: number[];
  // The neutral palettes the "neutral" pairings are measured against: one per theme that uses this palette.
  neutrals: Neutral[];
  steps: Record<number, { lch: Lch; hex: string }>;
  warnings: Finding[];
  errors: Finding[];
  adjustments: number;
};

const r3 = (x: number): number => Math.round(x * 1000) / 1000;
const r1 = (x: number): number => Math.round(x * 10) / 10;
const r2 = (x: number): number => Math.round(x * 100) / 100;

// Section 5.2 step 1. Closest target L wins. Ties go to the darker step (higher step number).
function chooseAnchor(L0: number): number {
  let best = STEPS[0];
  let bestD = Infinity;
  for (const s of STEPS) {
    const d = Math.abs(TARGET_L[s] - L0);
    if (d < bestD - 1e-12 || (Math.abs(d - bestD) <= 1e-12 && s > best)) {
      best = s;
      bestD = d;
    }
  }
  return best;
}

// Section 5.2 step 1. The brand's step: the closest target L, unless the brand fails the neutral contrast
// minimum of that step (section 1.1.5) against any of the given neutrals. Then it moves one step away from that rule's background, to a step
// with no rule of its own, so its HEX stays exact: dark text on a light background (500, 700) moves one step
// lighter (500 -> 400, 700 -> 600); light text on a dark background (300, 150) moves one step darker
// (300 -> 400, 150 -> 200).
export function placeAnchor(hex: string, neutrals: Neutral[] = [GRAY_HEX]): { closest: number; anchor: number } {
  const closest = chooseAnchor(hexToOklch(hex).L);
  const i = STEPS.indexOf(closest);
  for (const pair of CONTRAST_PAIRS.filter((x) => x.text === closest && x.bgPalette === "neutral")) {
    if (minContrast(hex, neutrals.map((n) => n[pair.bg])) >= pair.min) continue;
    const darkText = pair.text > pair.bg;
    return { closest, anchor: STEPS[i + (darkText ? 1 : -1)] }; // STEPS runs from darkest to lightest
  }
  return { closest, anchor: closest };
}

// The background colors of a pairing: the step of every neutral the palette is used with, or a step of
// the palette itself.
function pairBackgrounds(p: Palette, pair: ContrastPair): string[] {
  return pair.bgPalette === "self" ? [p.steps[pair.bg].hex] : p.neutrals.map((n) => n[pair.bg]);
}

// The hardest background of a pairing for the palette as it is now (the one with the lowest contrast).
export function pairBackgroundHex(p: Palette, pair: ContrastPair): string {
  const fg = p.steps[pair.text].hex;
  return pairBackgrounds(p, pair).reduce((a, b) => (contrast(fg, b) < contrast(fg, a) ? b : a));
}

// "Gray 100", "neutral 100" (tinted) or "Violet 100", for messages.
function pairBackgroundLabel(p: Palette, pair: ContrastPair): string {
  const plainGray = p.neutrals.every((n) => n === GRAY_HEX);
  return `${pair.bgPalette === "self" ? p.name : plainGray ? "Gray" : "neutral"} ${pair.bg}`;
}

function measure(p: Palette, pair: ContrastPair): number {
  return minContrast(p.steps[pair.text].hex, pairBackgrounds(p, pair));
}

// Section 5.5: a step's chroma on the curve, under its ceiling and above the minimum. The gamut clamp comes after.
function curveChroma(C400: number, s: number): number {
  return Math.max(Math.min(C400 * CHROMA_MULT[s], CHROMA_CEILING[s] ?? Infinity), MIN_CHROMA);
}

function commit(p: Palette, s: number, cand: Lch): void {
  const clamped = clampChroma(cand);
  if (clamped.C < cand.C - 1e-9) {
    p.warnings.push({
      check: "gamut_clamp",
      step: s,
      message: `Chroma reduced from ${cand.C.toFixed(4)} to ${clamped.C.toFixed(4)} to stay in sRGB.`,
    });
  }
  p.steps[s] = { lch: clamped, hex: oklchToHex(clamped) };
}

// Section 5.4 steps 2 and 3. Returns true if a candidate was accepted.
function fixPair(p: Palette, pair: ContrastPair, threshold: number, allowChroma: boolean): boolean {
  const s = pair.text;
  if (s === p.anchor) return false; // the brand color never changes (section 5.2)

  const cur = p.steps[s].lch;
  const bgs = pairBackgrounds(p, pair); // a candidate must pass against every one of them
  const bgL = hexToOklch(bgs[0]).L; // neutrals share Gray's lightness, so any of them gives the direction
  const dir = cur.L >= bgL ? 1 : -1;

  // Bounds: strictly between the nearest darker and lighter steps.
  const others = STEPS.filter((x) => x !== s).map((x) => p.steps[x].lch.L);
  const lower = others.filter((L) => L < cur.L).reduce((a, b) => Math.max(a, b), 0);
  const upper = others.filter((L) => L > cur.L).reduce((a, b) => Math.min(a, b), 1);

  // Lightness search (step 2).
  const n = Math.round(L_SEARCH_LIMIT / SEARCH_STEP);
  for (let i = 1; i <= n; i++) {
    const L = r3(cur.L + dir * i * SEARCH_STEP);
    if (L <= lower || L >= upper || L <= 0 || L >= 1) break;
    const cand = clampChroma({ L, C: cur.C, H: cur.H });
    if (minContrast(oklchToHex(cand), bgs) >= threshold) {
      commit(p, s, cand);
      return true;
    }
  }

  // Chroma search (step 3): descending to MIN_CHROMA, then ascending to the gamut maximum.
  if (allowChroma) {
    // Never above the step's ceiling (section 5.4 step 3).
    const maxC = Math.min(maxChroma(cur.L, cur.H), CHROMA_CEILING[s] ?? Infinity);
    const order: number[] = [];
    for (let C = r3(cur.C); C >= MIN_CHROMA - 1e-9; C = r3(C - SEARCH_STEP)) order.push(C);
    for (let C = r3(cur.C + SEARCH_STEP); C <= maxC; C = r3(C + SEARCH_STEP)) order.push(C);
    for (const C of order) {
      if (C < MIN_CHROMA - 1e-9 || C > maxC) continue;
      const cand: Lch = { L: cur.L, C, H: cur.H };
      if (minContrast(oklchToHex(cand), bgs) >= threshold) {
        commit(p, s, cand);
        return true;
      }
    }
  }
  return false;
}

// Section 5.4 step 2. The brand color fails on the palette's own background (500 on its own 100), and it must
// keep its exact HEX, so that background gets lighter instead, staying below the next lighter step.
// Returns true if a candidate was accepted.
function lightenOwnBackground(p: Palette, pair: ContrastPair, threshold: number): boolean {
  const cur = p.steps[pair.bg].lch;
  const upper = STEPS.filter((x) => p.steps[x].lch.L > cur.L).reduce((a, x) => Math.min(a, p.steps[x].lch.L), 1);
  const n = Math.round(L_SEARCH_LIMIT / SEARCH_STEP);
  for (let i = 1; i <= n; i++) {
    const L = r3(cur.L + i * SEARCH_STEP);
    if (L >= upper) break;
    const cand = clampChroma({ L, C: cur.C, H: cur.H });
    if (contrast(p.steps[pair.text].hex, oklchToHex(cand)) >= threshold) {
      commit(p, pair.bg, cand);
      return true;
    }
  }
  return false;
}

// Section 5.4: minimums first (hard), then targets (optimization, warnings only).
function calibrate(p: Palette): void {
  for (const pair of CONTRAST_PAIRS) {
    const ratio = measure(p, pair);
    if (ratio >= pair.min) continue;
    if (p.adjustments >= MAX_ADJUSTMENTS) {
      p.errors.push({
        check: "contrast_minimum", step: pair.text, message: "Adjustment cap of 50 reached.",
        expected: `>= ${pair.min}`, actual: r2(ratio),
      });
      return;
    }
    const fixed = pair.text === p.anchor && pair.bgPalette === "self"
      ? lightenOwnBackground(p, pair, pair.min)
      : fixPair(p, pair, pair.min, true);
    if (fixed) {
      p.adjustments++;
    } else {
      p.errors.push({
        check: "contrast_minimum",
        step: pair.text,
        message: `Step ${pair.text} vs ${pairBackgroundLabel(p, pair)}: minimum ${pair.min} not reachable (measured ${measure(p, pair).toFixed(2)}).`,
        expected: `>= ${pair.min}`,
        actual: r2(measure(p, pair)),
      });
    }
  }
  if (p.errors.length > 0) return;

  // Targets: lightness only, never the anchor (section 5.4 step 5). Re-spaced steps stay where the brand rule put
  // them and report only their minimums. Any other unmet target is a warning, also when the cap leaves no room to try.
  for (const pair of CONTRAST_PAIRS) {
    const ratio = measure(p, pair);
    if (ratio >= pair.target || p.respaced?.includes(pair.text)) continue;
    if (p.adjustments < MAX_ADJUSTMENTS && fixPair(p, pair, pair.target, false)) {
      p.adjustments++;
    } else {
      p.warnings.push({
        check: "contrast_target",
        step: pair.text,
        message: `Step ${pair.text} vs ${pairBackgroundLabel(p, pair)}: target ${pair.target} not reached (measured ${measure(p, pair).toFixed(2)}).`,
        expected: `>= ${pair.target}`,
        actual: r2(measure(p, pair)),
      });
    }
  }
}

// Section 5.2. Builds a brand palette: the brand HEX stays exactly at its anchor step.
// neutrals: the neutral palette of every theme that uses this palette (Color/Gray when not given).
export function buildPalette(name: string, hex: string, neutrals: Neutral[] = [GRAY_HEX]): Palette {
  const src = hexToOklch(hex);
  const { closest, anchor } = placeAnchor(hex, neutrals);
  const C400 = src.C / CHROMA_MULT[anchor];
  const H = r1(src.H);
  const respacedL = anchor === closest ? {} : respacedLightness(closest, anchor, src.L);

  const p: Palette = { name, anchor, steps: {}, warnings: [], errors: [], adjustments: 0, neutrals };
  if (anchor !== closest) p.respaced = Object.keys(respacedL).map(Number);
  for (const s of STEPS) {
    // The anchor is the brand color itself, with its exact HEX: converting it would round it by a digit.
    if (s === anchor) {
      p.steps[s] = { lch: { L: src.L, C: src.C, H }, hex: hex.toUpperCase() };
    } else if (s in respacedL) {
      // A re-spaced step follows the curve at its new L, with no ceiling (section 5.2 step 3).
      commit(p, s, { L: respacedL[s], C: Math.max(C400 * CHROMA_MULT[s], MIN_CHROMA), H });
    } else {
      commit(p, s, { L: TARGET_L[s], C: curveChroma(C400, s), H });
    }
  }

  calibrate(p);
  return p;
}

// Section 5.2 step 3, for a brand that moved one step: it sits darker (or lighter) than its step's target, so
// the steps around it get a new L, returned here as step -> L. Every other step keeps its target L.
// - Toward the shift: the first neighbour keeps the usual gap from the brand, and the second goes halfway
//   between it and the next step, which stays fixed.
// - On the other side: the two neighbours are spaced evenly between the brand and the next step, which stays fixed.
//   A brand that moved from 500 to 400 uses fixed fractions for 300, 200 and 150 instead, so the light steps have no jump.
function respacedLightness(closest: number, anchor: number, brandL: number): Record<number, number> {
  const T = TARGET_L;
  const i = STEPS.indexOf(anchor);
  const shift = brandL < T[anchor] ? -1 : 1; // index direction in STEPS: -1 = toward the darker steps
  const toward = (k: number): number => STEPS[i + k * shift];
  const away = (k: number): number => STEPS[i - k * shift];

  const L: Record<number, number> = {};
  L[toward(1)] = brandL + (T[toward(1)] - T[anchor]);
  L[toward(2)] = (L[toward(1)] + T[toward(3)]) / 2;
  if (closest === 500 && anchor === 400) {
    for (const s of Object.keys(RESPACE_FROM_500_TO_400).map(Number)) {
      L[s] = brandL + (T[100] - brandL) * RESPACE_FROM_500_TO_400[s];
    }
  } else {
    const gap = (T[away(3)] - brandL) / 3;
    L[away(1)] = brandL + gap;
    L[away(2)] = brandL + 2 * gap;
  }
  return Object.fromEntries(Object.entries(L).map(([s, value]) => [s, r3(value)]));
}

// Section 5.5: the yellow factor for an OKLCH hue. 1 outside the yellows, up to YELLOW_BOOST.factor.
export function yellowFactor(H: number): number {
  const y = YELLOW_BOOST;
  const w = Math.max(0, Math.min(1, (H - y.zeroBelow) / (y.fullFrom - y.zeroBelow), (y.zeroAbove - H) / (y.zeroAbove - y.fullTo)));
  return 1 + (y.factor - 1) * w;
}

// Section 5.3. Builds a status or custom palette from the hue of a HEX only: target L for every step,
// a fixed chroma curve (with the yellow boost), the ceilings, then the contrast adjustment. No anchor.
export function buildHuePalette(name: string, hex: string, neutrals: Neutral[] = [GRAY_HEX]): Palette {
  const H = r1(hexToOklch(hex).H);
  const C400 = REFERENCE_C400 * yellowFactor(H);
  const p: Palette = { name, anchor: -1, steps: {}, warnings: [], errors: [], adjustments: 0, neutrals };
  for (const s of STEPS) {
    commit(p, s, { L: TARGET_L[s], C: curveChroma(C400, s), H });
  }
  calibrate(p);
  return p;
}

// Section 1.1.9. A tinted neutral: Gray's lightness at every step, the neutral color's hue, and a small
// fixed chroma that fades toward the lightest and darkest steps. Only the hue of the HEX is used.
// It has no contrast pairings of its own: other palettes are measured against it.
export function buildNeutralPalette(name: string, hex: string): Palette {
  const H = r1(hexToOklch(hex).H);
  const p: Palette = { name, anchor: -1, steps: {}, warnings: [], errors: [], adjustments: 0, neutrals: [] };
  for (const s of STEPS) {
    commit(p, s, { L: hexToOklch(GRAY_HEX[s]).L, C: NEUTRAL_CHROMA * (NEUTRAL_FADE[s] ?? 1), H });
  }
  return p;
}

// A palette as step -> HEX, the shape the contrast pairings use for a neutral.
export function neutralOf(p: Palette): Neutral {
  return Object.fromEntries(STEPS.map((s) => [s, p.steps[s].hex]));
}

// Section 5.3 step 5: the step of a palette closest to a HEX, and how far it is (distance in Oklab).
export function closestStep(p: Palette, hex: string): { step: number; hex: string; distance: number } {
  const target = lab(hex);
  let best = { step: STEPS[0], hex: p.steps[STEPS[0]].hex, distance: Infinity };
  for (const s of STEPS) {
    const x = lab(p.steps[s].hex);
    const d = Math.hypot(x[0] - target[0], x[1] - target[1], x[2] - target[2]);
    if (d < best.distance) best = { step: s, hex: p.steps[s].hex, distance: d };
  }
  return best;
}

// A HEX as OKLab coordinates [L, a, b], where the distance between two colors matches how different they look.
function lab(hex: string): number[] {
  const c = hexToOklch(hex);
  const a = (c.H * Math.PI) / 180;
  return [c.L, c.C * Math.cos(a), c.C * Math.sin(a)];
}

// How different two palettes look: the largest OKLab distance between their steps of the same number.
// Used for similar_palette (section 1.1.8 rule 4).
export function paletteDifference(p: Palette, q: Palette): number {
  let largest = 0;
  for (const s of STEPS) {
    const x = lab(p.steps[s].hex);
    const y = lab(q.steps[s].hex);
    largest = Math.max(largest, Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]));
  }
  return largest;
}
