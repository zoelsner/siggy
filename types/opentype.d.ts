declare module "@shuding/opentype.js" {
  export function parse(data: ArrayBuffer): { charToGlyphIndex(character: string): number };
}
