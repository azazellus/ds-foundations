// Logic tests. Run with: node --experimental-strip-types test/logic.test.ts
import assert from "node:assert/strict";
import { hexToOklch, oklchToHex, contrast, inGamut } from "../src/color.ts";
import { buildPalette, STEPS, CONTRAST_PAIRS, pairBackgroundHex, buildHuePalette, closestStep, yellowFactor,
  CHROMA_CEILING, REFERENCE_C400, YELLOW_BOOST, SHIFT_NOTICE_DISTANCE, placeAnchor, TARGET_L,
  buildNeutralPalette, NEUTRAL_CHROMA, NEUTRAL_FADE, GRAY_HEX, neutralOf } from "../src/palette.ts";
import { validateHex } from "../src/validate.ts";
import { assignPaletteNames, hslHue, hueDistance, paletteRenames } from "../src/naming.ts";
import { readFileSync } from "node:fs";
import { buildPlan, namePalettes, themeModeNames, weightSlotOf } from "../src/foundations.ts";
import type { Inputs, Plan, ThemeInput } from "../src/foundations.ts";
import { buildTables } from "../src/tables.ts";
import { buildAppearanceExport, buildColorSchemeExport, exportFiles, exportName, kotlinFiles } from "../src/export.ts";

// 1. Color math round trip: HEX -> OKLCH -> HEX must return the same value.
for (const hex of ["#78449F", "#FFFFFF", "#000000", "#0D0D0D", "#D62828", "#2A9D8F", "#F4A261", "#EAEAEA"]) {
  assert.equal(oklchToHex(hexToOklch(hex)), hex, `round trip failed for ${hex}`);
}

// 2. WCAG contrast: black on white is 21:1.
assert.ok(Math.abs(contrast("#000000", "#FFFFFF") - 21) < 1e-9);

// 3. Palettes: every one must pass its minimums, keep order, and stay in gamut.
const samples: [string, string][] = [
  ["Violet", "#78449F"],
  ["Teal", "#2A9D8F"],
  ["Red", "#D62828"],
  ["Yellow", "#F4C430"],
  ["Blue", "#1D4ED8"],
  ["Green", "#2E7D32"],
];

for (const [name, hex] of samples) {
  const p = buildPalette(name, hex);
  assert.equal(p.errors.length, 0, `${name}: errors ${JSON.stringify(p.errors)}`);

  // Lightness must rise from step 950 to step 50.
  const Ls = STEPS.map((s) => p.steps[s].lch.L);
  for (let i = 1; i < Ls.length; i++) {
    assert.ok(Ls[i] > Ls[i - 1], `${name}: order broken at step ${STEPS[i]}`);
  }

  // Every step must be inside sRGB.
  for (const s of STEPS) {
    assert.ok(inGamut(p.steps[s].lch), `${name}: step ${s} out of gamut`);
  }

  // Every minimum must pass.
  for (const pair of CONTRAST_PAIRS) {
    const ratio = contrast(p.steps[pair.text].hex, pairBackgroundHex(p, pair));
    assert.ok(ratio >= pair.min, `${name}: ${pair.text} vs ${pair.bg} = ${ratio.toFixed(2)}`);
  }

  const targets = CONTRAST_PAIRS.map((pair) => {
    const r = contrast(p.steps[pair.text].hex, pairBackgroundHex(p, pair));
    return `${pair.text}/${pair.bgPalette === "self" ? "own" : ""}${pair.bg}=${r.toFixed(2)} (target ${pair.target})`;
  });
  console.log(`${name} ${hex}: anchor ${p.anchor}, adjustments ${p.adjustments}, warnings ${p.warnings.length}`);
  console.log(`  ${targets.join(", ")}`);
  for (const w of p.warnings) console.log(`  warning ${w.check} step ${w.step}: ${w.message}`);
}

// 4. Input validation.
assert.equal(validateHex("#78449F").length, 0);
assert.equal(validateHex("78449F").length, 1);

// 5. Variable plan (src/foundations.ts).
const spec = JSON.parse(readFileSync(new URL("../spec/tokens.json", import.meta.url), "utf8"));
const themeA: ThemeInput = {
  brand: { hex: "#78449F" },
  success: { hex: "#2E7D32" },
  danger: { hex: "#D62828" },
  warning: { hex: "#F4C430" },
  info: { hex: "#1D4ED8" },
  fontFamily: "Inter",
  // As the Figma layer reports them for Inter (non-italic). No weights selected: the slot matches are used.
  availableWeights: ["Thin", "Light", "Regular", "Medium", "Semi Bold", "Bold", "Black"],
};
const checksOf = (inputs: Inputs, s = spec) => buildPlan(s, inputs).report.filter((r) => r.severity === "error").map((r) => r.check);

// 5a. Bad inputs stop generation before anything is built.
assert.deepEqual(checksOf({ numberOfThemes: 27, themes: [themeA] }), ["missing_input"]);
assert.deepEqual(checksOf({ numberOfThemes: 0, themes: [] }), ["missing_input"]);
assert.deepEqual(checksOf({ numberOfThemes: 1.5, themes: [themeA] }), ["missing_input"]);
assert.ok(checksOf({ numberOfThemes: 2, themes: [themeA] }).includes("missing_input"));
assert.ok(checksOf({ numberOfThemes: 3, themes: [themeA, themeA] }).includes("missing_input"));
assert.ok(checksOf({ numberOfThemes: 1, themes: [{ ...themeA, brand: { hex: "78449F" } }] }).includes("invalid_hex"));
assert.ok(checksOf({ numberOfThemes: 1, themes: [{ ...themeA, brand: { hex: "" } }] }).includes("missing_input"));
assert.ok(checksOf({ numberOfThemes: 1, themes: [{ ...themeA, fontFamily: " " }] }).includes("missing_input"));
assert.ok(checksOf({ numberOfThemes: 1, themes: [themeA], darkCanvasStep: 800 }).includes("missing_input"));
const failed = buildPlan(spec, { numberOfThemes: 3, themes: [] });
assert.equal(failed.ok, false);
assert.equal(failed.variables.length, 0, "a failed plan must contain no variables");

// 5b. A contrast failure in Appearance stops generation. TEST-ONLY copy of the spec with a
// requirement no palette can meet; spec/tokens.json is not changed.
const strict = structuredClone(spec);
strict.appearance.statusPairings["text/bold"] = 21;
const stopped = buildPlan(strict, { numberOfThemes: 1, themes: [themeA] });
assert.equal(stopped.ok, false);
assert.ok(stopped.report.some((r) => r.check === "status_pairing" && r.severity === "error"));
assert.equal(stopped.variables.length, 0);

// 5c. Build checks with the real spec.
const plan = buildPlan(spec, { numberOfThemes: 1, themes: [themeA] });
assert.equal(plan.ok, true, JSON.stringify(plan.report.filter((r) => r.severity === "error")));
const count = (c: string) => plan.variables.filter((v) => v.collection === c).length;
// Primitives: Black + White, Gray 13, five palettes x 13, 28 sizes, 1 family, 5 slot-matching weights, 15 opacities.
assert.equal(count("Primitives"), 2 + 13 + 5 * 13 + 28 + 1 + 5 + 15);
// Theme: neutral 15, five other roles x 13, alpha 30 + 75, typography 6, size 11 + 16 + 5.
assert.equal(count("Theme"), 15 + 5 * 13 + 30 + 75 + 6 + 32);
assert.equal(count("Appearance"), Object.keys(spec.appearance.tokens).length);

const find = (c: string, name: string) => plan.variables.find((v) => v.collection === c && v.name === name)!;
assert.deepEqual(find("Theme", "color/brand/500").values, { "Theme A": { alias: "Color/Purple/500" } });
assert.deepEqual(find("Theme", "color/neutral/50").values, { "Theme A": { alias: "Color/Gray/50" } });
assert.deepEqual(find("Theme", "color/danger/alpha/a36").values, { "Theme A": { alias: "Color/Red/500", opacityAlias: "Opacity/36" } });
assert.equal(find("Theme", "color/danger/alpha/a36").alpha, true);
assert.deepEqual(find("Theme", "color/neutral/alpha/white/a16").values, { "Theme A": { alias: "Color/White", opacityAlias: "Opacity/16" } });
// Every alpha token links to an Opacity Primitive whose number matches its name (a04 -> Opacity/4).
for (const v of plan.variables.filter((x) => x.alpha)) {
  const val = v.values["Theme A"] as { alias: string; opacityAlias?: string };
  assert.equal(val.opacityAlias, "Opacity/" + Number(v.name.slice(-2)), v.name);
}
// A missing Opacity Primitive is an unresolved_reference. TEST-ONLY spec copy without Opacity 36.
const noOp36 = structuredClone(spec);
noOp36.primitives.opacities = noOp36.primitives.opacities.filter((o: number) => o !== 36);
const brokenOp = buildPlan(noOp36, { numberOfThemes: 1, themes: [themeA] });
assert.equal(brokenOp.ok, false);
assert.ok(brokenOp.report.some((r) => r.check === "unresolved_reference" && r.expected === "Primitives: Opacity/36"));
assert.deepEqual(find("Theme", "typography/font-family").values, { "Theme A": { alias: "Typography/Font-family/Inter" } });
assert.deepEqual(find("Theme", "size/border/sm").values, { "Theme A": { alias: "Size/0-5" } });
assert.deepEqual(find("Theme", "size/border/sm").scopes, ["STROKE_FLOAT"]);
assert.deepEqual(find("Primitives", "Opacity/48").scopes, ["OPACITY"]);
assert.deepEqual(find("Primitives", "Color/Purple/500").scopes, []);
assert.deepEqual(find("Appearance", "color/icon/danger").scopes, ["SHAPE_FILL", "TEXT_FILL"]);
assert.deepEqual(find("Appearance", "color/elevation/shadow/card").scopes, ["EFFECT_COLOR"]);
assert.deepEqual(find("Appearance", "color/bg/base").values.Dark, { alias: "color/neutral/950" });

