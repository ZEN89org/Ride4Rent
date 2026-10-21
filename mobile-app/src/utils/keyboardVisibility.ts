export function keyboardScrollDelta(inputTop: number, inputHeight: number, viewportTop: number, viewportBottom: number, gap = 16): number {
  if (viewportBottom <= viewportTop) return 0;
  const top = viewportTop + gap;
  const bottom = viewportBottom - gap;
  if (inputHeight > bottom - top) return inputTop - top;
  if (inputTop < top) return inputTop - top;
  if (inputTop + inputHeight > bottom) return inputTop + inputHeight - bottom;
  return 0;
}
