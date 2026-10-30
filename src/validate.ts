// Input validation (foundations-spec.md section 5.1 and section 6.1 check names).
// Palette names are not inputs: they are chosen in naming.ts (section 1.1.8).

import { isValidHex } from "./color.ts";

export type Problem = { check: string; message: string };

export function validateHex(hex: string): Problem[] {
  return isValidHex(hex) ? [] : [{ check: "invalid_hex", message: `"${hex}" is not a #RRGGBB value.` }];
}
