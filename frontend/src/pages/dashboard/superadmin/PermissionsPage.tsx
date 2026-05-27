import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import SuperAdminShell from './components/SuperAdminShell';
import { FieldLabel, GhostButton } from './components/ui';
import type { Client, RolePermission } from './types';

const permissionGroupLabels: Record<string, string> = {
  questions: 'Question Bank',
  courses: 'Courses',
  subjects: 'Subjects',
  chapters: 'Chapters',
  topics: 'Topics',
  exams: 'Exams',
  teaching_sessions: 'Teacher Session Tracker',
};

const permissionGroupOrder = ['Question Bank', 'Exams', 'Courses', 'Teacher Session Tracker', 'Subjects', 'Chapters', 'Topics', 'Other'];

const getPermissionGroup = (permission: string) => {
  const prefix = permission.split('.')[0];
  return permissionGroupLabels[prefix] ?? 'Other';
};

const clientScopedRoles = ['client_admin', 'school_owner', 'teacher', 'student'];

interface UserSummary {
  id: number;
  full_name: string;
  email: string;
  role: string;
  client_id: number | null;
}

interface UserPermission {
  id: number;
  user_id: number;
  permission: string;
  granted: boolean;
}

export default function PermissionsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [catalogPermissions, setCatalogPermissions] = useState<RolePermission[]>([]);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [userOverrides, setUserOverrides] = useState<UserPermission[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [overrideSaving, setOverrideSaving] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState('client_admin');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'granted' | 'missing'>('all');

  const requiresClient = clientScopedRoles.includes(selectedRole);

  const loadClients = async () => {
    try {
      const res = await api.get('/platform/clients');
      setClients(res.data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load clients');
    }
  };

  const loadPermissions = async (clientIdFilter?: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('role', selectedRole);
      if (clientIdFilter) {
        params.set('client_id', clientIdFilter);
      }
      const query = params.toString() ? `?${params.toString()}` : '';
      const res = await api.get(`/org/role-permissions${query}`);
      setPermissions(res.data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load permissions');
    } finally {
      setLoading(false);
    }
  };

  const loadCatalogPermissions = async () => {
    try {
      const res = await api.get('/org/role-permissions?role=content_authorizer');
      setCatalogPermissions(res.data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load permission catalog');
    }
  };

  const loadUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load users');
    }
  };

  const loadUserOverrides = async (userId: string) => {
    if (!userId) {
      setUserOverrides([]);
      return;
    }
    try {
      const res = await api.get(`/org/user-permissions?user_id=${userId}`);
      setUserOverrides(res.data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load user overrides');
    }
  };

  useEffect(() => {
    loadClients();
    loadCatalogPermissions();
    loadUsers();
  }, []);

  useEffect(() => {
    if (requiresClient && !selectedClientId) {
      setPermissions([]);
      return;
    }
    loadPermissions(selectedClientId || undefined);
  }, [selectedClientId, selectedRole]);

  useEffect(() => {
    loadUserOverrides(selectedUserId);
  }, [selectedUserId]);

  const filteredPermissions = useMemo(() => {
    return permissions.filter((perm) => {
      if (perm.role !== selectedRole) return false;
      if (!selectedClientId) return perm.client_id === null;
      return perm.client_id === Number(selectedClientId);
    });
  }, [permissions, selectedRole, selectedClientId]);

  const permissionMap = useMemo(() => {
    const map = new Map<string, RolePermission>();
    filteredPermissions.forEach((perm) => {
      map.set(perm.permission, perm);
    });
    return map;
  }, [filteredPermissions]);

  const permissionKeys = useMemo(() => {
    const keys = new Set<string>();
    const source = catalogPermissions.length > 0 ? catalogPermissions : permissions;
    source.forEach((perm) => keys.add(perm.permission));
    return Array.from(keys).sort();
  }, [permissions, catalogPermissions]);

  const userOverrideMap = useMemo(() => {
    const map = new Map<string, UserPermission>();
    userOverrides.forEach((override) => {
      map.set(override.permission, override);
    });
    return map;
  }, [userOverrides]);

  const groupedPermissions = useMemo(() => {
    const groups = new Map<string, string[]>();
    permissionKeys.forEach((permission) => {
      const group = getPermissionGroup(permission);
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group)?.push(permission);
    });

    const orderedGroups = permissionGroupOrder.filter((group) => groups.has(group));
    const remainingGroups = Array.from(groups.keys())
      .filter((group) => !permissionGroupOrder.includes(group))
      .sort();

    return [...orderedGroups, ...remainingGroups].map((group) => ({
      name: group,
      permissions: (groups.get(group) ?? []).sort(),
    }));
  }, [permissionKeys]);

  const filteredGroupedPermissions = useMemo(() => {
    const term = search.trim().toLowerCase();
    return groupedPermissions
      .map((group) => {
        const permissions = group.permissions.filter((permission) => {
          if (term && !permission.toLowerCase().includes(term)) return false;
          const granted = permissionMap.get(permission)?.granted === true;
          if (filterMode === 'granted') return granted;
          if (filterMode === 'missing') return !granted;
          return true;
        });
        return permissions.length > 0 ? { name: group.name, permissions } : null;
      })
      .filter(Boolean) as { name: string; permissions: string[] }[];
  }, [groupedPermissions, permissionMap, search, filterMode]);

  const permissionStats = useMemo(() => {
    const total = permissionKeys.length;
    let grantedCount = 0;
    permissionKeys.forEach((permission) => {
      if (permissionMap.get(permission)?.granted === true) grantedCount += 1;
    });
    return {
      total,
      granted: grantedCount,
      missing: Math.max(total - grantedCount, 0),
    };
  }, [permissionKeys, permissionMap]);

  const handleToggle = async (permission: string, nextValue: boolean) => {
    if (requiresClient && !selectedClientId) {
      toast.error('Select a client for this role');
      return;
    }

    // Special handling for exams.create: also grant/revoke exams.update and exams.publish
    const permissionsToToggle = [permission];
    if (permission === 'exams.create') {
      permissionsToToggle.push('exams.update', 'exams.publish');
    }

    try {
      setSaving(permission);

      if (nextValue) {
        // Grant all related permissions
        const payload: Record<string, unknown> = {
          role: selectedRole,
          granted: true,
        };
        if (selectedClientId) {
          payload.client_id = Number(selectedClientId);
        }

        for (const perm of permissionsToToggle) {
          const existingPerm = permissionMap.get(perm);
          if (existingPerm?.granted) {
            continue; // Already granted
          }
          if (existingPerm && !existingPerm.granted && existingPerm.id) {
            await api.delete(`/org/role-permissions/${existingPerm.id}`);
          }
          await api.post('/org/role-permissions', { ...payload, permission: perm });
        }
        toast.success('Permission granted');
      } else {
        // Revoke all related permissions
        for (const perm of permissionsToToggle) {
          const existingPerm = permissionMap.get(perm);
          if (!existingPerm || !existingPerm.id) {
            continue; // Not granted
          }
          await api.delete(`/org/role-permissions/${existingPerm.id}`);
        }
        toast.success('Permission removed');
      }

      await loadPermissions(selectedClientId || undefined);
    } catch (error) {
      console.error(error);
      toast.error('Failed to update permission');
    } finally {
      setSaving(null);
    }
  };

  const handleGroupToggle = async (groupName: string, groupPermissions: string[], nextValue: boolean) => {
    if (requiresClient && !selectedClientId) {
      toast.error('Select a client for this role');
      return;
    }

    // Special handling for Exams group: ensure exams.create, update, and publish are toggled together
    let permissionsToToggle = groupPermissions;
    if (groupName === 'Exams') {
      const examPerms = ['exams.create', 'exams.update', 'exams.publish'];
      if (nextValue) {
        // When enabling, enable all exam permissions
        permissionsToToggle = examPerms;
      } else {
        // When disabling, disable all exam permissions
        permissionsToToggle = examPerms;
      }
    }

    const pending = permissionsToToggle.filter((permission) => {
      const existing = permissionMap.get(permission);
      const enabled = Boolean(existing?.granted);
      return nextValue ? !enabled : Boolean(existing?.id);
    });

    if (pending.length === 0) return;

    try {
      setSaving(`group:${groupName}`);

      for (const permission of pending) {
        const existing = permissionMap.get(permission);
        if (nextValue) {
          if (existing?.granted) {
            continue;
          }
          if (existing && !existing.granted && existing.id) {
            await api.delete(`/org/role-permissions/${existing.id}`);
          }
          const payload: Record<string, unknown> = {
            role: selectedRole,
            permission,
            granted: true,
          };
          if (selectedClientId) {
            payload.client_id = Number(selectedClientId);
          }
          await api.post('/org/role-permissions', payload);
        } else if (existing?.id) {
          await api.delete(`/org/role-permissions/${existing.id}`);
        }
      }

      await loadPermissions(selectedClientId || undefined);
    } catch (error) {
      console.error(error);
      toast.error('Failed to update permissions');
    } finally {
      setSaving(null);
    }
  };

  const toggleDisabled = requiresClient && !selectedClientId;

  const handleUserOverride = async (permission: string, granted: boolean) => {
    if (!selectedUserId) {
      toast.error('Select a user');
      return;
    }

    try {
      setOverrideSaving(permission);
      await api.post('/org/user-permissions', {
        user_id: Number(selectedUserId),
        permission,
        granted,
      });
      await loadUserOverrides(selectedUserId);
      toast.success(`Permission ${granted ? 'granted' : 'denied'}`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to update user permission');
    } finally {
      setOverrideSaving(null);
    }
  };

  const handleUserOverrideClear = async (permission: string) => {
    const existing = userOverrideMap.get(permission);
    if (!existing?.id) return;

    try {
      setOverrideSaving(`clear:${permission}`);
      await api.delete(`/org/user-permissions/${existing.id}`);
      await loadUserOverrides(selectedUserId);
      toast.success('Override cleared');
    } catch (error) {
      console.error(error);
      toast.error('Failed to clear override');
    } finally {
      setOverrideSaving(null);
    }
  };

  return (
    <SuperAdminShell
      title="Permissions"
      subtitle="Toggle permissions by role and client scope."
      actions={
        <div className="flex items-center gap-2">
          <GhostButton onClick={() => loadPermissions(selectedClientId || undefined)}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </GhostButton>
        </div>
      }
    >
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <FieldLabel>Select Role</FieldLabel>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="client_admin">Client Admin</option>
              <option value="school_owner">School Owner</option>
              <option value="teacher">Teacher</option>
              <option value="student">Student</option>
              <option value="content_authorizer">Content Authorizer</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>
          <div className="space-y-2">
            <FieldLabel>Select Client</FieldLabel>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">Platform (no client)</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name} ({client.id})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Total</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">{permissionStats.total}</div>
            <div className="text-xs text-slate-500">Catalog permissions</div>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Granted</div>
            <div className="mt-2 text-2xl font-semibold text-emerald-700">{permissionStats.granted}</div>
            <div className="text-xs text-emerald-700/70">Enabled for this role</div>
          </div>
          <div className="rounded-2xl border border-rose-100 bg-rose-50/70 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-700">Missing</div>
            <div className="mt-2 text-2xl font-semibold text-rose-700">{permissionStats.missing}</div>
            <div className="text-xs text-rose-700/70">Not granted</div>
          </div>
        </div>

        {toggleDisabled && (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
            This role requires a client scope. Select a client to toggle permissions.
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                filterMode === 'all'
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('granted')}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                filterMode === 'granted'
                  ? 'border-emerald-600 bg-emerald-600 text-white'
                  : 'border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              Granted
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('missing')}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                filterMode === 'missing'
                  ? 'border-rose-600 bg-rose-600 text-white'
                  : 'border-rose-200 bg-white text-rose-700 hover:bg-rose-50'
              }`}
            >
              Not granted
            </button>
          </div>
          <div className="w-full md:w-64">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search permissions..."
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="mt-6 space-y-6">
          {filteredGroupedPermissions.length === 0 && (
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-6 text-sm text-slate-600">
              No permissions match your filters.
            </div>
          )}
          {filteredGroupedPermissions.map((group) => {
            const isGroupSaving = saving === `group:${group.name}`;
            return (
              <div key={group.name} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{group.name}</div>
                    <div className="text-xs text-slate-500">
                      {group.permissions.length} permission{group.permissions.length === 1 ? '' : 's'}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleGroupToggle(group.name, group.permissions, true)}
                      disabled={toggleDisabled || Boolean(saving)}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGroupToggle(group.name, group.permissions, false)}
                      disabled={toggleDisabled || Boolean(saving)}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Clear all
                    </button>
                    {isGroupSaving && (
                      <span className="text-xs text-slate-400">Saving...</span>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {group.permissions
                    .filter((permission) => {
                      // Skip exams.update and exams.publish - they're toggled with exams.create
                      if (['exams.update', 'exams.publish'].includes(permission)) {
                        return false;
                      }
                      return true;
                    })
                    .map((permission) => {
                    const existing = permissionMap.get(permission);
                    const enabled = Boolean(existing?.granted);
                    const isSaving = saving === permission || Boolean(saving?.startsWith('group:'));

                    return (
                      <div
                        key={permission}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3"
                      >
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{permission}</div>
                          <div className="text-xs text-slate-500">
                            {enabled ? 'Granted' : 'Not granted'}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggle(permission, !enabled)}
                          disabled={toggleDisabled || isSaving}
                          aria-pressed={enabled}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                            enabled ? 'bg-emerald-500' : 'bg-slate-200'
                          } ${toggleDisabled || isSaving ? 'cursor-not-allowed opacity-60' : ''}`}
                        >
                          <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                              enabled ? 'translate-x-5' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-slate-900">User Overrides</div>
            <div className="text-sm text-slate-500">Grant or deny permissions for a specific user.</div>
          </div>
          <div className="min-w-60">
            <FieldLabel>Select User</FieldLabel>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">Choose user</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name} ({user.email})
                </option>
              ))}
            </select>
          </div>
        </div>

        {!selectedUserId && (
          <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">
            Select a user to manage overrides.
          </div>
        )}

        {selectedUserId && (
          <div className="mt-6 space-y-6">
            {groupedPermissions.map((group) => (
              <div key={`user-${group.name}`} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                <div className="text-sm font-semibold text-slate-900">{group.name}</div>
                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {group.permissions
                    .filter((permission) => {
                      // Skip exams.update and exams.publish - they're toggled with exams.create
                      if (['exams.update', 'exams.publish'].includes(permission)) {
                        return false;
                      }
                      return true;
                    })
                    .map((permission) => {
                    const override = userOverrideMap.get(permission);
                    const state = override
                      ? override.granted
                        ? 'Granted'
                        : 'Denied'
                      : 'Inherited';
                    const isSaving =
                      overrideSaving === permission || overrideSaving === `clear:${permission}`;

                    return (
                      <div
                        key={`user-${permission}`}
                        className="rounded-2xl border border-slate-100 bg-white p-4"
                      >
                        <div className="text-sm font-semibold text-slate-900">{permission}</div>
                        <div className="text-xs text-slate-500">{state}</div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleUserOverride(permission, true)}
                            disabled={isSaving}
                            className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Grant
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUserOverride(permission, false)}
                            disabled={isSaving}
                            className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Deny
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUserOverrideClear(permission)}
                            disabled={isSaving || !override}
                            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </SuperAdminShell>
  );
}
