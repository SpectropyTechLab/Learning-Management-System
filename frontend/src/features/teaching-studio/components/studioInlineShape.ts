export interface InlineShapeData {
  kind: string;
  customPath?: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

export const inlineShapeToken = (shape: InlineShapeData) =>
  `[[shape:${encodeURIComponent(JSON.stringify(shape))}]]`;
