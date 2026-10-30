// Draws the color tables described by src/tables.ts on a page called "Color tokens".
// Figma-specific: this file creates frames and text. It never deletes variables, and on this page it
// removes only the tables it drew itself on an earlier run (they carry a plugin tag).
// Sizes, fonts and colors follow the CollectionTitle, GroupHeader and Row components on the
// "Tables design" page of the Test file.

import type { Cell, Table, TableRow } from "./tables.ts";

const PAGE_NAME = "Color tokens";
const PAGE_TAG = "color-tokens-page"; // marks the page, so it is found again even if renamed
const TABLE_TAG = "color-tokens-table"; // marks each table frame this plugin drew
const TABLE_GAP = 120; // space between the tables on the page

// Design colors (#RRGGBB).
const C = {
  black: "#000000",
  white: "#FFFFFF",
  muted: "#6D6D6D", // metadata labels, descriptions, alias lines on Light cells
  mutedDark: "#757575", // alias lines on Dark cells
  legendText: "#6A6A6A",
  legendBg: "#F1F1F1",
  divider: "#A2A2A2", // used at 24% opacity
  checker: "#D9D9D9", // grey squares behind transparent swatches
};

// Column widths and spacing from the design.
const NAME_W = 320;
const CELL_W = 320;
const GAP = 40;
const SIDE = 16; // left and right padding of rows and legends
const ROW_H = 64; // Theme and Appearance rows, cells and legends
const PRIM_ROW_H = 48; // Primitives rows (the swatch fills the full height)
const TILE = 40; // Theme and Appearance swatch size
const CHECK = 10; // checkerboard square size behind transparent swatches

type Fonts = Record<"bold" | "medium" | "regular" | "light" | "body", FontName>;

// What the drawing needs from the file's variables.
type Ctx = {
  fonts: Fonts;
  byKey: Map<string, Variable>; // "Collection|name" -> variable
  byId: Map<string, Variable>;
  collections: Map<string, VariableCollection>; // by name
  collectionsById: Map<string, VariableCollection>;
};

// ---------- Entry point ----------

export async function drawColorTables(tables: Table[]): Promise<{ page: string; tables: number }> {
  const ctx = await loadContext();

  // Find the page (by tag, then by name) or create it.
  let page = figma.root.children.find((p) => p.getPluginData(PAGE_TAG) === "1")
    ?? figma.root.children.find((p) => p.name === PAGE_NAME);
  if (!page) {
    page = figma.createPage();
    page.name = PAGE_NAME;
  }
  page.setPluginData(PAGE_TAG, "1");
  await page.loadAsync();

  // Put the new tables where the old ones were, or to the right of anything else on the page.
  const old = page.children.filter((n) => n.getPluginData(TABLE_TAG) !== "");
  let x = old.length ? Math.min(...old.map((n) => n.x))
    : page.children.length ? Math.max(...page.children.map((n) => n.x + n.width)) + 200 : 0;
  const y = old.length ? Math.min(...old.map((n) => n.y)) : 0;

  // Draw the new tables on this page (never on the page the user is looking at), and remove the old
  // ones only once all new ones are finished. If drawing fails, the half-built tables are removed
  // and the old ones stay.
  const drawn: FrameNode[] = [];
  try {
    for (const t of tables) {
      const frame = drawTable(t, ctx, page);
      drawn.push(frame);
      frame.x = x;
      frame.y = y;
      x += frame.width + TABLE_GAP;
    }
  } catch (e) {
    for (const f of drawn) if (!f.removed) f.remove();
    throw e;
  }
  for (const n of old) n.remove();
  return { page: page.name, tables: tables.length };
}

