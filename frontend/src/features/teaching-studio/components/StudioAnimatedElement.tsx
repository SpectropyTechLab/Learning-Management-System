import type { ReactNode } from 'react';

export const studioAnimationClass = (effect: string) => ({
  appear: 'studio-animate-appear', fade: 'studio-animate-fade', 'fly-in': 'studio-animate-fly-in', wipe: 'studio-animate-wipe', zoom: 'studio-animate-zoom', bounce: 'studio-animate-bounce', pulse: 'studio-animate-pulse', spin: 'studio-animate-spin', grow: 'studio-animate-grow', 'fade-out': 'studio-animate-fade-out', 'fly-out': 'studio-animate-fly-out', 'zoom-out': 'studio-animate-zoom-out',
}[effect] || '');

export default function StudioAnimatedElement({ children, animation }: { children: ReactNode; animation?: Record<string, unknown> }) {
  return <div className={`h-full w-full ${studioAnimationClass(String(animation?.effect || 'none'))}`} style={{ animationDuration: `${Number(animation?.duration) || 0.8}s`, animationDelay: `${Number(animation?.delay) || 0}s`, animationFillMode: 'both' }}>{children}</div>;
}
