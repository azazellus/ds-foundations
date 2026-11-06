// What Generate tokens writes: which collections and which text style platforms (foundations-spec.md section 5.1,
// tokens.json inputs.collections and inputs.textStylePlatforms). Pure functions, no Figma API.

import type { CollectionName, Inputs, Spec } from "./foundations.ts";
import type { TableSource } from "./tables.ts";

// The collections that can be chosen, in the order the plan writes them: Appearance, ColorScheme.
const choosable = (spec: Spec): CollectionName[] => spec.inputs.collections.allowed;

// The collections the user did not choose. They are not written and not checked, and what the file
// already holds in them is left alone. Primitives and Theme are never in this list.
export function skippedCollections(spec: Spec, inputs: Inputs): CollectionName[] {
  const chosen: string[] = inputs?.collections ?? spec.inputs.collections.default;
  return choosable(spec).filter((c) => !chosen.includes(c));
}

// The text style platforms to write (android, ios, web), in the spec's order.
export function chosenPlatforms(spec: Spec, inputs: Inputs): string[] {
  const chosen: string[] = inputs?.textStylePlatforms ?? spec.inputs.textStylePlatforms.default;
  return (spec.inputs.textStylePlatforms.allowed as string[]).filter((p) => chosen.includes(p));
}

// Entries of either list that are not allowed, for the input check. The window never sends any;
// they can come only from settings saved by hand or by another tool.
export function unknownChoices(spec: Spec, inputs: Inputs): { collections: string[]; platforms: string[] } {
  const allowedCollections: string[] = choosable(spec);
  const allowedPlatforms: string[] = spec.inputs.textStylePlatforms.allowed;
  return {
    collections: (inputs?.collections ?? []).filter((c) => !allowedCollections.includes(c)),
    platforms: (inputs?.textStylePlatforms ?? []).filter((p) => !allowedPlatforms.includes(p)),
  };
}

// What the color tables are drawn from after a write: the plan for the collections it wrote, and the file
// for the collections that were not chosen, so their tables show them as the file holds them.
// fromFile: the four collections as read from the file. A skipped collection the file does not have gets no table.
export function tableSourceAfterWrite(plan: TableSource, fromFile: TableSource, skipped: string[]): TableSource {
  return {
    collections: [...plan.collections, ...fromFile.collections.filter((c) => skipped.includes(c.name))],
    variables: [...plan.variables, ...fromFile.variables.filter((v) => skipped.includes(v.collection))],
  };
}
