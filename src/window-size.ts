// The size of the plugin window: its limits, and how a requested size is kept inside them.
// Pure functions, no Figma API: src/figma.ts resizes the window and remembers the size.

export const WINDOW_SIZE = {
  defaultWidth: 960,
  defaultHeight: 880,
  minWidth: 680,
  maxWidth: 1280,
  minHeight: 480,
  // A window taller than the screen would hide the resize handle in its corner.
  maxHeight: 1200,
};

const keepInside = (value: unknown, min: number, max: number, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, Math.round(value))) : fallback;

// A requested size, as whole pixels inside the limits. A value that is not a number gives the default.
export function clampWindowSize(width: unknown, height: unknown): { width: number; height: number } {
  const s = WINDOW_SIZE;
  return {
    width: keepInside(width, s.minWidth, s.maxWidth, s.defaultWidth),
    height: keepInside(height, s.minHeight, s.maxHeight, s.defaultHeight),
  };
}
