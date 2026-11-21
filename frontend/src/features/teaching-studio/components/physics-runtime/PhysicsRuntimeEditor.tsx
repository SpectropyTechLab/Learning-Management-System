import { useEffect, useMemo, useRef, useState } from 'react';
import type { SimulationDocument } from '../simulationStudioModel';
import {
  buildPhysicsStandaloneHtml,
  injectPhysicsEditor,
  type PhysicsNativeProject,
} from './physicsRuntimeProject';

let runtimePromise: Promise<string> | null = null;
const loadRuntime = () => runtimePromise ||= fetch('/simulation-runtimes/physics.html').then((response) => {
  if (!response.ok) throw new Error(`Physics runtime could not be loaded (${response.status}).`);
  return response.text();
});

type Props = {
  simulation: SimulationDocument;
  onBack: () => void;
  onInsert: (payload: { project: SimulationDocument; title: string; html: string }) => void;
};

export default function PhysicsRuntimeEditor({ simulation, onBack, onInsert }: Props) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [runtime, setRuntime] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    void loadRuntime().then((html) => { if (active) setRuntime(html); }).catch((reason) => {
      if (active) setError(reason instanceof Error ? reason.message : 'Physics runtime could not be loaded.');
    });
    return () => { active = false; };
  }, []);
  const source = useMemo(() => runtime ? injectPhysicsEditor(runtime, simulation) : '', [runtime, simulation]);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.source !== frameRef.current?.contentWindow) return;
      if (!event.data || event.data.spx !== 'insert' || !event.data.proj) return;
      const nativeProject = event.data.proj as PhysicsNativeProject;
      const title = typeof event.data.title === 'string' ? event.data.title : simulation.title;
      const project: SimulationDocument = {
        ...simulation,
        title,
        metadata: { ...simulation.metadata, physicsNativeProject: nativeProject },
      };
      onInsert({ project, title, html: buildPhysicsStandaloneHtml(runtime, nativeProject) });
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [onInsert, runtime, simulation]);

  if (error) return <div className="grid h-dvh place-items-center bg-slate-950 text-red-300">{error}</div>;
  if (!source) return <div className="grid h-dvh place-items-center bg-slate-950 text-cyan-200">Loading Physics Studio…</div>;
  return (
    <div className="relative h-dvh w-full overflow-hidden bg-black">
      <button
        type="button"
        onClick={onBack}
        className="absolute left-2 top-2 z-10 rounded border border-slate-500 bg-slate-950/90 px-2 py-1 text-xs font-semibold text-white shadow-lg"
      >
        ← Back
      </button>
      <iframe
        ref={frameRef}
        title={`${simulation.title} Physics Studio`}
        srcDoc={source}
        sandbox="allow-scripts allow-same-origin allow-downloads"
        className="h-full w-full border-0 bg-black"
      />
    </div>
  );
}
