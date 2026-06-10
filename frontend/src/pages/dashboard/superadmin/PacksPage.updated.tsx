import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import SuperAdminShell from './components/SuperAdminShell';
import { Badge, FieldLabel, GhostButton, PrimaryButton } from './components/ui';
import type { ContentPack } from './types';

interface Course {
  id: number;
  title: string;
  description: string | null;
  published: boolean | null;
}

interface ContentLibraryItem {
  id: number;
  course_id: number;
  parent_id: number | null;
  item_type: string;
  title: string;
  content_url?: string | null;
}

const itemTypeTone: Record<string, string> = {
  video: 'border-blue-200 bg-blue-50 text-blue-700',
  pdf: 'border-rose-200 bg-rose-50 text-rose-700',
  scorm: 'border-violet-200 bg-violet-50 text-violet-700',
  audio: 'border-amber-200 bg-amber-50 text-amber-700',
  html: 'border-cyan-200 bg-cyan-50 text-cyan-700',
  text: 'border-slate-200 bg-slate-100 text-slate-700',
  link: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  exam: 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700',
};

export default function PacksPage() {
  const [packs, setPacks] = useState<ContentPack[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseItems, setCourseItems] = useState<ContentLibraryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [contentLoading, setContentLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [packSearch, setPackSearch] = useState('');
  const [courseSearch, setCourseSearch] = useState('');
  const [contentSearch, setContentSearch] = useState('');
  const [selectedPackId, setSelectedPackId] = useState<number | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [selectedContentIds, setSelectedContentIds] = useState<number[]>([]);
  const [packForm, setPackForm] = useState({ name: '', description: '' });

  const filteredPacks = useMemo(() => {
    const term = packSearch.trim().toLowerCase();
    if (!term) return packs;
    return packs.filter((pack) =>
      [pack.name, pack.description || ''].some((value) => value.toLowerCase().includes(term)),
    );
  }, [packs, packSearch]);

  const selectedPack = useMemo(
    () => packs.find((pack) => pack.id === selectedPackId) || null,
    [packs, selectedPackId],
  );

  const filteredCourses = useMemo(() => {
    const term = courseSearch.trim().toLowerCase();
    if (!term) return courses;
    return courses.filter((course) =>
      [course.title, course.description || ''].some((value) => value.toLowerCase().includes(term)),
    );
  }, [courses, courseSearch]);

  const selectableItems = useMemo(
    () => courseItems.filter((item) => item.item_type !== 'folder'),
    [courseItems],
  );

  const filteredItems = useMemo(() => {
    const term = contentSearch.trim().toLowerCase();
    if (!term) return selectableItems;
    return selectableItems.filter((item) =>
      [item.title, item.item_type].some((value) => value.toLowerCase().includes(term)),
    );
  }, [contentSearch, selectableItems]);

  const selectedVisibleCount = useMemo(
    () => filteredItems.filter((item) => selectedContentIds.includes(item.id)).length,
    [filteredItems, selectedContentIds],
  );

  const loadPacks = async () => {
    try {
      setLoading(true);
      const res = await api.get('/platform/content-packs');
      const nextPacks = Array.isArray(res.data) ? res.data : [];
      setPacks(nextPacks);
      setSelectedPackId((current) => {
        if (current && nextPacks.some((pack: ContentPack) => pack.id === current)) return current;
        return nextPacks.find((pack: ContentPack) => pack.is_active)?.id || nextPacks[0]?.id || null;
      });
    } catch (error) {
      console.error(error);
      toast.error('Failed to load content packs');
    } finally {
      setLoading(false);
    }
  };

  const loadCourses = async () => {
    try {
      setCoursesLoading(true);
      const res = await api.get('/course/courses');
      const nextCourses = Array.isArray(res.data) ? res.data : [];
      setCourses(nextCourses);
      setSelectedCourseId((current) => {
        if (current && nextCourses.some((course: Course) => course.id === current)) return current;
        return nextCourses[0]?.id || null;
      });
    } catch (error) {
      console.error(error);
      toast.error('Failed to load courses for pack assignment');
    } finally {
      setCoursesLoading(false);
    }
  };

  const loadCourseItems = async (courseId: number) => {
    try {
      setContentLoading(true);
      const res = await api.get(`/admin/courses/${courseId}/content`);
      const nextItems = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.items)
          ? res.data.items
          : [];
      setCourseItems(nextItems);
      setSelectedContentIds([]);
    } catch (error) {
      console.error(error);
      setCourseItems([]);
      toast.error('Failed to load course content');
    } finally {
      setContentLoading(false);
    }
  };

  useEffect(() => {
    void Promise.all([loadPacks(), loadCourses()]);
  }, []);

  useEffect(() => {
    if (!selectedCourseId) {
      setCourseItems([]);
      setSelectedContentIds([]);
      return;
    }
    void loadCourseItems(selectedCourseId);
  }, [selectedCourseId]);

  const createPack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!packForm.name.trim()) return;
    try {
      const res = await api.post('/platform/content-packs', packForm);
      const nextPackId = Number(res.data?.id);
      setPackForm({ name: '', description: '' });
      await loadPacks();
      if (Number.isInteger(nextPackId) && nextPackId > 0) {
        setSelectedPackId(nextPackId);
      }
      toast.success('Content pack created');
    } catch (error) {
      console.error(error);
      toast.error('Failed to create content pack');
    }
  };

  const deactivatePack = async (id: number) => {
    try {
      await api.delete(`/platform/content-packs/${id}`);
      await loadPacks();
      toast.success('Content pack updated');
    } catch (error) {
      console.error(error);
      toast.error('Failed to update content pack');
    }
  };

  const toggleContentSelection = (contentId: number) => {
    setSelectedContentIds((current) =>
      current.includes(contentId) ? current.filter((id) => id !== contentId) : [...current, contentId],
    );
  };

  const toggleSelectVisible = () => {
    const visibleIds = filteredItems.map((item) => item.id);
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedContentIds.includes(id));

    setSelectedContentIds((current) => {
      if (allVisibleSelected) {
        return current.filter((id) => !visibleIds.includes(id));
      }

      return [...new Set([...current, ...visibleIds])];
    });
  };

  const assignSelectedItems = async () => {
    if (!selectedPackId || selectedContentIds.length === 0) return;

    try {
      setAssigning(true);
      await api.post(`/platform/content-packs/${selectedPackId}/items`, {
        content_ids: selectedContentIds,
      });
      toast.success('Content added to pack');
      setSelectedContentIds([]);
    } catch (error) {
      console.error(error);
      toast.error('Failed to add content to pack');
    } finally {
      setAssigning(false);
    }
  };

  return (
    <SuperAdminShell
      title="Content Packs"
      subtitle="Curate bundles of learning content available to tenants."
    >
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Content Packs</h2>
                <p className="text-sm text-slate-500">Create a pack, then choose which content items belong to it.</p>
              </div>
              <input
                value={packSearch}
                onChange={(e) => setPackSearch(e.target.value)}
                placeholder="Search packs"
                className="w-44 rounded-full border border-slate-200 px-3 py-2 text-xs"
              />
            </div>
            <div className="mt-5 space-y-3">
              {loading && (
                <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                  Loading content packs...
                </div>
              )}
              {!loading &&
                filteredPacks.map((pack) => {
                  const isSelected = pack.id === selectedPackId;

                  return (
                    <div
                      key={pack.id}
                      className={`rounded-2xl border p-4 transition ${
                        isSelected
                          ? 'border-blue-200 bg-blue-50/60'
                          : 'border-slate-100 bg-slate-50/60'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="font-semibold text-slate-900">{pack.name}</div>
                          <div className="text-xs text-slate-500">{pack.description || 'No description added'}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            tone={
                              pack.is_active
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                : 'border-slate-200 bg-slate-100 text-slate-500'
                            }
                          >
                            {pack.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          <GhostButton onClick={() => setSelectedPackId(pack.id)}>
                            {isSelected ? 'Selected' : 'Manage Content'}
                          </GhostButton>
                          <GhostButton onClick={() => deactivatePack(pack.id)} disabled={!pack.is_active}>
                            Deactivate
                          </GhostButton>
                        </div>
                      </div>
                    </div>
                  );
                })}
              {!loading && filteredPacks.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                  No content packs found.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Compose Pack</div>
                <h3 className="mt-2 text-lg font-semibold">Add Actual Content Items</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Pick a pack, browse a course, then select the content items to attach.
                </p>
              </div>
              {selectedPack && (
                <Badge tone="border-blue-200 bg-blue-50 text-blue-700">{selectedPack.name}</Badge>
              )}
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
              <div className="space-y-4">
                <div className="space-y-2">
                  <FieldLabel>Selected Pack</FieldLabel>
                  <select
                    value={selectedPackId ?? ''}
                    onChange={(e) => setSelectedPackId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="">Select pack</option>
                    {packs.map((pack) => (
                      <option key={pack.id} value={pack.id}>
                        {pack.name} {pack.is_active ? '' : '(Inactive)'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <FieldLabel>Course Library</FieldLabel>
                  <input
                    value={courseSearch}
                    onChange={(e) => setCourseSearch(e.target.value)}
                    placeholder="Search courses"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>

                <div className="max-h-80 space-y-2 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50/50 p-3">
                  {coursesLoading && <div className="text-sm text-slate-500">Loading courses...</div>}
                  {!coursesLoading &&
                    filteredCourses.map((course) => (
                      <button
                        key={course.id}
                        type="button"
                        onClick={() => setSelectedCourseId(course.id)}
                        className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
                          selectedCourseId === course.id
                            ? 'border-blue-200 bg-blue-50'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="text-sm font-semibold text-slate-900">{course.title}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {course.description || 'No description provided'}
                        </div>
                        <div className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          {course.published ? 'Published' : 'Draft'}
                        </div>
                      </button>
                    ))}
                  {!coursesLoading && filteredCourses.length === 0 && (
                    <div className="text-sm text-slate-500">No courses matched your search.</div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <FieldLabel>Course Content</FieldLabel>
                    <p className="mt-1 text-sm text-slate-500">
                      Only actual content items are listed here. Folder rows are skipped.
                    </p>
                  </div>
                  <input
                    value={contentSearch}
                    onChange={(e) => setContentSearch(e.target.value)}
                    placeholder="Search content"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm sm:w-52"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3">
                  <div className="text-sm text-slate-600">
                    {selectedContentIds.length} selected
                    {filteredItems.length > 0 ? ` • ${selectedVisibleCount} in current view` : ''}
                  </div>
                  <GhostButton onClick={toggleSelectVisible} disabled={filteredItems.length === 0}>
                    {selectedVisibleCount === filteredItems.length && filteredItems.length > 0
                      ? 'Clear Visible'
                      : 'Select Visible'}
                  </GhostButton>
                </div>

                <div className="max-h-[28rem] space-y-3 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50/50 p-3">
                  {contentLoading && <div className="text-sm text-slate-500">Loading course content...</div>}
                  {!contentLoading && !selectedCourseId && (
                    <div className="text-sm text-slate-500">Choose a course to browse its content items.</div>
                  )}
                  {!contentLoading && selectedCourseId && filteredItems.length === 0 && (
                    <div className="text-sm text-slate-500">No selectable content items found for this course.</div>
                  )}
                  {!contentLoading &&
                    filteredItems.map((item) => {
                      const checked = selectedContentIds.includes(item.id);

                      return (
                        <label
                          key={item.id}
                          className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 transition ${
                            checked ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleContentSelection(item.id)}
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-[#073b8a] focus:ring-[#073b8a]"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="text-sm font-semibold text-slate-900">{item.title}</div>
                              <Badge tone={itemTypeTone[item.item_type] || 'border-slate-200 bg-slate-100 text-slate-700'}>
                                {item.item_type}
                              </Badge>
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              Content ID: {item.id} • Course ID: {item.course_id}
                            </div>
                            {item.content_url && (
                              <div className="mt-1 truncate text-xs text-slate-400">{item.content_url}</div>
                            )}
                          </div>
                        </label>
                      );
                    })}
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                  New assignments are sent to the existing pack API. The current backend does not yet return pack item
                  listings, so this screen focuses on adding content into packs.
                </div>

                <PrimaryButton
                  onClick={assignSelectedItems}
                  disabled={!selectedPackId || selectedContentIds.length === 0 || assigning}
                >
                  {assigning ? 'Adding Content...' : 'Add Selected Content To Pack'}
                </PrimaryButton>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={createPack} className="h-fit rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Create Pack</div>
          <h3 className="mt-2 text-lg font-semibold">New Content Pack</h3>
          <div className="mt-5 space-y-4">
            <div className="space-y-2">
              <FieldLabel>Pack Name</FieldLabel>
              <input
                value={packForm.name}
                onChange={(e) => setPackForm({ ...packForm, name: e.target.value })}
                placeholder="Higher Secondary STEM"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                required
              />
            </div>
            <div className="space-y-2">
              <FieldLabel>Description</FieldLabel>
              <textarea
                value={packForm.description}
                onChange={(e) => setPackForm({ ...packForm, description: e.target.value })}
                placeholder="Add a short description of the pack."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                rows={4}
              />
            </div>
            <PrimaryButton type="submit" disabled={!packForm.name.trim()}>
              Create Pack
            </PrimaryButton>
          </div>
        </form>
      </div>
    </SuperAdminShell>
  );
}
