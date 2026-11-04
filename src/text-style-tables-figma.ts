// Draws the text style tables described by src/text-styles.ts on a page called "Text styles" (foundations-spec.md section 6.1.3).
// Figma-specific. It changes no text style and no variable. On this page it removes only the tables it drew itself
// on an earlier run (they carry a plugin tag). The look follows the color tables in src/tables-figma.ts.

import { C, divider, fixedWidth, loadFonts, solid, stack, text } from "./tables-figma.ts";
import type { Fonts } from "./tables-figma.ts";
import { fontLoader } from "./text-styles-figma.ts";
import { buildTextStyleTables, shortNumber } from "./text-styles.ts";
import type { LiveTextStyle, TextStyleTable } from "./text-styles.ts";
import type { Spec } from "./foundations.ts";

const PAGE_TAG = "text-styles-page"; // marks the page, so it is found again even if renamed
const TABLE_TAG = "text-styles-table"; // marks each table frame this plugin drew
const TABLE_GAP = 120;
const NAME_W = 320;
const SAMPLE_W = 640; // the widest sample, 64px text, fits in this
const SIZE_W = 56;
const LINE_W = 80;
const SPACING_W = 96;
const WEIGHT_W = 96;
const GAP = 40;
const SIDE = 16;

type Ctx = { fonts: Fonts; collection: VariableCollection; sample: string; available: (id: string, modeId: string) => boolean };

export type TextTablesResult = { page: string; tables: number; problems: string[] } | null;

const describe = (v: LineHeight | LetterSpacing): string => {
  if (v.unit === "AUTO") return "Auto";
  return v.unit === "PERCENT" ? `${shortNumber(v.value)}%` : shortNumber(v.value);
};

// Draws the tables from the text styles in the file. With no text style of the plugin's in the file,
// or no Theme collection, it draws nothing and leaves any earlier tables, and returns null.
export async function drawTextStyleTables(spec: Spec): Promise<TextTablesResult> {
  const ts = spec.textStyles;
  const problems: string[] = [];
  const styles = await figma.getLocalTextStylesAsync();
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  const collection = collections.find((c) => c.name === "Theme");
  if (!collection) return null;
  const variables = await figma.variables.getLocalVariablesAsync("STRING");
  const byId = new Map(variables.map((v) => [v.id, v]));

  // The text a linked variable has in a theme: Theme tokens link to a Primitive that holds the text.
  const textIn = (id: string | undefined, modeId: string): string | null => {
    const variable = id ? byId.get(id) : undefined;
    if (!variable) return null;
    const value = variable.valuesByMode[modeId] ?? Object.values(variable.valuesByMode)[0];
    if (typeof value === "string") return value;
    return value && typeof value === "object" && "type" in value && value.type === "VARIABLE_ALIAS" ? textIn(value.id, "") : null;
  };

  const live: LiveTextStyle[] = styles.map((s) => {
    const weightId = s.boundVariables?.fontStyle?.id;
    const token = weightId ? byId.get(weightId)?.name : undefined;
    return {
      id: s.id, name: s.name, fontSize: s.fontSize, lineHeight: describe(s.lineHeight), letterSpacing: describe(s.letterSpacing),
      weight: token ? token.split("/").pop()! : s.fontName.style,
    };
  });
  const tables = buildTextStyleTables(spec, live);
  if (tables.length === 0) return null;

  // Which samples can show their real font. Only styles in a table need their fonts.
  const load = fontLoader(problems);
  const inTables = new Set(tables.flatMap((t) => t.sections.flatMap((x) => x.rows.map((r) => r.id))));
  const ready = new Map<string, boolean>();
  for (const s of styles) {
    if (!inTables.has(s.id)) continue;
    const own = await load(s.fontName);
    for (const { modeId } of collection.modes) {
      const family = textIn(s.boundVariables?.fontFamily?.id, modeId);
      const style = textIn(s.boundVariables?.fontStyle?.id, modeId);
      const inTheme = family && style ? await load({ family, style }) : true;
      ready.set(`${s.id}|${modeId}`, own && inTheme);
    }
  }

  let page = figma.root.children.find((p) => p.getPluginData(PAGE_TAG) === "1") ?? figma.root.children.find((p) => p.name === ts.tables.page);
  if (!page) {
    page = figma.createPage();
    page.name = ts.tables.page;
  }
  page.setPluginData(PAGE_TAG, "1");
  await page.loadAsync();

  const ctx: Ctx = {
    fonts: await loadFonts(), collection, sample: ts.tables.sample,
    available: (id, modeId) => ready.get(`${id}|${modeId}`) ?? false,
  };
  const old = page.children.filter((n) => n.getPluginData(TABLE_TAG) !== "");
  let x = old.length ? Math.min(...old.map((n) => n.x)) : page.children.length ? Math.max(...page.children.map((n) => n.x + n.width)) + 200 : 0;
  const y = old.length ? Math.min(...old.map((n) => n.y)) : 0;

  // New tables are finished before old ones go. If drawing fails, the half-built tables are removed and the old ones stay.
  const drawn: FrameNode[] = [];
  try {
    for (const t of tables) {
      const frame = await drawTable(t, ctx, page, ts.tables.notation, drawn);
      frame.x = x;
      frame.y = y;
      x += frame.width + TABLE_GAP;
    }
  } catch (e) {
    for (const f of drawn) if (!f.removed) f.remove();
    throw e;
  }
  for (const n of old) n.remove();
  return { page: page.name, tables: tables.length, problems };
}

