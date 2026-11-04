// Writes the text styles described by src/text-styles.ts (foundations-spec.md section 6.1.3).
// Figma-specific. It finds each style by name and updates it, so it never makes duplicates. It never deletes a style.

import type { FontName, TextStyleDef } from "./text-styles.ts";

export type TextStyleSummary = { created: number; updated: number; unchanged: number; problems: string[] };

// Figma stores these values with small rounding differences, so close numbers count as the same.
const same = (a: number, b: number): boolean => Math.abs(a - b) < 0.001;

// Loads fonts, each one once. One that cannot be loaded (not installed) is added to problems, once.
// Each font keeps its promise, so two themes asking for the same font at the same moment share one load.
export function fontLoader(problems: string[]): (font: FontName) => Promise<boolean> {
  const loads = new Map<string, Promise<boolean>>();
  return (font) => {
    const key = `${font.family}|${font.style}`;
    let load = loads.get(key);
    if (!load) {
      load = figma.loadFontAsync(font).then(() => true, () => {
        problems.push(`Font not available: ${font.family} ${font.style}.`);
        return false;
      });
      loads.set(key, load);
    }
    return load;
  };
}

// True when a style already has the size, line height and letter spacing asked for.
function sameNumbers(style: TextStyle, def: TextStyleDef): boolean {
  const { lineHeight, letterSpacing } = style;
  return same(style.fontSize, def.fontSize)
    && lineHeight.unit === "PIXELS" && same(lineHeight.value, def.lineHeight)
    && letterSpacing.unit === "PIXELS" && same(letterSpacing.value, def.letterSpacing);
}

export async function writeTextStyles(defs: TextStyleDef[]): Promise<TextStyleSummary> {
  const summary: TextStyleSummary = { created: 0, updated: 0, unchanged: 0, problems: [] };
  if (defs.length === 0) return summary;

  // Read here, after the variables are written, so new variables are found.
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  const themeId = collections.find((c) => c.name === "Theme")?.id;
  const tokens = new Map((await figma.variables.getLocalVariablesAsync("STRING"))
    .filter((v) => v.variableCollectionId === themeId).map((v) => [v.name, v]));
  const existing = new Map<string, TextStyle>();
  for (const style of await figma.getLocalTextStylesAsync()) if (!existing.has(style.name)) existing.set(style.name, style);
  const load = fontLoader(summary.problems);
  let noFont = 0; // styles not written because their font is missing

  for (const def of defs) {
    try {
      const family = tokens.get(def.familyToken);
      const weight = tokens.get(def.weightToken);
      if (!family || !weight) {
        summary.problems.push(`${def.name}: token not found (${!family ? def.familyToken : def.weightToken}).`);
        continue;
      }
      let style = existing.get(def.name);
      const isNew = !style;
      const linked = !!style && style.boundVariables?.fontFamily?.id === family.id && style.boundVariables?.fontStyle?.id === weight.id;
      if (linked && sameNumbers(style!, def)) {
        summary.unchanged++;
        continue;
      }
      // Figma needs a style's own font loaded to change it. The first theme's font is the starting value.
      const fontsReady = await Promise.all(def.fonts.map((font) => load(font)));
      if (!fontsReady[0]) {
        noFont++;
        continue;
      }
      if (!style) {
        style = figma.createTextStyle();
        style.name = def.name;
        existing.set(def.name, style);
      }
      if (!linked) style.fontName = def.fonts[0];
      else await figma.loadFontAsync(style.fontName);
      style.fontSize = def.fontSize;
      style.lineHeight = { unit: "PIXELS", value: def.lineHeight };
      style.letterSpacing = { unit: "PIXELS", value: def.letterSpacing };
      style.setBoundVariable("fontFamily", family);
      style.setBoundVariable("fontStyle", weight);
      if (isNew) summary.created++;
      else summary.updated++;
    } catch (e) {
      summary.problems.push(`${def.name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  if (noFont > 0) summary.problems.push(`${noFont} text style(s) not written, because their font is not available.`);
  return summary;
}
