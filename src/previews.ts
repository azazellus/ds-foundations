// The real colors of each appearance card in the plugin window: its canvas, fields, text, and the sample
// words of its preview. They are the first theme's colors, worked out with the same rules that write the
// Appearance variables (section 5.1), so the card shows what "Generate tokens" will make.
// Pure functions, no Figma API: src/figma.ts sends the result to ui.html.

import { appearanceModes, appearanceValueFor } from "./foundations.ts";
import type { Inputs, Spec } from "./foundations.ts";

// Every color is a HEX value. The border is the only one with opacity, as #RRGGBBAA.
export type AppearancePreview = {
  canvas: string;
  input: string;
  border: string;
  icon: string;
  text: string; // Text fill: the neutral bolder text
  textBold: string;
  brandBolder: string;
  brandBold: string;
  softNeutral: string;
  softBrand: string;
};

// A two-digit opacity from a name, such as 24 in ".../a24", as the last two digits of a HEX color.
const alphaHex = (percent: number): string => Math.round((percent / 100) * 255).toString(16).padStart(2, "0").toUpperCase();

// One preview per appearance, in the order Light, Dark (when included), extra appearances.
// neutral and brand are the first theme's palettes: step -> HEX.
export function appearancePreviews(
  spec: Spec, inputs: Inputs, neutral: Record<string, string>, brand: Record<string, string>,
): AppearancePreview[] {
  const black = spec.primitives.baseColors["Color/Black"];
  const white = spec.primitives.baseColors["Color/White"];
  // A Theme token, as used in Appearance values, as its HEX value.
  const hexOf = (alias: string): string => {
    const alpha = alias.match(/^color\/neutral\/alpha\/(black|white)\/a(\d+)$/);
    if (alpha) return (alpha[1] === "black" ? black : white) + alphaHex(Number(alpha[2]));
    if (alias === "color/neutral/black") return black;
    if (alias === "color/neutral/white") return white;
    const step = alias.match(/^color\/(neutral|brand)\/(\d+)$/);
    return step ? (step[1] === "neutral" ? neutral : brand)[step[2]] : "";
  };
  return appearanceModes(spec, inputs).map((mode) => {
    const color = (name: string): string => hexOf(appearanceValueFor(spec, name, spec.appearance.tokens[name][mode.base], mode, []));
    return {
      canvas: color("color/bg/base"),
      input: color("color/bg/input"),
      border: color("color/border/default"),
      icon: color("color/icon/default"),
      text: color("color/text/default"),
      textBold: color("color/text/subtle"),
      brandBolder: color("color/text/brand/strong"),
      brandBold: color("color/text/brand/default"),
      softNeutral: color("color/bg/neutral/softest"),
      softBrand: color("color/bg/brand/softest"),
    };
  });
}
