/** Average glyph width as a fraction of font size, per map font (no text measuring needed). */
const GLYPH = { display: 0.52, mono: 0.6 } as const;

/** Rough SVG text width: Grenze Gothic ("display") or Share Tech Mono ("mono") at the given font size. */
export const textWidth = (text: string, fontSize: number, font: keyof typeof GLYPH): number =>
  text.length * fontSize * GLYPH[font];
