import { useState } from 'react';
import { MonitorPlay } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { StudioSelection } from './setup/selectionState';
import StudioContextPicker from './components/StudioContextPicker';
import StudioShell from './components/StudioShell';

export default function StudioEditorEntryPage() {
  const navigate = useNavigate();
  const [selection, setSelection] = useState<StudioSelection | null>(null);
  return <StudioShell title="Screen Editor" subtitle="Choose the Session whose ordered Screens you want to edit."><section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"><StudioContextPicker onChange={setSelection} /><div className="mt-5 flex justify-end"><button type="button" disabled={!selection?.sessionId} onClick={() => navigate(`/studio/editor/${selection!.sessionId}`)} className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-5 py-2.5 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"><MonitorPlay size={18} />Open Screen Editor</button></div></section></StudioShell>;
}

