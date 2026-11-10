import type { CSSProperties, ReactNode } from 'react';
import { studioAnimationStyle } from './studioAnimationRuntime';

export default function StudioAnimatedElement({
  children,
  animation,
  presenterEffects,
  presenterVisible,
  playbackKey,
}: {
  children: ReactNode;
  animation?: Record<string, unknown>;
  presenterEffects?: Array<Record<string, unknown>>;
  presenterVisible?: boolean;
  playbackKey?: string | number;
}) {
  const isPresenterControlled = presenterEffects !== undefined || presenterVisible !== undefined;
  const style = isPresenterControlled
    ? presenterEffects?.length
      ? studioAnimationStyle({ effects: presenterEffects })
      : presenterVisible === false
        ? ({ opacity: 0 } satisfies CSSProperties)
        : {}
    : studioAnimationStyle(animation);
  return (
    <div
      key={playbackKey}
      data-studio-animated="true"
      className="h-full w-full"
      style={style}
    >
      {children}
    </div>
  );
}
