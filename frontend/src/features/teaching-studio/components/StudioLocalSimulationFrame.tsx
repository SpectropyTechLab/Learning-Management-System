import { useEffect, useMemo, useState } from 'react';
import { buildSimulationHtml } from './simulationExport';
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
  const [html, setHtml] = useState('');
  const [runtimeError, setRuntimeError] = useState('');
  const result = useMemo(() => {
    try {
      const simulation = validateSimulationDocument(project);
      return { simulation, error: '' };
    } catch (error) {
      return {
        simulation: null,
        error: error instanceof Error ? error.message : 'This screen contains an invalid Simulation project.',
      };
    }
  }, [project]);

  useEffect(() => {
    let active = true;
    setHtml('');
    setRuntimeError('');
    if (!result.simulation) return () => { active = false; };

    void buildSimulationHtml(result.simulation)
      .then((nextHtml) => {
        if (active) setHtml(nextHtml);
      })
      .catch((error) => {
        if (active) setRuntimeError(error instanceof Error ? error.message : 'Unable to load this simulation runtime.');
      });
    return () => { active = false; };
  }, [result.simulation]);

  if (result.error) {
    return <div className={`grid place-items-center bg-slate-950 p-4 text-center text-xs text-white ${className}`}>{result.error}</div>;
  }

  if (runtimeError) {
    return <div className={`grid place-items-center bg-slate-950 p-4 text-center text-xs text-white ${className}`}>{runtimeError}</div>;
  }

  if (!interactive) {
    return <div className={`grid place-items-center bg-slate-900 p-4 text-center text-white ${className}`}><div><p className="font-semibold">{title}</p><p className="mt-1 text-xs uppercase text-slate-400">Screen-local Simulation</p></div></div>;
  }

  if (!html) {
    return <div className={`grid place-items-center bg-slate-950 p-4 text-center text-xs text-slate-300 ${className}`}>Loading simulation…</div>;
  }

  return (
    <iframe
      srcDoc={html}
      title={title}
      className={`border-0 bg-white ${className}`}
      sandbox="allow-scripts allow-popups allow-top-navigation-by-user-activation allow-pointer-lock allow-forms allow-modals allow-downloads allow-presentation"
      allow="fullscreen"
      allowFullScreen
      onLoad={onReady}
    />
  );
}
