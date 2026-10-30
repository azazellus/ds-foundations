// Turns the user's inputs plus spec/tokens.json into a full variable plan and a validation report.
// Pure functions, no Figma API. Implements foundations-spec.md sections 2, 3, 5.1, 5.6 and 6.1.

import { contrast } from "./color.ts";
import { buildHuePalette, buildPalette, closestStep, paletteDifference, SHIFT_NOTICE_DISTANCE } from "./palette.ts";
import type { Palette } from "./palette.ts";
import { validateHex } from "./validate.ts";
import { assignPaletteNames, similarPalettes } from "./naming.ts";
import type { NamedColorInput, NamedPalette, SimilarNotice } from "./naming.ts";

// The parsed contents of spec/tokens.json. Kept loose on purpose: the file is the source of truth.
export type Spec = any;

// ---------- Input shapes (section 5.1) ----------

// A color the user picked. The palette name is chosen by the plugin (naming.ts); an old saved
// name, if any, is ignored.
export type HueInput = { hex: string; name?: string };

export type ThemeInput = {
  brand: HueInput;
  // Status colors: needed only for the roles in Inputs.statusRoles.
  success?: HueInput;
  danger?: HueInput;
  warning?: HueInput;
  info?: HueInput;
  custom?: Record<string, HueInput>; // one color per custom role (Inputs.customRoles)
  fontFamily: string;
  // Selected styles of the font family, with the font's own names ("Semi Bold"). When empty, the
  // available styles that match a weight slot are used (section 5.1).
  fontWeights?: string[];
  // The non-italic styles the family has in Figma. Supplied by the Figma layer; when present, every
  // selected weight must be one of them.
  availableWeights?: string[];
};

// An extra appearance mode (section 5.1): copies Light or Dark, with its own canvas step
// ("white" or 50 for Light, 950/900/850 for Dark). "key" identifies it across renames (Figma layer only).
export type AppearanceInput = { name: string; base: string; canvasStep?: number | string; key?: string };

export type Inputs = {
  numberOfThemes: number; // 1 to 26
  themes: ThemeInput[];
  themeNames?: string[]; // optional; "Theme A", "Theme B", ... for missing or empty entries
  themeKeys?: string[]; // identifies each theme across renames (Figma layer only)
  includeDark?: boolean; // optional; true when omitted
  lightCanvasStep?: number | string; // optional; "white" when omitted. Applies to Light itself.
  darkCanvasStep?: number; // optional; 950 when omitted. Applies to Dark itself.
  customRoles?: string[]; // optional; extra color roles such as "promo", treated like status roles
  extraAppearances?: AppearanceInput[]; // optional; besides Light and Dark
  statusRoles?: string[]; // optional; which of success, danger, warning, info exist (all four when omitted)
};

// ---------- Output shapes (section 6.1) ----------

export type CollectionName = "Primitives" | "Theme" | "Appearance" | "ColorScheme";
export type VarType = "COLOR" | "FLOAT" | "STRING";

// A raw value (HEX string for colors, number, or string) or an alias to another variable by name.
// opacityAlias is used only by alpha tokens: a second link, to an Opacity Primitive (section 2.1).
export type Value = { alias: string; opacityAlias?: string } | string | number;

export type VariableDef = {
  collection: CollectionName;
  name: string;
  type: VarType;
  scopes: string[];
  values: Record<string, Value>; // mode name -> value
  alpha?: boolean; // true for alpha tokens (section 2.1): color link plus opacity link; never contrast-checked
};

export type ReportEntry = {
  check: string;
  severity: "error" | "warning";
  collection: string;
  token: string;
  mode: string;
  expected: string;
  actual: string | number;
  message: string;
};

export type ContrastResult = { against: string; theme: string; minimum: number; ratio: number; pass: boolean };

export type ManifestEntry = {
  collection: CollectionName;
  name: string;
  type: VarType;
  value: Value;
  scopes: string[];
  mode: string;
  resolved_hex?: string | Record<string, string>; // per theme for Appearance and ColorScheme tokens when there is more than one theme
  contrast?: ContrastResult[];
};

export type Plan = {
  ok: boolean; // false when any error was found; nothing may be written to Figma then
  collections: { name: CollectionName; modes: string[] }[];
  variables: VariableDef[];
  report: ReportEntry[];
  manifest: ManifestEntry[];
  // The generated palettes and the color (theme key + role) that made each one. Used by the Figma
  // layer to rename a palette whose name changed (section 1.1.8).
  palettes?: NamedPalette[];
};

// Built-in input roles in the order they are generated. Brand comes first (section 5.2).
// Custom roles (Inputs.customRoles) follow them.
const ROLE_INPUTS = ["brand", "success", "danger", "warning", "info"];

// "white" stays a word; "50" from a form becomes the number 50.
function canvasStepOf(v: unknown): number | string {
  return typeof v === "string" && /^\d+$/.test(v) ? Number(v) : (v as number | string);
}

