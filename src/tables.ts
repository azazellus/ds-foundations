// Describes the color tables (Primitives, Theme, Appearance, ColorScheme) drawn on the "Color tokens" page.
// Pure functions, no Figma API: src/tables-figma.ts draws what this file describes.
// Layout follows the "Primitives example", "Theme example" and "Appearance example" frames on the
// "Tables design" page of the Test file.

import type { CollectionName, Plan, Spec, VariableDef } from "./foundations.ts";
import { isValidHex, relativeLuminance } from "./color.ts";
import { appearanceOrder } from "./foundations.ts";

// One cell to the right of the token name.
export type Cell = {
  themeMode?: string; // explicit Theme mode for the swatch (Theme and Appearance tables)
  appMode?: string; // explicit Appearance (or ColorScheme) mode for the swatch (Appearance and ColorScheme tables)
  dark: boolean; // drawn on a black panel (an appearance whose canvas is dark)
  ref?: string; // alias target, shown as "→ name"
  opacityRef?: string; // alpha tokens only: the linked Opacity Primitive
};

export type TableRow = { name: string; cells: Cell[] };
export type TableGroup = { name: string; rows: TableRow[] };

export type Table = {
  collection: CollectionName;
  count: number; // number of tokens (rows) in the table
  description: string;
  modesLabel: string; // "EXPLICIT MODE" or "EXPLICIT MODES"
  modes: string; // "Light / Dark"
  notation: string;
  info: string;
  nameHeader: string; // first legend column
  columns: string[]; // the other legend columns
  groups: TableGroup[];
};

// "Four" for 4, digits above twelve ("Four contexts per token", "16 contexts per token").
const WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve"];
function countWord(n: number): string {
  return WORDS[n] ?? String(n);
}

