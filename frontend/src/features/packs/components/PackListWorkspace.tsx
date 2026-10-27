import { useEffect, useMemo, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RiDeleteBinLine,
  RiLayoutGridLine,
  RiListCheck2,
  RiMore2Fill,
  RiPencilLine,
  RiSearchLine,
  RiShieldCheckLine,
} from 'react-icons/ri';
import toast from 'react-hot-toast';
import { useAuth } from '@/features/auth/hooks/useAuth';
import api from '@/lib/api';
import { Badge, GhostButton, PrimaryButton } from '@/pages/dashboard/superadmin/components/ui';
import { DeletePackDialog, EntitlementDialog, PackFormDialog } from './PackDialogs';
import type {
  ClientOption,
  CreatePackResponse,
  EditablePackFormValues,
  PackEntitlementFormValues,
  PackSummary,
  PaginatedResponse,
} from '../types';

const statusTone = {
  active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  inactive: 'border-slate-200 bg-slate-100 text-slate-600',
} as const;

const readError = (error: unknown, fallback: string) =>
  typeof error === 'object' &&
  error !== null &&
  (error as { response?: { data?: { error?: string } } }).response?.data?.error
    ? String((error as { response?: { data?: { error?: string } } }).response?.data?.error)
    : fallback;

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));

const EMPTY_PACK_FORM: EditablePackFormValues = { name: '', description: '' };

const toDateTimeLocalValue = (date: Date) => {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
};

const toUtcIsoString = (value: string) => {
  if (!value) return value;
  return new Date(value).toISOString();
};

interface PackListWorkspaceProps {
  basePath: string;
}