async function loadContext(): Promise<Ctx> {
  const vars = await figma.variables.getLocalVariablesAsync();
  const cols = await figma.variables.getLocalVariableCollectionsAsync();
  const collectionsById = new Map(cols.map((c) => [c.id, c]));
  return {
    fonts: await loadFonts(),
    byKey: new Map(vars.map((v) => [`${collectionsById.get(v.variableCollectionId)?.name}|${v.name}`, v])),
    byId: new Map(vars.map((v) => [v.id, v])),
    collections: new Map(cols.map((c) => [c.name, c])),
    collectionsById,
  };
}

// The design uses Inter Display; Inter is used when Inter Display is not installed.
async function loadFonts(): Promise<Fonts> {
  const pick = async (style: string): Promise<FontName> => {
    try {
      await figma.loadFontAsync({ family: "Inter Display", style });
      return { family: "Inter Display", style };
    } catch {
      await figma.loadFontAsync({ family: "Inter", style });
      return { family: "Inter", style };
    }
  };
  await figma.loadFontAsync({ family: "Inter", style: "Regular" });
  return {
    bold: await pick("Bold"),
    medium: await pick("Medium"),
    regular: await pick("Regular"),
    light: await pick("Light"),
    body: { family: "Inter", style: "Regular" }, // descriptions and info text use plain Inter in the design
  };
}

// ---------- Table parts ----------

// The table frame is placed on the target page first; everything else is built inside it.
// The plugin tag goes on last, so a frame that failed halfway is never mistaken for a finished table.
function drawTable(t: Table, ctx: Ctx, page: PageNode): FrameNode {
  const cellCount = t.collection === "Primitives" ? 0 : t.columns.length;
  const contentW = t.collection === "Primitives"
    ? SIDE + NAME_W + GAP + 120 + GAP + 80 + SIDE
    : SIDE + NAME_W + cellCount * (GAP + CELL_W) + SIDE;

  const outer = stack(page, "VERTICAL", { name: `${t.collection} color tokens`, gap: 0, pad: [40, 40, 40, 40] });
  outer.fills = [solid(C.white)];
  outer.cornerRadius = 32;
  fixedWidth(outer, contentW + 80);

  titleBlock(outer, t, ctx);
  for (const g of t.groups) {
    groupHeader(outer, g.name, t, ctx);
    for (const r of g.rows) row(outer, r, t, ctx);
  }
  outer.setPluginData(TABLE_TAG, t.collection);
  return outer;
}

// Every builder below receives its parent and attaches each new layer to it straight away,
// so nothing is ever left on the page the user is looking at.

// CollectionTitle: name, token count, description, metadata line, info paragraph.
function titleBlock(parent: FrameNode, t: Table, ctx: Ctx): void {
  const f = ctx.fonts;
  const block = stack(parent, "VERTICAL", { name: "CollectionTitle", gap: 32, pad: [32, 16, 32, 16] });
  block.layoutSizingHorizontal = "FILL";

  const header = stack(block, "HORIZONTAL", { name: "Collection header", gap: 32 });
  header.layoutSizingHorizontal = "FILL";
  header.primaryAxisAlignItems = "SPACE_BETWEEN";
  header.counterAxisAlignItems = "BASELINE";
  text(header, t.collection, f.bold, 64, null, C.black);
  text(header, `${t.count} tokens`, f.bold, 24, null, C.black);

  text(block, t.description, f.body, 16, 20, C.black);

  const meta = stack(block, "VERTICAL", { name: "Collection specification", gap: 0 });
  meta.layoutSizingHorizontal = "FILL";
  const specRow = stack(meta, "HORIZONTAL", { name: "Collection metadata", gap: 64, pad: [18, 0, 18, 0] });
  specRow.layoutSizingHorizontal = "FILL";
  divider(specRow, true);
  for (const [label, value] of [["COLLECTION", t.collection], [t.modesLabel, t.modes], ["VALUE NOTATION", t.notation]]) {
    const item = stack(specRow, "VERTICAL", { name: label, gap: 6 });
    text(item, label, f.medium, 10, 12, C.muted);
    text(item, value, f.regular, 14, 16, C.black);
  }
  const infoWrap = stack(meta, "VERTICAL", { name: "Info", gap: 16, pad: [18, 0, 18, 0] });
  infoWrap.layoutSizingHorizontal = "FILL";
  text(infoWrap, t.info, f.body, 10, 14, C.black, NAME_W);
}