// Manifest: one entry per variable per mode; alpha tokens carry no resolved HEX.
assert.equal(plan.manifest.length, count("Primitives") + count("Theme") + 2 * count("Appearance") + 2 * count("ColorScheme"));
assert.equal(plan.manifest.find((e) => e.name === "color/bg/disabled")!.resolved_hex, undefined);
assert.equal(plan.manifest.find((e) => e.name === "color/bg/base" && e.mode === "Light")!.resolved_hex, "#FFFFFF");

// 5d. Dark canvas step 900 changes the two Dark canvas tokens only.
const plan900 = buildPlan(spec, { numberOfThemes: 1, themes: [themeA], darkCanvasStep: 900 });
const find900 = (name: string) => plan900.variables.find((v) => v.name === name)!;
assert.deepEqual(find900("color/bg/base").values.Dark, { alias: "color/neutral/900" });
assert.deepEqual(find900("color/elevation/surface/canvas").values.Dark, { alias: "color/neutral/900" });
assert.deepEqual(find900("color/border/inverse").values.Dark, { alias: "color/neutral/950" });

// 5d2. Dark backgrounds and surfaces follow the canvas (section 5.1 table, appearance.darkCanvas).
const expectedDark: Record<number, Record<string, number>> = {
  950: { softest: 900, softer: 850, soft: 800, overlay: 900, menu: 850, raised: 850 },
  900: { softest: 850, softer: 800, soft: 700, overlay: 850, menu: 800, raised: 800 },
  850: { softest: 800, softer: 700, soft: 600, overlay: 800, menu: 700, raised: 700 },
};
for (const step of [950, 900, 850]) {
  const p = buildPlan(spec, { numberOfThemes: 1, themes: [themeA], darkCanvasStep: step });
  assert.equal(p.ok, true, `canvas ${step}: ${JSON.stringify(p.report.filter((r) => r.severity === "error"))}`);
  const dark = (name: string) => (p.variables.find((v) => v.collection === "Appearance" && v.name === name)!.values.Dark as { alias: string }).alias;
  const e = expectedDark[step];
  assert.equal(dark("color/elevation/surface/canvas"), `color/neutral/${step}`);
  assert.equal(dark("color/bg/base"), `color/neutral/${step}`);
  for (const [roleToken, role] of [["brand", "brand"], ["danger", "danger"], ["info", "info"], ["neutral", "neutral"],
    ["selected", "brand"], ["success", "success"], ["warning", "warning"]]) {
    for (const emph of ["softest", "softer", "soft"]) {
      assert.equal(dark(`color/bg/${roleToken}/${emph}`), `color/${role}/${e[emph]}`, `canvas ${step} ${roleToken}/${emph}`);
    }
  }
  for (const s of ["overlay", "menu", "raised"]) assert.equal(dark(`color/elevation/surface/${s}`), `color/neutral/${e[s]}`);
  // Tokens outside the list do not move.
  assert.equal(dark("color/border/inverse"), "color/neutral/950");
  assert.equal(dark("color/bg/input"), "color/neutral/700");
}
assert.ok(checksOf({ numberOfThemes: 1, themes: [themeA], darkCanvasStep: 800 }).includes("missing_input"));

// 5e. Two themes: per-theme palettes; a palette shared by both themes (same name and HEX) is created once.
const themeB: ThemeInput = { ...themeA, brand: { hex: "#2A9D8F" }, fontFamily: "Garamond" };
const plan2 = buildPlan(spec, { numberOfThemes: 2, themes: [themeA, themeB] });
assert.equal(plan2.ok, true, JSON.stringify(plan2.report.filter((r) => r.severity === "error")));
assert.deepEqual(plan2.variables.find((v) => v.name === "color/brand/400")!.values, {
  "Theme A": { alias: "Color/Purple/400" }, "Theme B": { alias: "Color/Teal/400" },
});
assert.equal(plan2.variables.filter((v) => v.name === "Color/Red/500").length, 1);
assert.ok(plan2.variables.some((v) => v.name === "Typography/Font-family/Garamond"));

// 5f. A weight picked in one theme only is an error; a weight picked in no theme is not created.
assert.ok(checksOf({ numberOfThemes: 2, themes: [themeA, { ...themeB, fontWeights: ["Regular", "Bold"] }] }, spec).includes("missing_input"));
const planW = buildPlan(spec, { numberOfThemes: 1, themes: [{ ...themeA, fontWeights: ["Regular", "Bold"] }] });
assert.equal(planW.ok, true);
assert.equal(planW.variables.some((v) => v.name === "typography/font-weight/light"), false);
assert.equal(planW.variables.some((v) => v.name === "Typography/Font-weight/Light"), false);

// 5g. More than two themes, and extra appearances based on Light or Dark (section 5.1).
const themeC: ThemeInput = { ...themeA, brand: { hex: "#E4572E" }, fontFamily: "Roboto" };
const extras = [{ name: "Dim", base: "Dark", canvasStep: 850 }, { name: "Paper", base: "Light" }];
const plan3 = buildPlan(spec, { numberOfThemes: 3, themes: [themeA, themeB, themeC], extraAppearances: extras });
assert.equal(plan3.ok, true, JSON.stringify(plan3.report.filter((r) => r.severity === "error")));
assert.deepEqual(plan3.collections.find((c) => c.name === "Theme")!.modes, ["Theme A", "Theme B", "Theme C"]);
assert.deepEqual(plan3.collections.find((c) => c.name === "Appearance")!.modes, ["Light", "Dark", "Dim", "Paper"]);
const find3 = (c: string, name: string) => plan3.variables.find((v) => v.collection === c && v.name === name)!;
assert.deepEqual(find3("Theme", "color/brand/500").values["Theme C"], { alias: "Color/Vermilion/500" });
assert.deepEqual(find3("Theme", "color/neutral/500").values["Theme C"], { alias: "Color/Gray/500" });
// Dim = Dark with canvas 850; Dark keeps the default 950; Paper = Light.
assert.deepEqual(find3("Appearance", "color/elevation/surface/canvas").values, {
  Light: { alias: "color/neutral/white" }, Dark: { alias: "color/neutral/950" },
  Dim: { alias: "color/neutral/850" }, Paper: { alias: "color/neutral/white" },
});
assert.deepEqual(find3("Appearance", "color/bg/success/softer").values.Dim, { alias: "color/success/700" });
assert.deepEqual(find3("Appearance", "color/text/link").values.Paper, find3("Appearance", "color/text/link").values.Light);
// Every Appearance token has a value in all 4 appearances; checks ran in all 3 × 4 contexts.
assert.ok(plan3.variables.filter((v) => v.collection === "Appearance").every((v) => Object.keys(v.values).length === 4));
assert.ok(plan3.manifest.some((e) => e.contrast?.some((c) => c.theme === "Theme C") && e.mode === "Dim"));
// Invalid extra appearances stop generation.
for (const bad of [[{ name: "Dark", base: "Dark" }], [{ name: "", base: "Light" }], [{ name: "Dim!", base: "Dark" }],
  [{ name: "Dim", base: "Dark" }, { name: "Dim", base: "Light" }], [{ name: "Dim", base: "Sepia" }],
  [{ name: "Dim", base: "Dark", canvasStep: 800 }]]) {
  assert.ok(checksOf({ numberOfThemes: 1, themes: [themeA], extraAppearances: bad }).includes("missing_input"), JSON.stringify(bad));
}

// 5h. Status roles that are turned off (inputs.statusRoles): nothing is asked for or created for them.
const { warning: _w, info: _i, ...themeNoWI } = themeA;
const planSD = buildPlan(spec, { numberOfThemes: 1, themes: [themeNoWI], statusRoles: ["success", "danger"] });
assert.equal(planSD.ok, true, JSON.stringify(planSD.report.filter((r) => r.severity === "error")));
assert.equal(planSD.variables.filter((v) => /warning|info|Yellow|Blue/.test(v.name)).length, 0);
const countSD = (c: string) => planSD.variables.filter((v) => v.collection === c).length;
assert.equal(countSD("Primitives"), count("Primitives") - 2 * 13); // two palettes fewer
assert.equal(countSD("Theme"), count("Theme") - 2 * (13 + 15)); // two roles and their alpha tokens fewer
assert.equal(countSD("Appearance"), count("Appearance") - 2 * 8); // bg ×4, text ×2, border, icon per role
assert.ok(!planSD.manifest.some((e) => e.contrast?.some((c) => /warning|info/.test(c.against))));
assert.ok(!buildTables(spec, planSD)[2].groups.some((g) => g.rows.some((r) => /warning|info/.test(r.name))));
// All four off: only brand and neutral remain, and the plan still passes.
const { success: _s, danger: _d, ...brandOnly } = themeNoWI;
assert.equal(buildPlan(spec, { numberOfThemes: 1, themes: [brandOnly], statusRoles: [] }).ok, true);
// An unknown role is an error; a missing color for a role in use is still reported.
assert.ok(checksOf({ numberOfThemes: 1, themes: [themeA], statusRoles: ["success", "error"] }).includes("missing_input"));
assert.ok(checksOf({ numberOfThemes: 1, themes: [themeNoWI], statusRoles: ["warning"] }).includes("missing_input"));

