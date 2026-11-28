import { useLayoutEffect, useRef, useState } from 'react';
import ScreenSimulationPlayer from '../ScreenSimulationPlayer';
import type { SimulationDocument } from '../simulationStudioModel';

const PREVIEW_WIDTH = 1920;
const PREVIEW_HEIGHT = 1080;

type Props = {
  simulation: SimulationDocument;
  className?: string;
};

export default function FittedScreenSimulationPreview({ simulation, className = '' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    const fit = () => {
      const widthScale = container.clientWidth / PREVIEW_WIDTH;
      const heightScale = container.clientHeight / PREVIEW_HEIGHT;
      setScale(Math.max(0, Math.min(widthScale, heightScale)));
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className={`relative overflow-hidden bg-slate-950 ${className}`}>
      {scale > 0 ? (
        <div
          className="absolute left-1/2 top-1/2 origin-center"
          style={{
            width: PREVIEW_WIDTH,
            height: PREVIEW_HEIGHT,
            transform: `translate(-50%, -50%) scale(${scale})`,
          }}
        >
          <ScreenSimulationPlayer simulation={simulation} className="h-full w-full" />
        </div>
      ) : null}
    </div>
  );
}
