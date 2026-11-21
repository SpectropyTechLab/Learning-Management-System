import { useEffect, useRef } from 'react';
import { loadPhysicsLabRuntime, type PhysicsLabDefinition } from './physicsLabModel';

type Props = {
  labId: string;
  definition?: PhysicsLabDefinition;
  title?: string;
  className?: string;
};

const LAB_WIDTH = 1000;
const LAB_HEIGHT = 560;

export default function PhysicsLabThumbnail({ labId, definition: suppliedDefinition, title, className = '' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    let runtimeState: unknown;
    let activeDefinition: PhysicsLabDefinition | undefined;

    const paint = async () => {
      const definitions = suppliedDefinition ? null : await loadPhysicsLabRuntime();
      if (cancelled) return;
      activeDefinition = suppliedDefinition || definitions?.[labId];
      const canvas = canvasRef.current;
      if (!activeDefinition || !canvas) return;

      const parameters = Object.fromEntries(activeDefinition.controls.map((control) => [control.k, control.def]));
      runtimeState = activeDefinition.init(parameters);
      for (let frame = 0; frame < 4; frame += 1) {
        activeDefinition.step?.(runtimeState, parameters, 1 / 30, frame / 30);
      }

      const bounds = canvas.getBoundingClientRect();
      const cssWidth = Math.max(180, Math.round(bounds.width || 480));
      const cssHeight = Math.max(100, Math.round(bounds.height || 210));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(cssWidth * dpr);
      canvas.height = Math.round(cssHeight * dpr);
      const context = canvas.getContext('2d');
      if (!context) return;
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.fillStyle = '#141518';
      context.fillRect(0, 0, canvas.width, canvas.height);
      const scale = Math.min(cssWidth / LAB_WIDTH, cssHeight / LAB_HEIGHT);
      const offsetX = (cssWidth - LAB_WIDTH * scale) / 2;
      const offsetY = (cssHeight - LAB_HEIGHT * scale) / 2;
      context.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * offsetX, dpr * offsetY);
      context.save();
      context.beginPath();
      context.rect(0, 0, LAB_WIDTH, LAB_HEIGHT);
      context.clip();
      activeDefinition.draw(context, runtimeState, parameters, 1.2);
      context.restore();
    };

    void paint().catch(() => {
      const canvas = canvasRef.current;
      const context = canvas?.getContext('2d');
      if (!canvas || !context) return;
      context.fillStyle = '#141518';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = '#67e8f9';
      context.font = '700 36px system-ui';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText((title || labId).slice(0, 2).toUpperCase(), canvas.width / 2, canvas.height / 2);
    });

    return () => {
      cancelled = true;
      if (runtimeState !== undefined) activeDefinition?.dispose?.(runtimeState);
    };
  }, [labId, suppliedDefinition, title]);

  return <canvas ref={canvasRef} className={`block bg-[#141518] object-cover ${className}`} role="img" aria-label={`${title || labId} lab preview`} />;
}
