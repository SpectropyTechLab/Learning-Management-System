import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import SuperAdminShell from './components/SuperAdminShell';
import { Badge, FieldLabel, GhostButton, PrimaryButton } from './components/ui';
import type { Client, ContentPack, Entitlement } from './types';

const statusTone: Record<string, string> = {
  active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  expired: 'border-rose-200 bg-rose-50 text-rose-700',
};

const visibleEntitlementStatuses = new Set(['active', 'expired']);

const toUtcIsoString = (value: string) => {
  if (!value) return value;
  return new Date(value).toISOString();
};

export default function EntitlementsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [packs, setPacks] = useState<ContentPack[]>([]);
  const [entitlements, setEntitlements] = useState<Entitlement[]>([]);
  const [loading, setLoading] = useState(false);
  const [entitlementStatusFilter, setEntitlementStatusFilter] = useState('all');

  const [entitlementForm, setEntitlementForm] = useState({
    client_id: '',
    content_id: '',
    pack_id: '',
    start_at: '',
    end_at: '',
    status: 'active',
  });

  const filteredEntitlements = useMemo(() => {
    const visibleEntitlements = entitlements.filter((entitlement) =>
      visibleEntitlementStatuses.has(entitlement.status),
    );
    if (entitlementStatusFilter === 'all') return visibleEntitlements;
    return visibleEntitlements.filter((entitlement) => entitlement.status === entitlementStatusFilter);
  }, [entitlements, entitlementStatusFilter]);

  const loadClients = async () => {
    const res = await api.get('/platform/clients');
    setClients(res.data);
  };

  const loadPacks = async () => {
    const res = await api.get('/platform/content-packs');
    setPacks(res.data);
  };

  const loadEntitlements = async () => {
    const res = await api.get('/platform/entitlements');
    setEntitlements(res.data);
  };

  const loadAll = async () => {
    try {
      setLoading(true);
      await Promise.all([loadClients(), loadPacks(), loadEntitlements()]);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load entitlements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const createEntitlement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/platform/entitlements', {
        ...entitlementForm,
        client_id: Number(entitlementForm.client_id),
        content_id: entitlementForm.content_id ? Number(entitlementForm.content_id) : null,
        pack_id: entitlementForm.pack_id ? Number(entitlementForm.pack_id) : null,
        start_at: toUtcIsoString(entitlementForm.start_at),
        end_at: toUtcIsoString(entitlementForm.end_at),
      });
      setEntitlementForm({
        client_id: '',
        content_id: '',
        pack_id: '',
        start_at: '',
        end_at: '',
        status: 'active',
      });
      loadEntitlements();
      toast.success('Entitlement granted');
    } catch (error) {
      console.error(error);
      toast.error('Failed to grant entitlement');
    }
  };

  const revokeEntitlement = async (id: number) => {
    try {
      await api.delete(`/platform/entitlements/${id}`);
      loadEntitlements();
      toast.success('Entitlement revoked');
    } catch (error) {
      console.error(error);
      toast.error('Failed to revoke entitlement');
    }
  };

  return (
    <SuperAdminShell
      title="Entitlements"
      subtitle="Grant access windows for packs or specific content."
    >
      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Entitlements</h2>
              <p className="text-sm text-slate-500">Track entitlement windows per client.</p>
            </div>
            <select
              value={entitlementStatusFilter}
              onChange={(e) => setEntitlementStatusFilter(e.target.value)}
              className="rounded-full border border-slate-200 px-3 py-2 text-xs"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
            </select>
          </div>
          <div className="mt-5 space-y-3">
            {loading && (
              <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                Loading entitlements...
              </div>
            )}
            {!loading &&
              filteredEntitlements.map((entitlement) => (
                <div key={entitlement.id} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-900">
                        {entitlement.client_name || `Client ${entitlement.client_id}`}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        Pack: {entitlement.pack_name || entitlement.pack_id || '-'} | Content:{' '}
                        {entitlement.content_title || entitlement.content_id || '-'}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {entitlement.start_at || 'Start'} to {entitlement.end_at || 'End'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={statusTone[entitlement.status] || statusTone.active}>{entitlement.status}</Badge>
                      <GhostButton onClick={() => revokeEntitlement(entitlement.id)}>Revoke</GhostButton>
                    </div>
                  </div>
                </div>
              ))}
            {!loading && filteredEntitlements.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                No entitlements found.
              </div>
            )}
          </div>
        </div>

        <form onSubmit={createEntitlement} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Grant Entitlement</div>
          <h3 className="mt-2 text-lg font-semibold">Access Window</h3>
          <div className="mt-5 space-y-4">
            <div className="space-y-2">
              <FieldLabel>Client</FieldLabel>
              <select
                value={entitlementForm.client_id}
                onChange={(e) => setEntitlementForm({ ...entitlementForm, client_id: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                required
              >
                <option value="">Select client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name} ({client.id})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <FieldLabel>Pack (Optional)</FieldLabel>
              <select
                value={entitlementForm.pack_id}
                onChange={(e) => setEntitlementForm({ ...entitlementForm, pack_id: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">Select pack</option>
                {packs.map((pack) => (
                  <option key={pack.id} value={pack.id}>
                    {pack.name} ({pack.id})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <FieldLabel>Content ID (Optional)</FieldLabel>
              <input
                value={entitlementForm.content_id}
                onChange={(e) => setEntitlementForm({ ...entitlementForm, content_id: e.target.value })}
                placeholder="Content ID"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel>Start At</FieldLabel>
                <input
                  type="datetime-local"
                  value={entitlementForm.start_at}
                  onChange={(e) => setEntitlementForm({ ...entitlementForm, start_at: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-2">
                <FieldLabel>End At</FieldLabel>
                <input
                  type="datetime-local"
                  value={entitlementForm.end_at}
                  onChange={(e) => setEntitlementForm({ ...entitlementForm, end_at: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="space-y-2">
              <FieldLabel>Status</FieldLabel>
              <select
                value={entitlementForm.status}
                onChange={(e) => setEntitlementForm({ ...entitlementForm, status: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="active">active</option>
                <option value="pending">pending</option>
                <option value="grace">grace</option>
                <option value="expired">expired</option>
              </select>
            </div>
            <PrimaryButton type="submit" disabled={!entitlementForm.client_id}>
              Grant Entitlement
            </PrimaryButton>
          </div>
        </form>
      </div>
    </SuperAdminShell>
  );
}
