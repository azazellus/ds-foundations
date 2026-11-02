// Describes the ColorScheme color maps drawn next to the color tables: one chart per theme and appearance,
// with every role as a labeled block, like Material's own color scheme chart.
// Pure functions, no Figma API: src/tables-figma.ts draws what this file describes.
// Layout follows the "ColorScheme maps" section (Figma file iazRlRbvKhWQirK81Tr7kX, node 62:5404).

import type { TableSource } from "./tables.ts";

// Size of a map, and the role of its background.
export const MAP_WIDTH = 1872;
export const MAP_HEIGHT = 1272;
export const MAP_BACKGROUND = "surfaceContainer";

// One block: its fill role, the role its label is written in, its text, and its place in the map.
// A "\n" in the label is a line break, as in the design.
export type MapBlock = { role: string; labelRole: string; label: string; x: number; y: number; w: number; h: number };

export type ColorMap = { name: string; themeMode: string; appMode: string; blocks: MapBlock[] };

// The accent column of one role family: the role, "on" role, container and "on" container.
function accentColumn(role: string, Role: string, x: number): MapBlock[] {
  const on = `on${Role}`;
  const container = `${role}Container`;
  const onContainer = `on${Role}Container`;
  return [
    { role, labelRole: on, label: Role, x, y: 104, w: 392, h: 102 },
    { role: on, labelRole: role, label: `On ${Role}`, x, y: 206, w: 392, h: 80 },
    { role: container, labelRole: onContainer, label: `${Role} Container`, x, y: 294, w: 392, h: 102 },
    { role: onContainer, labelRole: on, label: `On ${Role} Container`, x, y: 396, w: 392, h: 80 },
  ];
}

// The fixed roles of one family: two half-width blocks above two full-width ones.
function fixedColumn(role: string, Role: string, x: number): MapBlock[] {
  const fixed = `${role}Fixed`;
  const onFixed = `on${Role}Fixed`;
  return [
    { role: fixed, labelRole: onFixed, label: `${Role}\nFixed`, x, y: 508, w: 196, h: 112 },
    { role: `${role}FixedDim`, labelRole: onFixed, label: `${Role}\nFixed Dim`, x: x + 196, y: 508, w: 196, h: 112 },
    { role: onFixed, labelRole: fixed, label: `On ${Role} Fixed`, x, y: 620, w: 392, h: 72 },
    { role: `on${Role}FixedVariant`, labelRole: fixed, label: `On ${Role} Fixed Variant`, x, y: 692, w: 392, h: 72 },
  ];
}

// Every block of the design, in the order they are drawn.
export const MAP_BLOCKS: MapBlock[] = [
  ...accentColumn("primary", "Primary", 128),
  ...accentColumn("secondary", "Secondary", 528),
  ...accentColumn("tertiary", "Tertiary", 928),
  ...accentColumn("error", "Error", 1352),
  ...fixedColumn("primary", "Primary", 128),
  ...fixedColumn("secondary", "Secondary", 528),
  ...fixedColumn("tertiary", "Tertiary", 928),
  // Surfaces.
  { role: "surfaceDim", labelRole: "onSurface", label: "Surface Dim", x: 128, y: 796, w: 397.333, h: 130 },
  { role: "surface", labelRole: "onSurface", label: "Surface", x: 525.333, y: 796, w: 397.333, h: 130 },
  { role: "surfaceBright", labelRole: "onSurface", label: "Surface Bright", x: 922.667, y: 796, w: 397.333, h: 130 },
  { role: "surfaceContainerLowest", labelRole: "onSurface", label: "Surface\nContainer\nLowest", x: 128, y: 934, w: 238.4, h: 146 },
  { role: "surfaceContainerLow", labelRole: "onSurface", label: "Surface\nContainer Low", x: 366.4, y: 934, w: 238.4, h: 146 },
  { role: "surfaceContainer", labelRole: "onSurface", label: "Surface\nContainer", x: 604.8, y: 934, w: 238.4, h: 146 },
  { role: "surfaceContainerHigh", labelRole: "onSurface", label: "Surface\nContainer High", x: 843.2, y: 934, w: 238.4, h: 146 },
  { role: "surfaceContainerHighest", labelRole: "onSurface", label: "Surface\nContainer\nHighest", x: 1081.6, y: 934, w: 238.4, h: 146 },
  // Text and lines on surfaces.
  { role: "onSurface", labelRole: "inverseOnSurface", label: "On Surface", x: 128, y: 1088, w: 298, h: 80 },
  { role: "onSurfaceVariant", labelRole: "inverseOnSurface", label: "On Surface Variant", x: 426, y: 1088, w: 298, h: 80 },
  { role: "outline", labelRole: "inverseOnSurface", label: "Outline", x: 724, y: 1088, w: 298, h: 80 },
  { role: "outlineVariant", labelRole: "onSurface", label: "Outline Variant", x: 1022, y: 1088, w: 298, h: 80 },
  // The right column: surface variant, background, tint, inverse roles and the scrim.
  { role: "surfaceVariant", labelRole: "onSurface", label: "Surface Variant", x: 1352, y: 542, w: 392, h: 72 },
  { role: "background", labelRole: "onBackground", label: "Background", x: 1352, y: 622, w: 392, h: 72 },
  { role: "onBackground", labelRole: "background", label: "On Background", x: 1352, y: 694, w: 392, h: 72 },
  { role: "surfaceTint", labelRole: "inverseOnSurface", label: "Surface Tint", x: 1352, y: 774, w: 392, h: 72 },
  { role: "inverseSurface", labelRole: "inverseOnSurface", label: "Inverse Surface", x: 1352, y: 854, w: 392, h: 72 },
  { role: "inverseOnSurface", labelRole: "onSurface", label: "Inverse On Surface", x: 1352, y: 928, w: 392, h: 72 },
  { role: "inversePrimary", labelRole: "onPrimaryContainer", label: "Inverse Primary", x: 1352, y: 1008, w: 392, h: 72 },
  { role: "scrim", labelRole: "primaryFixed", label: "Scrim", x: 1352, y: 1088, w: 392, h: 80 },
];

// One map per theme and appearance in the ColorScheme collection. A role the file does not have (no
// tertiary, danger turned off) leaves its place empty, so the other blocks never move.
export function buildColorMaps(source: TableSource): ColorMap[] {
  const modesOf = (c: string): string[] => source.collections.find((x) => x.name === c)?.modes ?? [];
  const themes = modesOf("Theme");
  const roles = new Set(source.variables.filter((v) => v.collection === "ColorScheme" && v.type === "COLOR").map((v) => v.name));
  const blocks = MAP_BLOCKS.filter((b) => roles.has(b.role) && roles.has(b.labelRole));
  return themes.flatMap((themeMode) => modesOf("ColorScheme").map((appMode) => ({
    // With one theme the name is the design's; with more, it also says which theme it shows.
    name: themes.length > 1 ? `ColorScheme map - ${themeMode} ${appMode}` : `ColorScheme map - ${appMode}`,
    themeMode,
    appMode,
    blocks,
  })));
}
