// Figma side of the plugin. This is the only file that uses the Figma API.
// It shows the form (ui.html), asks src/foundations.ts for a plan, and writes the plan into the open file.
// Implements foundations-spec.md sections 5.8 and 6.3. It never deletes variables or modes.

import spec from "../spec/tokens.json";
import { buildPlan, hueOnlyShifts, namePalettes } from "./foundations.ts";
import type { CollectionName, Inputs, Plan, ReportEntry, Value, VariableDef } from "./foundations.ts";
import { appearancePreviews } from "./previews.ts";
import { fileHasTokens, inputsToShow, readSavedInputs } from "./saved-inputs.ts";
import { clampWindowSize, WINDOW_SIZE } from "./window-size.ts";
import { buildTables } from "./tables.ts";
import { buildAppearanceExport, buildColorSchemeExport, exportFiles, kotlinFiles } from "./export.ts";
import type { ExportOptions } from "./export.ts";
import type { TableSource } from "./tables.ts";
import { drawColorTables } from "./tables-figma.ts";
import { buildColorMaps } from "./color-maps.ts";
import { checkRenames, ensureModes, findOrphanModes, matchModes } from "./modes-figma.ts";
import type { ModeMatch } from "./modes-figma.ts";
import { plannedPaletteRenames, renamePalettes, storePaletteSources } from "./palettes-figma.ts";

// What happened during a write, shown to the user next to the validation report.
// updated = an existing variable had at least one value or its scopes changed; unchanged = nothing to write.
type WriteSummary = { created: number; updated: number; unchanged: number; problems: string[]; renamed: string[]; tablesPage?: string };

// Where the form's settings are saved: in the file, so each file keeps its own (section 6.3).
const FILE_INPUTS = "form-inputs";
// Earlier versions kept one copy per user, in every file. It is only read now, for files they generated.
const OLDER_STORAGE_KEY = "last-inputs";

// Light or dark window: this person's choice, in every file.
const UI_MODE_KEY = "ui-mode";

// The size of the window: this person's choice too.
const WINDOW_SIZE_KEY = "window-size";

figma.showUI(__html__, { width: WINDOW_SIZE.defaultWidth, height: WINDOW_SIZE.defaultHeight });
figma.clientStorage.getAsync(WINDOW_SIZE_KEY).then((size) => {
  if (!size) return;
  const { width, height } = clampWindowSize(size.width, size.height);
  figma.ui.resize(width, height);
});
figma.clientStorage.getAsync(UI_MODE_KEY).then((mode) => {
  if (mode) figma.ui.postMessage({ type: "ui-mode", mode });
});

// The font families installed in Figma, with their non-italic styles (for the font and weight lists).
let fontStyles: Record<string, string[]> | null = null;
async function loadFontStyles(): Promise<Record<string, string[]>> {
  if (fontStyles) return fontStyles;
  const styles: Record<string, string[]> = {};
  for (const f of await figma.listAvailableFontsAsync()) {
    if (/italic|oblique/i.test(f.fontName.style)) continue;
    (styles[f.fontName.family] ??= []).push(f.fontName.style);
  }
  fontStyles = styles;
  return styles;
}

// The settings the form opens with: this file's, or the defaults when the file has no tokens (section 6.3).
async function settingsForThisFile(): Promise<Inputs | null> {
  const variables = await figma.variables.getLocalVariablesAsync();
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  const nameOf = new Map(collections.map((c) => [c.id, c.name]));
  const hasTokens = fileHasTokens(variables.map((v) => nameOf.get(v.variableCollectionId)));
  const older = (await figma.clientStorage.getAsync(OLDER_STORAGE_KEY)) ?? null;
  return inputsToShow(hasTokens, readSavedInputs(figma.root.getPluginData(FILE_INPUTS)), older);
}