// "Theme A and Theme B", "Theme A, Theme B and Theme C".
function listOf(items: string[]): string {
  return items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

// True when the canvas token of this theme and appearance resolves to a dark color
// (WCAG relative luminance below 0.18, roughly the middle of the gray scale).
function isDarkContext(spec: Spec, byKey: Map<string, VariableDef>, themeMode: string, appMode: string): boolean {
  const find = (c: CollectionName, name: string) => byKey.get(`${c}|${name}`);
  const canvas = find("Appearance", spec.appearance.contrastCanvas);
  const themeRef = canvas ? aliasOf(canvas, appMode) : undefined;
  const themeVar = themeRef ? find("Theme", themeRef) : undefined;
  const primRef = themeVar ? aliasOf(themeVar, themeMode) : undefined;
  const primVar = primRef ? find("Primitives", primRef) : undefined;
  const hex = primVar ? Object.values(primVar.values)[0] : undefined;
  if (typeof hex === "string" && isValidHex(hex)) return relativeLuminance(hex) < 0.18;
  return appMode === "Dark"; // canvas not found: fall back to the mode name
}

// "Color/Violet/500" -> "Color/Violet"; "Color/Black" -> "Color".
function parentPath(name: string): string {
  const parts = name.split("/");
  return parts.length > 1 ? parts.slice(0, -1).join("/") : name;
}

// "color/bg/brand/bold" -> "color/bg".
function firstTwo(name: string): string {
  return name.split("/").slice(0, 2).join("/");
}

// Groups rows by a key, keeping the order in which keys first appear.
function groupBy(vars: VariableDef[], key: (v: VariableDef) => string, row: (v: VariableDef) => TableRow): TableGroup[] {
  const groups: TableGroup[] = [];
  for (const v of vars) {
    const k = key(v);
    let g = groups.find((x) => x.name === k);
    if (!g) groups.push((g = { name: k, rows: [] }));
    g.rows.push(row(v));
  }
  return groups;
}

const aliasOf = (v: VariableDef, mode: string): string | undefined => {
  const val = v.values[mode];
  return typeof val === "object" ? val.alias : undefined;
};

// The Opacity Primitive an alpha token links to in this mode, if any.
const opacityAliasOf = (v: VariableDef, mode: string): string | undefined => {
  const val = v.values[mode];
  return typeof val === "object" ? val.opacityAlias : undefined;
};

// What the tables are built from: the plan just written, or the variables read live from the Figma file
// (the "Update tables only" button). Only collections, modes and variables are needed.
export type TableSource = Pick<Plan, "collections" | "variables">;

// Builds one table per collection that exists in the source, in the order Primitives, Theme, Appearance, ColorScheme.
export function buildTables(spec: Spec, source: TableSource): Table[] {
  const has = (c: CollectionName): boolean => source.collections.some((x) => x.name === c);
  const modesOf = (c: CollectionName): string[] => source.collections.find((x) => x.name === c)?.modes ?? [];
  const colors = (c: CollectionName): VariableDef[] => source.variables.filter((v) => v.collection === c && v.type === "COLOR");

  // ----- Primitives: one swatch and HEX per color -----
  const prim = colors("Primitives");
  const primMode = modesOf("Primitives")[0];
  const ramps = new Set(prim.map((v) => v.name.split("/")).filter((p) => p.length === 3).map((p) => p[1])).size;
  const primitives: Table = {
    collection: "Primitives",
    count: prim.length,
    description: "The source palettes. Absolute color values before semantic meaning.",
    modesLabel: "EXPLICIT MODE",
    modes: primMode,
    notation: "HEX",
    info: `${ramps} tonal ramps × ${spec.primitives.steps.length} steps, plus Black and White. ` +
      `Token names retain their source capitalization. Swatches are bound to the original Primitives variables in ${primMode} mode.`,
    nameHeader: "FULL TOKEN NAME",
    columns: ["VALUE", "HEX"],
    groups: groupBy(prim, (v) => parentPath(v.name), (v) => ({ name: v.name, cells: [{ dark: false }] })),
  };

  // ----- Theme: one column per theme, showing the Primitive each theme points to -----
  const themeModes = modesOf("Theme");
  const many = themeModes.length > 1;
  const theme: Table = {
    collection: "Theme",
    count: colors("Theme").length,
    description: themeModes.length === 2
      ? "Semantic palettes, compared side by side across both themes."
      : many
        ? `Semantic palettes, compared side by side across all ${themeModes.length} themes.`
        : "Semantic palettes, each role resolved to its Primitive.",
    modesLabel: many ? "EXPLICIT MODES" : "EXPLICIT MODE",
    modes: themeModes.join(" / "),
    notation: "Primitive color token, primitive opacity token (optional)",
    info: (many
      ? `Each row is one source variable. The ${countWord(themeModes.length).toLowerCase()} columns resolve that same variable in ${listOf(themeModes)}. `
      : `Each row is one source variable, resolved in ${themeModes[0] ?? "Theme A"}. `) +
      "Arrows show exact alias targets; literal alpha colors retain their source opacity. Swatches sit on a light neutral substrate.",
    nameHeader: "TOKEN NAME AND DESCRIPTION",
    columns: themeModes.map((m) => m.toUpperCase()),
    groups: groupBy(colors("Theme"), (v) => firstTwo(v.name), (v) => ({
      name: v.name,
      cells: themeModes.map((m) => ({
        themeMode: m,
        dark: false,
        ref: aliasOf(v, m),
        // Alpha tokens: the opacity link actually stored on the variable.
        opacityRef: opacityAliasOf(v, m),
      })),
    })),
  };

  // ----- Appearance: one column per theme and appearance combination -----
  const appModes = modesOf("Appearance");
  const contexts = themeModes.flatMap((t) => appModes.map((a) => ({ t, a })));
  // A column is drawn on a black panel when its canvas color is dark, so Dark-based extra appearances
  // are recognised by their colors, not by their name.
  const byKey = new Map(source.variables.map((v) => [`${v.collection}|${v.name}`, v]));
  const darkOf = new Map(contexts.map(({ t, a }) => [`${t}|${a}`, isDarkContext(spec, byKey, t, a)]));
  // Rows in appearance.order (groups elevation, bg, text, border, icon; then emphasis), even when the
  // file's variables were created in another order. Unknown groups (added by hand in Figma) go last.
  const appVars = appearanceOrder(spec, colors("Appearance").map((v) => v.name)).map((n) => byKey.get(`Appearance|${n}`)!);
  const appGroups = groupBy(appVars, (v) => firstTwo(v.name), (v) => ({
    name: v.name,
    cells: contexts.map(({ t, a }) => ({ themeMode: t, appMode: a, dark: darkOf.get(`${t}|${a}`)!, ref: aliasOf(v, a) })),
  }));
  const appearance: Table = {
    collection: "Appearance",
    count: colors("Appearance").length,
    description: "Application roles across every theme and appearance combination.",
    modesLabel: "EXPLICIT MODES",
    modes: appModes.join(" / "),
    notation: "Theme color token",
    info: `${countWord(contexts.length)} contexts per token. Read each alias chain from Mode → Theme → Primitives; ` +
      "every value and bound swatch uses the same explicit theme and appearance. " +
      "Identical values are repeated so no combination is implicit. Literal colors are labeled directly.",
    nameHeader: "TOKEN NAME AND DESCRIPTION",
    columns: contexts.map(({ t, a }) => `${t} ${a}`.toUpperCase()),
    groups: appGroups,
  };

  // ----- ColorScheme: like Appearance, rows in colorScheme.tokens order (Compose order) -----
  const csModes = modesOf("ColorScheme");
  const csContexts = themeModes.flatMap((t) => csModes.map((a) => ({ t, a })));
  const csSpec: { name: string; group: string }[] = spec.colorScheme.tokens;
  // Tokens the spec does not know (added by hand in Figma) go last, in the file's order.
  const rank = (name: string): number => {
    const i = csSpec.findIndex((x) => x.name === name);
    return i < 0 ? csSpec.length : i;
  };
  const csVars = [...colors("ColorScheme")].sort((a, b) => rank(a.name) - rank(b.name));
  const colorScheme: Table = {
    collection: "ColorScheme",
    count: csVars.length,
    description: "Material 3 color roles for Android (Jetpack Compose ColorScheme), across every theme and appearance.",
    modesLabel: "EXPLICIT MODES",
    modes: csModes.join(" / "),
    notation: "Theme color token",
    info: `${countWord(csContexts.length)} contexts per token. Names are the Compose names. Read each alias chain from Mode → Theme → Primitives; ` +
      "roles that match an Appearance token use the same Theme token in every mode.",
    nameHeader: "TOKEN NAME AND DESCRIPTION",
    columns: csContexts.map(({ t, a }) => `${t} ${a}`.toUpperCase()),
    groups: groupBy(csVars, (v) => csSpec.find((x) => x.name === v.name)?.group ?? "other", (v) => ({
      name: v.name,
      cells: csContexts.map(({ t, a }) => ({
        themeMode: t, appMode: a, dark: darkOf.get(`${t}|${a}`) ?? isDarkContext(spec, byKey, t, a), ref: aliasOf(v, a),
      })),
    })),
  };

  return [primitives, theme, appearance, colorScheme].filter((t) => has(t.collection));
}
