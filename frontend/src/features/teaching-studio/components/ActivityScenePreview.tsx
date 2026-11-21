import { useEffect, useRef } from 'react';
import type { ActivityDocument } from './activityBuilderModel';
import { drawActivityScene } from './activitySceneRenderer';

type Props = Pick<ActivityDocument, 'scene' | 'sceneSource' | 'sceneUrl' | 'sceneMediaType' | 'sceneMediaFit' | 'sceneResourceName' | 'accent' | 'ambientAnimation' | 'subject'>;

export default function ActivityScenePreview({ scene, sceneSource, sceneUrl, sceneMediaType, sceneMediaFit, sceneResourceName, accent, ambientAnimation, subject }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (sceneSource !== 'built-in') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    let frame = 0;
    let stopped = false;
    const render = (now: number) => {
      if (stopped) return;
      const rect = canvas.getBoundingClientRect();
      const density = window.devicePixelRatio || 1;
      const width = Math.max(1, Math.round(rect.width * density));
      const height = Math.max(1, Math.round(rect.height * density));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      context.setTransform(density, 0, 0, density, 0, 0);
      drawActivityScene(context, rect.width, rect.height, scene, accent, now / 1000, ambientAnimation, subject);
      if (ambientAnimation) frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    const observer = new ResizeObserver(() => {
      if (!ambientAnimation) frame = requestAnimationFrame(render);
    });
    observer.observe(canvas);
    return () => { stopped = true; cancelAnimationFrame(frame); observer.disconnect(); };
  }, [accent, ambientAnimation, scene, sceneSource, subject]);

  return <div className="mx-auto w-full max-w-[300px] overflow-hidden rounded-lg border border-slate-300 bg-[#0d0e10]">
    <div className="flex items-center justify-between border-b border-white/10 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-300">
      <span>Scene preview</span><span className="max-w-[65%] truncate text-slate-500">{sceneSource === 'built-in' ? scene : sceneResourceName || sceneSource}</span>
    </div>
    <div className="relative aspect-video w-full">
      {sceneSource === 'built-in' ? <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" /> : null}
      {sceneSource !== 'built-in' && sceneUrl && sceneMediaType === 'video' ? <video className="absolute inset-0 h-full w-full" style={{ objectFit: sceneMediaFit }} src={sceneUrl} autoPlay muted loop playsInline /> : null}
      {sceneSource !== 'built-in' && sceneUrl && sceneMediaType === 'image' ? <img className="absolute inset-0 h-full w-full" style={{ objectFit: sceneMediaFit }} src={sceneUrl} alt="Selected activity scene" /> : null}
      {sceneSource !== 'built-in' && !sceneUrl ? <div className="absolute inset-0 grid place-items-center px-6 text-center text-xs text-slate-400">Choose a Resource or enter an external URL to preview this scene.</div> : null}
    </div>
  </div>;
}
