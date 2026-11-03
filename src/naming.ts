// Palette names (foundations-spec.md section 1.1.8, tokens.json primitives.paletteNaming).
// The user only picks HEX values; this file decides which palette each color uses and what it is called.
// Pure functions, no Figma API, so it can be tested with test/logic.test.ts.

import { hexToRgb255 } from "./color.ts";

// One color the user picked. source identifies it across runs (theme key + role), label is for messages.
// exact is true for a brand color: its HEX must stay in its palette, so it never joins another color's palette.
export type NamedColorInput = { source: string; hex: string; label: string; exact?: boolean };

// What a color ends up using. palette is "Gray" for a color with no hue.
export type ColorAssignment = { source: string; hex: string; palette: string };

// A generated palette: its name, the color that shapes it, and every color that uses it.
// exact: the palette is shaped by a brand color and keeps its HEX (section 5.2); otherwise only the hue is used (5.3).
export type NamedPalette = { name: string; hex: string; hue: number; source: string; label: string; sources: string[]; exact: boolean };

// A notice about two palettes that will look almost the same (similar_palette).
// difference is the largest step difference between them; message is for the report;
// note is shown in the form, under the color it is about.
export type SimilarNotice = {
  source: string; label: string; palette: string; otherPalette: string; otherLabel: string;
  difference: number; message: string; note: string;
};

export type NamingResult = {
  assignments: ColorAssignment[];
  palettes: NamedPalette[];
  problems: string[]; // when all names are taken
};

// HSL hue of a HEX in degrees (0 to 360), or null when R, G and B are equal (no hue).
export function hslHue(hex: string): number | null {
  const [r, g, b] = hexToRgb255(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return null;
  const d = max - min;
  let h: number;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}

const capitalize = (t: string): string => t.charAt(0).toUpperCase() + t.slice(1);

// Distance between two hues on the circle, from 0 to 180.
export function hueDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

// Index in the name list of the range that holds this hue. Red (index 0) covers 357° up to 3°.
function rangeIndex(hue: number, width: number, count: number): number {
  return Math.floor(hue / width + 0.5) % count;
}

// Names every color, in the order given (the caller passes them in the spec's fixed order).
export function assignPaletteNames(naming: any, achromaticPalette: string, colors: NamedColorInput[]): NamingResult {
  const names: string[] = naming.names;
  const width: number = naming.rangeWidth;
  const shareWithin: number = naming.shareWithinDegrees;
  const palettes: NamedPalette[] = [];
  const assignments: ColorAssignment[] = [];
  const problems: string[] = [];
  const taken = new Set<string>();

  for (const c of colors) {
    const hex = c.hex.toUpperCase();
    const hue = hslHue(hex);
    // 1. No hue: the fixed neutral palette.
    if (hue === null) {
      assignments.push({ source: c.source, hex, palette: achromaticPalette });
      continue;
    }
    // 2. Same hue (within 1°) as a palette already named: share it. The closest one wins.
    // A brand color only shares a palette made by a brand color with the same HEX.
    const same = c.exact
      ? palettes.find((p) => p.exact && p.hex === hex)
      : palettes
        .filter((p) => hueDistance(p.hue, hue) <= shareWithin)
        .sort((a, b) => hueDistance(a.hue, hue) - hueDistance(b.hue, hue))[0];
    if (same) {
      same.sources.push(c.source);
      assignments.push({ source: c.source, hex, palette: same.name });
      continue;
    }
    // 3. A new palette: the name of its range, or the nearest free name.
    const home = rangeIndex(hue, width, names.length);
    let index = -1;
    for (let d = 0; d <= names.length / 2 && index < 0; d++) {
      const sides = [...new Set([(home + d) % names.length, (home - d + names.length) % names.length])]
        .filter((i) => !taken.has(names[i]))
        // Equally far: the name whose center is closer to 240° (the colder side) wins.
        .sort((a, b) => hueDistance(a * width, 240) - hueDistance(b * width, 240));
      if (sides.length > 0) index = sides[0];
    }
    if (index < 0) {
      problems.push(`All ${names.length} palette names are taken, so ${c.label} (${hex}) cannot get a palette.`);
      continue;
    }
    const name = names[index];
    taken.add(name);
    palettes.push({ name, hex, hue, source: c.source, label: c.label, sources: [c.source], exact: !!c.exact });
    assignments.push({ source: c.source, hex, palette: name });
  }
  return { assignments, palettes, problems };
}

// 4. Palettes that look almost the same as a palette made before them: no step differs by more than
// maxDifference (section 1.1.8 rule 4). The hue is not used here: HSL hues are uneven around the circle,
// so the finished palettes are compared. difference(a, b) measures two palettes, given by name.
// Each palette is compared with the ones before it, and the notice names the closest one.
// A brand has priority over the other colors, so a palette made by a brand never gets this notice.
export function similarPalettes(palettes: NamedPalette[], difference: (a: string, b: string) => number, maxDifference: number): SimilarNotice[] {
  const out: SimilarNotice[] = [];
  palettes.forEach((p, i) => {
    if (p.exact) return;
    const near = palettes
      .slice(0, i)
      .map((q) => ({ q, d: difference(p.name, q.name) }))
      .filter((x) => x.d <= maxDifference)
      .sort((a, b) => a.d - b.d)[0];
    if (!near) return;
    out.push({
      source: p.source, label: p.label, palette: p.name, otherPalette: near.q.name, otherLabel: near.q.label, difference: near.d,
      message: `${capitalize(p.label)} (${p.hex}) makes a palette that looks almost the same as the one of ${near.q.label} (${near.q.hex}).`,
      note: `Its palette looks almost the same as the one of ${near.q.label}.`,
    });
  });
  return out;
}

// Which palettes to rename in the Figma file (section 1.1.8 rule 5).
// previous: the palette each color made in the last run (source -> name), as stored in the file.
// existing: palette names that already have variables in the file.
// Returns old name -> new name. A palette is renamed only when the color that made it before now makes
// a palette with another name, no palette of this run uses the old name, and the new name is still free.
export function paletteRenames(previous: Record<string, string>, palettes: NamedPalette[], existing: Set<string>): Record<string, string> {
  const used = new Set(palettes.map((p) => p.name));
  const renames: Record<string, string> = {};
  for (const p of palettes) {
    const old = previous[p.source];
    if (!old || old === p.name || used.has(old) || !existing.has(old) || existing.has(p.name)) continue;
    if (Object.keys(renames).includes(old) || Object.values(renames).includes(p.name)) continue;
    renames[old] = p.name;
  }
  return renames;
}
