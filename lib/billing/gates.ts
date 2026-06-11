// Feature gates for the free tier. Flip a flag to true to move that feature
// behind the $19 unlock — server enforcement (lib/render.tsx, /api/render-name,
// /api/assets) and the editor's locked states all read from here.
//
// Current model: everything is free, the unlock only removes the watermark.
export const GATES: { proFonts: boolean; headshot: boolean } = {
  proFonts: false,
  headshot: false,
};
