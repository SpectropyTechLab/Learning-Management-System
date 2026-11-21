import { useMemo } from 'react';
import { FlaskConical } from 'lucide-react';
import { buildPhysicsLabHtml } from './physicsLabExport';
import { validatePhysicsLabProject } from './physicsLabModel';

export default function StudioLocalPhysicsLabFrame({ project, title, interactive = true, className = '' }: { project: unknown; title?: string; interactive?: boolean; className?: string }) {
  const result = useMemo(() => {
    try {
      const validated = validatePhysicsLabProject(project);
      return { project: validated, html: buildPhysicsLabHtml(validated), error: '' };
    } catch (error) {
      return { project: null, html: '', error: error instanceof Error ? error.message : 'Invalid Physics Lab project.' };
    }
  }, [project]);
  if (result.error || !result.project) return <div className={`grid h-full w-full place-items-center bg-slate-950 p-5 text-center text-red-200 ${className}`}><div><FlaskConical className="mx-auto" size={32} /><p className="mt-2 text-sm font-semibold">{result.error}</p></div></div>;
  if (!interactive) return <div className={`grid h-full w-full place-items-center bg-[#07111f] p-5 text-center text-white ${className}`}><div><FlaskConical className="mx-auto text-cyan-300" size={38} /><p className="mt-2 font-semibold">{title || result.project.title}</p><p className="mt-1 text-xs uppercase text-slate-400">Interactive Physics Lab</p></div></div>;
  return <iframe title={title || result.project.title} srcDoc={result.html} sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-presentation allow-downloads allow-modals" allow="fullscreen" className={`h-full w-full border-0 ${className}`} />;
}