// GroupHeader: group title and the grey legend bar.
function groupHeader(parent: FrameNode, name: string, t: Table, ctx: Ctx): void {
  const f = ctx.fonts;
  const block = stack(parent, "VERTICAL", { name: "GroupHeader", gap: 32, pad: [48, 0, 0, 0] });
  block.layoutSizingHorizontal = "FILL";
  const title = stack(block, "HORIZONTAL", { name: "Group title", gap: 8, pad: [8, 16, 8, 16] });
  text(title, name, f.bold, 32, null, C.black);

  // Legend bar: fixed 64px tall, labels centred vertically.
  const legend = stack(block, "HORIZONTAL", { name: "Legend", gap: GAP, pad: [16, SIDE, 16, SIDE] });
  legend.fills = [solid(C.legendBg)];
  legend.cornerRadius = 8;
  legend.counterAxisAlignItems = "CENTER";
  legend.resize(1, ROW_H); // fixes the height; the width is set to FILL next
  legend.layoutSizingHorizontal = "FILL";
  legendText(legend, t.nameHeader, NAME_W, ctx);
  if (t.collection === "Primitives") {
    legendText(legend, t.columns[0], 120, ctx);
    legendText(legend, t.columns[1], 80, ctx);
  } else {
    // Which columns are Dark: their labels are indented further, to line up with the Dark cells.
    const firstRow = t.groups[0]?.rows[0];
    for (const [i, col] of t.columns.entries()) {
      const indent = firstRow?.cells[i]?.dark ? 24 : 16;
      const wrap = stack(legend, "HORIZONTAL", { name: col, gap: 8, pad: [0, 0, 0, indent] });
      fixedWidth(wrap, CELL_W);
      legendText(wrap, col, CELL_W - indent, ctx);
    }
  }
}

function legendText(parent: FrameNode, label: string, width: number, ctx: Ctx): void {
  const t = text(parent, label, ctx.fonts.medium, 10, 12, C.legendText, width);
  t.letterSpacing = { value: 0.7, unit: "PIXELS" };
}

// Row: token name, then one swatch cell per column.
function row(parent: FrameNode, r: TableRow, t: Table, ctx: Ctx): void {
  const f = ctx.fonts;
  const variable = ctx.byKey.get(`${t.collection}|${r.name}`);

  // Primitives: 48px rows without dividers; the swatch fills the row height.
  if (t.collection === "Primitives") {
    const line = stack(parent, "HORIZONTAL", { name: r.name, gap: GAP, pad: [0, SIDE, 0, SIDE] });
    line.counterAxisAlignItems = "CENTER";
    line.resize(1, PRIM_ROW_H); // the width is set to FILL next
    line.layoutSizingHorizontal = "FILL";
    const rgba = variable ? resolve(variable, new Map(), ctx) : null;
    text(line, r.name, f.medium, 16, 20, C.black, NAME_W);
    swatch(line, variable, 120, PRIM_ROW_H, rgba);
    text(line, rgba ? toHex(rgba, false) : "—", f.regular, 14, 16, C.black, 80);
    return;
  }

  // Theme, Appearance and ColorScheme: 64px rows with a divider. Appearance and ColorScheme rows have no right padding.
  const perAppearance = t.collection === "Appearance" || t.collection === "ColorScheme";
  const line = stack(parent, "HORIZONTAL", { name: r.name, gap: GAP, pad: [8, perAppearance ? 0 : SIDE, 8, SIDE] });
  line.counterAxisAlignItems = "CENTER";
  line.resize(1, ROW_H); // the width is set to FILL next
  line.layoutSizingHorizontal = "FILL";
  divider(line, false);

  const nameCol = stack(line, "VERTICAL", { name: "Token", gap: 4 });
  text(nameCol, r.name, f.medium, 16, 20, C.black, NAME_W);
  // Appearance and ColorScheme rows show the variable's own Figma description, when it has one.
  if (perAppearance && variable?.description) {
    text(nameCol, variable.description, f.light, 10, 12, C.muted, NAME_W);
  }
  for (const cell of r.cells) swatchCell(line, cell, variable, t, ctx);
}