// Section 5.1, appearance.lightCanvas and appearance.darkCanvas in tokens.json: the value of an
// Appearance token in a Light- or Dark-based mode for that mode's canvas step. Canvas tokens use the
// step itself. In Dark, following tokens move lighter along primitives.steps by as many steps as the
// canvas moved from 950. Light has no following tokens, only fixed values per step (valuesByStep).
// Other tokens keep their value.
// customRoles fills in the {role} following tokens.
function canvasValueFor(
  spec: Spec, name: string, value: string, base: string, step: number | string, customRoles: string[],
): string {
  const rule = base === "Dark" ? spec.appearance.darkCanvas : spec.appearance.lightCanvas;
  if (rule.canvasTokens.includes(name)) return `color/neutral/${step}`;
  // Fixed values for this canvas step (appearance.lightCanvas.valuesByStep: menu and raised on 50).
  const fixed = rule.valuesByStep?.[String(step)]?.[name];
  if (fixed) return fixed;
  const following: string[] = [
    ...(rule.followingTokens ?? []),
    ...customRoles.flatMap((r) => (rule.customRoleFollowingTokens ?? []).map((t: string) => t.replace("{role}", r))),
  ];
  if (!following.includes(name)) return value;
  return shiftWithDarkCanvas(spec, value, step);
}

// A Dark value moved lighter along primitives.steps by as many steps as the dark canvas moved from its
// default (950). Used by ColorScheme tokens with followsDarkCanvas (section 3.5).
function shiftWithDarkCanvas(spec: Spec, value: string, step: number | string): string {
  const steps: number[] = spec.primitives.steps; // darkest first: 950, 900, 850, ...
  const shift = steps.indexOf(step as number) - steps.indexOf(spec.inputs.darkCanvasStep.default); // toward 50
  const m = value.match(/^(.*\/)(\d+)$/);
  if (!m || shift === 0) return value;
  const moved = steps[steps.indexOf(Number(m[2])) + shift];
  // Past either end of the scale there is nothing to point to; the alias check then reports it.
  return `${m[1]}${moved ?? "out-of-scale"}`;
}

// The weight slot a style fills: its name without spaces, in lowercase ("Semi Bold" -> "semibold").
export function weightSlotOf(style: string): string {
  return style.replace(/\s+/g, "").toLowerCase();
}

// ---------- Small helpers ----------

function severityOf(spec: Spec, check: string): "error" | "warning" {
  return spec.validation.checks.warning.includes(check) ? "warning" : "error";
}

function isAlias(v: Value): v is { alias: string } {
  return typeof v === "object" && v !== null && "alias" in v;
}

// "Size/0-5" for 0.5: Figma names cannot hold a dot in this system.
function sizeName(v: number): string {
  return `Size/${String(v).replace(".", "-")}`;
}

// ---------- Palette names (section 1.1.8) ----------

// The colors to name, in the spec's fixed order: theme by theme; within a theme brand, the status
// roles in use, then the custom roles. Colors without a valid HEX are left out.
export function orderedColors(spec: Spec, inputs: Inputs): (NamedColorInput & { theme: number; role: string })[] {
  const n = Math.max(0, Math.min(inputs?.numberOfThemes ?? 0, inputs?.themes?.length ?? 0));
  const modes = themeModeNames(spec, n, inputs?.themeNames);
  const statusRoles: string[] = inputs?.statusRoles ?? spec.inputs.statusRoles.default;
  const customRoles = (inputs?.customRoles ?? []).map((r) => String(r ?? "").trim());
  const roles = [...ROLE_INPUTS.filter((r) => r === "brand" || statusRoles.includes(r)), ...customRoles];
  const out: (NamedColorInput & { theme: number; role: string })[] = [];
  for (let i = 0; i < n; i++) {
    const t = inputs.themes[i];
    for (const role of roles) {
      const h = customRoles.includes(role) ? t?.custom?.[role] : (t as any)?.[role];
      const hex = h?.hex?.trim().toUpperCase() ?? "";
      if (validateHex(hex).length > 0) continue;
      out.push({
        theme: i, role, hex, source: `${inputs.themeKeys?.[i] || modes[i]}|${role}`, label: `the ${role} color of ${modes[i]}`,
        exact: role === "brand", // only the brand keeps its HEX (section 5.2)
      });
    }
  }
  return out;
}

// Names the palettes of these inputs. Used by buildPlan, and by the plugin form to warn about
// similar palettes while the user is still picking colors.
export function namePalettes(spec: Spec, inputs: Inputs) {
  const colors = orderedColors(spec, inputs);
  const result = assignPaletteNames(spec.primitives.paletteNaming, spec.primitives.neutralPalette.name, colors);
  // The palette of each color, by theme index and role.
  const paletteOf = (theme: number, role: string): string | undefined => {
    const c = colors.find((x) => x.theme === theme && x.role === role);
    return c ? result.assignments.find((a) => a.source === c.source)?.palette : undefined;
  };
  // Every palette: brand palettes keep their HEX, the others use only the hue (sections 5.2, 5.3).
  const built: Palette[] = result.palettes.map((p) => (p.exact ? buildPalette(p.name, p.hex) : buildHuePalette(p.name, p.hex)));
  const byName = (name: string): Palette => built.find((p) => p.name === name)!;
  const build = (): Palette[] => built;
  // Palettes that look almost the same as an earlier one (section 1.1.8 rule 4), with the theme index
  // and role of the color they are about (for the form).
  const similar = similarPalettes(result.palettes, (a, b) => paletteDifference(byName(a), byName(b)),
    spec.primitives.paletteNaming.similarMaxStepDifference).map((s: SimilarNotice) => {
    const c = colors.find((x) => x.source === s.source)!;
    return { ...s, theme: c.theme, role: c.role };
  });
  return { ...result, similar, paletteOf, build, colors };
}

