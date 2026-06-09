import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import SectionCard from '@/features/teaching-sessions/components/SectionCard';
import StatusBadge from '@/features/teaching-sessions/components/StatusBadge';
import { teachingSessionsApi } from '@/features/teaching-sessions/api/teachingSessionsApi';
import type { ClientEntitlement, ProgramOption } from '@/features/teaching-sessions/types';
import SuperAdminShell from '@/pages/dashboard/superadmin/components/SuperAdminShell';

type ClientOption = {
  id: number;
  name: string;
  slug?: string;
};

export default function ClientEntitlementsPage() {
  const [clientId, setClientId] = useState('');
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [programs, setPrograms] = useState<ProgramOption[]>([]);
  const [entitlements, setEntitlements] = useState<ClientEntitlement[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [loadingEntitlements, setLoadingEntitlements] = useState(false);
  const [savingFeature, setSavingFeature] = useState(false);
  const [savingProgramId, setSavingProgramId] = useState<number | null>(null);

  const featureEntitlement = useMemo(
    () =>
      entitlements.find(
        (entitlement) =>
          entitlement.entitlement_type === 'feature' &&
          entitlement.feature_key === 'teacher_session_tracker'
      ) ?? null,
    [entitlements]
  );

  const featureEnabled = Boolean(featureEntitlement?.enabled);

  const programEntitlements = useMemo(
    () =>
      entitlements.filter((entitlement) => entitlement.entitlement_type === 'program'),
    [entitlements]
  );

  const programEntitlementMap = useMemo(() => {
    const nextMap = new Map<number, ClientEntitlement>();
    for (const entitlement of programEntitlements) {
      if (typeof entitlement.program_id !== 'number') continue;
      nextMap.set(entitlement.program_id, entitlement);
    }
    return nextMap;
  }, [programEntitlements]);

  const loadClients = async () => {
    try {
      setLoadingClients(true);
      const res = await api.get<ClientOption[]>('/platform/clients');
      setClients(res.data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load clients');
    } finally {
      setLoadingClients(false);
    }
  };

  const loadEntitlements = async (selectedClientId: string) => {
    if (!selectedClientId) {
      setEntitlements([]);
      return;
    }

    try {
      setLoadingEntitlements(true);
      const data = await teachingSessionsApi.listClientEntitlements(selectedClientId);
      setEntitlements(data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load entitlements');
    } finally {
      setLoadingEntitlements(false);
    }
  };

  const loadPrograms = async (selectedClientId: string) => {
    if (!selectedClientId) {
      setPrograms([]);
      return;
    }

    try {
      setLoadingPrograms(true);
      const res = await api.get<ProgramOption[]>('/platform/programs', {
        params: { client_id: Number(selectedClientId) },
      });
      setPrograms(res.data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load client programs');
    } finally {
      setLoadingPrograms(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    loadEntitlements(clientId);
    loadPrograms(clientId);
  }, [clientId]);

  const saveFeatureEntitlement = async (enabled: boolean) => {
    if (!clientId) {
      toast.error('Select a client first');
      return;
    }

    try {
      setSavingFeature(true);
      if (featureEntitlement) {
        await teachingSessionsApi.updateClientEntitlement(featureEntitlement.id, { enabled });
      } else {
        await teachingSessionsApi.createClientEntitlement({
          client_id: Number(clientId),
          entitlement_type: 'feature',
          feature_key: 'teacher_session_tracker',
          enabled,
        });
      }
      toast.success('Feature entitlement updated');
      await loadEntitlements(clientId);
    } catch (error) {
      console.error(error);
      toast.error('Failed to update feature entitlement');
    } finally {
      setSavingFeature(false);
    }
  };

  const toggleProgramEntitlement = async (programId: number) => {
    if (!clientId) {
      toast.error('Select a client first');
      return;
    }

    const existing = programEntitlementMap.get(programId) ?? null;
    const nextEnabled = !(existing?.enabled ?? false);

    try {
      setSavingProgramId(programId);
      if (existing) {
        await teachingSessionsApi.updateClientEntitlement(existing.id, { enabled: nextEnabled });
      } else {
        await teachingSessionsApi.createClientEntitlement({
          client_id: Number(clientId),
          entitlement_type: 'program',
          program_id: programId,
          enabled: true,
        });
      }
      toast.success('Program entitlement updated');
      await loadEntitlements(clientId);
    } catch (error) {
      console.error(error);
      toast.error('Failed to update program entitlement');
    } finally {
      setSavingProgramId(null);
    }
  };

  const selectedClient = clients.find((client) => Number(client.id) === Number(clientId)) ?? null;

  return (
    <SuperAdminShell
      title="Tracker Entitlements"
      subtitle="Enable Teacher Session Tracker for a client and select the programs that client can use."
    >
      <div className="space-y-6">
        <SectionCard title="Client Selection" subtitle="Choose the client whose tracker access you want to manage.">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm text-slate-600">
              Client
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                disabled={loadingClients}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              >
                <option value="">{loadingClients ? 'Loading clients...' : 'Select a client'}</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Selected Client</div>
              <div className="mt-2 font-semibold text-slate-900">
                {selectedClient ? selectedClient.name : 'No client selected'}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {selectedClient?.slug || 'Choose a client to load tracker entitlements and programs.'}
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Feature Enablement" subtitle="Turn Teacher Session Tracker on or off for the selected client.">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div>
              <div className="text-sm font-semibold text-slate-900">Teacher Session Tracker</div>
              <div className="text-sm text-slate-500">
                {featureEnabled
                  ? 'This client can access Teacher Session Tracker, subject to program entitlements.'
                  : 'Enable the tracker before client admins can use tracker programs.'}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={featureEnabled ? 'completed' : 'not_completed'} />
              <button
                type="button"
                onClick={() => saveFeatureEntitlement(!featureEnabled)}
                disabled={!clientId || savingFeature}
                className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingFeature ? 'Saving...' : featureEnabled ? 'Disable Feature' : 'Enable Feature'}
              </button>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Program Entitlements"
          subtitle="Choose which programs the selected client can use inside Teacher Session Tracker."
          actions={
            <button
              type="button"
              onClick={() => {
                loadEntitlements(clientId);
                loadPrograms(clientId);
              }}
              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700"
            >
              Refresh
            </button>
          }
        >
          <div className="space-y-3">
            {!clientId && (
              <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                Select a client to manage tracker programs.
              </div>
            )}
            {clientId && loadingPrograms && (
              <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                Loading client programs...
              </div>
            )}
            {clientId && !loadingPrograms && programs.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                No programs found for this client.
              </div>
            )}
            {programs.map((program) => {
              const entitlement = programEntitlementMap.get(program.id) ?? null;
              const enabled = Boolean(entitlement?.enabled);
              return (
                <div
                  key={program.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4"
                >
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      {program.code ? `${program.name} (${program.code})` : program.name}
                    </div>
                    <div className="text-xs text-slate-500">Program ID: {program.id}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={enabled ? 'completed' : 'not_completed'} />
                    <button
                      type="button"
                      onClick={() => toggleProgramEntitlement(program.id)}
                      disabled={!clientId || savingProgramId === program.id}
                      className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {savingProgramId === program.id ? 'Saving...' : enabled ? 'Disable Program' : 'Enable Program'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard title="Current Entitlements">
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Client</th>
                    <th className="px-3 py-2 text-left">Type</th>
                    <th className="px-3 py-2 text-left">Feature / Program</th>
                    <th className="px-3 py-2 text-left">Enabled</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {loadingEntitlements && (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-slate-500">
                        Loading entitlements...
                      </td>
                    </tr>
                  )}
                  {!loadingEntitlements && entitlements.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-slate-500">
                        No entitlements created yet for this client.
                      </td>
                    </tr>
                  )}
                  {entitlements.map((entitlement) => (
                    <tr key={entitlement.id}>
                      <td className="px-3 py-2">{selectedClient?.name || entitlement.client_id}</td>
                      <td className="px-3 py-2 capitalize">{entitlement.entitlement_type}</td>
                      <td className="px-3 py-2">
                        {entitlement.feature_key ||
                          programs.find((program) => Number(program.id) === Number(entitlement.program_id))?.name ||
                          entitlement.program_id ||
                          '-'}
                      </td>
                      <td className="px-3 py-2">
                        <StatusBadge status={entitlement.enabled ? 'completed' : 'not_completed'} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </SectionCard>
      </div>
    </SuperAdminShell>
  );
}
