import { useEffect, useMemo, useRef, useState } from 'react';
import type { SimulationDocument } from '../simulationStudioModel';
import { injectPhysicsWizard, type PhysicsNativeProject } from './physicsRuntimeProject';

const runtimePromises = new Map<string, Promise<string>>();
const loadRuntime = (runtimeUrl: string) => {
  const existing = runtimePromises.get(runtimeUrl);
  if (existing) return existing;
  const pending = fetch(runtimeUrl).then((response) => {
    if (!response.ok) throw new Error(`Simulation runtime could not be loaded (${response.status}).`);
    return response.text();
  });
  runtimePromises.set(runtimeUrl, pending);
  return pending;
};

export default function PhysicsRuntimeWizard({ simulation, onProject, onClose, runtimeUrl = '/simulation-runtimes/physics.html', title = 'New Physics Simulation' }: {
  simulation: SimulationDocument;
  onProject: (project: PhysicsNativeProject) => void;
  onClose: () => void;
  runtimeUrl?: string;
  title?: string;
}) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [runtime, setRuntime] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setRuntime('');
    void loadRuntime(runtimeUrl).then((html) => { if (active) setRuntime(html); }).catch((reason) => {
      if (active) setError(reason instanceof Error ? reason.message : 'Physics runtime could not be loaded.');
    });
    return () => { active = false; };
  }, [runtimeUrl]);
  const source = useMemo(() => runtime ? injectPhysicsWizard(runtime, simulation) : '', [runtime, simulation]);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.source !== frameRef.current?.contentWindow) return;
      if (event.data?.spx === 'wizard-close') { onClose(); return; }
      if (event.data?.spx !== 'project' || !event.data.project) return;
      onProject(event.data.project as PhysicsNativeProject);
      onClose();
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [onClose, onProject]);
  return (
    <div className="fixed inset-x-0 bottom-0 top-11 z-50 bg-slate-950/65 backdrop-blur-[1px]">
      {error ? <div className="grid h-full place-items-center text-red-300">{error}</div> : null}
      {!error && !source ? <div className="grid h-full place-items-center text-cyan-200">Loading Physics wizard…</div> : null}
      {source ? (
        <iframe
          ref={frameRef}
          title={title}
          srcDoc={source}
          sandbox="allow-scripts allow-same-origin"
          className="h-full w-full border-0 bg-transparent"
        />
      ) : null}
    </div>
  );
}
