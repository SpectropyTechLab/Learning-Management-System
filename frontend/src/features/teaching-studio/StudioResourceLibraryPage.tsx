import { useState } from 'react';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { getApiErrorDetails } from '@/lib/api';
import { createStudioResource, type StudioResourceUploadInput } from './api/studioResourcesApi';
import ResourceLibrary from './components/resources/ResourceLibrary';
import ResourceUploadModal from './components/resources/ResourceUploadModal';
import StudioShell from './components/StudioShell';

export default function StudioResourceLibraryPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const createResource = async (input: StudioResourceUploadInput) => {
    setSubmitting(true);
    setServerError('');
    try {
      await createStudioResource(input);
      setCreateOpen(false);
      setRefreshKey((value) => value + 1);
      toast.success('Resource added successfully.');
    } catch (error) {
      const message = getApiErrorDetails(error, 'Unable to add the Resource.').message;
      setServerError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <StudioShell
      title="Resource Library"
      subtitle="Find, filter and manage reusable Resources for your teaching content."
      wrapContent={false}
      actions={<button type="button" onClick={() => { setServerError(''); setCreateOpen(true); }} className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-800"><Plus size={18} />Add Resource</button>}
    >
      <ResourceLibrary refreshKey={refreshKey} />
      <ResourceUploadModal open={createOpen} mode="create" submitting={submitting} serverError={serverError} onClose={() => setCreateOpen(false)} onSubmit={createResource} />
    </StudioShell>
  );
}