// One Theme or Appearance cell: swatch plus details, in an explicit theme (and appearance) mode.
function swatchCell(parent: FrameNode, cell: Cell, variable: Variable | undefined, t: Table, ctx: Ctx): void {
  const f = ctx.fonts;
  // Fixed 320×64. Dark cells are square black panels with more left padding, so they join into columns.
  const box = stack(parent, "HORIZONTAL", {
    name: [cell.themeMode, cell.appMode].filter(Boolean).join(" "),
    gap: 16,
    pad: [8, 8, 8, cell.dark ? 16 : 8],
  });
  box.counterAxisAlignItems = "CENTER";
  box.resize(CELL_W, ROW_H);
  if (cell.dark) box.fills = [solid(C.black)];

  // Explicit modes, so the bound swatch shows this exact theme and appearance.
  const modes = new Map<string, string>();
  const setMode = (collection: string, modeName?: string): void => {
    const col = ctx.collections.get(collection);
    const mode = col?.modes.find((m) => m.name === modeName);
    if (col && mode) {
      box.setExplicitVariableModeForCollection(col, mode.modeId);
      modes.set(col.id, mode.modeId);
    }
  };
  setMode("Theme", cell.themeMode);
  setMode("Appearance", cell.appMode);
  setMode("ColorScheme", cell.appMode); // same mode names as Appearance

  // The color this swatch shows in this cell's modes: used for the HEX label and the white-only stroke.
  const rgba = variable ? resolve(variable, modes, ctx) : null;
  swatch(box, variable, TILE, TILE, rgba);
  const details = stack(box, "VERTICAL", { name: "Color details", gap: 6 });
  details.layoutSizingHorizontal = "FILL";

  const lines: [string, FontName, number, number, string][] = [];
  if (t.collection === "Theme") {
    lines.push([`→ ${cell.ref ?? "—"}`, f.regular, 14, 16, C.black]);
    if (cell.opacityRef) lines.push([`→ ${cell.opacityRef}`, f.regular, 14, 16, C.black]);
  } else {
    lines.push([rgba ? toHex(rgba, true) : "—", f.regular, 14, 16, cell.dark ? C.white : C.black]);
    lines.push([`→ ${cell.ref ?? "—"}`, f.regular, 12, 14, cell.dark ? C.mutedDark : C.muted]);
  }
  for (const [chars, font, size, lh, color] of lines) {
    const tn = text(details, chars, font, size, lh, color);
    tn.textAutoResize = "HEIGHT"; // wrap first, then stretch to the cell width
    tn.layoutSizingHorizontal = "FILL";
  }
}

// A rounded swatch whose fill is bound to the variable. rgba is the color it shows in its cell's modes.
// - Opaque: one rectangle. The thin outline is added only for pure white, which would vanish on the white table.
// - Transparent (opacity below 100%): the color sits on a white and grey checkerboard, as in the
//   "TransparentSwatch" example on the Tables design page. Three layers: a clipping frame with the
//   outline, one vector holding all grey squares, and the bound color rectangle.
function swatch(parent: FrameNode, variable: Variable | undefined, w: number, h: number, rgba: RGBA | null): void {
  const paint = solid(C.white);
  const fill = variable ? figma.variables.setBoundVariableForPaint(paint, "color", variable) : paint;

  if (!rgba || rgba.a >= 1) {
    const rect = figma.createRectangle();
    parent.appendChild(rect);
    rect.name = "#color_tile";
    rect.resize(w, h);
    rect.fills = [fill];
    rect.cornerRadius = 8;
    if (isWhite(rgba)) outline(rect);
    return;
  }

  const frame = figma.createFrame();
  parent.appendChild(frame);
  frame.name = "#color_tile";
  frame.resize(w, h);
  frame.cornerRadius = 8;
  frame.clipsContent = true;
  frame.fills = [solid(C.white)];
  outline(frame);
  checkerboard(frame, w, h);
  const rect = figma.createRectangle();
  frame.appendChild(rect);
  rect.name = "Color";
  rect.resize(w, h);
  rect.fills = [fill];
}