// Status and custom colors whose palette has no step close to the HEX picked (section 5.3 step 5).
export function hueOnlyShifts(naming: ReturnType<typeof namePalettes>, built: Palette[]) {
  const out: { theme: number; role: string; label: string; hex: string; palette: string; step: number; stepHex: string; distance: number }[] = [];
  for (const c of naming.colors) {
    if (c.exact) continue;
    const name = naming.paletteOf(c.theme, c.role);
    const p = built.find((x) => x.name === name);
    if (!p) continue; // Gray: no generated palette
    const near = closestStep(p, c.hex);
    if (near.distance > SHIFT_NOTICE_DISTANCE) {
      out.push({ theme: c.theme, role: c.role, label: c.label, hex: c.hex, palette: p.name, step: near.step, stepHex: near.hex, distance: near.distance });
    }
  }
  return out;
}

// ---------- Main entry ----------

export function buildPlan(spec: Spec, inputs: Inputs): Plan {
  const report: ReportEntry[] = [];
  const add = (
    check: string, collection: string, token: string, mode: string,
    expected: string, actual: string | number, message: string,
  ): void => {
    report.push({ check, severity: severityOf(spec, check), collection, token, mode, expected, actual, message });
  };
  const hasErrors = (): boolean => report.some((r) => r.severity === "error");
  const stop = (): Plan => ({ ok: false, collections: [], variables: [], report, manifest: [] });

  // ----- 1. Validate inputs (section 5.1) -----

  const n = inputs?.numberOfThemes;
  const { minimum, maximum } = spec.inputs.numberOfThemes;
  if (!Number.isInteger(n) || n < minimum || n > maximum) {
    add("missing_input", "Theme", "numberOfThemes", "Global", `${minimum} to ${maximum}`, String(n),
      `Number of themes must be a whole number from ${minimum} to ${maximum}.`);
    return stop();
  }
  // Theme mode names: the user's names, or Theme A, Theme B, ... (section 5.1).
  const themeModes = themeModeNames(spec, n, inputs.themeNames);
  const namePattern = new RegExp(spec.inputs.themeNames.namePattern);
  themeModes.forEach((name, i) => {
    if (!namePattern.test(name)) {
      add("missing_input", "Theme", `theme ${i + 1} name`, "Global", "letters, numbers and single spaces", name,
        `"${name}" is not a valid theme name.`);
    } else if (themeModes.indexOf(name) !== i) {
      add("missing_input", "Theme", `theme ${i + 1} name`, "Global", "unique theme name", name, `"${name}" is used by more than one theme.`);
    }
  });

  // Every color needs a valid HEX. The palette names are chosen later (section 1.1.8).
  const checkHue = (h: HueInput | undefined, label: string, mode: string): void => {
    const hex = h?.hex?.trim().toUpperCase() ?? "";
    if (!hex) add("missing_input", "Primitives", label, mode, "#RRGGBB", "", `The ${label} needs a HEX value.`);
    else for (const p of validateHex(hex)) add(p.check, "Primitives", label, mode, "#RRGGBB", hex, p.message);
  };

  const themes: ThemeInput[] = [];
  for (let i = 0; i < n; i++) {
    const t = inputs.themes?.[i];
    const mode = themeModes[i];
    if (!t) {
      add("missing_input", "Theme", "theme inputs", mode, "inputs for this theme", "", `${mode} has no inputs.`);
      continue;
    }
    themes.push(t);
  }

  // Status roles in use (section 5.1). Brand is always in use; the others only when listed.
  const sr = spec.inputs.statusRoles;
  const statusRoles: string[] = inputs.statusRoles ?? sr.default;
  for (const r of statusRoles) {
    if (!sr.allowed.includes(r)) {
      add("missing_input", "Theme", "statusRoles", "Global", sr.allowed.join(", "), String(r), `"${r}" is not a status role.`);
    }
  }
  const inactiveRoles = sr.allowed.filter((r: string) => !statusRoles.includes(r));

  // Custom roles (section 5.1): lowercase letters, unique, not a name the spec already uses.
  const cr = spec.inputs.customRoles;
  const customRoles: string[] = (inputs.customRoles ?? []).map((r) => String(r ?? "").trim());
  customRoles.forEach((r, i) => {
    const label = `custom color ${i + 1}`;
    if (!new RegExp(cr.namePattern).test(r)) {
      add("missing_input", "Theme", label, "Global", "lowercase letters only", r,
        r ? `"${r}" is not a valid color role name. Use lowercase letters only.` : `The ${label} needs a role name.`);
    } else if (cr.reservedNames.includes(r)) {
      add("missing_input", "Theme", label, "Global", `not ${cr.reservedNames.join(", ")}`, r, `"${r}" is already used by the spec.`);
    } else if (customRoles.indexOf(r) !== i) {
      add("missing_input", "Theme", label, "Global", "unique role name", r, `"${r}" is used by more than one custom color.`);
    }
  });

  const activeRoles = ROLE_INPUTS.filter((r) => r === "brand" || statusRoles.includes(r));
  const colorOf = (t: ThemeInput, role: string): HueInput | undefined =>
    customRoles.includes(role) ? t.custom?.[role] : (t as any)[role];

  themes.forEach((t, i) => {
    for (const role of [...activeRoles, ...customRoles]) checkHue(colorOf(t, role), `${role} color`, themeModes[i]);
  });

  // Font family and weights (section 5.1). Weight slots are the input:fontWeights.{slot} entries.
  const slots = (Object.values(spec.theme.typography) as string[])
    .filter((src) => src.startsWith("input:fontWeights."))
    .map((src) => src.split(".")[1]);
  const weightsByTheme: string[][] = [];
  themes.forEach((t, i) => {
    const mode = themeModes[i];
    if (!t.fontFamily?.trim()) {
      add("missing_input", "Theme", "font family", mode, "font family name", "", `${mode} needs a font family.`);
    }
    const available = t.availableWeights;
    const weights = t.fontWeights && t.fontWeights.length > 0
      ? t.fontWeights
      : (available ?? []).filter((w) => slots.includes(weightSlotOf(w)));
    for (const w of weights) {
      if (available && !available.includes(w)) {
        add("missing_input", "Theme", "font weights", mode, `a style of ${t.fontFamily}`, w,
          `"${w}" is not a style of ${t.fontFamily}.`);
      }
    }
    weightsByTheme.push(weights);
  });

  // A slot needs a style in every theme, so a slot matched in only some themes is an error.
  // A slot matched in no theme is simply not created (the input is optional).
  const styleForSlot = (slot: string, i: number): string | undefined =>
    weightsByTheme[i].find((w) => weightSlotOf(w) === slot);
  for (const slot of slots) {
    const missing = themes.filter((_, i) => !styleForSlot(slot, i));
    if (missing.length > 0 && missing.length < themes.length) {
      const fonts = [...new Set(missing.map((t) => t.fontFamily))].join(", ");
      add("missing_input", "Theme", `typography/font-weight/${slot}`, "Global", `a ${slot} style in every theme`,
        `no match in ${fonts}`, `The ${slot} weight is selected in some themes but has no match in ${fonts}.`);
    }
  }

  // Appearance modes: Light, Dark when included, and the extra appearances (section 5.1).
  const includeDark = inputs.includeDark !== false;
  const lightStep = canvasStepOf(inputs.lightCanvasStep ?? spec.inputs.lightCanvasStep.default);
  if (!spec.inputs.lightCanvasStep.allowed.includes(lightStep)) {
    const allowed = spec.inputs.lightCanvasStep.allowed.join(", ");
    add("missing_input", "Appearance", "lightCanvasStep", "Global", allowed, String(lightStep), `Light canvas step must be one of ${allowed}.`);
  }
  const darkStep = canvasStepOf(inputs.darkCanvasStep ?? spec.inputs.darkCanvasStep.default) as number;
  if (includeDark && !spec.inputs.darkCanvasStep.allowed.includes(darkStep)) {
    const allowed = spec.inputs.darkCanvasStep.allowed.join(", ");
    add("missing_input", "Appearance", "darkCanvasStep", "Global", allowed, String(darkStep), `Dark canvas step must be one of ${allowed}.`);
  }

  // Extra appearances: user-named modes based on Light or Dark, each with its own canvas step.
  const xa = spec.inputs.extraAppearances;
  const extras: { name: string; base: string; canvasStep: number | string }[] = [];
  const seenModes = new Set<string>(xa.reservedNames);
  (inputs.extraAppearances ?? []).forEach((a, i) => {
    const label = `extra appearance ${i + 1}`;
    const name = a?.name?.trim() ?? "";
    if (!new RegExp(xa.namePattern).test(name)) {
      add("missing_input", "Appearance", label, "Global", "letters, numbers and single spaces", name,
        name ? `"${name}" is not a valid appearance name.` : `The ${label} needs a name.`);
    } else if (seenModes.has(name)) {
      add("missing_input", "Appearance", label, "Global", "unique, not Light or Dark", name, `"${name}" is already an appearance.`);
    }
    seenModes.add(name);
    const rule = xa.canvasStep[a?.base];
    if (!rule) {
      add("missing_input", "Appearance", label, "Global", xa.bases.join(" or "), String(a?.base), `The base of "${name}" must be Light or Dark.`);
      return;
    }
    const step = canvasStepOf(a.canvasStep ?? rule.default);
    if (!rule.allowed.includes(step)) {
      add("missing_input", "Appearance", label, "Global", rule.allowed.join(", "), String(step),
        `The canvas of "${name}" must be one of ${rule.allowed.join(", ")}.`);
    }
    extras.push({ name, base: a.base, canvasStep: step });
  });

  if (hasErrors()) return stop();

  // ----- 2. Name and generate palettes (sections 1.1.8 and 5.2 to 5.5) -----

  // Colors with (almost) the same hue share a palette; a color with no hue uses Gray.
  const naming = namePalettes(spec, inputs);
  for (const p of naming.problems) add("missing_input", "Primitives", "palette names", "Default", "a free palette name", "none left", p);
  for (const s of naming.similar) {
    add("similar_palette", "Primitives", `Color/${s.palette}`, themeModes[s.theme],
      `a step more than ${spec.primitives.paletteNaming.similarMaxStepDifference} from Color/${s.otherPalette}`,
      `largest step difference ${s.difference.toFixed(3)}`, s.message);
  }
  if (hasErrors()) return stop();

  const palettes: Palette[] = naming.build();
  // Status and custom colors only give a hue; tell the user when the palette looks quite different.
  for (const h of hueOnlyShifts(naming, palettes)) {
    add("hue_only_shift", "Primitives", `Color/${h.palette}`, themeModes[h.theme], `a step within ${SHIFT_NOTICE_DISTANCE} of ${h.hex}`,
      `step ${h.step} ${h.stepHex}`,
      `Only the hue of ${h.label} (${h.hex}) is used. Its palette is closer to ${h.stepHex} (step ${h.step}).`);
  }
  for (const p of palettes) {
    for (const f of [...p.errors, ...p.warnings]) {
      const token = f.step !== undefined ? `Color/${p.name}/${f.step}` : `Color/${p.name}`;
      if (f.check === "gamut_clamp") {
        add(f.check, "Primitives", token, "Default", "inside sRGB", "chroma reduced", f.message);
      } else {
        add(f.check, "Primitives", token, "Default", f.expected ?? "", f.actual ?? "", f.message);
      }
    }
  }
  if (hasErrors()) return stop();

  // ----- 3. Build variable definitions -----

  const vars: VariableDef[] = [];
  const primMode: string = spec.collections.Primitives.modes[0];
  // Light, Dark (when included), then the extra appearances in the order given.
  const baseModes: string[] = spec.collections.Appearance.modes.filter((m: string) => includeDark || m !== "Dark");
  const appModes: string[] = [...baseModes, ...extras.map((e) => e.name)];

  // Same value in every Theme mode.
  const everyTheme = (v: Value): Record<string, Value> =>
    Object.fromEntries(themeModes.map((m) => [m, v]));

  // Primitives (section 1)
  const prim = (name: string, type: VarType, value: Value, scopes: string[] = []): void => {
    vars.push({ collection: "Primitives", name, type, scopes, values: { [primMode]: value } });
  };
  for (const [name, hex] of Object.entries(spec.primitives.baseColors) as [string, string][]) prim(name, "COLOR", hex);
  const gray = spec.primitives.neutralPalette;
  for (const step of spec.primitives.steps) prim(`Color/${gray.name}/${step}`, "COLOR", gray.steps[String(step)]);
  for (const p of palettes) {
    for (const step of spec.primitives.steps) prim(`Color/${p.name}/${step}`, "COLOR", p.steps[step].hex);
  }
  for (const v of spec.primitives.sizes) prim(sizeName(v), "FLOAT", v);
  const families = [...new Set(themes.map((t) => t.fontFamily.trim()))];
  for (const f of families) prim(`Typography/Font-family/${f}`, "STRING", f);
  // One Primitive per selected style, across all themes, in the order first selected.
  const usedWeights = [...new Set(weightsByTheme.flat())];
  for (const w of usedWeights) prim(`Typography/Font-weight/${w}`, "STRING", w);
  for (const o of spec.primitives.opacities) prim(`Opacity/${o}`, "FLOAT", o, ["OPACITY"]);

  // Theme (section 2). Which palette a role uses in theme i.
  const paletteFor = (role: string, i: number): string => {
    const rule = spec.theme.colorRoles[role];
    return rule?.source === "fixed" ? rule.palette : naming.paletteOf(i, role)!;
  };
  const theme = (name: string, type: VarType, values: Record<string, Value>, scopes: string[] = [], alpha = false): void => {
    vars.push({ collection: "Theme", name, type, scopes, values, ...(alpha ? { alpha } : {}) });
  };

  const exp = spec.theme.colorExpansion;
  // Built-in roles, then custom roles (theme.customRoles): the same 13-step expansion.
  for (const role of [...Object.keys(spec.theme.colorRoles), ...customRoles]) {
    if (inactiveRoles.includes(role)) continue; // a status role the user turned off
    for (const step of exp.steps) {
      const name = exp.pattern.replace("{role}", role).replace("{step}", String(step));
      theme(name, "COLOR", Object.fromEntries(themeModes.map((m, i) => [m, { alias: `Color/${paletteFor(role, i)}/${step}` }])));
    }
    if (role === "neutral") {
      for (const [name, target] of Object.entries(exp.neutralExtras) as [string, string][]) {
        theme(name, "COLOR", everyTheme({ alias: target }));
      }
    }
  }

  // Alpha tokens: a composed color with two links, the color source and the Opacity Primitive.
  // The listed tokens first, then the same 15 tokens for each custom role (theme.customRoles).
  const al = spec.theme.alpha;
  const customAlpha = customRoles.flatMap((role) => al.opacities.map((o: number) => ({
    name: al.coloredNamePattern.replace("{role}", role).replace("{NN}", String(o).padStart(2, "0")),
    role,
    opacity: o,
  })));
  for (const t of [...al.tokens, ...customAlpha]) {
    if (t.role && inactiveRoles.includes(t.role)) continue;
    const values = Object.fromEntries(themeModes.map((m, i) => [
      m,
      {
        alias: t.colorSource ?? `Color/${paletteFor(t.role, i)}/${spec.theme.alpha.coloredSourceStep}`,
        opacityAlias: `Opacity/${t.opacity}`,
      },
    ]));
    theme(t.name, "COLOR", values, [], true);
  }

  for (const [name, src] of Object.entries(spec.theme.typography) as [string, string][]) {
    if (src === "input:fontFamilies") {
      theme(name, "STRING", Object.fromEntries(themeModes.map((m, i) => [m, { alias: `Typography/Font-family/${themes[i].fontFamily.trim()}` }])));
    } else if (src.startsWith("input:fontWeights.")) {
      // A slot links, in each theme, to the selected style with the same name (spaces and case ignored).
      const slot = src.split(".")[1];
      if (themes.some((_, i) => !styleForSlot(slot, i))) continue; // no match: the slot is not created
      theme(name, "STRING", Object.fromEntries(themeModes.map((m, i) => [m, { alias: `Typography/Font-weight/${styleForSlot(slot, i)}` }])));
    }
  }

  for (const [category, group] of Object.entries(spec.theme.size) as [string, any][]) {
    for (const [variant, target] of Object.entries(group.values) as [string, string][]) {
      theme(`size/${category}/${variant}`, "FLOAT", everyTheme({ alias: target }), [group.scope]);
    }
  }

  // Appearance (section 3)
  const categories = Object.keys(spec.appearance.scopesByCategory).sort((a, b) => b.length - a.length);
  const scopesFor = (name: string): string[] => {
    const rest = name.replace(/^color\//, "");
    const cat = categories.find((c) => rest.startsWith(c + "/"));
    return cat ? spec.appearance.scopesByCategory[cat] : [];
  };
  // Appearance tokens of the roles in use. A token belongs to a role when its third name segment is the
  // role (color/bg/warning/soft, color/border/warning) or when one of its values points to color/{role}/.
  const usesInactiveRole = (name: string): boolean => {
    const map = spec.appearance.tokens[name] as Record<string, string>;
    return inactiveRoles.some((r: string) =>
      name.split("/")[2] === r || Object.values(map).some((target) => target.startsWith(`color/${r}/`)));
  };
  // Light and Dark values of every Appearance token: the spec's list, then each custom role's
  // tokens from the appearance.customRoles template with {role} filled in.
  const appMaps = new Map<string, Record<string, string>>();
  for (const name of Object.keys(spec.appearance.tokens)) {
    if (!usesInactiveRole(name)) appMaps.set(name, spec.appearance.tokens[name]);
  }
  for (const role of customRoles) {
    for (const [tpl, map] of Object.entries(spec.appearance.customRoles.tokens) as [string, Record<string, string>][]) {
      appMaps.set(tpl.replace("{role}", role), { Light: map.Light.replace("{role}", role), Dark: map.Dark.replace("{role}", role) });
    }
  }
  const appNames = [...appMaps.keys()];

  // Every mode copies its base (Light or Dark) and applies its own canvas step (section 5.1).
  const modeBases = [
    { name: "Light", base: "Light", canvasStep: lightStep },
    ...(includeDark ? [{ name: "Dark", base: "Dark", canvasStep: darkStep as number | string }] : []),
    ...extras,
  ];
  // Created in appearance.order, so a new collection lists them in that order in Figma.
  for (const name of appearanceOrder(spec, appNames)) {
    const map = appMaps.get(name)!;
    const values: Record<string, Value> = {};
    for (const m of modeBases) {
      values[m.name] = { alias: canvasValueFor(spec, name, map[m.base], m.base, m.canvasStep, customRoles) };
    }
    vars.push({ collection: "Appearance", name, type: "COLOR", scopes: scopesFor(name), values });
  }

  // ColorScheme (section 3.5): Material 3 roles for Android, with the same modes as Appearance.
  // A "sameAs" token copies the Appearance token's value in every mode, so the two never drift apart.
  // Its own tokens list a Light and a Dark Theme token, and may follow the dark canvas step.
  const cs = spec.colorScheme;
  const appearanceVar = new Map(vars.filter((v) => v.collection === "Appearance").map((v) => [v.name, v]));
  // {secondary} is the first custom role, {tertiary} the second; brand and danger are input roles.
  const slotRole = (r: string): string | undefined => (r in cs.slots ? customRoles[cs.slots[r]] : r);
  const fill = (text: string): string => text.replace(/\{(secondary|tertiary)\}/g, (slot) => slotRole(slot) ?? slot);
  for (const t of cs.tokens) {
    if (t.role) {
      const role = slotRole(t.role);
      if (!role || inactiveRoles.includes(role)) continue; // no such custom role, or a status role turned off
    }
    const values: Record<string, Value> = {};
    if (t.sameAs) {
      const source = appearanceVar.get(fill(t.sameAs));
      if (!source) continue; // the Appearance token is not generated
      for (const m of modeBases) values[m.name] = source.values[m.name];
    } else {
      for (const m of modeBases) {
        const own = fill(t[m.base]);
        values[m.name] = { alias: t.followsDarkCanvas && m.base === "Dark" ? shiftWithDarkCanvas(spec, own, m.canvasStep) : own };
      }
    }
    vars.push({ collection: "ColorScheme", name: t.name, type: "COLOR", scopes: cs.scopesByKind[t.kind], values });
  }

  const collections: Plan["collections"] = [
    { name: "Primitives", modes: [primMode] },
    { name: "Theme", modes: themeModes },
    { name: "Appearance", modes: appModes },
    { name: "ColorScheme", modes: appModes },
  ];

  // ----- 4. Structural checks (section 6.1) -----

  const byName: Record<CollectionName, Map<string, VariableDef>> = {
    Primitives: new Map(), Theme: new Map(), Appearance: new Map(), ColorScheme: new Map(),
  };
  for (const v of vars) {
    if (byName[v.collection].has(v.name)) {
      add("duplicate_name", v.collection, v.name, "", "unique name", v.name, "This name is used more than once.");
    }
    byName[v.collection].set(v.name, v);
    if (!followsGrammar(v)) {
      add("naming_grammar", v.collection, v.name, "", "naming pattern of the spec", v.name, "This name breaks the naming rules.");
    }
  }

  // Aliases point one way only: Theme -> Primitives, Appearance -> Theme, ColorScheme -> Theme.
  const targetOf: Record<CollectionName, CollectionName | null> = {
    Primitives: null, Theme: "Primitives", Appearance: "Theme", ColorScheme: "Theme",
  };
  for (const v of vars) {
    const modes = collections.find((c) => c.name === v.collection)!.modes;
    for (const m of modes) {
      const val = v.values[m];
      if (val === undefined) {
        add("missing_mandatory_token", v.collection, v.name, m, "a value", "none", `No value in mode ${m}.`);
        continue;
      }
      if (!isAlias(val)) continue;
      const target = targetOf[v.collection];
      if (!target || !byName[target].has(val.alias)) {
        add("unresolved_reference", v.collection, v.name, m, `${target ?? "no alias"}: ${val.alias}`, "not found",
          `Cannot resolve ${val.alias}.`);
      }
      // Alpha tokens: the opacity link must point to a Primitive too.
      if (val.opacityAlias !== undefined && !byName.Primitives.has(val.opacityAlias)) {
        add("unresolved_reference", v.collection, v.name, m, `Primitives: ${val.opacityAlias}`, "not found",
          `Cannot resolve ${val.opacityAlias}.`);
      }
    }
  }

  for (const name of appNames) {
    if (!byName.Appearance.has(name)) {
      add("missing_mandatory_token", "Appearance", name, "", "present", "missing", "Mandatory Appearance token is missing.");
    }
  }
  if (hasErrors()) return stop();

  // ----- 5. Contrast checks (sections 3.4 and 5.7) -----

  // Resolve an Appearance token to a HEX for one theme and one appearance.
  // Returns null when the token goes through an alpha token, which is never checked.
  const alphaDependent: string[] = spec.appearance.alphaDependentTokens;
  const resolveAppearance = (name: string, themeIdx: number, appMode: string): string | null => {
    if (alphaDependent.includes(name)) return null;
    const a = byName.Appearance.get(name)!.values[appMode] as { alias: string };
    const t = byName.Theme.get(a.alias)!;
    if (t.alpha) return null;
    return resolveTheme(t, themeIdx);
  };
  // A ColorScheme token in one theme and mode, or null when it goes through an alpha token.
  const resolveScheme = (v: VariableDef, themeIdx: number, mode: string): string | null => {
    const t = byName.Theme.get((v.values[mode] as { alias: string }).alias)!;
    return t.alpha ? null : resolveTheme(t, themeIdx);
  };
  const resolveTheme = (t: VariableDef, themeIdx: number): string => {
    const p = t.values[themeModes[themeIdx]] as { alias: string };
    return byName.Primitives.get(p.alias)!.values[primMode] as string;
  };

  // Results kept for the manifest: key "token|appearanceMode" -> results.
  const contrastByToken = new Map<string, ContrastResult[]>();
  const modeLabel = (i: number, m: string): string => (n === 1 ? m : `${themeModes[i]} / ${m}`);

  const checkPair = (fg: string, bg: string, minimum: number, check: string, i: number, m: string): void => {
    if (!byName.Appearance.has(fg) || !byName.Appearance.has(bg)) return; // a status role not in use
    const fgHex = resolveAppearance(fg, i, m);
    const bgHex = resolveAppearance(bg, i, m);
    if (!fgHex || !bgHex) return; // alpha-based: excluded (section 3.4)
    const ratio = contrast(fgHex, bgHex);
    const rounded = Math.round(ratio * 100) / 100;
    const key = `${fg}|${m}`;
    if (!contrastByToken.has(key)) contrastByToken.set(key, []);
    contrastByToken.get(key)!.push({ against: bg, theme: themeModes[i], minimum, ratio: rounded, pass: ratio >= minimum });
    if (ratio < minimum) {
      add(check, "Appearance", fg, modeLabel(i, m), `>= ${minimum}`, rounded, `Minimum contrast not met against ${bg}.`);
    }
  };

  // The spec's pairs, plus each custom role's pairs (appearance.customRoles.contrastRequired).
  const contrastPairs: { text: string; background: string; minimum: number }[] = [
    ...spec.appearance.contrastRequired,
    ...customRoles.flatMap((role) => spec.appearance.customRoles.contrastRequired.map((p: any) => ({
      ...p, text: p.text.replace("{role}", role), background: p.background.replace("{role}", role),
    }))),
  ];
  for (let i = 0; i < n; i++) {
    for (const m of appModes) {
      for (const pair of contrastPairs) {
        checkPair(pair.text, pair.background, pair.minimum, "contrast_minimum", i, m);
      }
      const sp = spec.appearance.statusPairings;
      for (const role of [...sp.roles.filter((r: string) => !inactiveRoles.includes(r)), ...customRoles]) {
        for (const bgName of sp.backgrounds) {
          const bg = `color/bg/${role}/${bgName}`;
          checkPair(`color/text/${role}/bold`, bg, sp["text/bold"], "status_pairing", i, m);
          checkPair(`color/text/${role}/bolder`, bg, sp["text/bolder"], "status_pairing", i, m);
          checkPair(`color/icon/${role}`, bg, sp["icon"], "status_pairing", i, m);
        }
      }
    }
  }
  // ColorScheme pairs (section 3.5.1, colorScheme.contrastRequired): each Material text role on the
  // background it is drawn on, in every theme and mode. Tokens not generated are skipped.
  for (let i = 0; i < n; i++) {
    for (const m of appModes) {
      for (const pair of spec.colorScheme.contrastRequired as { text: string; background: string; minimum: number }[]) {
        const fg = byName.ColorScheme.get(pair.text);
        const bg = byName.ColorScheme.get(pair.background);
        if (!fg || !bg) continue; // no tertiary, danger turned off, ...
        const fgHex = resolveScheme(fg, i, m);
        const bgHex = resolveScheme(bg, i, m);
        if (!fgHex || !bgHex) continue; // alpha-based: excluded, as in Appearance
        const ratio = contrast(fgHex, bgHex);
        const rounded = Math.round(ratio * 100) / 100;
        const key = `${pair.text}|${m}`;
        if (!contrastByToken.has(key)) contrastByToken.set(key, []);
        contrastByToken.get(key)!.push({ against: pair.background, theme: themeModes[i], minimum: pair.minimum, ratio: rounded, pass: ratio >= pair.minimum });
        if (ratio < pair.minimum) {
          add("contrast_minimum", "ColorScheme", pair.text, modeLabel(i, m), `>= ${pair.minimum}`, rounded,
            `Minimum contrast not met against ${pair.background}.`);
        }
      }
    }
  }
  if (hasErrors()) return stop();

  // ----- 6. Token manifest (section 6.1, output 1) -----

  const manifest: ManifestEntry[] = [];
  for (const v of vars) {
    for (const [mode, value] of Object.entries(v.values)) {
      const entry: ManifestEntry = { collection: v.collection, name: v.name, type: v.type, value, scopes: v.scopes, mode };
      if (v.type === "COLOR" && !v.alpha) {
        if (v.collection === "Primitives") entry.resolved_hex = value as string;
        if (v.collection === "Theme") entry.resolved_hex = resolveTheme(v, themeModes.indexOf(mode));
        if (v.collection === "Appearance" || v.collection === "ColorScheme") {
          const perTheme = themeModes.map((_, i) => (v.collection === "Appearance" ? resolveAppearance(v.name, i, mode) : resolveScheme(v, i, mode)));
          if (perTheme.every((h) => h !== null)) {
            entry.resolved_hex = n === 1 ? perTheme[0]! : Object.fromEntries(themeModes.map((t, i) => [t, perTheme[i]!]));
          }
        }
      }
      const c = contrastByToken.get(`${v.name}|${mode}`);
      if (c) entry.contrast = c;
      manifest.push(entry);
    }
  }

  return { ok: true, collections, variables: vars, report, manifest, palettes: naming.palettes };
}

// Appearance token names in the order of appearance.order (section 3.3): group (elevation, bg, text,
// border, icon), then sub-group in order of first appearance in appearance.tokens, then emphasis
// (bolder ... softest), then tokens without an emphasis in appearance.tokens order. Names that the spec
// does not know (added by hand in Figma) keep their relative order after the known ones of their sub-group.
export function appearanceOrder(spec: Spec, names: string[]): string[] {
  const { categories, emphasis } = spec.appearance.order as { categories: string[]; emphasis: string[] };
  const specNames = Object.keys(spec.appearance.tokens);
  const reference = [...specNames, ...names.filter((n) => !specNames.includes(n))];
  const pos = new Map(reference.map((n, i) => [n, i]));
  const parentOf = (n: string): string => n.split("/").slice(0, -1).join("/");
  const firstOfParent = new Map<string, number>();
  for (const n of reference) if (!firstOfParent.has(parentOf(n))) firstOfParent.set(parentOf(n), pos.get(n)!);
  const rank = (list: string[], x: string): number => (list.includes(x) ? list.indexOf(x) : list.length);
  const key = (n: string): number[] => {
    const parts = n.split("/");
    return [rank(categories, parts[1]), firstOfParent.get(parentOf(n))!, rank(emphasis, parts[parts.length - 1]), pos.get(n)!];
  };
  const keys = new Map(names.map((n) => [n, key(n)]));
  return [...names].sort((a, b) => {
    const ka = keys.get(a)!, kb = keys.get(b)!;
    for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return ka[i] - kb[i];
    return 0;
  });
}

// Theme mode names: the user's name for each theme, or "Theme A", "Theme B", ... from the pattern
// in tokens.json (collections.Theme) when a name is missing or empty.
export function themeModeNames(spec: Spec, n: number, names: string[] = []): string[] {
  const t = spec.collections.Theme;
  return [...t.letters.slice(0, n)].map((l: string, i: number) =>
    names[i]?.trim() || t.modePattern.replace("{letter}", l));
}

// Naming grammar per collection (sections 1, 2 and 3.2).
function followsGrammar(v: VariableDef): boolean {
  const parts = v.name.split("/");
  if (parts.some((p) => p.length === 0 || p.trim() !== p)) return false;
  if (v.collection === "Primitives") return ["Color", "Size", "Typography", "Opacity"].includes(parts[0]);
  const lower = parts.every((p) => /^[a-z0-9-]+$/.test(p));
  if (v.collection === "Theme") return lower && ["color", "typography", "size"].includes(parts[0]);
  // ColorScheme: one Compose name in lowerCamelCase, such as onPrimaryContainer.
  if (v.collection === "ColorScheme") return parts.length === 1 && /^[a-z][A-Za-z]*$/.test(parts[0]);
  return lower && parts[0] === "color" && ["elevation", "bg", "text", "border", "icon"].includes(parts[1]);
}
