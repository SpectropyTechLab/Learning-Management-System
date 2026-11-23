const record = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const clamp = (value: unknown, minimum: number, maximum: number, fallback: number) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(maximum, Math.max(minimum, number)) : fallback;
};
const color = (value: unknown) => {
  const candidate = String(value || '').trim();
  return /^(?:#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|transparent)$/i.test(candidate) ? candidate : undefined;
};

const paint = (value: unknown) => {
  if (!record(value)) return value;
  const normalized = { ...value };
  const normalizedColor = color(value.color);
  if (normalizedColor) normalized.color = normalizedColor;
  else delete normalized.color;
  if (value.opacity !== undefined) normalized.opacity = clamp(value.opacity, 0, 1, 1);
  if (value.width !== undefined) normalized.width = clamp(value.width, 0, 100, 1);
  return normalized;
};

export const normalizeImportStyle = (style: Record<string, unknown> = {}) => {
  const normalized: Record<string, unknown> = { ...style };
  if (style.opacity !== undefined) normalized.opacity = clamp(style.opacity, 0, 1, 1);
  if (style.fill !== undefined) normalized.fill = paint(style.fill);
  if (style.line !== undefined) normalized.line = paint(style.line);
  if (record(style.text)) {
    const text = { ...style.text };
    const normalizedColor = color(style.text.color);
    if (normalizedColor) text.color = normalizedColor;
    else delete text.color;
    if (style.text.font_family !== undefined) text.font_family = String(style.text.font_family).trim().slice(0, 120);
    if (style.text.font_size !== undefined) text.font_size = clamp(style.text.font_size, 1, 400, 18);
    if (style.text.font_weight !== undefined) text.font_weight = clamp(style.text.font_weight, 100, 900, 400);
    if (style.text.alignment !== undefined) {
      const alignment = String(style.text.alignment).toLowerCase();
      text.alignment = ['left', 'center', 'right', 'justify'].includes(alignment) ? alignment : 'left';
    }
    normalized.text = text;
  }
  return normalized;
};
