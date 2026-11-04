// The Figma text styles made with the variables (foundations-spec.md section 6.1.3, tokens.json textStyles).
// Pure functions, no Figma API: src/text-styles-figma.ts writes what this file describes.

import type { Plan, ReportEntry, Spec } from "./foundations.ts";

// A font as Figma names it, for example { family: "Inter", style: "Semi Bold" }.
export type FontName = { family: string; style: string };

export type TextStyleDef = {
  name: string; // for example android/display/medium-emphasized
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  familyToken: string; // the Theme token the font family links to
  weightToken: string; // the Theme token the font weight links to
  fonts: FontName[]; // the font this style shows in each theme, first theme first
};

const warning = (check: string, token: string, expected: string, actual: string | number, message: string): ReportEntry => (
  { check, severity: "warning", collection: "Text styles", token, mode: "", expected, actual, message }
);

// The text styles to write for this plan, and the warnings about them. Nothing is written here.
export function buildTextStyles(spec: Spec, plan: Plan): { styles: TextStyleDef[]; report: ReportEntry[] } {
  const ts = spec.textStyles;
  const inCollection = (collection: string) => new Map(plan.variables.filter((v) => v.collection === collection).map((v) => [v.name, v]));
  const themeVariables = inCollection("Theme");
  const primitives = inCollection("Primitives");
  const tokenOf = (weight: string): string => ts.weightToken.replace("{weight}", weight);
  const exists = (weight: string): boolean => themeVariables.has(tokenOf(weight));
  const themeModes = plan.collections.find((c) => c.name === "Theme")?.modes ?? [];

  // Theme token -> the text it resolves to in one theme: it links to a Primitive that holds the text.
  const textOf = (token: string, mode: string): string => {
    const alias = (themeVariables.get(token)!.values[mode] as { alias: string }).alias;
    return Object.values(primitives.get(alias)!.values)[0] as string;
  };

  // A weight token exists only when its weight is selected. With none at all, no style can be made.
  const weightPrefix: string = ts.weightToken.replace("{weight}", "");
  if (![...themeVariables.keys()].some((name) => name.startsWith(weightPrefix))) {
    return {
      styles: [],
      report: [warning("text_style_weight", "text styles", "a selected weight that matches a weight slot", "none",
        "No text style was written: the selected weights match no weight slot, such as Regular or Bold.")],
    };
  }

  const styles: TextStyleDef[] = [];
  const report: ReportEntry[] = [];
  for (const [group, rows] of Object.entries(ts.groups) as [string, any[]][]) {
    let sameAsNormal = 0;
    for (const row of rows) {
      // The weight a style really uses: the one it asks for, or the first of its fallbacks that exists.
      const define = (name: string, letterSpacing: number, asked: string): string => {
        const weight: string = [asked, ...ts.weightFallback[asked]].find(exists);
        const weightToken = tokenOf(weight);
        styles.push({
          name, fontSize: row.size, lineHeight: row.lineHeight, letterSpacing, familyToken: ts.familyToken, weightToken,
          fonts: themeModes.map((m) => ({ family: textOf(ts.familyToken, m), style: textOf(weightToken, m) })),
        });
        return weight;
      };
      const full = `${group}/${row.name}`;
      const normal = define(full, row.letterSpacing, row.weight);
      if (!row.emphasized) continue;
      const emphasized = define(full + ts.emphasizedSuffix, row.emphasized.letterSpacing, row.emphasized.weight);
      // The same weight is expected only when the spec asks for it, as for ios/headline.
      if (emphasized === normal && row.emphasized.weight !== row.weight) sameAsNormal++;
    }
    if (sameAsNormal > 0) {
      report.push(warning("text_style_emphasis", group, "emphasized variants heavier than their normal style", `${sameAsNormal} the same`,
        `${sameAsNormal} emphasized text style(s) in ${group} look the same as their normal style, because a weight is not selected.`));
    }
  }
  return { styles, report };
}

// Text styles in the plugin's groups that it does not make. They stay in the file: the plugin never deletes them.
// This reads the spec, not a plan, so a run that writes no style does not call all of them orphans.
export function findOrphanTextStyles(spec: Spec, namesInFile: string[]): ReportEntry[] {
  const ts = spec.textStyles;
  const groups = Object.entries(ts.groups) as [string, any[]][];
  const made = new Set(groups.flatMap(([group, rows]) => rows.flatMap((r) => [
    `${group}/${r.name}`,
    ...(r.emphasized ? [`${group}/${r.name}${ts.emphasizedSuffix}`] : []),
  ])));
  return namesInFile
    .filter((name) => groups.some(([g]) => name.startsWith(`${g}/`)) && !made.has(name))
    .map((name) => warning("orphan_text_style", name, "made by the plugin", "not made by the plugin",
      "This text style is not one the plugin makes. It was left untouched; the plugin never deletes text styles."));
}

// ---------- Tables (section 6.1.3) ----------

// A text style as it is in the file, including changes made by hand.
export type LiveTextStyle = {
  id: string;
  name: string;
  fontSize: number;
  lineHeight: string; // "64", "Auto" or "120%"
  letterSpacing: string; // "-0.2" or "2%"
  weight: string; // the weight token's last word, such as semibold, or the font's style when it is not linked
};
export type TextStyleTableSection = { name: string; rows: LiveTextStyle[] };
export type TextStyleTable = { group: string; count: number; description: string; sections: TextStyleTableSection[] };

// Numbers as people read them: Figma stores -0.2 as -0.20000000298.
export const shortNumber = (n: number): string => String(Math.round(n * 100) / 100);

// One table per group that has a style in the file. Rows follow the order in the spec; each emphasized variant follows its style.
export function buildTextStyleTables(spec: Spec, live: LiveTextStyle[]): TextStyleTable[] {
  const ts = spec.textStyles;
  const byName = new Map(live.map((s) => [s.name, s]));
  const tables: TextStyleTable[] = [];
  for (const [group, rows] of Object.entries(ts.groups) as [string, any[]][]) {
    const sections: TextStyleTableSection[] = [];
    for (const row of rows) {
      // Sections come from the name (display/large is in display), or the spec. Flat names with no section use the group.
      const part = row.name.includes("/") ? row.name.split("/")[0] : row.tableSection;
      const sectionName = part ? `${group}/${part}` : group;
      const found = [`${group}/${row.name}`, `${group}/${row.name}${ts.emphasizedSuffix}`]
        .map((name) => byName.get(name)).filter((s): s is LiveTextStyle => !!s);
      if (found.length === 0) continue;
      let section = sections.find((x) => x.name === sectionName);
      if (!section) sections.push(section = { name: sectionName, rows: [] });
      section.rows.push(...found);
    }
    const count = sections.reduce((n, x) => n + x.rows.length, 0);
    if (count > 0) tables.push({ group, count, description: ts.tables.descriptions[group], sections });
  }
  return tables;
}
