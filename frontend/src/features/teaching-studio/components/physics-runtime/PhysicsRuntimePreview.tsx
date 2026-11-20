import { useEffect, useMemo, useState } from 'react';
import type { SimulationDocument } from '../simulationStudioModel';
import { injectPhysicsProject } from './physicsRuntimeProject';

let runtimePromise: Promise<string> | null = null;
const loadRuntime = () => runtimePromise ||= fetch('/simulation-runtimes/physics.html').then((response) => {
  if (!response.ok) throw new Error(`Physics runtime could not be loaded (${response.status}).`);
  return response.text();
});

export default function PhysicsRuntimePreview({ simulation, resetToken = 0 }: {
  simulation: SimulationDocument;
  resetToken?: number;
}) {
  const [runtime, setRuntime] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    void loadRuntime().then((html) => { if (active) setRuntime(html); }).catch((reason) => {
      if (active) setError(reason instanceof Error ? reason.message : 'Physics runtime could not be loaded.');
    });
    return () => { active = false; };
  }, []);
  const source = useMemo(() => runtime ? injectPhysicsProject(runtime, simulation) : '', [runtime, simulation]);
  if (error) return <div className="grid h-full place-items-center p-6 text-sm text-red-300">{error}</div>;
  if (!source) return <div className="grid h-full place-items-center text-sm text-cyan-200">Loading Physics runtime…</div>;
  return (
    <iframe
      key={`${simulation.templateId}-${resetToken}`}
      title={`${simulation.title} Physics simulation`}
      srcDoc={source}
      sandbox="allow-scripts allow-same-origin"
      className="h-full w-full border-0 bg-[#09111d]"
    />
  );
}
