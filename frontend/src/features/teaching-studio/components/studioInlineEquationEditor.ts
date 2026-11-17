type RectLike = Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>;

export const inlineEquationEditorBounds = (
  target: RectLike,
  container: RectLike,
  containerBorder = { left: 0, top: 0 },
) => ({
  left: target.left - container.left - containerBorder.left,
  top: target.top - container.top - containerBorder.top,
  width: Math.max(36, target.width),
  height: Math.max(32, target.height),
});