// 6. Same-palette pairing (section 1.1.5, last row).
// 6a. The pairings in palette.ts must match tokens.json exactly.
assert.deepEqual(
  CONTRAST_PAIRS.map((p) => [p.text, p.bg, p.bgPalette, p.min, p.target]),
  spec.primitives.contrastPairs.map((p: any) => [p.text, p.background, p.backgroundPalette, p.minimum, p.target]),
  "palette.ts CONTRAST_PAIRS differs from tokens.json primitives.contrastPairs",
);

// 6b. Inputs that used to fail step 500 vs their own step 100: very light colors anchored at step 100,
// and saturated reds whose step 500 only just passed against Gray 100.
for (const hex of ["#FFDDC3", "#F9DFCB", "#FFDEBA", "#F6E1C9", "#D2006F", "#D60056", "#C83B2C"]) {
  const p = buildPalette("Sample", hex);
  assert.equal(p.errors.length, 0, `${hex}: errors ${JSON.stringify(p.errors)}`);
  const r = contrast(p.steps[500].hex, p.steps[100].hex);
  assert.ok(r >= 4.5, `${hex}: step 500 vs own 100 = ${r.toFixed(2)}`);
  const Ls = STEPS.map((s) => p.steps[s].lch.L);
  for (let i = 1; i < Ls.length; i++) assert.ok(Ls[i] > Ls[i - 1], `${hex}: order broken at step ${STEPS[i]}`);
}

// 6c. A pale status color passes the status pairing on softer in the full plan.
const pale = buildPlan(spec, { numberOfThemes: 1, themes: [{ ...themeA, info: { hex: "#FFDDC3" } }] });
assert.equal(pale.ok, true, JSON.stringify(pale.report.filter((r) => r.severity === "error")));

// 7. Color tables (src/tables.ts).
const tables = buildTables(spec, plan2); // two themes
assert.deepEqual(tables.map((t) => t.collection), ["Primitives", "Theme", "Appearance", "ColorScheme"]);
const colorCount = (c: string) => plan2.variables.filter((v) => v.collection === c && v.type === "COLOR").length;
for (const t of tables) {
  assert.equal(t.count, colorCount(t.collection), `${t.collection} count`);
  assert.equal(t.groups.reduce((n, g) => n + g.rows.length, 0), t.count, `${t.collection} rows`);
}
const [tPrim, tTheme, tApp] = tables;
assert.equal(tPrim.groups[0].name, "Color"); // Color/Black and Color/White
assert.deepEqual(tPrim.groups[0].rows.map((r) => r.name), ["Color/Black", "Color/White"]);
assert.ok(tPrim.groups.some((g) => g.name === "Color/Purple" && g.rows.length === 13));
assert.deepEqual(tTheme.columns, ["THEME A", "THEME B"]);
const brand400 = tTheme.groups.find((g) => g.name === "color/brand")!.rows.find((r) => r.name === "color/brand/400")!;
assert.deepEqual(brand400.cells.map((c) => c.ref), ["Color/Purple/400", "Color/Teal/400"]);
assert.equal(brand400.cells[0].opacityRef, undefined);
const a36 = tTheme.groups.find((g) => g.name === "color/danger")!.rows.find((r) => r.name === "color/danger/alpha/a36")!;
assert.deepEqual(a36.cells.map((c) => c.opacityRef), ["Opacity/36", "Opacity/36"]);
assert.deepEqual(tApp.groups.map((g) => g.name), ["color/elevation", "color/bg", "color/text", "color/border", "color/icon"]);
assert.deepEqual(tApp.columns, ["THEME A LIGHT", "THEME A DARK", "THEME B LIGHT", "THEME B DARK"]);
const appBase = tApp.groups.find((g) => g.name === "color/bg")!.rows.find((r) => r.name === "color/bg/base")!;
assert.deepEqual(appBase.cells.map((c) => [c.themeMode, c.appMode, c.dark, c.ref]), [
  ["Theme A", "Light", false, "color/neutral/white"], ["Theme A", "Dark", true, "color/neutral/950"],
  ["Theme B", "Light", false, "color/neutral/white"], ["Theme B", "Dark", true, "color/neutral/950"],
]);
assert.ok(tApp.info.startsWith("Four contexts"));
// One theme: two Appearance columns, one Theme column.
const [, tTheme1, tApp1] = buildTables(spec, plan);
assert.deepEqual(tTheme1.columns, ["THEME A"]);
assert.deepEqual(tApp1.columns, ["THEME A LIGHT", "THEME A DARK"]);
assert.ok(tApp1.info.startsWith("Two contexts"));
// Three themes and four appearances: 12 Appearance columns; Dim is dark by its colors, Paper is not.
const [, tTheme3, tApp3] = buildTables(spec, plan3);
assert.deepEqual(tTheme3.columns, ["THEME A", "THEME B", "THEME C"]);
assert.ok(tTheme3.info.includes("Theme A, Theme B and Theme C"));
assert.equal(tApp3.columns.length, 12);
assert.ok(tApp3.info.startsWith("Twelve contexts"));
const canvasRow = tApp3.groups.find((g) => g.name === "color/elevation")!.rows.find((r) => r.name === "color/elevation/surface/canvas")!;
const darkByMode = Object.fromEntries(canvasRow.cells.filter((c) => c.themeMode === "Theme C").map((c) => [c.appMode, c.dark]));
assert.deepEqual(darkByMode, { Light: false, Dark: true, Dim: true, Paper: false });

// 7c. Appearance order (appearance.order): groups elevation, bg, text, border, icon; emphasis bolder to softest.
const appNames = plan.variables.filter((v) => v.collection === "Appearance").map((v) => v.name);
const groupsInOrder = [...new Set(appNames.map((n) => n.split("/")[1]))];
assert.deepEqual(groupsInOrder, ["elevation", "bg", "text", "border", "icon"]);
const sub = (prefix: string) => appNames.filter((n) => n.startsWith(prefix)).map((n) => n.slice(prefix.length));
assert.deepEqual(sub("color/bg/brand/"), ["bold", "accent", "soft", "softer", "softest"]);
assert.deepEqual(sub("color/bg/neutral/"), ["bolder", "soft", "softer", "softest"]);
assert.deepEqual(sub("color/text/brand/"), ["bolder", "bold"]);
assert.deepEqual(sub("color/icon/brand/"), ["bolder", "bold", "accent"]);
assert.deepEqual(sub("color/border/brand/"), ["heavy", "light"]); // no emphasis: kept as they are
// The tables use the same order even when the file's variables come in another order (shuffled here).
const shuffled = { collections: plan.collections, variables: [...plan.variables].reverse() };
const [, , tAppShuffled] = buildTables(spec, shuffled);
assert.deepEqual(tAppShuffled.groups.map((g) => g.name), ["color/elevation", "color/bg", "color/text", "color/border", "color/icon"]);
assert.deepEqual(tAppShuffled.groups.flatMap((g) => g.rows.map((r) => r.name)), appNames);

// A failed plan draws nothing.
assert.deepEqual(buildTables(spec, failed), []);

// 7b. "Update tables only" uses the variables read from the file, which the user may have edited by hand.
// Simulated here: color/brand/400 re-pointed in Theme A, no "alpha" flag (live variables have none),
// and no Appearance or ColorScheme collection yet.
const live = {
  collections: plan2.collections.filter((c) => c.name !== "Appearance" && c.name !== "ColorScheme"),
  variables: plan2.variables
    .filter((v) => v.collection !== "Appearance" && v.collection !== "ColorScheme")
    .map((v) => {
      const { alpha, ...rest } = v;
      return v.name === "color/brand/400"
        ? { ...rest, values: { ...v.values, "Theme A": { alias: "Color/Purple/300" } } }
        : rest;
    }),
};
const liveTables = buildTables(spec, live);
assert.deepEqual(liveTables.map((t) => t.collection), ["Primitives", "Theme"]);
const liveBrand400 = liveTables[1].groups.find((g) => g.name === "color/brand")!.rows.find((r) => r.name === "color/brand/400")!;
assert.deepEqual(liveBrand400.cells.map((c) => c.ref), ["Color/Purple/300", "Color/Teal/400"]);
const liveA36 = liveTables[1].groups.find((g) => g.name === "color/danger")!.rows.find((r) => r.name === "color/danger/alpha/a36")!;
assert.equal(liveA36.cells[0].opacityRef, "Opacity/36");

