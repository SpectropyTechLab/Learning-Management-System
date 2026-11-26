export type StudioFontCategory = 'Sans serif' | 'Serif' | 'Display' | 'Monospace';

export interface StudioFontDefinition {
  name: string;
  category: StudioFontCategory;
  fallback: 'sans-serif' | 'serif' | 'monospace';
}

// Keep this catalogue as the single source of truth for the picker and rich-text
// sanitization. New bundled/cloud fonts can be added here without changing either.
export const STUDIO_FONTS: readonly StudioFontDefinition[] = [
  { name: 'Arial', category: 'Sans serif', fallback: 'sans-serif' },
  { name: 'Aptos', category: 'Sans serif', fallback: 'sans-serif' },
  { name: 'Bahnschrift', category: 'Sans serif', fallback: 'sans-serif' },
  { name: 'Calibri', category: 'Sans serif', fallback: 'sans-serif' },
  { name: 'Candara', category: 'Sans serif', fallback: 'sans-serif' },
  { name: 'Century Gothic', category: 'Sans serif', fallback: 'sans-serif' },
  { name: 'Corbel', category: 'Sans serif', fallback: 'sans-serif' },
  { name: 'Franklin Gothic Medium', category: 'Sans serif', fallback: 'sans-serif' },
  { name: 'Gill Sans', category: 'Sans serif', fallback: 'sans-serif' },
  { name: 'Segoe UI', category: 'Sans serif', fallback: 'sans-serif' },
  { name: 'Tahoma', category: 'Sans serif', fallback: 'sans-serif' },
  { name: 'Trebuchet MS', category: 'Sans serif', fallback: 'sans-serif' },
  { name: 'Verdana', category: 'Sans serif', fallback: 'sans-serif' },

  { name: 'Book Antiqua', category: 'Serif', fallback: 'serif' },
  { name: 'Bookman Old Style', category: 'Serif', fallback: 'serif' },
  { name: 'Cambria', category: 'Serif', fallback: 'serif' },
  { name: 'Century Schoolbook', category: 'Serif', fallback: 'serif' },
  { name: 'Constantia', category: 'Serif', fallback: 'serif' },
  { name: 'Garamond', category: 'Serif', fallback: 'serif' },
  { name: 'Georgia', category: 'Serif', fallback: 'serif' },
  { name: 'Palatino Linotype', category: 'Serif', fallback: 'serif' },
  { name: 'Times New Roman', category: 'Serif', fallback: 'serif' },

  { name: 'Arial Black', category: 'Display', fallback: 'sans-serif' },
  { name: 'Comic Sans MS', category: 'Display', fallback: 'sans-serif' },
  { name: 'Cooper Black', category: 'Display', fallback: 'serif' },
  { name: 'Impact', category: 'Display', fallback: 'sans-serif' },
  { name: 'Lucida Handwriting', category: 'Display', fallback: 'sans-serif' },

  { name: 'Consolas', category: 'Monospace', fallback: 'monospace' },
  { name: 'Courier New', category: 'Monospace', fallback: 'monospace' },
  { name: 'Lucida Console', category: 'Monospace', fallback: 'monospace' },
] as const;

export const STUDIO_FONT_CATEGORIES: readonly StudioFontCategory[] = ['Sans serif', 'Serif', 'Display', 'Monospace'];

const fontByLowercaseName = new Map(STUDIO_FONTS.map((font) => [font.name.toLowerCase(), font]));

export const normalizeStudioFontFamily = (value: string) => {
  const candidates = value.split(',').map((font) => font.trim().replace(/^['"]|['"]$/g, '').toLowerCase());
  for (const candidate of candidates) {
    const match = fontByLowercaseName.get(candidate);
    if (match) return match.name;
  }
  return undefined;
};

export const studioFontCssFamily = (value: string) => {
  const name = normalizeStudioFontFamily(value) || 'Arial';
  const font = fontByLowercaseName.get(name.toLowerCase());
  const quotedName = name.includes(' ') ? `"${name.replaceAll('"', '')}"` : name;
  return `${quotedName}, ${font?.fallback || 'sans-serif'}`;
};

export const filterStudioFonts = (query: string) => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return STUDIO_FONTS;
  return STUDIO_FONTS.filter((font) => font.name.toLowerCase().includes(normalizedQuery));
};
