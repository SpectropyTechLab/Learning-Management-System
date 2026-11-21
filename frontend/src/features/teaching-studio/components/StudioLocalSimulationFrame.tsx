import { useMemo } from 'react';
import { buildStandaloneSimulationHtml } from './simulationExport';
import { validateSimulationDocument } from './simulationStudioModel';

type Props = {
  project: unknown;
  title?: string;
  className?: string;
  interactive?: boolean;
  onReady?: () => void;
};

export default function StudioLocalSimulationFrame({
  project,
  title = 'Interactive Simulation',
  className = '',
  interactive = true,
  onReady,
}: Props) {
  const result = useMemo(() => {
    try {
      const simulation = validateSimulationDocument(project);
      return { html: buildStandaloneSimulationHtml(simulation), error: '' };
    } catch (error) {
      return {
        html: '',
        error: error instanceof Error ? error.message : 'This screen contains an invalid Simulation project.',
      };
    }
  }, [project]);

  if (result.error) {
    return <div className={`grid place-items-center bg-slate-950 p-4 text-center text-xs text-white ${className}`}>{result.error}</div>;
  }

  if (!interactive) {
    return <div className={`grid place-items-center bg-slate-900 p-4 text-center text-white ${className}`}><div><p className="font-semibold">{title}</p><p className="mt-1 text-xs uppercase text-slate-400">Screen-local Simulation</p></div></div>;
  }

  return (
    <iframe
      srcDoc={result.html}
      title={title}
      className={`border-0 bg-white ${className}`}
      sandbox="allow-scripts allow-popups allow-top-navigation-by-user-activation allow-pointer-lock allow-forms allow-modals allow-downloads allow-presentation"
      allow="fullscreen"
      allowFullScreen
      onLoad={onReady}
    />
  );
}