// 8. Theme names (inputs.themeNames): the user's names, defaults for empty entries; invalid or duplicated names stop.
const planN = buildPlan(spec, { numberOfThemes: 3, themes: [themeA, themeB, themeC], themeNames: ["Acme", "", "Night Shop"] });
assert.equal(planN.ok, true, JSON.stringify(planN.report.filter((r) => r.severity === "error")));
assert.deepEqual(planN.collections.find((c) => c.name === "Theme")!.modes, ["Acme", "Theme B", "Night Shop"]);
assert.deepEqual(planN.variables.find((v) => v.name === "color/brand/500")!.values["Night Shop"], { alias: "Color/Vermilion/500" });
assert.deepEqual(themeModeNames(spec, 2), ["Theme A", "Theme B"]);
for (const bad of [["Acme", "Acme"], ["Acme!"], ["Two  spaces"]]) {
  assert.ok(checksOf({ numberOfThemes: bad.length, themes: [themeA, themeB].slice(0, bad.length), themeNames: bad }).includes("missing_input"), JSON.stringify(bad));
}

// 9. Without Dark (inputs.includeDark false): no Dark mode, no Dark values or checks; Dark-based extras still work.
const planL = buildPlan(spec, { numberOfThemes: 1, themes: [themeA], includeDark: false, extraAppearances: [{ name: "Dim", base: "Dark", canvasStep: 900 }] });
assert.equal(planL.ok, true, JSON.stringify(planL.report.filter((r) => r.severity === "error")));
assert.deepEqual(planL.collections.find((c) => c.name === "Appearance")!.modes, ["Light", "Dim"]);
assert.ok(planL.variables.filter((v) => v.collection === "Appearance").every((v) => !("Dark" in v.values)));
assert.deepEqual(planL.variables.find((v) => v.name === "color/bg/base")!.values.Dim, { alias: "color/neutral/900" });
assert.ok(!planL.manifest.some((e) => e.mode === "Dark"));
// The dark canvas step is ignored without Dark.
assert.equal(buildPlan(spec, { numberOfThemes: 1, themes: [themeA], includeDark: false, darkCanvasStep: 800 }).ok, true);

// 10. Light canvas 50 (appearance.lightCanvas): only the two canvas tokens change; nothing else moves,
// so the plan passes with all status roles on.
for (const viaExtra of [false, true]) {
  const p = viaExtra
    ? buildPlan(spec, { numberOfThemes: 1, themes: [themeA], extraAppearances: [{ name: "Paper", base: "Light", canvasStep: "50" }] })
    : buildPlan(spec, { numberOfThemes: 1, themes: [themeA], lightCanvasStep: 50 });
  assert.equal(p.ok, true, JSON.stringify(p.report.filter((r) => r.severity === "error")));
  const mode = viaExtra ? "Paper" : "Light";
  const val = (name: string) => (p.variables.find((v) => v.collection === "Appearance" && v.name === name)!.values[mode] as { alias: string }).alias;
  assert.equal(val("color/elevation/surface/canvas"), "color/neutral/50");
  assert.equal(val("color/bg/base"), "color/neutral/50");
  assert.equal(val("color/elevation/surface/menu"), "color/neutral/white");
  assert.equal(val("color/elevation/surface/raised"), "color/neutral/100");
  // Everything else keeps its Light value from the spec.
  const changed = [...spec.appearance.lightCanvas.canvasTokens, "color/elevation/surface/menu", "color/elevation/surface/raised"];
  for (const name of Object.keys(spec.appearance.tokens)) {
    if (changed.includes(name)) continue;
    assert.equal(val(name), spec.appearance.tokens[name].Light, name);
  }
}
// With an extra Paper at 50, Light itself stays white.
const planP = buildPlan(spec, { numberOfThemes: 1, themes: [themeA], extraAppearances: [{ name: "Paper", base: "Light", canvasStep: 50 }] });
assert.deepEqual(planP.variables.find((v) => v.name === "color/bg/base")!.values.Light, { alias: "color/neutral/white" });
assert.deepEqual(planP.variables.find((v) => v.name === "color/elevation/surface/menu")!.values.Light, { alias: "color/neutral/50" });
assert.deepEqual(planP.variables.find((v) => v.name === "color/elevation/surface/raised")!.values.Light, { alias: "color/neutral/50" });
assert.ok(checksOf({ numberOfThemes: 1, themes: [themeA], lightCanvasStep: 100 }).includes("missing_input"));
assert.ok(checksOf({ numberOfThemes: 1, themes: [themeA], extraAppearances: [{ name: "Paper", base: "Light", canvasStep: 950 }] }).includes("missing_input"));

// 11. Custom roles (inputs.customRoles): per-theme palettes and the same tokens and checks as a status role.
const promoA = { ...themeA, custom: { promo: { hex: "#D6336C" } } };
const promoB = { ...themeB, custom: { promo: { hex: "#E8590C" } } };
const planC = buildPlan(spec, { numberOfThemes: 2, themes: [promoA, promoB], customRoles: ["promo"] });
assert.equal(planC.ok, true, JSON.stringify(planC.report.filter((r) => r.severity === "error")));
const findC = (c: string, name: string) => planC.variables.find((v) => v.collection === c && v.name === name);
const countC = (c: string) => planC.variables.filter((v) => v.collection === c).length;
const count2 = (c: string) => plan2.variables.filter((v) => v.collection === c).length;
assert.equal(countC("Primitives"), count2("Primitives") + 2 * 13); // Cerise and Persimmon
assert.equal(countC("Theme"), count2("Theme") + 13 + 15);
assert.equal(countC("Appearance"), count2("Appearance") + 8);
assert.deepEqual(findC("Theme", "color/promo/500")!.values, { "Theme A": { alias: "Color/Cerise/500" }, "Theme B": { alias: "Color/Persimmon/500" } });
assert.deepEqual(findC("Theme", "color/promo/alpha/a08")!.values["Theme B"], { alias: "Color/Persimmon/500", opacityAlias: "Opacity/8" });
assert.deepEqual(findC("Appearance", "color/bg/promo/softer")!.values, { Light: { alias: "color/promo/100" }, Dark: { alias: "color/promo/850" } });
assert.deepEqual(findC("Appearance", "color/icon/promo")!.scopes, ["SHAPE_FILL", "TEXT_FILL"]);
// Custom backgrounds follow both canvases.
const planC2 = buildPlan(spec, { numberOfThemes: 1, themes: [promoA], customRoles: ["promo"], darkCanvasStep: 900, extraAppearances: [{ name: "Paper", base: "Light", canvasStep: 50 }] });
// On a Light canvas of 50 the promo backgrounds keep their Light values.
assert.equal(planC2.ok, true, JSON.stringify(planC2.report.filter((r) => r.severity === "error")));
assert.deepEqual(planC2.variables.find((v) => v.name === "color/bg/promo/soft")!.values.Paper, { alias: "color/promo/150" });
const planC3 = buildPlan(spec, { numberOfThemes: 1, themes: [promoA], customRoles: ["promo"], darkCanvasStep: 900 });
assert.deepEqual(planC3.variables.find((v) => v.name === "color/bg/promo/soft")!.values, { Light: { alias: "color/promo/150" }, Dark: { alias: "color/promo/700" } });
// Checks: canvas contrast and status pairings ran for promo.
const promoChecks = planC.manifest.filter((e) => e.name === "color/text/promo/bold" && e.mode === "Light")[0].contrast!;
assert.ok(promoChecks.some((c) => c.against === "color/elevation/surface/canvas"));
assert.ok(promoChecks.some((c) => c.against === "color/bg/promo/softer"));
// Ordered after the built-in tokens of each group.
const appC = planC.variables.filter((v) => v.collection === "Appearance").map((v) => v.name);
assert.ok(appC.indexOf("color/bg/promo/bold") > appC.indexOf("color/bg/warning/softest"));
assert.ok(appC.indexOf("color/bg/promo/bold") < appC.indexOf("color/text/neutral/bolder"));
assert.deepEqual(appC.filter((n) => n.startsWith("color/bg/promo/")).map((n) => n.split("/")[3]), ["bold", "soft", "softer", "softest"]);
// Invalid role names, and a missing color in one theme, stop generation.
for (const bad of [["Promo"], ["promo", "promo"], ["brand"], ["link"], [""]]) {
  assert.ok(checksOf({ numberOfThemes: 1, themes: [promoA], customRoles: bad }).includes("missing_input"), JSON.stringify(bad));
}
assert.ok(checksOf({ numberOfThemes: 2, themes: [promoA, themeB], customRoles: ["promo"] }).includes("missing_input"));