// Grey squares of the checkerboard as a single vector; the white squares are the frame's own fill.
// Squares are 10×10 at any swatch size and start white in the top-left corner.
const checkerPaths = new Map<string, string>(); // "w×h" -> path data; only two swatch sizes exist

function checkerboard(parent: FrameNode, w: number, h: number): void {
  const sizeKey = `${w}×${h}`;
  let data = checkerPaths.get(sizeKey);
  if (!data) {
    const squares: string[] = [];
    for (let row = 0; row * CHECK < h; row++) {
      for (let col = 0; col * CHECK < w; col++) {
        if ((row + col) % 2 === 0) continue;
        const x = col * CHECK, y = row * CHECK;
        squares.push(`M ${x} ${y} L ${x + CHECK} ${y} L ${x + CHECK} ${y + CHECK} L ${x} ${y + CHECK} Z`);
      }
    }
    data = squares.join(" ");
    checkerPaths.set(sizeKey, data);
  }
  const v = figma.createVector();
  parent.appendChild(v);
  v.name = "Checkerboard";
  v.vectorPaths = [{ windingRule: "NONZERO", data }];
  v.fills = [solid(C.checker)];
  v.strokes = [];
  v.x = 0;
  v.y = 0;
}

function outline(node: RectangleNode | FrameNode): void {
  node.strokes = [solid(C.black, 0.08)];
  node.strokeWeight = 1;
  node.strokeAlign = "INSIDE";
}

// ---------- Value resolution ----------

// Follows aliases to the final color, using the given mode per collection (default mode otherwise).
// Reads the live variables, so alpha tokens include their linked opacity.
function resolve(v: Variable, modes: Map<string, string>, ctx: Ctx, depth = 0): RGBA | null {
  const val = valueIn(v, modes, ctx);
  return val === undefined || depth > 10 ? null : resolveValue(val, modes, ctx, depth);
}

function valueIn(v: Variable, modes: Map<string, string>, ctx: Ctx): VariableValue | undefined {
  const col = ctx.collectionsById.get(v.variableCollectionId);
  return col ? v.valuesByMode[modes.get(col.id) ?? col.defaultModeId] : undefined;
}

function resolveValue(val: VariableValue, modes: Map<string, string>, ctx: Ctx, depth: number): RGBA | null {
  if (typeof val !== "object" || val === null) return null;
  if ("type" in val && val.type === "VARIABLE_ALIAS") {
    const next = ctx.byId.get(val.id);
    return next ? resolve(next, modes, ctx, depth + 1) : null;
  }
  // Composed color (alpha tokens): the color, with its opacity percentage (0–100) applied.
  if ("color" in val && "opacity" in val) {
    const base = resolveValue(val.color, modes, ctx, depth + 1);
    const pct = typeof val.opacity === "number" ? val.opacity : resolveNumber(val.opacity, modes, ctx);
    return base && pct !== null ? { ...base, a: base.a * (pct / 100) } : null;
  }
  if ("r" in val) return { r: val.r, g: val.g, b: val.b, a: "a" in val ? (val as RGBA).a : 1 };
  return null;
}

