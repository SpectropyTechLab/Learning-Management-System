import { useEffect, useMemo } from 'react';
import { Sigma } from 'lucide-react';
import { buildMathematicsLabHtml } from './mathematicsLabExport';
import { validateMathematicsLabProject } from './mathematicsLabModel';

export default function StudioLocalMathematicsLabFrame({ project, title, interactive = true, className = '', onReady }: { project: unknown; title?: string; interactive?: boolean; className?: string; onReady?: () => void }) {
  const result = useMemo(() => {
    try { const validated = validateMathematicsLabProject(project); return { project: validated, html: buildMathematicsLabHtml(validated), error: '' }; }
    catch (error) { return { project: null, html: '', error: error instanceof Error ? error.message : 'Invalid Mathematics Lab project.' }; }
  }, [project]);
  useEffect(() => {
    if (interactive || !result.project || !onReady) return;
    const frame = window.requestAnimationFrame(() => window.requestAnimationFrame(onReady));
    return () => window.cancelAnimationFrame(frame);
  }, [interactive, onReady, result.project]);
  if (result.error || !result.project) return <div className={`grid h-full w-full place-items-center bg-slate-950 p-5 text-center text-red-200 ${className}`}><div><Sigma className="mx-auto" size={32}/><p className="mt-2 text-sm font-semibold">{result.error}</p></div></div>;
  if (!interactive) return <div className={`grid h-full w-full place-items-center bg-[#141517] p-5 text-center text-white ${className}`}><div><Sigma className="mx-auto text-amber-300" size={38}/><p className="mt-2 font-semibold">{title || result.project.title}</p><p className="mt-1 text-xs uppercase text-slate-400">Interactive Mathematics Lab</p></div></div>;
  return <iframe title={title || result.project.title} srcDoc={result.html} onLoad={onReady} sandbox="allow-scripts allow-forms allow-same-origin allow-pointer-lock allow-presentation allow-modals" allow="fullscreen" className={`h-full w-full border-0 ${className}`}/>;
}