// 12. Font weights follow the family's own styles (inputs.fontWeights).
const findPlan = (p: any, name: string) => p.variables.find((v: any) => v.name === name);
assert.ok(findPlan(plan, "Typography/Font-weight/Semi Bold"));
assert.deepEqual(findPlan(plan, "typography/font-weight/semibold").values, { "Theme A": { alias: "Typography/Font-weight/Semi Bold" } });
assert.equal(findPlan(plan, "Typography/Font-weight/Thin"), undefined); // matches no slot, so not selected by default
// Different names per family fill the same slot.
const garamond = { ...themeA, fontFamily: "Garamond", availableWeights: ["Regular", "SemiBold", "Bold", "ExtraBold"], fontWeights: ["Regular", "SemiBold", "Bold", "ExtraBold"] };
const interPicked = { ...themeA, fontWeights: ["Regular", "Semi Bold", "Bold", "Thin"] };
const planF = buildPlan(spec, { numberOfThemes: 2, themes: [interPicked, { ...garamond, brand: themeB.brand }] });
assert.equal(planF.ok, true, JSON.stringify(planF.report.filter((r) => r.severity === "error")));
assert.deepEqual(findPlan(planF, "typography/font-weight/semibold").values, {
  "Theme A": { alias: "Typography/Font-weight/Semi Bold" }, "Theme B": { alias: "Typography/Font-weight/SemiBold" },
});
assert.ok(findPlan(planF, "Typography/Font-weight/Thin") && findPlan(planF, "Typography/Font-weight/ExtraBold")); // Primitives only
assert.equal(findPlan(planF, "typography/font-weight/light"), undefined); // matched in no theme
// A slot matched in some themes only: error naming the slot and the family without a match.
const partial = buildPlan(spec, { numberOfThemes: 2, themes: [themeA, { ...garamond, brand: themeB.brand }] });
const slotErr = partial.report.find((r) => r.token === "typography/font-weight/light")!;
assert.equal(slotErr.check, "missing_input");
assert.ok(slotErr.message.includes("Garamond"));
// A style the family does not have is an error.
assert.ok(checksOf({ numberOfThemes: 1, themes: [{ ...themeA, fontWeights: ["Book"] }] }).includes("missing_input"));
assert.equal(weightSlotOf("Semi Bold"), "semibold");

// 13. Developer export (src/export.ts): Appearance tokens as HEX per theme and appearance.
const opts = (keepColorPrefix: boolean, naming: any) => ({ keepColorPrefix, naming });
assert.equal(exportName("color/bg/brand/bold", opts(true, "dot")), "color.bg.brand.bold");
assert.equal(exportName("color/bg/brand/bold", opts(false, "dot")), "bg.brand.bold");
assert.equal(exportName("color/bg/brand/bold", opts(true, "pascal")), "ColorBgBrandBold");
assert.equal(exportName("color/bg/brand/bold", opts(false, "camel")), "bgBrandBold");
assert.equal(exportName("color/bg/brand/bold", opts(true, "kebab")), "--color-bg-brand-bold");
assert.equal(exportName("color/text/on-dark", opts(false, "camel")), "textOnDark");
const ex = buildAppearanceExport(plan2, opts(false, "dot"));
assert.deepEqual(ex.problems, []);
assert.equal(ex.data.version, 1);
assert.deepEqual(Object.keys(ex.data.themes), ["Theme A", "Theme B"]);
assert.deepEqual(Object.keys(ex.data.themes["Theme A"].appearances), ["Light", "Dark"]);
const exLight = ex.data.themes["Theme A"].appearances.Light;
assert.equal(Object.keys(exLight).length, count2("Appearance"));
assert.deepEqual(Object.keys(exLight), [...Object.keys(exLight)].sort((a, b) => a.localeCompare(b))); // alphabetical
// The HEX values match the plan's own resolution (the manifest), per theme.
const resolved = (name: string, mode: string, t: string) =>
  (plan2.manifest.find((e) => e.name === name && e.mode === mode)!.resolved_hex as Record<string, string>)[t];
assert.equal(exLight["bg.brand.bold"], resolved("color/bg/brand/bold", "Light", "Theme A"));
assert.equal(ex.data.themes["Theme B"].appearances.Dark["text.brand.bold"], resolved("color/text/brand/bold", "Dark", "Theme B"));
assert.notEqual(ex.data.themes["Theme A"].appearances.Light["bg.brand.bold"], ex.data.themes["Theme B"].appearances.Light["bg.brand.bold"]);
// Alpha-based tokens become 8-digit HEX: the color source plus its opacity.
const disabledTarget = (plan2.variables.find((v) => v.name === "color/bg/disabled")!.values.Light as { alias: string }).alias;
const disabledTheme = plan2.variables.find((v) => v.collection === "Theme" && v.name === disabledTarget)!.values["Theme A"] as { alias: string; opacityAlias: string };
const opacity = plan2.variables.find((v) => v.name === disabledTheme.opacityAlias)!.values.Default as number;
const sourceHex = plan2.variables.find((v) => v.name === disabledTheme.alias)!.values.Default as string;
assert.equal(exLight["bg.disabled"], sourceHex + Math.round(opacity / 100 * 255).toString(16).padStart(2, "0").toUpperCase());
// A missing Primitive is reported, and the token is left out.
const broken = { collections: plan2.collections, variables: plan2.variables.filter((v) => v.name !== "Color/Purple/500") };
const exBroken = buildAppearanceExport(broken, opts(true, "kebab"));
assert.ok(exBroken.problems.some((p) => p.includes("color/bg/brand/bold (Theme A, Light)")));
assert.equal(exBroken.data.themes["Theme A"].appearances.Light["--color-bg-brand-bold"], undefined);
assert.ok(exBroken.data.themes["Theme B"].appearances.Light["--color-bg-brand-bold"]); // Theme B uses Teal
// No Appearance collection: one clear problem, nothing exported.
assert.equal(buildAppearanceExport({ collections: [], variables: [] }, opts(true, "dot")).problems.length, 1);

// 13b. Export files: one file with all themes, or one file per theme with the same structure.
const all = exportFiles(ex.data, "all");
assert.deepEqual(all.map((f) => f.fileName), ["appearance-tokens.json"]);
assert.deepEqual(all[0].data, ex.data);
const per = exportFiles(ex.data, "perTheme");
assert.deepEqual(per.map((f) => f.fileName), ["appearance-tokens-theme-a.json", "appearance-tokens-theme-b.json"]);
assert.deepEqual(Object.keys(per[1].data.themes), ["Theme B"]);
assert.deepEqual(per[1].data.themes["Theme B"], ex.data.themes["Theme B"]);
assert.equal(per[0].data.version, 1);
// Theme names that make the same file name get a number.
const twin = { version: 1 as const, themes: { "Night Shop": ex.data.themes["Theme A"], "night-shop": ex.data.themes["Theme B"] } };
assert.deepEqual(exportFiles(twin, "perTheme").map((f) => f.fileName), ["appearance-tokens-night-shop.json", "appearance-tokens-night-shop-2.json"]);

// 14. Palette names (src/naming.ts, section 1.1.8). The plugin names palettes from the HSL hue.
assert.equal(hslHue("#FFFFFF"), null);
assert.equal(hslHue("#808080"), null);
assert.equal(hslHue("#FF0000"), 0);
assert.equal(hslHue("#0000FF"), 240);
assert.equal(hueDistance(358, 2), 4);
const pn = spec.primitives.paletteNaming;
assert.equal(pn.names.length, 60);
assert.equal(new Set(pn.names).size, 60);
assert.ok(!pn.names.some((n: string) => spec.inputs.reservedHueNames.includes(n)));
const nameAll = (...hexes: string[]) =>
  assignPaletteNames(pn, "Gray", hexes.map((hex, i) => ({ source: `s${i}`, hex, label: `color ${i}` })));
