// Figma side of palette names (foundations-spec.md section 1.1.8, rule 5).
// The plugin remembers, on the Primitives collection, which color (theme key + role) made each palette.
// When a later run gives that color's palette a new name, the old palette's variables are renamed in
// place, so layers and aliases that use them keep working. Nothing is ever deleted.

import type { Plan } from "./foundations.ts";
import { paletteRenames } from "./naming.ts";

const PALETTE_SOURCES = "palette-sources";
const STEP_NAME = /^Color\/([^/]+)\/\d+$/;

function primitivesOf(collections: VariableCollection[]): VariableCollection | undefined {
  return collections.find((c) => c.name === "Primitives");
}

// The palettes made in the last run: source -> palette name.
function storedSources(col: VariableCollection | undefined): Record<string, string> {
  try {
    return col ? JSON.parse(col.getPluginData(PALETTE_SOURCES) || "{}") : {};
  } catch {
    return {};
  }
}

// Old name -> new name for every palette that should be renamed. Changes nothing.
export function plannedPaletteRenames(plan: Plan, existing: Variable[], collections: VariableCollection[]): Record<string, string> {
  const col = primitivesOf(collections);
  if (!col || !plan.palettes) return {};
  const names = new Set<string>();
  for (const v of existing) {
    const m = v.variableCollectionId === col.id ? STEP_NAME.exec(v.name) : null;
    if (m) names.add(m[1]);
  }
  return paletteRenames(storedSources(col), plan.palettes, names);
}

// Renames the variables Color/Old/{step} to Color/New/{step}. Returns one line per renamed palette.
export function renamePalettes(renames: Record<string, string>, existing: Variable[], collections: VariableCollection[]): string[] {
  const col = primitivesOf(collections);
  if (!col) return [];
  const done: string[] = [];
  for (const [oldName, newName] of Object.entries(renames)) {
    for (const v of existing) {
      const m = v.variableCollectionId === col.id ? STEP_NAME.exec(v.name) : null;
      if (m && m[1] === oldName) v.name = v.name.replace(`Color/${oldName}/`, `Color/${newName}/`);
    }
    done.push(`Palette Color/${oldName} was renamed to Color/${newName}.`);
  }
  return done;
}

// After a write: remember which color made each palette, for the next run.
export async function storePaletteSources(plan: Plan): Promise<void> {
  const col = primitivesOf(await figma.variables.getLocalVariableCollectionsAsync());
  if (!col || !plan.palettes) return;
  col.setPluginData(PALETTE_SOURCES, JSON.stringify(Object.fromEntries(plan.palettes.map((p) => [p.source, p.name]))));
}
