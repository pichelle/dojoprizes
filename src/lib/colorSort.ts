// Sorts filaments the way you'd lay out a physical color wheel: red through
// orange, yellow, green, blue, purple, and back to red, with each hue
// running dark-to-light before the next hue starts. Filaments with no
// swatch, or with a swatch too close to gray/white/black to have a
// meaningful hue, sort to the end (dark-to-light by lightness, then name)
// rather than landing arbitrarily in the red bucket.

export type Hsl = { h: number; s: number; l: number };

export function hexToHsl(hex: string | null | undefined): Hsl | null {
  if (!hex) return null;
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  const int = parseInt(match[1], 16);
  const r = ((int >> 16) & 255) / 255;
  const g = ((int >> 8) & 255) / 255;
  const b = (int & 255) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) return { h: 0, s: 0, l };

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  switch (max) {
    case r:
      h = (g - b) / d + (g < b ? 6 : 0);
      break;
    case g:
      h = (b - r) / d + 2;
      break;
    default:
      h = (r - g) / d + 4;
  }
  h *= 60;

  return { h, s, l };
}

// Below this saturation, a color reads as gray/white/black rather than a
// hue -- grouping these into "red" (hue defaults to 0) would be wrong.
const ACHROMATIC_SATURATION_THRESHOLD = 0.08;

export function compareByHue<T extends { swatch_hex: string | null; color_name: string }>(
  a: T,
  b: T,
): number {
  const hslA = hexToHsl(a.swatch_hex);
  const hslB = hexToHsl(b.swatch_hex);

  const bucketOf = (hsl: Hsl | null) => {
    if (!hsl) return 2; // no swatch at all
    if (hsl.s < ACHROMATIC_SATURATION_THRESHOLD) return 1; // gray/white/black
    return 0; // has a real hue
  };
  const bucketA = bucketOf(hslA);
  const bucketB = bucketOf(hslB);
  if (bucketA !== bucketB) return bucketA - bucketB;

  if (bucketA === 0) {
    // Real hues: red -> orange -> yellow -> green -> blue -> purple -> pink,
    // each running dark to light before the next hue begins.
    if (hslA!.h !== hslB!.h) return hslA!.h - hslB!.h;
    if (hslA!.l !== hslB!.l) return hslA!.l - hslB!.l;
    return a.color_name.localeCompare(b.color_name);
  }
  if (bucketA === 1) {
    // Grays: black to white.
    if (hslA!.l !== hslB!.l) return hslA!.l - hslB!.l;
    return a.color_name.localeCompare(b.color_name);
  }
  // No swatch at all: alphabetical, so it's at least predictable.
  return a.color_name.localeCompare(b.color_name);
}