// Send the fonts and the settings to the form, so the user does not have to type them again.
(async () => {
  const saved = await settingsForThisFile();
  // Values from spec/tokens.json that the form shows, so the form never holds its own copy.
  const ui = {
    gray: spec.primitives.neutralPalette.steps, // swatches of the canvas dropdowns
    slots: Object.values(spec.theme.typography as Record<string, string>)
      .filter((src) => src.startsWith("input:fontWeights."))
      .map((src) => src.split(".")[1]), // weight styles ticked by default
    lightSteps: spec.inputs.lightCanvasStep.allowed,
    darkSteps: spec.inputs.darkCanvasStep.allowed,
    lightFillSteps: spec.inputs.lightTextFillStep.allowed,
    darkFillSteps: spec.inputs.darkTextFillStep.allowed,
    steps: [...spec.primitives.steps].sort((a, b) => a - b), // palette steps, lightest first
    firstThemeName: spec.collections.Theme.firstModeName, // default names
    customThemeName: spec.collections.Theme.customModeName,
    customAppearanceName: spec.inputs.extraAppearances.defaultName,
  };
  figma.ui.postMessage({ type: "saved-inputs", inputs: saved ?? null, fonts: await loadFontStyles(), ui });
})();

figma.ui.onmessage = async (msg: {
  type: string; inputs: Inputs; write: boolean; options: ExportChoice; mode: string; width: number; height: number;
}) => {
  // While the resize handle is dragged, the window follows it. The size is remembered when it is released.
  if (msg.type === "resize" || msg.type === "resize-end") {
    const { width, height } = clampWindowSize(msg.width, msg.height);
    figma.ui.resize(width, height);
    if (msg.type === "resize-end") await figma.clientStorage.setAsync(WINDOW_SIZE_KEY, { width, height });
    return;
  }
  if (msg.type === "ui-mode") return figma.clientStorage.setAsync(UI_MODE_KEY, msg.mode);
  if (msg.type === "tables") return updateTablesOnly();
  if (msg.type === "export") return exportTokens(msg.options);
  if (msg.type === "names") return previewNames(msg.inputs);
  if (msg.type !== "run") return;
  try {
    // Each theme's available styles let the plan check the selected weights (section 5.1).
    const fonts = await loadFontStyles();
    const inputs: Inputs = {
      ...msg.inputs,
      themes: (msg.inputs.themes ?? []).map((t) => ({ ...t, availableWeights: fonts[t.fontFamily?.trim()] })),
    };
    const plan = buildPlan(spec, inputs);
    const existing = await figma.variables.getLocalVariablesAsync();
    const collections = await figma.variables.getLocalVariableCollectionsAsync();

    // Orphans are only meaningful when there is a manifest to compare against.
    const report: ReportEntry[] = [...plan.report];
    let modes: ModeMatch[] = [];
    // Palettes whose name changed are renamed in place (section 1.1.8), so they are not orphans.
    let renames: Record<string, string> = {};
    if (plan.ok) {
      modes = matchModes(plan, inputs, collections);
      renames = plannedPaletteRenames(plan, existing, collections);
      const renamed = (name: string) => Object.keys(renames).some((old) => name.startsWith(`Color/${old}/`));
      report.push(
        ...findOrphans(plan, existing, collections).filter((r) => !(r.collection === "Primitives" && renamed(r.token))),
        ...findOrphanModes(modes, collections),
      );
    }

    let summary: WriteSummary | null = null;
    if (plan.ok && msg.write) {
      checkRenames(modes, collections); // stops before anything is written
      const renamedPalettes = renamePalettes(renames, existing, collections);
      summary = writePlan(plan, existing, collections, modes);
      summary.renamed = renamedPalettes;
      await storePaletteSources(plan);
      figma.root.setPluginData(FILE_INPUTS, JSON.stringify(msg.inputs)); // the variables are written, so keep these settings
      // Redraw the color tables on the "Color tokens" page. The variables are already written,
      // so a drawing problem is reported but does not undo anything.
      try {
        summary.tablesPage = (await drawColorTables(buildTables(spec, plan), buildColorMaps(plan))).page;
      } catch (e) {
        summary.problems.push(`Color tables were not drawn: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    figma.ui.postMessage({
      type: "result",
      ok: plan.ok,
      wrote: summary !== null,
      summary,
      report,
      manifest: plan.manifest,
      collections: plan.collections,
      variables: plan.variables,
    });
    if (summary) figma.notify(`Variables: ${summary.created} created, ${summary.updated} updated, ${summary.unchanged} unchanged.`);
  } catch (e) {
    figma.ui.postMessage({ type: "failure", message: e instanceof Error ? e.message : String(e) });
  }
};

// While the user picks colors, the form asks which ones would make a palette that looks almost the
// same as another one (similar_palette), which status or custom colors have a hue close to the brand
// (close_to_brand), and which get a palette that looks quite different from the color picked
// (hue_only_shift), so it can show a notice next to them.
// It also gets every color's palette, shown next to the color as a strip of 13 steps. Writes nothing.
function previewNames(inputs: Inputs): void {
  try {
    const naming = namePalettes(spec, inputs);
    const built = naming.build();
    const notes = [...naming.closeToBrand, ...naming.similar].map((s) => ({ theme: s.theme, role: s.role, note: s.note }));
    for (const h of hueOnlyShifts(naming, built)) {
      notes.push({ theme: h.theme, role: h.role, note: `Only the hue of this color is used. Its palette will be closer to ${h.stepHex} (step ${h.step}).` });
    }
    // The palette each color will get, as HEX values from the lightest step to the darkest.
    // These are the same palettes "Generate tokens" writes. A color with no hue uses the Gray palette.
    const steps = [...spec.primitives.steps].sort((a, b) => a - b);
    const gray = spec.primitives.neutralPalette.steps as Record<string, string>;
    const palettes = naming.colors.map((c) => {
      const p = built.find((x) => x.name === naming.paletteOf(c.theme, c.role));
      return { theme: c.theme, role: c.role, hexes: steps.map((s) => (p ? p.steps[s].hex : gray[String(s)])) };
    });
    // Each theme's neutral: Color/Gray, or its tinted neutral (section 1.1.9).
    for (let i = 0; i < (inputs.themes ?? []).length; i++) {
      const neutral = naming.neutralStepsOf(i);
      palettes.push({ theme: i, role: "neutral", hexes: steps.map((s) => neutral[s]) });
    }
    // The real colors of each appearance card, from the first theme. A brand with no hue uses Gray.
    const brandName = naming.paletteOf(0, "brand");
    const brandPalette = built.find((x) => x.name === brandName);
    const brandSteps: Record<string, string> = Object.fromEntries(steps.map((s) => [s, brandPalette ? brandPalette.steps[s].hex : gray[String(s)]]));
    const previews = appearancePreviews(spec, inputs, naming.neutralStepsOf(0) as unknown as Record<string, string>, brandSteps);
    figma.ui.postMessage({ type: "names-result", similar: notes, palettes, previews });
  } catch {
    figma.ui.postMessage({ type: "names-result", similar: [], palettes: [], previews: [] });
  }
}

// "Update tables only": redraws the color tables from the variables as they are now in the file,
// including changes made by hand in Figma. Reads variables only; never changes them.
async function updateTablesOnly(): Promise<void> {
  try {
    const source = await readLiveVariables();
    const names = source.collections.map((c) => c.name);
    const missing = ["Primitives", "Theme", "Appearance", "ColorScheme"].filter((n) => !names.includes(n as CollectionName));
    if (names.length === 0) {
      figma.ui.postMessage({ type: "failure", message: "No Primitives, Theme or Appearance collection in this file. Generate tokens first." });
      return;
    }
    const result = await drawColorTables(buildTables(spec, source), buildColorMaps(source));
    figma.ui.postMessage({ type: "tables-result", page: result.page, tables: result.tables, missing });
    figma.notify(`Color tables updated on "${result.page}".`);
  } catch (e) {
    figma.ui.postMessage({ type: "failure", message: e instanceof Error ? e.message : String(e) });
  }
}

// What the form's Export panel asks for. collection: Appearance tokens, or ColorScheme tokens for Android.
// format applies to ColorScheme only: JSON, or Kotlin for Jetpack Compose (in kotlinPackage).
// split: "all" for one file with every theme, "perTheme" for one file per theme.
type ExportChoice = ExportOptions & {
  split?: "all" | "perTheme"; collection?: "appearance" | "colorScheme"; format?: "json" | "kotlin"; kotlinPackage?: string;
};

// "Export for developers": tokens as HEX, per theme and appearance, read from the variables as they are
// now in the file. Reads only; never changes anything.
async function exportTokens(options: ExportChoice): Promise<void> {
  try {
    const source = await readLiveVariables(true);
    const split = options.split ?? "all";
    if (options.collection === "colorScheme") {
      const exp = buildColorSchemeExport(source);
      const ok = Object.keys(exp.data.themes).length > 0;
      if (options.format === "kotlin") {
        const roles = (spec.colorScheme.tokens as { name: string }[]).map((t) => t.name);
        const k = ok ? kotlinFiles(exp, split, options.kotlinPackage ?? "", roles) : { files: [], problems: [] };
        figma.ui.postMessage({ type: "export-result", data: exp.data, files: k.files, problems: [...exp.problems, ...k.problems] });
      } else {
        const files = ok ? exportFiles(exp.data, split, "colorscheme-tokens") : [];
        figma.ui.postMessage({ type: "export-result", data: exp.data, files, problems: exp.problems });
      }
      return;
    }
    const { data, problems } = buildAppearanceExport(source, options);
    const files = Object.keys(data.themes).length > 0 ? exportFiles(data, split) : [];
    figma.ui.postMessage({ type: "export-result", data, files, problems });
  } catch (e) {
    figma.ui.postMessage({ type: "failure", message: e instanceof Error ? e.message : String(e) });
  }
}

// Reads the Primitives, Theme, Appearance and ColorScheme collections into the shape src/tables.ts expects.
// Values become alias names ({ alias: "Color/Violet/500" }) or HEX strings, keyed by mode name.
// keepAlpha adds two alpha digits to colors typed in by hand that are not fully opaque (for the export;
// the tables use six-digit HEX).
async function readLiveVariables(keepAlpha = false): Promise<TableSource> {
  const wanted: CollectionName[] = ["Primitives", "Theme", "Appearance", "ColorScheme"];
  const cols = (await figma.variables.getLocalVariableCollectionsAsync()).filter((c) => wanted.includes(c.name as CollectionName));
  const all = await figma.variables.getLocalVariablesAsync();
  const nameById = new Map(all.map((v) => [v.id, v.name]));
  const variables: VariableDef[] = [];
  for (const col of cols) {
    for (const v of all.filter((x) => x.variableCollectionId === col.id)) {
      if (v.resolvedType !== "COLOR" && v.resolvedType !== "FLOAT" && v.resolvedType !== "STRING") continue;
      const values: Record<string, Value> = {};
      for (const m of col.modes) {
        const val = v.valuesByMode[m.modeId];
        if (val && typeof val === "object" && "type" in val && val.type === "VARIABLE_ALIAS") {
          values[m.name] = { alias: nameById.get(val.id) ?? "(library variable)" };
        } else if (val && typeof val === "object" && "color" in val && "opacity" in val) {
          // Composed color (alpha tokens): keep both links, by name.
          const c = val.color, o = val.opacity;
          const colorName = typeof c === "object" && "type" in c ? nameById.get(c.id) ?? "(library variable)" : rgbaToHex(c as RGBA, keepAlpha);
          const opacityName = typeof o === "object" ? nameById.get(o.id) : undefined;
          values[m.name] = { alias: colorName, ...(opacityName ? { opacityAlias: opacityName } : {}) };
        } else if (val && typeof val === "object" && "r" in val) {
          values[m.name] = rgbaToHex(val as RGBA, keepAlpha);
        } else if (typeof val === "number" || typeof val === "string") {
          values[m.name] = val;
        }
      }
      variables.push({ collection: col.name as CollectionName, name: v.name, type: v.resolvedType, scopes: [...v.scopes], values });
    }
  }
  // Keep the order Primitives, Theme, Appearance, ColorScheme.
  const collections = wanted.flatMap((name) => {
    const c = cols.find((x) => x.name === name);
    return c ? [{ name, modes: c.modes.map((m) => m.name) }] : [];
  });
  return { collections, variables };
}

function rgbaToHex(c: RGBA, keepAlpha = false): string {
  const channels = keepAlpha && c.a !== undefined && c.a < 1 ? [c.r, c.g, c.b, c.a] : [c.r, c.g, c.b];
  return "#" + channels.map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("").toUpperCase();
}

// Every local variable that is not in the plan is reported, and left alone.
function findOrphans(plan: Plan, existing: Variable[], collections: VariableCollection[]): ReportEntry[] {
  const planned = new Set(plan.variables.map((v) => `${v.collection}|${v.name}`));
  const nameOf = new Map(collections.map((c) => [c.id, c.name]));
  return existing
    .filter((v) => !planned.has(`${nameOf.get(v.variableCollectionId)}|${v.name}`))
    .map((v) => ({
      check: "orphan_variable",
      severity: "warning" as const,
      collection: nameOf.get(v.variableCollectionId) ?? "",
      token: v.name,
      mode: "",
      expected: "in manifest",
      actual: "not in manifest",
      message: "Not created by this plugin. Left untouched; the plugin never deletes variables.",
    }));
}

// Section 6.3 implementation steps 2 to 6. existing and allCollections are the file's variables and
// collections, read once before writing. Only values and scopes that differ are written, so a re-run
// with the same inputs changes nothing in the file.
function writePlan(plan: Plan, existing: Variable[], allCollections: VariableCollection[], modes: ModeMatch[]): WriteSummary {
  const summary: WriteSummary = { created: 0, updated: 0, unchanged: 0, problems: [], renamed: [] };

  // Step 2: find or create each collection and its modes.
  const collectionOf = new Map<string, VariableCollection>();
  const modeIds = new Map<string, Record<string, string>>(); // collection name -> mode name -> mode id
  for (const c of plan.collections) {
    const col = allCollections.find((x) => x.name === c.name) ?? figma.variables.createVariableCollection(c.name);
    collectionOf.set(c.name, col);
    modeIds.set(c.name, ensureModes(col, modes.filter((m) => m.collection === c.name)));
  }

  // Index existing variables by collection and name, so nothing is created twice.
  const nameOfCollection = new Map([...collectionOf.values()].map((c) => [c.id, c.name]));
  const byKey = new Map<string, Variable>();
  for (const v of existing) {
    const col = nameOfCollection.get(v.variableCollectionId);
    if (col) byKey.set(`${col}|${v.name}`, v);
  }

  // Steps 3 to 7: the plan is already ordered Primitives, Theme (with alpha), Appearance, ColorScheme,
  // so every alias target exists before it is referenced.
  for (const def of plan.variables) {
    const key = `${def.collection}|${def.name}`;
    let variable = byKey.get(key);
    if (variable && variable.resolvedType !== def.type) {
      summary.problems.push(`${key}: exists as ${variable.resolvedType}, expected ${def.type}. Not changed.`);
      continue;
    }
    const isNew = !variable;
    if (!variable) {
      variable = figma.variables.createVariable(def.name, collectionOf.get(def.collection)!, def.type);
      byKey.set(key, variable);
    }

    let changed = false;
    if (!sameScopes(variable.scopes, def.scopes)) {
      variable.scopes = def.scopes as VariableScope[];
      changed = true;
    }

    // Only tokens with a description in the spec get one; others keep whatever the file has.
    if (def.description !== undefined && variable.description !== def.description) {
      variable.description = def.description;
      changed = true;
    }

    const modes = modeIds.get(def.collection)!;
    for (const [modeName, value] of Object.entries(def.values)) {
      const modeId = modes[modeName];
      const figmaValue = toFigmaValue(def, value, byKey);
      if (figmaValue === null) {
        summary.problems.push(`${key} (${modeName}): alias target not found.`);
        continue;
      }
      if (isNew || !sameValue(variable.valuesByMode[modeId], figmaValue)) {
        variable.setValueForMode(modeId, figmaValue);
        changed = true;
      }
    }

    if (isNew) summary.created++;
    else if (changed) summary.updated++;
    else summary.unchanged++;
  }
  return summary;
}

function sameScopes(current: VariableScope[], wanted: string[]): boolean {
  return current.length === wanted.length && wanted.every((s) => current.includes(s as VariableScope));
}

// True when Figma already stores this value: the same alias, the same two links (alpha tokens),
// the same color (compared as 8-bit channels, as stored in HEX), or the same number or text.
function sameValue(current: VariableValue | undefined, wanted: VariableValue): boolean {
  if (current === undefined) return false;
  if (typeof wanted !== "object" || wanted === null) return current === wanted;
  if (typeof current !== "object" || current === null) return false;
  const isAliasValue = (v: object): v is VariableAlias => "type" in v && (v as VariableAlias).type === "VARIABLE_ALIAS";
  if (isAliasValue(wanted)) return isAliasValue(current) && current.id === wanted.id;
  if ("opacity" in wanted) {
    if (!("opacity" in current) || !("color" in current)) return false;
    const w = wanted as { color: VariableAlias; opacity: VariableAlias };
    const c = current as { color: VariableValue; opacity: VariableValue };
    return sameValue(c.color, w.color) && sameValue(c.opacity, w.opacity);
  }
  if ("r" in wanted && "r" in current) {
    const byte = (x: number): number => Math.round(x * 255);
    const w = wanted as RGBA, c = current as RGBA;
    return byte(c.r) === byte(w.r) && byte(c.g) === byte(w.g) && byte(c.b) === byte(w.b) && byte(c.a ?? 1) === byte(w.a ?? 1);
  }
  return false;
}

// Converts a plan value into what Figma stores: an alias, a composed color (alias + opacity alias),
// an RGBA color, a number, or a string.
function toFigmaValue(def: VariableDef, value: Value, byKey: Map<string, Variable>): VariableValue | null {
  if (typeof value === "object") {
    // Theme aliases point to Primitives; Appearance and ColorScheme aliases point to Theme (sections 2, 3, 3.5).
    const target = def.collection === "Appearance" || def.collection === "ColorScheme" ? "Theme" : "Primitives";
    const v = byKey.get(`${target}|${value.alias}`);
    if (!v) return null;
    if (value.opacityAlias === undefined) return figma.variables.createVariableAlias(v);
    // Alpha tokens: color link plus opacity link, both to Primitives (section 2.1).
    const op = byKey.get(`Primitives|${value.opacityAlias}`);
    if (!op) return null;
    return { color: figma.variables.createVariableAlias(v), opacity: figma.variables.createVariableAlias(op) };
  }
  if (def.type === "COLOR") return hexToRgba(value as string);
  return value;
}

function hexToRgba(hex: string): RGBA {
  return {
    r: parseInt(hex.slice(1, 3), 16) / 255,
    g: parseInt(hex.slice(3, 5), 16) / 255,
    b: parseInt(hex.slice(5, 7), 16) / 255,
    a: 1,
  };
}
