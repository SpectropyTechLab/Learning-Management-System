import { useLayoutEffect, useRef, useState } from 'react';
import type { ActivityDocument } from './activityBuilderModel';
import ActivityLivePreview from './ActivityLivePreview';

const PLAYER_WIDTH = 960;
const PLAYER_HEIGHT = 540;

export default function ActivityPlayerFrame({ activity }: { activity: ActivityDocument }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const resize = () => {
      const { width, height } = frame.getBoundingClientRect();
      setScale(Math.max(0.01, Math.min(width / PLAYER_WIDTH, height / PLAYER_HEIGHT)));
    };
    const observer = new ResizeObserver(resize);
    observer.observe(frame);
    resize();
    return () => observer.disconnect();
  }, []);

  return <div ref={frameRef} className="relative h-full min-h-0 w-full overflow-hidden">
    <div
      className="absolute left-1/2 top-1/2"
      style={{
        width: PLAYER_WIDTH,
        height: PLAYER_HEIGHT,
        transform: `translate(-50%, -50%) scale(${scale})`,
        transformOrigin: 'center',
      }}
    >
      <ActivityLivePreview activity={activity} />
    </div>
  </div>;
}