// Range edges: Red covers 357° up to 3°.
assert.equal(nameAll("#FF0008").palettes[0].name, "Red"); // 358.1°
assert.equal(nameAll("#FF0D00").palettes[0].name, "Scarlet"); // 3.1°
assert.equal(nameAll("#FF000D").palettes[0].name, "Carmine"); // 356.9°
// No hue: Gray, and no palette is made.
const grays = nameAll("#FFFFFF", "#000000", "#808080");
assert.deepEqual(grays.assignments.map((a) => a.palette), ["Gray", "Gray", "Gray"]);
assert.equal(grays.palettes.length, 0);
// Two shades of the same hue (within 1°) share one palette, shaped by the first color.
const shades = nameAll("#2E7D32", "#81C784"); // 123.0° and 122.6°
assert.equal(shades.palettes.length, 1);
assert.deepEqual(shades.assignments.map((a) => a.palette), ["Shamrock", "Shamrock"]);
assert.equal(shades.palettes[0].hex, "#2E7D32");
assert.deepEqual(shades.palettes[0].sources, ["s0", "s1"]);
// A different hue in a taken range takes the nearest free name; equally far, the colder side wins.
const taken = nameAll("#FF0000", "#FF0008"); // 0° and 358.1°: both in Red's range
assert.deepEqual(taken.palettes.map((p) => p.name), ["Red", "Carmine"]); // Carmine (354°) is closer to 240° than Scarlet (6°)
// In another range: its own name.
assert.deepEqual(nameAll("#FF0000", "#FF0D00").palettes.map((p) => p.name), ["Red", "Scarlet"]);
// Renames: the color that made Purple now makes Violet, so Purple is renamed in place.
const moved = nameAll("#7F00FF"); // 270°: Amethyst
const movedName = moved.palettes[0].name;
assert.deepEqual(paletteRenames({ s0: "Purple" }, moved.palettes, new Set(["Purple"])), { Purple: movedName });
assert.deepEqual(paletteRenames({ s0: "Purple" }, moved.palettes, new Set(["Purple", movedName])), {}); // new name exists
assert.deepEqual(paletteRenames({ s0: "Purple" }, moved.palettes, new Set()), {}); // nothing to rename
assert.deepEqual(paletteRenames({ s0: movedName }, moved.palettes, new Set([movedName])), {}); // unchanged
// In a plan: the order is theme by theme, a gray brand uses Color/Gray, and similar palettes are warned.
const grayBrand = buildPlan(spec, { numberOfThemes: 1, themes: [{ ...themeA, brand: { hex: "#333333" } }] });
assert.ok(grayBrand.ok);
assert.deepEqual(grayBrand.variables.find((v) => v.name === "color/brand/500")!.values, { "Theme A": { alias: "Color/Gray/500" } });
// Similar palettes (rule 4) are found by comparing the finished palettes, not the hues.
const paletteOfRole = (plan: Plan, role: string) => (plan.variables.find((v) => v.name === `color/${role}/500`)!.values["Theme A"] as { alias: string }).alias.replace(/\/500$/, "");
const similarOn = (plan: Plan, token: string) => plan.report.filter((r) => r.check === "similar_palette" && r.token === token);
// #FF0026 and #BD4242 are 8.9° apart in HSL, but as status colors they make almost the same palette.
const twoReds = buildPlan(spec, { numberOfThemes: 1, themes: [{ ...themeA, danger: { hex: "#FF0026" }, warning: { hex: "#BD4242" } }] });
assert.ok(twoReds.ok);
assert.notEqual(paletteOfRole(twoReds, "danger"), paletteOfRole(twoReds, "warning"));
const redNotice = similarOn(twoReds, paletteOfRole(twoReds, "warning"));
assert.equal(redNotice.length, 1);
assert.equal(redNotice[0].severity, "warning");
assert.ok(redNotice[0].expected.includes(paletteOfRole(twoReds, "danger")));
assert.match(String(redNotice[0].actual), /^largest step difference 0\.0\d\d$/);
// The same notice reaches the form, with the theme and role it is about.
const formNotice = namePalettes(spec, { numberOfThemes: 1, themes: [{ ...themeA, danger: { hex: "#FF0026" }, warning: { hex: "#BD4242" } }] }).similar;
assert.deepEqual(formNotice.map((x) => [x.theme, x.role]), [[0, "warning"]]);
// A brand keeps its HEX: #B03C3C as brand (at its closest step, 500) still looks like the #FF0026 status palette...
const brandRed = buildPlan(spec, { numberOfThemes: 1, themes: [{ ...themeA, brand: { hex: "#B03C3C" }, danger: { hex: "#FF0026" } }] });
assert.equal(similarOn(brandRed, paletteOfRole(brandRed, "danger")).length, 1);
// ...but the neon #FF0026 as brand does not look like the #BD4242 status palette.
const neonBrand = buildPlan(spec, { numberOfThemes: 1, themes: [{ ...themeA, brand: { hex: "#FF0026" }, danger: { hex: "#BD4242" } }] });
assert.equal(similarOn(neonBrand, paletteOfRole(neonBrand, "danger")).length, 0);
// A status color with the same hue as a brand (#B48ED0 is within 1° of #78449F) uses the brand's palette.
const shared = buildPlan(spec, { numberOfThemes: 1, themes: [{ ...themeA, success: { hex: "#B48ED0" } }] });
assert.deepEqual(shared.variables.find((v) => v.name === "color/success/500")!.values, { "Theme A": { alias: "Color/Purple/500" } });
assert.equal(shared.palettes!.find((p) => p.name === "Purple")!.source, "Theme A|brand");
assert.equal(shared.palettes!.find((p) => p.name === "Purple")!.hex, "#78449F");
// Two brands with the same hue but a different HEX: each keeps its HEX, so each gets its own palette.
const twoBrands = buildPlan(spec, { numberOfThemes: 2, themes: [themeA, { ...themeB, brand: { hex: "#B48ED0" } }] });
assert.deepEqual(twoBrands.variables.find((v) => v.name === "color/brand/500")!.values["Theme B"], { alias: "Color/Amethyst/500" });
// Their palettes differ by 0.066 at most, so they are not reported as similar.
assert.equal(similarOn(twoBrands, "Color/Amethyst").length, 0);
// The same brand HEX in two themes shares one palette.
const sameBrand = buildPlan(spec, { numberOfThemes: 2, themes: [themeA, { ...themeB, brand: themeA.brand }] });
assert.deepEqual(sameBrand.variables.find((v) => v.name === "color/brand/500")!.values, { "Theme A": { alias: "Color/Purple/500" }, "Theme B": { alias: "Color/Purple/500" } });

// 15. Palette chroma (sections 5.2, 5.3, 5.5). The constants in palette.ts must match tokens.json.
assert.deepEqual(CHROMA_CEILING, Object.fromEntries(Object.entries(spec.primitives.chromaCeiling.steps).map(([k, v]) => [Number(k), v])));
const hop = spec.primitives.hueOnlyPalette;
assert.equal(REFERENCE_C400, hop.referenceChroma400);
assert.deepEqual(YELLOW_BOOST, { factor: hop.yellowBoost.factor, zeroBelow: hop.yellowBoost.zeroBelow, fullFrom: hop.yellowBoost.fullFrom, fullTo: hop.yellowBoost.fullTo, zeroAbove: hop.yellowBoost.zeroAbove });
assert.equal(SHIFT_NOTICE_DISTANCE, hop.shiftNotice.maxDistance);
// The yellow factor: full from 85° to 105°, fading to none at 65° and 125°.
assert.equal(yellowFactor(95), 1.6);
assert.ok(Math.abs(yellowFactor(75) - 1.3) < 1e-9);
assert.equal(yellowFactor(50), 1);
assert.equal(yellowFactor(130), 1);
// The brand keeps its exact HEX at its anchor, even when it is above a ceiling; other steps stay under it.
const vivid = buildPalette("Red", "#E53935"); // anchor 400, chroma 0.209
assert.equal(vivid.anchor, 400);
assert.equal(vivid.steps[400].hex, "#E53935");
for (const s of STEPS) {
  const cap = CHROMA_CEILING[s];
  if (cap && s !== vivid.anchor) assert.ok(vivid.steps[s].lch.C <= cap + 1e-9, `brand step ${s} above its ceiling`);
}
// A vivid brand that anchors at 500: its generated 400 is held at the 0.18 ceiling.
// (#D62828 used to be the example; it now moves to 400 and keeps its own chroma, see test 17.)
const red500 = buildPalette("Red", "#C62828");
assert.equal(red500.anchor, 500);
assert.ok(hexToOklch(red500.steps[400].hex).C <= 0.18 + 0.005);
// Status and custom palettes use only the hue: no anchor, target L, the fixed curve, and no step above a ceiling.
for (const hex of ["#E74B3C", "#D62828", "#48A13F", "#4785E6", "#F4C430", "#39FF14", "#8A9A7B", "#FFDDC3"]) {
  const p = buildHuePalette("X", hex);
  assert.equal(p.anchor, -1);
  assert.equal(p.errors.length, 0, `${hex}: ${p.errors.map((e) => e.message).join("; ")}`);
  for (const s of STEPS) {
    const cap = CHROMA_CEILING[s];
    if (cap) assert.ok(p.steps[s].lch.C <= cap + 1e-9, `${hex} step ${s} above its ceiling`);
  }
}
// The same hue gives the same palette, whatever the lightness and chroma of the pick.
const hueOf = (hex: string) => Math.round(hexToOklch(hex).H * 10) / 10;
assert.equal(hueOf("#FF0000"), hueOf("#FF0000"));
assert.deepEqual(buildHuePalette("X", "#FF0000").steps, buildHuePalette("X", "#FF0000").steps);
// Yellow gets more chroma in the light steps than the plain curve would give (0.16 × 0.64 at step 200).
assert.ok(buildHuePalette("X", "#F4C430").steps[200].lch.C > 0.16 * 0.64 + 0.03);
// Shift notice: a default status color has a close step; a neon pick does not.
assert.ok(closestStep(buildHuePalette("X", "#48A13F"), "#48A13F").distance < SHIFT_NOTICE_DISTANCE);
assert.ok(closestStep(buildHuePalette("X", "#39FF14"), "#39FF14").distance > SHIFT_NOTICE_DISTANCE);
const neon = buildPlan(spec, { numberOfThemes: 1, themes: [{ ...themeA, success: { hex: "#39FF14" } }] });
assert.ok(neon.ok);
assert.ok(neon.report.some((r) => r.check === "hue_only_shift" && r.severity === "warning" && r.message.includes("#39FF14")));
const calm = buildPlan(spec, { numberOfThemes: 1, themes: [{ ...themeA, success: { hex: "#48A13F" } }] }).report.filter((r) => r.check === "hue_only_shift");
assert.ok(!calm.some((r) => r.message.includes("success")));
assert.ok(calm.some((r) => r.message.includes("#D62828"))); // the vivid test red gets a calmer palette