// Follows an alias to a number (the Opacity Primitives).
function resolveNumber(alias: VariableAlias, modes: Map<string, string>, ctx: Ctx): number | null {
  let cur = ctx.byId.get(alias.id);
  for (let depth = 0; cur && depth < 10; depth++) {
    const val = valueIn(cur, modes, ctx);
    if (typeof val === "number") return val;
    if (val && typeof val === "object" && "type" in val && val.type === "VARIABLE_ALIAS") cur = ctx.byId.get(val.id);
    else return null;
  }
  return null;
}

// True for pure white (#FFFFFF), whatever its opacity. Unknown colors count as not white.
function isWhite(c: RGBA | null): boolean {
  return c !== null && [c.r, c.g, c.b].every((v) => Math.round(v * 255) === 255);
}

// "#RRGGBB", or "#RRGGBBAA" when withAlpha is true.
function toHex(c: RGBA, withAlpha: boolean): string {
  const ch = [c.r, c.g, c.b, ...(withAlpha ? [c.a] : [])];
  return "#" + ch.map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("").toUpperCase();
}

// ---------- Small builders ----------

// An auto-layout frame that hugs its content, with no fill, attached to its parent at once.
function stack(
  parent: BaseNode & ChildrenMixin, dir: "HORIZONTAL" | "VERTICAL",
  o: { name: string; gap: number; pad?: [number, number, number, number] },
): FrameNode {
  const fr = figma.createFrame();
  parent.appendChild(fr);
  fr.name = o.name;
  fr.layoutMode = dir;
  fr.primaryAxisSizingMode = "AUTO";
  fr.counterAxisSizingMode = "AUTO";
  if (o.gap) fr.itemSpacing = o.gap;
  // New frames already have zero padding, so only non-zero sides are set (fewer calls into Figma).
  const [t, r, b, l] = o.pad ?? [0, 0, 0, 0];
  if (t) fr.paddingTop = t;
  if (r) fr.paddingRight = r;
  if (b) fr.paddingBottom = b;
  if (l) fr.paddingLeft = l;
  fr.fills = [];
  fr.clipsContent = false;
  return fr;
}

// Gives an auto-layout frame a fixed width while its height keeps fitting its content.
// resize() fixes both directions, so the height is switched back to "fit content" afterwards.
// Sizes are never read while drawing: reading one makes Figma re-measure the whole table so far.
function fixedWidth(fr: FrameNode, width: number): void {
  fr.resize(width, 1);
  fr.layoutSizingHorizontal = "FIXED";
  fr.layoutSizingVertical = "HUG";
}

// A 1px divider line at 24% opacity: top and bottom (metadata line) or bottom only (rows).
function divider(fr: FrameNode, topToo: boolean): void {
  fr.strokes = [solid(C.divider, 0.24)];
  fr.strokeAlign = "OUTSIDE";
  fr.strokeTopWeight = topToo ? 1 : 0;
  fr.strokeBottomWeight = 1;
  fr.strokeLeftWeight = 0;
  fr.strokeRightWeight = 0;
}

// A text layer attached to its parent. With a width it wraps; without, it grows to fit.
// lineHeight null means auto.
function text(
  parent: FrameNode, chars: string, font: FontName, size: number, lineHeight: number | null, color: string, width?: number,
): TextNode {
  const t = figma.createText();
  parent.appendChild(t);
  t.fontName = font;
  t.fontSize = size;
  t.characters = chars;
  t.lineHeight = lineHeight === null ? { unit: "AUTO" } : { value: lineHeight, unit: "PIXELS" };
  t.fills = [solid(color)];
  if (width !== undefined) {
    t.resize(width, lineHeight ?? size); // any height: HEIGHT below recomputes it from the text
    t.textAutoResize = "HEIGHT";
  }
  return t;
}

function solid(hex: string, opacity?: number): SolidPaint {
  return {
    type: "SOLID",
    color: { r: parseInt(hex.slice(1, 3), 16) / 255, g: parseInt(hex.slice(3, 5), 16) / 255, b: parseInt(hex.slice(5, 7), 16) / 255 },
    ...(opacity !== undefined ? { opacity } : {}),
  };
}
