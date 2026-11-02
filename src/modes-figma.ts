// Figma modes of the four collections (foundations-spec.md section 5.8). Figma API only, no logic of
// the spec: it finds which existing mode belongs to each planned theme or appearance, renames a mode in
// place when its theme or appearance was renamed, adds missing modes, and reports modes nobody uses.
// It never deletes a mode.

import type { Inputs, Plan, ReportEntry } from "./foundations.ts";

// Stored on each collection: which Figma mode belongs to which theme or appearance.
// A theme or appearance keeps its key when renamed, so its mode is found again and renamed in place.
const MODE_KEYS = "mode-keys";

// One planned mode and the existing Figma mode it maps to (none yet when it will be added).
export type ModeMatch = { collection: string; name: string; key: string; modeId?: string };

// The key of every planned mode: Light and Dark by name, themes and extra appearances by the key the
// form gives them (so a rename keeps the key), or by name when the form sent none.
function plannedModes(plan: Plan, inputs: Inputs): { collection: string; name: string; key: string }[] {
  const out: { collection: string; name: string; key: string }[] = [];
  for (const c of plan.collections) {
    c.modes.forEach((name, i) => {
      let key = name;
      if (c.name === "Theme") key = inputs.themeKeys?.[i] || name;
      // ColorScheme has the same modes as Appearance, with the same keys (section 3.5).
      // The extra appearances are the last modes, in the order of the inputs.
      const extras = inputs.extraAppearances ?? [];
      if (c.name === "Appearance" || c.name === "ColorScheme") key = extras[i - (c.modes.length - extras.length)]?.key || name;
      out.push({ collection: c.name, name, key });
    });
  }
  return out;
}

function storedKeys(col: VariableCollection | undefined): Record<string, string> {
  try {
    return col ? JSON.parse(col.getPluginData(MODE_KEYS) || "{}") : {};
  } catch {
    return {};
  }
}

// Finds the existing mode of each planned mode: first the mode stored for its key (it may have been
// renamed since), then a mode with its name. Reads only; nothing is renamed or added here.
export function matchModes(plan: Plan, inputs: Inputs, collections: VariableCollection[]): ModeMatch[] {
  const used = new Set<string>();
  return plannedModes(plan, inputs).map((m) => {
    const col = collections.find((c) => c.name === m.collection);
    const byKey = col?.modes.find((x) => x.modeId === storedKeys(col)[m.key] && !used.has(x.modeId));
    const byName = col?.modes.find((x) => x.name === m.name && !used.has(x.modeId));
    const mode = byKey ?? byName;
    if (mode) used.add(mode.modeId);
    return { ...m, modeId: mode?.modeId };
  });
}

// Every existing mode of the four collections that no planned mode maps to. Left alone.
export function findOrphanModes(modes: ModeMatch[], collections: VariableCollection[]): ReportEntry[] {
  const matched = new Set(modes.map((m) => m.modeId));
  const out: ReportEntry[] = [];
  for (const col of collections) {
    if (!["Primitives", "Theme", "Appearance", "ColorScheme"].includes(col.name)) continue;
    // A new collection's untouched "Mode 1" is reused, so it is not an orphan.
    if (col.modes.length === 1 && col.modes[0].name === "Mode 1") continue;
    for (const m of col.modes) {
      if (matched.has(m.modeId)) continue;
      out.push({
        check: "orphan_mode",
        severity: "warning",
        collection: col.name,
        token: "",
        mode: m.name,
        expected: "in inputs",
        actual: "not in inputs",
        message: `The mode "${m.name}" is not in the inputs. Left untouched; the plugin never deletes modes. You can delete it in Figma.`,
      });
    }
  }
  return out;
}

// A renamed mode cannot take a name that another mode of the collection still has.
// Checked before anything is written, so nothing changes when it fails.
export function checkRenames(modes: ModeMatch[], collections: VariableCollection[]): void {
  for (const m of modes) {
    const col = collections.find((x) => x.name === m.collection);
    const clash = col?.modes.find((x) => x.name === m.name && x.modeId !== m.modeId);
    if (m.modeId && clash) {
      throw new Error(`Cannot rename a mode to "${m.name}" in ${m.collection}: another mode already has that name. Rename or delete it in Figma first. Nothing was changed.`);
    }
  }
}

// Makes sure the collection has every mode the plan needs, renaming matched modes whose theme or
// appearance was renamed (section 5.8). Returns mode name -> mode id, and stores each key's mode id.
// A new collection starts with one mode called "Mode 1"; that one is renamed instead of adding a mode.
export function ensureModes(col: VariableCollection, wanted: ModeMatch[]): Record<string, string> {
  const ids: Record<string, string> = {};
  const keys = storedKeys(col);
  for (const { name, key, modeId } of wanted) {
    let mode = col.modes.find((m) => m.modeId === modeId);
    if (mode && mode.name !== name) col.renameMode(mode.modeId, name);
    if (!mode && col.modes.length === 1 && col.modes[0].name === "Mode 1" && Object.keys(ids).length === 0) {
      col.renameMode(col.modes[0].modeId, name);
      mode = col.modes[0];
    }
    if (!mode) {
      try {
        col.addMode(name);
      } catch (e) {
        throw new Error(
          `Figma did not allow adding the mode "${name}" to the ${col.name} collection. ` +
          `Your Figma plan may limit the number of modes per collection. (${e instanceof Error ? e.message : e})`,
        );
      }
      mode = col.modes.find((m) => m.name === name)!;
    }
    ids[name] = mode.modeId;
    keys[key] = mode.modeId;
  }
  col.setPluginData(MODE_KEYS, JSON.stringify(keys));
  return ids;
}
