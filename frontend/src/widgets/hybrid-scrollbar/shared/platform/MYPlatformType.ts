export type MYPlatformType = 'ios' | 'android' | 'desktop';

export const myGetPlatformType = (): MYPlatformType => {
  if (typeof window === 'undefined') {
    return 'desktop';
  }

  const nav = window.navigator as Navigator & {
    userAgentData?: { platform?: string };
  };
  const ua = nav.userAgent || '';

  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    ((nav.userAgentData?.platform === 'macOS' || /Macintosh/i.test(ua)) && nav.maxTouchPoints > 1);

  if (isIOS) return 'ios';
  if (/android/i.test(ua)) return 'android';

  return 'desktop';
};