export default function PackListWorkspace({ basePath }: PackListWorkspaceProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [packs, setPacks] = useState<PackSummary[]>([]);
  const [packsLoading, setPacksLoading] = useState(true);
  const [packsError, setPacksError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [packFormMode, setPackFormMode] = useState<'create' | 'edit' | null>(null);
  const [packFormSubmitting, setPackFormSubmitting] = useState(false);
  const [packForm, setPackForm] = useState<EditablePackFormValues>(EMPTY_PACK_FORM);
  const [packFormErrors, setPackFormErrors] = useState<{ name?: string }>({});
  const [activePack, setActivePack] = useState<PackSummary | null>(null);
  const [deleteDialogPack, setDeleteDialogPack] = useState<PackSummary | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [entitlementDialogPack, setEntitlementDialogPack] = useState<PackSummary | null>(null);
  const [entitlementSubmitting, setEntitlementSubmitting] = useState(false);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [entitlementForm, setEntitlementForm] = useState<PackEntitlementFormValues>({
    client_id: user?.client_id ? String(user.client_id) : '',
    pack_id: 0,
    start_at: '',
    end_at: '',
    status: 'active',
  });
  const [entitlementErrors, setEntitlementErrors] = useState<{
    client_id?: string;
    start_at?: string;
    end_at?: string;
  }>({});

  const isClientLocked = user?.role === 'content_authorizer';

  const filteredPacks = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return packs.filter((pack) => {
      if (!pack.is_active) return false;
      if (!normalizedQuery) return true;

      return [pack.name, pack.description ?? '', String(pack.item_count), String(pack.course_count)]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [packs, searchQuery]);

  const refreshPacks = async () => {
    try {
      setPacksLoading(true);
      setPacksError(null);
      const response = await api.get<PaginatedResponse<PackSummary>>('/packs', {
        params: { page: 1, page_size: 100 },
      });
      setPacks(response.data.data.filter((pack) => pack.is_active));
    } catch (error) {
      setPacksError(readError(error, 'Failed to load packs.'));
    } finally {
      setPacksLoading(false);
    }
  };

  useEffect(() => {
    void refreshPacks();
  }, []);

  const ensureClientsLoaded = async () => {
    if (isClientLocked || clients.length > 0 || clientsLoading) return;
    try {
      setClientsLoading(true);
      const response = await api.get<Array<{ id: number; name: string }>>('/platform/clients');
      setClients(response.data.map((client) => ({ id: client.id, name: client.name })));
    } catch (error) {
      toast.error(readError(error, 'Failed to load clients.'));
    } finally {
      setClientsLoading(false);
    }
  };

  const openCreateDialog = () => {
    setPackFormMode('create');
    setActivePack(null);
    setPackForm(EMPTY_PACK_FORM);
    setPackFormErrors({});
    setOpenMenuId(null);
  };

  const openEditDialog = (pack: PackSummary) => {
    setPackFormMode('edit');
    setActivePack(pack);
    setPackForm({ name: pack.name, description: pack.description ?? '' });
    setPackFormErrors({});
    setOpenMenuId(null);
  };

  const closePackFormDialog = () => {
    setPackFormMode(null);
    setActivePack(null);
    setPackForm(EMPTY_PACK_FORM);
    setPackFormErrors({});
  };

  const submitPackForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = {
      name: packForm.name.trim() ? undefined : 'Name is required.',
    };
    setPackFormErrors(nextErrors);
    if (nextErrors.name) return;

    try {
      setPackFormSubmitting(true);
      if (packFormMode === 'edit' && activePack) {
        await api.patch(`/platform/content-packs/${activePack.id}`, {
          name: packForm.name.trim(),
          description: packForm.description.trim() || undefined,
        });
        toast.success('Pack updated.');
      } else {
        await api.post<CreatePackResponse>('/packs', {
          name: packForm.name.trim(),
          description: packForm.description.trim() || undefined,
        });
        toast.success('Pack created.');
      }
      closePackFormDialog();
      await refreshPacks();
    } catch (error) {
      const message = readError(error, `Failed to ${packFormMode === 'edit' ? 'update' : 'create'} pack.`);
      setPackFormErrors((current) => ({
        ...current,
        name: message.includes('already exists') ? message : current.name,
      }));
      toast.error(message);
    } finally {
      setPackFormSubmitting(false);
    }
  };

  const openDeleteDialog = (pack: PackSummary) => {
    setDeleteDialogPack(pack);
    setOpenMenuId(null);
  };

  const confirmDelete = async () => {
    if (!deleteDialogPack) return;
    try {
      setDeleteSubmitting(true);
      await api.delete(`/platform/content-packs/${deleteDialogPack.id}`);
      toast.success('Pack deactivated.');
      setDeleteDialogPack(null);
      await refreshPacks();
    } catch (error) {
      toast.error(readError(error, 'Failed to deactivate pack.'));
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const openEntitlementDialog = async (pack: PackSummary) => {
    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    setEntitlementDialogPack(pack);
    setEntitlementForm({
      client_id: isClientLocked ? String(user?.client_id ?? '') : '',
      pack_id: pack.id,
      start_at: toDateTimeLocalValue(now),
      end_at: toDateTimeLocalValue(thirtyDaysLater),
      status: 'active',
    });
    setEntitlementErrors({});
    setOpenMenuId(null);
    await ensureClientsLoaded();
  };

  const closeEntitlementDialog = () => {
    setEntitlementDialogPack(null);
    setEntitlementErrors({});
    setEntitlementForm((current) => ({ ...current, start_at: '', end_at: '', status: 'active' }));
  };

  const submitEntitlement = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = {
      client_id: entitlementForm.client_id ? undefined : 'Client is required.',
      start_at: entitlementForm.start_at ? undefined : 'Start date is required.',
      end_at: entitlementForm.end_at ? undefined : 'End date is required.',
    };
    setEntitlementErrors(nextErrors);
    if (nextErrors.client_id || nextErrors.start_at || nextErrors.end_at) return;

    try {
      setEntitlementSubmitting(true);
      await api.post('/platform/entitlements', {
        client_id: Number(entitlementForm.client_id),
        pack_id: entitlementForm.pack_id,
        start_at: toUtcIsoString(entitlementForm.start_at),
        end_at: toUtcIsoString(entitlementForm.end_at),
        status: entitlementForm.status,
      });
      toast.success('Entitlement granted.');
      closeEntitlementDialog();
    } catch (error) {
      toast.error(readError(error, 'Failed to grant entitlement.'));
    } finally {
      setEntitlementSubmitting(false);
    }
  };

  const handleOpenPack = (packId: number) => {
    navigate(`${basePath}/${packId}`);
  };

  const handlePackKeyDown = (event: KeyboardEvent<HTMLElement>, packId: number) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleOpenPack(packId);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Content Packs</div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Pack list</h2>
        </div>
        <PrimaryButton onClick={openCreateDialog} className="!w-auto !rounded-full !px-5 !py-2.5">
          Create Pack
        </PrimaryButton>
      </div>

      <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-3 xl:flex-row xl:items-center">
          <div className="relative min-w-0 flex-1 xl:max-w-md">
            <RiSearchLine className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search packs"
              className="w-full rounded-full border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none transition focus:border-slate-300"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 self-end xl:self-auto">
          <div className="flex items-center rounded-full border border-slate-200 p-1">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`rounded-full px-3 py-2 text-sm transition ${
                viewMode === 'list' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-700'
              }`}
              aria-label="List view"
            >
              <RiListCheck2 />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`rounded-full px-3 py-2 text-sm transition ${
                viewMode === 'grid' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-700'
              }`}
              aria-label="Grid view"
            >
              <RiLayoutGridLine />
            </button>
          </div>
          <GhostButton onClick={() => void refreshPacks()} className="!rounded-full !px-4 !py-2 !text-sm">
            Refresh
          </GhostButton>
        </div>
      </div>

      {viewMode === 'list' ? (
        <div className="overflow-x-auto">
          <div className="min-w-[880px]">
            <div className="grid grid-cols-[minmax(0,2.4fr)_120px_120px_120px_150px_56px] gap-4 border-b border-slate-200 pb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              <div>Pack</div>
              <div>Items</div>
              <div>Courses</div>
              <div>Status</div>
              <div>Created</div>
              <div className="text-right">Actions</div>
            </div>

            <div className="divide-y divide-slate-200">
              {packsLoading && <div className="py-8 text-sm text-slate-500">Loading packs...</div>}
              {!packsLoading && packsError && <div className="py-8 text-sm text-rose-600">{packsError}</div>}
              {!packsLoading && !packsError && filteredPacks.length === 0 && (
                <div className="py-8 text-sm text-slate-500">No packs matched your filters.</div>
              )}

              {!packsLoading &&
                !packsError &&
                filteredPacks.map((pack) => (
                  <article
                    key={pack.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleOpenPack(pack.id)}
                    onKeyDown={(event) => handlePackKeyDown(event, pack.id)}
                    className="grid grid-cols-[minmax(0,2.4fr)_120px_120px_120px_150px_56px] items-center gap-4 py-4 text-left transition hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-900">{pack.name}</div>
                      <div className="mt-1 line-clamp-2 text-sm text-slate-500">
                        {pack.description?.trim() || 'No description added yet.'}
                      </div>
                    </div>
                    <div className="text-sm text-slate-700">{pack.item_count}</div>
                    <div className="text-sm text-slate-700">{pack.course_count}</div>
                    <div>
                      <Badge tone={pack.is_active ? statusTone.active : statusTone.inactive}>
                        {pack.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="text-sm text-slate-500">{formatDate(pack.created_at)}</div>
                    <div
                      className="relative flex justify-end"
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => setOpenMenuId((current) => (current === pack.id ? null : pack.id))}
                        className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                        aria-label={`Open actions for ${pack.name}`}
                      >
                        <RiMore2Fill className="text-lg" />
                      </button>
                      {openMenuId === pack.id && (
                        <div className="absolute right-0 top-10 z-20 min-w-[180px] rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                          <button
                            type="button"
                            onClick={() => openEditDialog(pack)}
                            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
                          >
                            <RiPencilLine />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => openDeleteDialog(pack)}
                            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-rose-600 transition hover:bg-rose-50"
                          >
                            <RiDeleteBinLine />
                            Delete
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              void openEntitlementDialog(pack);
                            }}
                            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
                          >
                            <RiShieldCheckLine />
                            Entitlement
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-x-8 gap-y-0 md:grid-cols-2">
          {packsLoading && <div className="py-8 text-sm text-slate-500">Loading packs...</div>}
          {!packsLoading && packsError && <div className="py-8 text-sm text-rose-600">{packsError}</div>}
          {!packsLoading && !packsError && filteredPacks.length === 0 && (
            <div className="py-8 text-sm text-slate-500">No packs matched your filters.</div>
          )}

          {!packsLoading &&
            !packsError &&
            filteredPacks.map((pack) => (
              <article
                key={pack.id}
                role="button"
                tabIndex={0}
                onClick={() => handleOpenPack(pack.id)}
                onKeyDown={(event) => handlePackKeyDown(event, pack.id)}
                className="border-b border-slate-200 py-5 text-left transition hover:bg-slate-50"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="truncate text-base font-semibold text-slate-900">{pack.name}</h4>
                      <Badge tone={pack.is_active ? statusTone.active : statusTone.inactive}>
                        {pack.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-slate-500">
                      {pack.description?.trim() || 'No description added yet.'}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-600">
                      <span>{pack.item_count} items</span>
                      <span>{pack.course_count} courses</span>
                      <span>{formatDate(pack.created_at)}</span>
                    </div>
                  </div>

                  <div
                    className="relative"
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenMenuId((current) => (current === pack.id ? null : pack.id))}
                      className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                      aria-label={`Open actions for ${pack.name}`}
                    >
                      <RiMore2Fill className="text-lg" />
                    </button>
                    {openMenuId === pack.id && (
                      <div className="absolute right-0 top-10 z-20 min-w-[180px] rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                        <button
                          type="button"
                          onClick={() => openEditDialog(pack)}
                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
                        >
                          <RiPencilLine />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => openDeleteDialog(pack)}
                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-rose-600 transition hover:bg-rose-50"
                        >
                          <RiDeleteBinLine />
                          Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            void openEntitlementDialog(pack);
                          }}
                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
                        >
                          <RiShieldCheckLine />
                          Entitlement
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            ))}
        </div>
      )}

      <PackFormDialog
        open={packFormMode !== null}
        mode={packFormMode ?? 'create'}
        submitting={packFormSubmitting}
        form={packForm}
        errors={packFormErrors}
        onClose={closePackFormDialog}
        onSubmit={submitPackForm}
        onFormChange={(field, value) => setPackForm((current) => ({ ...current, [field]: value }))}
      />

      <DeletePackDialog
        open={deleteDialogPack !== null}
        pack={deleteDialogPack}
        submitting={deleteSubmitting}
        onClose={() => setDeleteDialogPack(null)}
        onConfirm={() => {
          void confirmDelete();
        }}
      />

      <EntitlementDialog
        open={entitlementDialogPack !== null}
        pack={entitlementDialogPack}
        clients={clients}
        clientsLoading={clientsLoading}
        currentClientLabel={isClientLocked ? `Client ${user?.client_id ?? ''}` : null}
        submitting={entitlementSubmitting}
        form={entitlementForm}
        errors={entitlementErrors}
        isClientLocked={isClientLocked}
        onClose={closeEntitlementDialog}
        onSubmit={submitEntitlement}
        onFormChange={(field, value) => setEntitlementForm((current) => ({ ...current, [field]: value }))}
      />
    </div>
  );
}