// 16. ColorScheme (section 3.5): Material 3 roles for Android, parallel to Appearance.
const csSpec = spec.colorScheme.tokens as { name: string; sameAs?: string; role?: string; kind: string; group: string }[];
// Every name is a unique Compose name in lowerCamelCase, and every kind has scopes.
assert.equal(new Set(csSpec.map((t) => t.name)).size, csSpec.length);
assert.ok(csSpec.every((t) => /^[a-z][A-Za-z]*$/.test(t.name) && spec.colorScheme.scopesByKind[t.kind]));
const scheme = (p: Plan) => p.variables.filter((v) => v.collection === "ColorScheme");
const schemeVar = (p: Plan, name: string) => scheme(p).find((v) => v.name === name)!;
const appVar = (p: Plan, name: string) => p.variables.find((v) => v.collection === "Appearance" && v.name === name)!;
const bySlot = (p: Plan, slot: string) => scheme(p).filter((v) => csSpec.find((t) => t.name === v.name)!.role === `{${slot}}`);
// No custom roles: no secondary or tertiary roles (8 each, with their fixed roles).
assert.equal(scheme(plan).length, csSpec.length - 16);
assert.equal(bySlot(plan, "secondary").length, 0);
// One custom role: secondary only. Two: secondary and tertiary, in the custom roles' order.
assert.equal(scheme(planC).length, csSpec.length - 8);
assert.equal(bySlot(planC, "secondary").length, 8);
assert.deepEqual(schemeVar(planC, "secondary").values, { Light: { alias: "color/promo/500" }, Dark: { alias: "color/promo/300" } });
const twoCustom = buildPlan(spec, {
  numberOfThemes: 1, themes: [{ ...themeA, custom: { promo: { hex: "#D6336C" }, sea: { hex: "#127681" } } }], customRoles: ["promo", "sea"],
});
assert.equal(twoCustom.ok, true, JSON.stringify(twoCustom.report.filter((r) => r.severity === "error")));
assert.equal(scheme(twoCustom).length, csSpec.length);
assert.deepEqual(schemeVar(twoCustom, "onTertiaryContainer").values, appVar(twoCustom, "color/text/sea/bolder").values);
assert.equal((schemeVar(twoCustom, "tertiaryFixedDim").values.Dark as { alias: string }).alias, "color/sea/200");
// Same modes as Appearance, and aliases to Theme tokens.
for (const p of [plan, plan3]) {
  assert.deepEqual(p.collections.find((c) => c.name === "ColorScheme")!.modes, p.collections.find((c) => c.name === "Appearance")!.modes);
}
assert.ok(scheme(plan).every((v) => Object.values(v.values).every((x) => typeof x === "object" && plan.variables.some((t) => t.collection === "Theme" && t.name === x.alias))));
// A "sameAs" role has exactly the Appearance token's values in every mode, also with a dark canvas step and
// extra appearances (plan3 has Dim and Paper).
for (const p of [plan, plan900, plan3]) {
  for (const t of csSpec.filter((x) => x.sameAs && !x.role?.startsWith("{"))) {
    assert.deepEqual(schemeVar(p, t.name).values, appVar(p, t.sameAs!).values, `${t.name} matches ${t.sameAs}`);
  }
}
assert.deepEqual(schemeVar(plan, "primary").values, { Light: { alias: "color/brand/500" }, Dark: { alias: "color/brand/300" } });
// Own values: inversePrimary swaps primary's steps; surface containers follow the dark canvas step.
assert.deepEqual(schemeVar(plan, "inversePrimary").values, { Light: { alias: "color/brand/300" }, Dark: { alias: "color/brand/500" } });
assert.equal((schemeVar(plan, "surfaceContainerLow").values.Dark as { alias: string }).alias, "color/neutral/900");
assert.equal((schemeVar(plan900, "surfaceContainerLow").values.Dark as { alias: string }).alias, "color/neutral/850");
assert.equal((schemeVar(plan900, "surfaceContainerLow").values.Light as { alias: string }).alias, "color/neutral/50");
assert.equal((schemeVar(plan900, "primaryFixed").values.Dark as { alias: string }).alias, "color/brand/100"); // fixed roles never move
// Scopes by kind.
assert.deepEqual(schemeVar(plan, "primary").scopes, ["FRAME_FILL", "SHAPE_FILL"]);
assert.deepEqual(schemeVar(plan, "onPrimary").scopes, ["TEXT_FILL", "SHAPE_FILL"]);
assert.deepEqual(schemeVar(plan, "outline").scopes, ["STROKE_COLOR"]);
// danger turned off: no error roles.
const noDanger = buildPlan(spec, { numberOfThemes: 1, themes: [themeA], statusRoles: ["success", "warning", "info"] });
assert.equal(noDanger.ok, true);
assert.ok(!scheme(noDanger).some((v) => /^(on)?[eE]rror/.test(v.name)));
// The manifest resolves ColorScheme roles to HEX, like Appearance; alpha roles have none.
const primaryHex = plan.manifest.find((e) => e.collection === "ColorScheme" && e.name === "primary" && e.mode === "Light")!.resolved_hex;
assert.equal(primaryHex, plan.manifest.find((e) => e.collection === "Appearance" && e.name === "color/bg/brand/bold" && e.mode === "Light")!.resolved_hex);
assert.equal(plan.manifest.find((e) => e.collection === "ColorScheme" && e.name === "scrim")!.resolved_hex, undefined);
// Table: in Compose order, grouped by role family.
const tScheme = buildTables(spec, twoCustom).find((t) => t.collection === "ColorScheme")!;
assert.equal(tScheme.count, csSpec.length);
assert.deepEqual(tScheme.groups.flatMap((g) => g.rows.map((r) => r.name)), csSpec.map((t) => t.name).filter((n) => tScheme.groups.some((g) => g.rows.some((r) => r.name === n))));
assert.equal(tScheme.groups[0].name, "primary");
assert.deepEqual(tScheme.columns, ["THEME A LIGHT", "THEME A DARK"]);

// 16a. ColorScheme contrast pairs (section 3.5.1): every pair names real roles, the plugin's own mapping
// passes them (also with a lighter dark canvas), and a failure stops generation.
const csPairs = spec.colorScheme.contrastRequired as { text: string; background: string; minimum: number; source: string }[];
const csNames = csSpec.map((t) => t.name);
assert.ok(csPairs.every((p) => csNames.includes(p.text) && csNames.includes(p.background) && p.minimum === 4.5));
assert.ok(csPairs.some((p) => p.text === "onPrimary" && p.background === "primary" && p.source === "documented"));
// The fixed mapping (approved with the checks).
assert.deepEqual(schemeVar(plan, "onSurfaceVariant").values, { Light: { alias: "color/neutral/600" }, Dark: { alias: "color/neutral/200" } });
assert.deepEqual(schemeVar(plan, "inverseSurface").values, { Light: { alias: "color/neutral/700" }, Dark: { alias: "color/neutral/100" } });
assert.equal((schemeVar(plan, "surfaceContainerHighest").values.Dark as { alias: string }).alias, "color/neutral/800");
const plan850 = buildPlan(spec, { numberOfThemes: 1, themes: [themeA], darkCanvasStep: 850 });
assert.equal(plan850.ok, true, JSON.stringify(plan850.report.filter((r) => r.severity === "error")));
assert.equal((schemeVar(plan850, "surfaceContainerHighest").values.Dark as { alias: string }).alias, "color/neutral/600");
assert.equal(twoCustom.ok, true); // secondary and tertiary pairs pass too
// Results are kept in the manifest, like Appearance contrast.
const onPrimaryLight = plan.manifest.find((e) => e.collection === "ColorScheme" && e.name === "onPrimary" && e.mode === "Light")!;
assert.ok(onPrimaryLight.contrast!.some((c) => c.against === "primary" && c.pass && c.minimum === 4.5));
// TEST-ONLY copy of the spec with the old onSurfaceVariant (Gray 500 on Gray 150 in Light): generation stops.
const oldVariant = structuredClone(spec);
const ov = oldVariant.colorScheme.tokens.find((t: any) => t.name === "onSurfaceVariant");
delete ov.Light; delete ov.Dark; ov.sameAs = "color/text/neutral/bold";
const failing = buildPlan(oldVariant, { numberOfThemes: 1, themes: [themeA] });
assert.equal(failing.ok, false);
assert.ok(failing.report.some((r) => r.check === "contrast_minimum" && r.severity === "error" && r.collection === "ColorScheme"
  && r.token === "onSurfaceVariant" && r.mode === "Light" && r.message.includes("surfaceVariant")));

// 16b. ColorScheme export: JSON with the Compose names, and Kotlin for Jetpack Compose.
const csExp = buildColorSchemeExport(plan3);
assert.deepEqual(csExp.problems, []);
assert.deepEqual(Object.keys(csExp.data.themes), ["Theme A", "Theme B", "Theme C"]);
assert.deepEqual(Object.keys(csExp.data.themes["Theme A"].appearances), ["Light", "Dark", "Dim", "Paper"]);
assert.equal(csExp.data.themes["Theme A"].appearances.Light.primary,
  plan3.manifest.find((e) => e.collection === "ColorScheme" && e.name === "primary" && e.mode === "Light")!.resolved_hex!["Theme A"]);
