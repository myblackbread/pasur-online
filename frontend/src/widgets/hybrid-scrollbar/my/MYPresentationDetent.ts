export type MYPresentationDetent = 
  | 'medium' 
  | 'large' 
  | number 
  | `${number}px` 
  | `${number}%`;

const clamp = (val: number, min: number, max: number): number =>
  Math.min(Math.max(val, min), max);

export const myResolveDetentHeight = ({
  detent = 'medium',
  windowHeight,
}: {
  detent?: MYPresentationDetent;
  windowHeight: number;
}): number => {
  if (windowHeight <= 0) {
    return 0;
  }

  if (detent === 'medium') {
    return windowHeight * 0.5;
  }

  if (detent === 'large') {
    return windowHeight * 0.92;
  }

  if (typeof detent === 'number') {
    return Number.isNaN(detent) 
      ? windowHeight * 0.5 
      : clamp(detent, 0, windowHeight);
  }

  if (typeof detent === 'string') {
    if (detent.endsWith('px')) {
      const parsed = parseFloat(detent);
      return Number.isNaN(parsed) 
        ? windowHeight * 0.5 
        : clamp(parsed, 0, windowHeight);
    }

    if (detent.endsWith('%')) {
      const parsed = parseFloat(detent);
      if (Number.isNaN(parsed)) {
        return windowHeight * 0.5;
      }
      return clamp(windowHeight * (parsed / 100), 0, windowHeight);
    }
  }

  return windowHeight * 0.5;
};