async function drawTable(t: TextStyleTable, ctx: Ctx, page: PageNode, notation: string, drawn: FrameNode[]): Promise<FrameNode> {
  const f = ctx.fonts;
  const themes = ctx.collection.modes;
  const contentW = SIDE + NAME_W + themes.length * (GAP + SAMPLE_W) + GAP + SIZE_W + GAP + LINE_W + GAP + SPACING_W + GAP + WEIGHT_W + SIDE;
  const outer = stack(page, "VERTICAL", { name: `${t.group} text styles`, gap: 0, pad: [40, 40, 40, 40] });
  drawn.push(outer);
  outer.fills = [solid(C.white)];
  outer.cornerRadius = 32;
  fixedWidth(outer, contentW + 80);

  // Title: the same look as the color tables.
  const block = stack(outer, "VERTICAL", { name: "Title", gap: 32, pad: [32, 16, 32, 16] });
  block.layoutSizingHorizontal = "FILL";
  const header = stack(block, "HORIZONTAL", { name: "Header", gap: 32 });
  header.layoutSizingHorizontal = "FILL";
  header.primaryAxisAlignItems = "SPACE_BETWEEN";
  header.counterAxisAlignItems = "BASELINE";
  text(header, t.group, f.bold, 64, null, C.black);
  text(header, `${t.count} styles`, f.bold, 24, null, C.black);
  text(block, t.description, f.body, 16, 20, C.black);
  const meta = stack(block, "HORIZONTAL", { name: "Metadata", gap: 64, pad: [18, 0, 18, 0] });
  meta.layoutSizingHorizontal = "FILL";
  divider(meta, true);
  const modes = themes.map((m) => m.name).join(" / ");
  for (const [label, value] of [["GROUP", t.group], [themes.length > 1 ? "EXPLICIT MODES" : "EXPLICIT MODE", modes], ["VALUE NOTATION", notation]]) {
    const item = stack(meta, "VERTICAL", { name: label, gap: 6 });
    text(item, label, f.medium, 10, 12, C.muted);
    text(item, value, f.regular, 14, 16, C.black);
  }

  const columns: [string, number][] = [
    ["FULL STYLE NAME", NAME_W],
    ...themes.map((m): [string, number] => [m.name, SAMPLE_W]),
    ["SIZE", SIZE_W], ["LINE HEIGHT", LINE_W], ["LETTER SPACING", SPACING_W], ["WEIGHT", WEIGHT_W],
  ];
  for (const section of t.sections) {
    const head = stack(outer, "VERTICAL", { name: "GroupHeader", gap: 32, pad: [48, 0, 0, 0] });
    head.layoutSizingHorizontal = "FILL";
    const title = stack(head, "HORIZONTAL", { name: "Group title", gap: 8, pad: [8, 16, 8, 16] });
    text(title, section.name, f.bold, 32, null, C.black);
    const legend = stack(head, "HORIZONTAL", { name: "Legend", gap: GAP, pad: [16, SIDE, 16, SIDE] });
    legend.fills = [solid(C.legendBg)];
    legend.cornerRadius = 8;
    legend.counterAxisAlignItems = "CENTER";
    legend.resize(1, 64);
    legend.layoutSizingHorizontal = "FILL";
    for (const [label, width] of columns) {
      const l = text(legend, label, f.medium, 10, 12, C.legendText, width);
      l.letterSpacing = { value: 0.7, unit: "PIXELS" };
    }
    for (const r of section.rows) await drawRow(outer, r, ctx);
  }
  outer.setPluginData(TABLE_TAG, t.group);
  return outer;
}

async function drawRow(parent: FrameNode, r: LiveTextStyle, ctx: Ctx): Promise<void> {
  const f = ctx.fonts;
  const line = stack(parent, "HORIZONTAL", { name: r.name, gap: GAP, pad: [16, SIDE, 16, SIDE] });
  line.counterAxisAlignItems = "CENTER";
  line.layoutSizingHorizontal = "FILL";
  divider(line, false);
  text(line, r.name, f.medium, 16, 20, C.black, NAME_W);
  for (const theme of ctx.collection.modes) {
    const cell = stack(line, "HORIZONTAL", { name: theme.name, gap: 0 });
    fixedWidth(cell, SAMPLE_W);
    cell.clipsContent = true;
    cell.setExplicitVariableModeForCollection(ctx.collection, theme.modeId);
    if (ctx.available(r.id, theme.modeId)) {
      const sample = text(cell, ctx.sample, f.regular, 16, null, C.black);
      await sample.setTextStyleIdAsync(r.id);
    } else {
      text(cell, "Font not available", f.regular, 14, 16, C.muted);
    }
  }
  text(line, shortNumber(r.fontSize), f.regular, 14, 16, C.black, SIZE_W);
  text(line, r.lineHeight, f.regular, 14, 16, C.black, LINE_W);
  text(line, r.letterSpacing, f.regular, 14, 16, C.black, SPACING_W);
  text(line, r.weight, f.regular, 14, 16, C.black, WEIGHT_W);
}