// Dark schemes are found by their surface color, so Dark-based extra appearances count as dark.
assert.equal(csExp.dark["Theme A"].Light, false);
assert.equal(csExp.dark["Theme A"].Dark, true);
assert.equal(typeof csExp.dark["Theme A"].Dim, "boolean");
assert.match(csExp.data.themes["Theme A"].appearances.Light.scrim, /^#000000[0-9A-F]{2}$/); // alpha kept as two digits
assert.deepEqual(exportFiles(csExp.data, "all", "colorscheme-tokens").map((f) => f.fileName), ["colorscheme-tokens.json"]);
assert.deepEqual(exportFiles(csExp.data, "perTheme", "colorscheme-tokens").map((f) => f.fileName),
  ["colorscheme-tokens-theme-a.json", "colorscheme-tokens-theme-b.json", "colorscheme-tokens-theme-c.json"]);
const roleNames = csSpec.map((t) => t.name);
const kt = kotlinFiles(csExp, "all", "com.acme.theme", roleNames);
assert.deepEqual(kt.problems, []);
assert.deepEqual(kt.files.map((f) => f.fileName), ["ColorSchemes.kt"]);
const ktText = kt.files[0].text!;
assert.ok(ktText.includes("package com.acme.theme\n"));
assert.ok(ktText.includes("val ThemeALightColorScheme = lightColorScheme(\n"));
assert.ok(ktText.includes("val ThemeADarkColorScheme = darkColorScheme(\n"));
const lightPrimary = csExp.data.themes["Theme A"].appearances.Light.primary.slice(1);
assert.ok(ktText.includes(`    primary = Color(0xFF${lightPrimary}),`));
// Compose writes alpha first: #RRGGBBAA becomes 0xAARRGGBB.
const scrimHex = csExp.data.themes["Theme A"].appearances.Light.scrim.slice(1);
assert.ok(ktText.includes(`    scrim = Color(0x${scrimHex.slice(6)}${scrimHex.slice(0, 6)}),`));
assert.deepEqual(kotlinFiles(csExp, "perTheme", "com.acme.theme", roleNames).files.map((f) => f.fileName),
  ["ThemeAColorScheme.kt", "ThemeBColorScheme.kt", "ThemeCColorScheme.kt"]);
// A bad package name falls back to the default; a role added by hand in Figma is left out of Kotlin.
assert.equal(kotlinFiles(csExp, "all", "Not A Package", roleNames).problems.length, 1);
const handAdded = { collections: plan.collections, variables: [...plan.variables, { ...schemeVar(plan, "primary"), name: "brandGlow" }] };
const ktHand = kotlinFiles(buildColorSchemeExport(handAdded), "all", "com.acme.theme", roleNames);
assert.ok(ktHand.problems.some((p) => p.startsWith("brandGlow")));
assert.ok(!ktHand.files[0].text!.includes("brandGlow"));

// 17. Moved brand anchor (section 5.2 steps 1 and 3, tokens.json primitives.brandAnchor).
// A brand closest to step 500 but too light for 500 on Gray 100 moves to 400 and keeps its exact HEX.
for (const hex of ["#127681", "#2E7D32", "#D62828"]) {
  assert.deepEqual(placeAnchor(hex), { closest: 500, anchor: 400 }, hex);
  const p = buildPalette("x", hex);
  assert.equal(p.anchor, 400);
  assert.equal(p.steps[400].hex, hex, `${hex} stays exact`);
  assert.deepEqual(p.errors, [], `${hex} meets every minimum`);
  assert.ok(contrast(p.steps[500].hex, "#EAEAEA") >= 4.5);
  assert.deepEqual([...p.respaced!].sort((a, b) => a - b), [200, 300, 500, 600]);
  // Step 500 keeps the usual gap below the brand; 50, 100, 150 and 800 to 950 keep their targets.
  const L = hexToOklch(hex).L;
  assert.ok(Math.abs(p.steps[500].lch.L - (L - (TARGET_L[400] - TARGET_L[500]))) < 0.002 || p.steps[500].lch.L < L - 0.11);
  for (const s of [50, 100, 800, 850, 900, 950]) assert.ok(Math.abs(p.steps[s].lch.L - TARGET_L[s]) < 0.0011, `${hex} step ${s}`);
  // The lightness order is kept.
  for (let i = 1; i < STEPS.length; i++) assert.ok(p.steps[STEPS[i]].lch.L > p.steps[STEPS[i - 1]].lch.L, `${hex} order at ${STEPS[i]}`);
}
// A brand that passes at its closest step stays there, and its palette is built as before.
for (const hex of ["#5B3CC4", "#78449F", "#E53935", "#1D4ED8", "#B03C3C"]) {
  const a = placeAnchor(hex);
  assert.equal(a.anchor, a.closest, hex);
  assert.equal(buildPalette("x", hex).respaced, undefined);
}
// The constant rules match tokens.json: the moved anchor table in section 5.2.
assert.ok(spec.primitives.brandAnchor.move.includes("500 to 400") && spec.primitives.brandAnchor.move.includes("150 to 200"));

// 18. Tinted neutrals (section 1.1.9, tokens.json primitives.neutralTint).
const nt = spec.primitives.neutralTint;
assert.equal(NEUTRAL_CHROMA, nt.chroma);
assert.deepEqual(NEUTRAL_FADE, Object.fromEntries(Object.entries(nt.fade.steps).map(([k, v]) => [Number(k), v])));
// 24 single-word names, none of them a palette name or a reserved name.
assert.equal(nt.naming.names.length, 24);
assert.ok(nt.naming.names.every((n: string) => /^[A-Z][a-z]+$/.test(n)));
assert.ok(!nt.naming.names.some((n: string) => spec.primitives.paletteNaming.names.includes(n) || spec.inputs.reservedHueNames.includes(n)));
// Gray's lightness at every step, the picked hue, and chroma 0.015 faded toward the ends.
const slate = buildNeutralPalette("Slate", "#4785E6");
for (const st of STEPS) {
  assert.ok(Math.abs(slate.steps[st].lch.L - hexToOklch(GRAY_HEX[st]).L) < 0.001, `neutral L at ${st}`);
  assert.ok(slate.steps[st].lch.C <= NEUTRAL_CHROMA * (NEUTRAL_FADE[st] ?? 1) + 1e-9, `neutral chroma at ${st}`);
}
assert.ok(Math.abs(slate.steps[500].lch.C - 0.015) < 1e-6);
assert.ok(Math.abs(slate.steps[500].lch.H - hexToOklch("#4785E6").H) < 0.1);
// Only the hue counts: a barely saturated and a vivid color get the same tint strength.
for (const hex of ["#7F00FF", "#8A8590"]) assert.ok(Math.abs(buildNeutralPalette("x", hex).steps[500].lch.C - NEUTRAL_CHROMA) < 1e-6, hex);
// In a plan: plain gray (the default) keeps Color/Gray; a tinted neutral gets its own name and palette.
const neutralAlias = (p: Plan, theme: string) => (p.variables.find((v) => v.collection === "Theme" && v.name === "color/neutral/500")!.values[theme] as { alias: string }).alias;
assert.equal(neutralAlias(plan, "Theme A"), "Color/Gray/500");
assert.equal(neutralAlias(buildPlan(spec, { numberOfThemes: 1, themes: [{ ...themeA, neutral: { hex: "#808080" } }] }), "Theme A"), "Color/Gray/500");
const tintedInputs = { numberOfThemes: 2, themes: [{ ...themeA, neutral: { hex: "#4785E6" } }, { ...themeB, neutral: { hex: "#C9A27A" } }] };
const tinted = buildPlan(spec, tintedInputs);
assert.equal(tinted.ok, true, JSON.stringify(tinted.report.filter((r) => r.severity === "error")));
assert.equal(neutralAlias(tinted, "Theme A"), "Color/Slate/500"); // HSL hue 216.6°
assert.equal(neutralAlias(tinted, "Theme B"), "Color/Taupe/500"); // HSL hue 30.4°
assert.ok(tinted.variables.some((v) => v.name === "Color/Slate/50") && tinted.variables.some((v) => v.name === "Color/Gray/50"));
// Black and white stay pure, and the neutral alpha tokens still link to them.
assert.deepEqual(tinted.variables.find((v) => v.name === "color/neutral/white")!.values["Theme A"], { alias: "Color/White" });
// The same tint in two themes shares one palette.
const sameTint = buildPlan(spec, { numberOfThemes: 2, themes: [{ ...themeA, neutral: { hex: "#4785E6" } }, { ...themeB, neutral: { hex: "#4785E6" } }] });
assert.equal(sameTint.variables.filter((v) => v.name === "Color/Slate/500").length, 1);
assert.equal(neutralAlias(sameTint, "Theme B"), "Color/Slate/500");
// A palette shared by themes with different neutrals is calibrated against both (section 1.1.5).
const sharedNaming = namePalettes(spec, tintedInputs);
const successPalette = sharedNaming.build().find((p) => p.name === sharedNaming.paletteOf(0, "success"))!;
assert.equal(successPalette.neutrals.length, 2);
for (const neutral of successPalette.neutrals) {
  assert.ok(contrast(successPalette.steps[500].hex, neutral[100]) >= 4.5);
  assert.ok(contrast(successPalette.steps[700].hex, neutral[200]) >= 7);
}
// An invalid neutral HEX stops generation.
const badNeutral = buildPlan(spec, { numberOfThemes: 1, themes: [{ ...themeA, neutral: { hex: "#12345" } }] });
assert.equal(badNeutral.ok, false);
assert.ok(badNeutral.report.some((r) => r.check === "invalid_hex" && r.token === "neutral color"));
// Every check still passes with tinted neutrals of many hues and every canvas setting.
for (const hex of ["#4785E6", "#5B6B8C", "#C9A27A", "#48A13F", "#A930FF", "#D4667A", "#FFD400"]) {
  for (const extra of [{}, { darkCanvasStep: 850 }, { lightCanvasStep: 50 }]) {
    const p = buildPlan(spec, { numberOfThemes: 1, themes: [{ ...themeA, neutral: { hex } }], ...extra });
    assert.equal(p.ok, true, `${hex} ${JSON.stringify(extra)}: ${JSON.stringify(p.report.filter((r) => r.severity === "error").slice(0, 2))}`);
  }
}

console.log("All logic tests passed.");
