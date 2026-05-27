import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { moduleEntitlementsApi } from '@/features/module-entitlements/api/moduleEntitlementsApi';
import type { ModuleEntitlement, ModuleProgramOption } from '@/features/module-entitlements/types';
import type { Client } from '@/pages/dashboard/superadmin/types';
import { Badge, GhostButton } from '@/pages/dashboard/superadmin/components/ui';

type Props = {
  modulePath: string;
  featureKey: string;
  featureLabel: string;
  featureDescription: string;
  programSectionTitle: string;
  emptyProgramText: string;
};

const enabledTone = 'border-emerald-200 bg-emerald-50 text-emerald-700';
const disabledTone = 'border-slate-300 bg-slate-100 text-slate-600';

export default function ModuleEntitlementsManager({
  modulePath,
  featureKey,
  featureLabel,
  featureDescription,
  programSectionTitle,
  emptyProgramText,
}: Props) {
  const [clientId, setClientId] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [programs, setPrograms] = useState<ModuleProgramOption[]>([]);
  const [entitlements, setEntitlements] = useState<ModuleEntitlement[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [loadingEntitlements, setLoadingEntitlements] = useState(false);
  const [savingFeature, setSavingFeature] = useState(false);
  const [savingProgramId, setSavingProgramId] = useState<number | null>(null);

  const selectedClient = clients.find((client) => Number(client.id) === Number(clientId)) ?? null;

  const featureEntitlement = useMemo(
    () =>
      entitlements.find(
        (entitlement) =>
          entitlement.entitlement_type === 'feature' && entitlement.feature_key === featureKey
      ) ?? null,
    [entitlements, featureKey]
  );

  const featureEnabled = Boolean(featureEntitlement?.enabled);

  const programEntitlementMap = useMemo(() => {
    const nextMap = new Map<number, ModuleEntitlement>();
    entitlements
      .filter((entitlement) => entitlement.entitlement_type === 'program')
      .forEach((entitlement) => {
        if (typeof entitlement.program_id === 'number') {
          nextMap.set(entitlement.program_id, entitlement);
        }
      });
    return nextMap;
  }, [entitlements]);

  const loadClients = async () => {
    try {
      setLoadingClients(true);
      const res = await api.get<Client[]>('/platform/clients');
      setClients(res.data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load clients');
    } finally {
      setLoadingClients(false);
    }
  };

  const loadPrograms = async (selectedClientId: string) => {
    if (!selectedClientId) {
      setPrograms([]);
      return;
    }

    try {
      setLoadingPrograms(true);
      const res = await api.get<ModuleProgramOption[]>('/platform/programs', {
        params: { client_id: Number(selectedClientId) },
      });
      setPrograms(res.data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load programs');
    } finally {
      setLoadingPrograms(false);
    }
  };

  const loadEntitlements = async (selectedClientId: string) => {
    if (!selectedClientId) {
      setEntitlements([]);
      return;
    }

    try {
      setLoadingEntitlements(true);
      const data = await moduleEntitlementsApi.list(modulePath, selectedClientId);
      setEntitlements(data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load entitlements');
    } finally {
      setLoadingEntitlements(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    loadPrograms(clientId);
    loadEntitlements(clientId);
  }, [clientId]);

  const saveFeatureEntitlement = async (enabled: boolean) => {
    if (!clientId) {
      toast.error('Select a client first');
      return;
    }

    try {
      setSavingFeature(true);
      if (featureEntitlement) {
        await moduleEntitlementsApi.update(modulePath, featureEntitlement.id, { enabled });
      } else {
        await moduleEntitlementsApi.create(modulePath, {
          client_id: Number(clientId),
          entitlement_type: 'feature',
          feature_key: featureKey,
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
        await moduleEntitlementsApi.update(modulePath, existing.id, { enabled: nextEnabled });
      } else {
        await moduleEntitlementsApi.create(modulePath, {
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

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm text-slate-600">
            Client
            <select
              value={clientId}
              onChange={(event) => setClientId(event.target.value)}
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
              {selectedClient?.slug || 'Choose a client to manage entitlements.'}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div>
            <div className="text-sm font-semibold text-slate-900">{featureLabel}</div>
            <div className="text-sm text-slate-500">{featureDescription}</div>
          </div>
          <div className="flex items-center gap-3">
            <Badge tone={featureEnabled ? enabledTone : disabledTone}>
              {featureEnabled ? 'Enabled' : 'Disabled'}
            </Badge>
            <GhostButton
              onClick={() => saveFeatureEntitlement(!featureEnabled)}
              disabled={!clientId || savingFeature}
              className="px-4 py-2"
            >
              {savingFeature ? 'Saving...' : featureEnabled ? 'Disable Feature' : 'Enable Feature'}
            </GhostButton>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{programSectionTitle}</h2>
            <p className="text-sm text-slate-500">Choose which programs this client can use for this module.</p>
          </div>
          <GhostButton
            onClick={() => {
              loadPrograms(clientId);
              loadEntitlements(clientId);
            }}
          >
            Refresh
          </GhostButton>
        </div>

        <div className="mt-5 space-y-3">
          {!clientId && (
            <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
              Select a client to manage program entitlements.
            </div>
          )}
          {clientId && loadingPrograms && (
            <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
              Loading programs...
            </div>
          )}
          {clientId && !loadingPrograms && programs.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
              {emptyProgramText}
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
                  <Badge tone={enabled ? enabledTone : disabledTone}>{enabled ? 'Enabled' : 'Disabled'}</Badge>
                  <GhostButton
                    onClick={() => toggleProgramEntitlement(program.id)}
                    disabled={!clientId || savingProgramId === program.id}
                    className="px-4 py-2"
                  >
                    {savingProgramId === program.id ? 'Saving...' : enabled ? 'Disable Program' : 'Enable Program'}
                  </GhostButton>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Current Entitlements</h2>
            <p className="text-sm text-slate-500">Review current feature and program access for the selected client.</p>
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
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
                      <Badge tone={entitlement.enabled ? enabledTone : disabledTone}>
                        {entitlement.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
