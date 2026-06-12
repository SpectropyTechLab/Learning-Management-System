import { useEffect, useRef, useState, type SetStateAction } from "react";
import api from "@/lib/api";
import { GrChapterAdd } from "react-icons/gr";
import { PiUsersBold } from "react-icons/pi";
import type { DashboardTheme } from "@/components/layout/dashboardTheme";
import spectropyLogo from "/logo.png";
import { getCoursePermissions, type CoursePermissions } from "@/features/courses/utils/coursePermissions";

const PLATFORM_OWNER_CLIENT_ID = 17;

type Course = {
  id: number;
  title: string;
  original_title?: string;
  description: string | null;
  client_id?: number | null;
  published?: boolean;
  created_at?: string;
  updated_at?: string | null;
  enrolled_learners?: number;
  assigned_school_count?: number;
  assigned_school_names?: string[];
  is_created_by_me?: boolean;
  is_assigned_to_my_school?: boolean;
  is_pack_derived?: boolean;
  course_access_type?: "platform_assigned" | "pack_derived" | "client_owned";
  can_edit_course?: boolean;
  can_rename_assigned_course?: boolean;
  can_publish_course?: boolean;
  can_delete_course?: boolean;
  can_manage_content?: boolean;
  can_enroll?: boolean;
};

type CourseManagerMode = "admin" | "student" | "custom";

interface AdminCourseManagerProps {
  mode?: CourseManagerMode;
  role?: string | null;
  permissionKeys?: string[] | null;
  permissions?: Partial<CoursePermissions>;
  theme: DashboardTheme;
  brandLogo?: string;
  brandName?: string;
  courseBannerClass?: string;
  listTitle?: string;
  emptyMessage?: string;
  courses?: Course[];
  loading?: boolean;
  apiPrefix?: string;
  onManageContent?: (courseId: number) => void;
  onEnroll?: (courseId: number) => void;
  onViewCourse?: (courseId: number) => void;
}

export default function AdminCourseManager({
  mode = "admin",
  role,
  permissionKeys,
  permissions,
  theme,
  brandLogo,
  brandName = "Spectropy",
  courseBannerClass = "bg-blue-50",
  listTitle = "All Courses",
  emptyMessage = "No courses found.",
  courses: courseOverrides,
  loading: loadingOverride,
  apiPrefix = "/admin",
  onManageContent,
  onEnroll,
  onViewCourse,
}: AdminCourseManagerProps) {
  const mergedPermissions: CoursePermissions = {
    ...getCoursePermissions({ role, permissions: permissionKeys }),
    ...permissions,
  };

  const [courses, setCourses] = useState<Course[]>([]);
  const [fetching, setFetching] = useState(mode !== "custom");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [published, setPublished] = useState(false);
  const [loading, setLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [courseToPublish, setCourseToPublish] = useState<number | null>(null);

  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const filterRef = useRef<HTMLDivElement | null>(null);

  const [editingCourseId, setEditingCourseId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPublished, setEditPublished] = useState(false);
  const [renamingCourseId, setRenamingCourseId] = useState<number | null>(null);
  const [renameTitle, setRenameTitle] = useState("");
  const normalizedApiPrefix = apiPrefix.startsWith("/") ? apiPrefix : `/${apiPrefix}`;

  const displayCourses = mode === "custom" ? courseOverrides ?? [] : courses;
  const isLoading = mode === "custom" ? Boolean(loadingOverride) : fetching;
  const hasPublishState = displayCourses.some(
    (course) => typeof course.published === "boolean"
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowFilters(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (mode === "custom") return;
    if (mode === "student") {
      fetchStudentCourses();
      return;
    }
    fetchAdminCourses();
  }, [mode, normalizedApiPrefix]);

  const resolveCourseCapability = (
    course: Course,
    courseValue: boolean | undefined,
    fallback: boolean
  ) => (typeof courseValue === "boolean" ? courseValue : fallback);

  const canEditCourse = (course: Course) =>
    resolveCourseCapability(course, course.can_edit_course, mergedPermissions.canEdit);

  const canRenameAssignedCourse = (course: Course) =>
    Boolean(course.can_rename_assigned_course);

  const canPublishCourse = (course: Course) =>
    resolveCourseCapability(course, course.can_publish_course, mergedPermissions.canPublish);

  const canDeleteCourse = (course: Course) =>
    resolveCourseCapability(course, course.can_delete_course, mergedPermissions.canDelete);

  const canManageCourseContent = (course: Course) =>
    resolveCourseCapability(course, course.can_manage_content, mergedPermissions.canManageContent);

  const canEnrollInCourse = (course: Course) =>
    resolveCourseCapability(course, course.can_enroll, mergedPermissions.canEnroll);

  const getCourseScopeLabel = (course: Course) => {
    if (course.course_access_type === "pack_derived" || course.is_pack_derived) {
      return "Assigned course";
    }
    if (course.course_access_type === "platform_assigned" || course.client_id == null || Number(course.client_id) === PLATFORM_OWNER_CLIENT_ID) {
      return "Platform course";
    }
    if (course.is_assigned_to_my_school && !course.is_created_by_me) {
      return "Assigned";
    }
    if (course.is_created_by_me) {
      return "Created by you";
    }
    if ((course.assigned_school_count ?? 0) > 0) {
      const count = course.assigned_school_count ?? 0;
      return `${count} school${count === 1 ? "" : "s"}`;
    }
    return "Client course";
  };

  const fetchAdminCourses = async () => {
    setFetching(true);
    try {
      const res = await api.get(`${normalizedApiPrefix}/courses`);
      setCourses(res.data);
    } catch (err) {
      console.error("Failed to load courses");
    } finally {
      setFetching(false);
    }
  };

  const fetchStudentCourses = async () => {
    setFetching(true);
    try {
      const res = await api.get("/student/enrolled-courses");
      const mapped: Course[] = res.data.map((course: any) => ({
        id: course.id,
        title: course.title,
        description: course.description ?? null,
        created_at: course.enrolled_at ?? "",
        published: true,
      }));
      setCourses(mapped);
    } catch (err) {
      console.error("Failed to load courses");
    } finally {
      setFetching(false);
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    try {
      await api.post(`${normalizedApiPrefix}/courses`, {
        title,
        description: description.trim() || null,
        published,
      });
      alert("Course created successfully!");
      setTitle("");
      setDescription("");
      setPublished(false);
      fetchAdminCourses();
      setShowCreateForm(false);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || "Failed to create course";
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const openPublishModal = (courseId: SetStateAction<number | null>) => {
    setCourseToPublish(courseId);
    setPublishModalOpen(true);
  };

  const closePublishModal = () => {
    setPublishModalOpen(false);
    setCourseToPublish(null);
  };

  const handlePublish = async () => {
    if (courseToPublish === null) return;
    try {
      await api.patch(`${normalizedApiPrefix}/courses/${courseToPublish}/publish`);
      await fetchAdminCourses();
      closePublishModal();
    } catch (err) {
      console.error("Failed to publish course:", err);
      alert("Failed to publish course. Please try again.");
    }
  };

  const handleDeleteCourse = async (id: number) => {
    if (!confirm("Are you sure you want to delete this course? This action cannot be undone.")) {
      return;
    }
    try {
      await api.delete(`${normalizedApiPrefix}/courses/${id}`);
      setCourses((prev) => prev.filter((course) => course.id !== id));
      alert("Course deleted successfully!");
    } catch (err: any) {
      console.error("Failed to delete course:", err);
      const errorMsg = err.response?.data?.error || "Failed to delete course. Please try again.";
      alert(errorMsg);
    }
  };

  const handleEditCourse = (course: Course) => {
    setEditingCourseId(course.id);
    setEditTitle(course.title);
    setEditDescription(course.description || "");
    setEditPublished(Boolean(course.published));
  };

  const handleSaveEdit = async (id: number) => {
    if (!editTitle.trim()) {
      alert("Title is required");
      return;
    }

    try {
      await api.patch(`${normalizedApiPrefix}/courses/${id}`, {
        title: editTitle.trim(),
        description: editDescription.trim() || null,
        published: editPublished,
      });

      setCourses((prev) =>
        prev.map((course) =>
          course.id === id
            ? {
              ...course,
              title: editTitle.trim(),
              description: editDescription.trim() || null,
              published: editPublished,
            }
            : course
        )
      );

      setEditingCourseId(null);
      alert("Course updated successfully!");
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || "Failed to update course";
      alert(errorMsg);
    }
  };

  const handleCancelEdit = () => {
    setEditingCourseId(null);
  };

  const handleOpenRename = (course: Course) => {
    setRenamingCourseId(course.id);
    setRenameTitle(course.title);
  };

  const handleCloseRename = () => {
    setRenamingCourseId(null);
    setRenameTitle("");
  };

  const handleSaveRename = async () => {
    if (renamingCourseId === null) return;
    if (!renameTitle.trim()) {
      alert("Title is required");
      return;
    }

    try {
      await api.patch(`${normalizedApiPrefix}/courses/${renamingCourseId}`, {
        title: renameTitle.trim(),
      });

      setCourses((prev) =>
        prev.map((course) =>
          course.id === renamingCourseId
            ? {
                ...course,
                title: renameTitle.trim(),
              }
            : course
        )
      );

      handleCloseRename();
      alert("Course name updated successfully!");
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || "Failed to rename course";
      alert(errorMsg);
    }
  };

  const filteredCourses = displayCourses.filter((course) => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      !hasPublishState || statusFilter === "all"
        ? true
        : statusFilter === "published"
          ? course.published === true
          : course.published === false;

    return matchesSearch && matchesStatus;
  });

  const canShowCreate = mergedPermissions.canCreate && mode === "admin";
  const canShowPublishToggle = mergedPermissions.canPublish && mode === "admin";

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search by Course Title"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full p-3 pl-10 border rounded-lg focus:outline-none focus:ring-2 border-gray-300 focus:ring-blue-900 focus:border-transparent"
          />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-gray-400 absolute left-3 top-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          {hasPublishState && (
            <div ref={filterRef} className="relative">
              <button
                onClick={() => setShowFilters((prev) => !prev)}
                className={`inline-flex items-center px-4 py-2 border rounded-lg text-sm bg-white ${theme.secondaryBorderClass} hover:bg-gray-50`}
              >
                Filters
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-4 w-4 ml-1 transition-transform ${showFilters ? "rotate-180" : ""
                    }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {showFilters && (
                <div
                  className="absolute right-0 mt-2 w-56 bg-white border shadow-lg rounded-lg p-3 z-50 border-gray-200"
                >
                  <label
                    className="text-xs font-semibold text-gray-600"
                  >
                    Published Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      const val = e.target.value as "all" | "published" | "draft";
                      setStatusFilter(val);
                      setShowFilters(false);
                    }}
                    className="w-full p-2 mt-1 border rounded text-sm border-gray-300"
                  >
                    <option value="all">All Courses</option>
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => setViewMode("grid")}
            className={`p-2 border rounded-lg ${viewMode === "grid"
              ? "bg-blue-900 text-white border-blue-900"
              : "border-gray-300 hover:bg-gray-50"
              }`}
            title="Grid view"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h6v6H4zM14 6h6v6h-6zM4 16h6v6H4zM14 16h6v6h-6z" />
            </svg>
          </button>

          <button
            onClick={() => setViewMode("list")}
            className={`p-2 border rounded-lg ${viewMode === "list"
              ? "bg-blue-900 text-white border-blue-900"
              : "border-gray-300 hover:bg-gray-50"
              }`}
            title="List view"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {canShowCreate && (
            <button
              onClick={() => setShowCreateForm(true)}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${theme.primaryButtonClass}`}
            >
              Create Course
            </button>
          )}
        </div>
      </div>

      {showCreateForm && canShowCreate && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
          <div
            className="bg-white rounded-lg shadow-lg w-full max-w-md mx-auto p-6"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Create New Course</h2>
              <button
                onClick={() => setShowCreateForm(false)}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Close form"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateCourse} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 border-gray-300 focus:ring-blue-900 focus:border-transparent"
                  placeholder="Enter course title"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 border-gray-300 focus:ring-blue-900 focus:border-transparent"
                  placeholder="Optional course description"
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center">
                  <span className="text-sm font-medium mr-3 text-gray-700">
                    Publish Course
                  </span>
                  <button
                    type="button"
                    onClick={() => setPublished(!published)}
                    disabled={!canShowPublishToggle}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${published ? "bg-green-500" : "bg-gray-300"
                      } ${canShowPublishToggle ? "" : "opacity-50 cursor-not-allowed"}`}
                    aria-label="Toggle publish"
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${published ? "translate-x-6" : "translate-x-1"
                        }`}
                    />
                  </button>
                  <span className="ml-2 text-sm text-gray-600">
                    {published ? "Published" : "Draft"}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded disabled:opacity-50 font-medium bg-blue-900 text-white hover:bg-blue-700"
                >
                  {loading ? "Creating..." : "Create Course"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <div>
        <h2 className="text-lg font-semibold mb-4">
          {listTitle} ({filteredCourses.length})
        </h2>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-900" />
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            {emptyMessage} {searchQuery && "Try a different search term or clear filters."}
          </div>
        ) : (
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                : "flex flex-col gap-4"
            }
          >
            {filteredCourses.map((course) => {
              const showStatus = typeof course.published === "boolean";
              const createdLabel = course.created_at
                ? `Created: ${new Date(course.created_at).toLocaleDateString()}`
                : null;
              const courseCanEdit = canEditCourse(course);
              const courseCanRename = canRenameAssignedCourse(course);
              const courseCanDelete = canDeleteCourse(course);
              const courseCanPublish = canPublishCourse(course);
              const courseCanManageContent = canManageCourseContent(course);
              const courseCanEnroll = canEnrollInCourse(course);
              const showCourseMenu = courseCanEdit || courseCanRename || courseCanDelete;
              const showViewAction = !courseCanManageContent && Boolean(onViewCourse);
              const scopeLabel = getCourseScopeLabel(course);
              const assignedSchoolsLabel = Array.isArray(course.assigned_school_names) && course.assigned_school_names.length > 0
                ? course.assigned_school_names.join(", ")
                : null;

              return (
                <div
                  key={course.id}
                  className={`bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow ${viewMode === "list"
                    ? "p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4"
                    : "flex flex-col justify-end"
                    }`}
                >
                  {viewMode === "list" ? (
                    <>
                      <div className="flex-1 min-w-0">
                        {editingCourseId === course.id && courseCanEdit ? (
                          <div className="space-y-2">
                            <input
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              className="w-full p-1 text-sm border border-gray-300 rounded"
                              placeholder="Course title"
                              autoFocus
                            />
                            <textarea
                              value={editDescription}
                              onChange={(e) => setEditDescription(e.target.value)}
                              className="w-full p-1 text-xs border border-gray-300 rounded"
                              placeholder="Description"
                              rows={2}
                            />
                            {courseCanPublish && showStatus && (
                              <div className="flex items-center gap-2">
                                <span className="text-[10px]">Published:</span>
                                <button
                                  type="button"
                                  onClick={() => setEditPublished(!editPublished)}
                                  className={`relative inline-flex h-4 w-8 items-center rounded-full ${editPublished ? "bg-green-500" : "bg-gray-300"
                                    }`}
                                >
                                  <span
                                    className={`h-3 w-3 rounded-full bg-white transform transition ${editPublished ? "translate-x-4" : "translate-x-0.5"
                                      }`}
                                  />
                                </button>
                              </div>
                            )}
                            <div className="flex gap-1 mt-1">
                              <button
                                onClick={() => handleSaveEdit(course.id)}
                                className="text-[10px] bg-green-600 text-white px-2 py-0.5 rounded"
                              >
                                Save
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="text-[10px] bg-gray-300 text-gray-700 px-2 py-0.5 rounded"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-3 flex-wrap">
                              <h3 className="font-semibold text-sm md:text-base break-words">
                                {course.title.toUpperCase()}
                              </h3>
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-700">
                                {scopeLabel}
                              </span>
                              {createdLabel && (
                                <div className="text-[11px] text-gray-500 mt-0.5">
                                  {createdLabel}
                                </div>
                              )}
                              {showStatus &&
                                (course.published ? (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700 cursor-default">
                                    Published
                                  </span>
                                ) : courseCanPublish ? (
                                  <button
                                    onClick={() => openPublishModal(course.id)}
                                    className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-orange-100 text-orange-700 cursor-pointer"
                                    title="Click to publish this course"
                                  >
                                    Draft
                                  </button>
                                ) : (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-orange-100 text-orange-700 cursor-default">
                                    Draft
                                  </span>
                                ))}
                            </div>

                            {course.description && (
                              <div className="relative group overflow-visible">
                                <p className="text-xs text-gray-600 line-clamp-2 cursor-default max-w-2xl">
                                  {course.description}
                                </p>
                                <div className="absolute left-0 top-full mt-2 hidden group-hover:block bg-gray-500 text-white text-xs rounded-md px-3 py-2 max-w-3xl shadow-xl z-50">
                                  {course.description}
                                  <span className="absolute -top-1 left-3 w-2 h-2 bg-gray-500 rotate-45" />
                                </div>
                              </div>
                            )}

                            {assignedSchoolsLabel && (
                              <div className="mt-2 text-[11px] text-slate-500">
                                Assigned schools: {assignedSchoolsLabel}
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {courseCanManageContent && onManageContent && (
                          <button
                            onClick={() => onManageContent(course.id)}
                            className="px-3 py-1.5 text-xs border rounded-md hover:bg-gray-50 flex items-center gap-1"
                          >
                            <GrChapterAdd className="text-xs" />
                            Content
                          </button>
                        )}

                        {showViewAction && onViewCourse && (
                          <button
                            onClick={() => onViewCourse(course.id)}
                            className="px-3 py-1.5 text-xs border rounded-md hover:bg-gray-50"
                          >
                            View Course
                          </button>
                        )}

                        {courseCanEnroll && onEnroll && (
                          <button
                            onClick={() => onEnroll(course.id)}
                            className="px-3 py-1.5 text-xs border rounded-md hover:bg-gray-50 flex items-center gap-1"
                          >
                            <PiUsersBold className="text-xs" />
                            Enroll
                          </button>
                        )}

                        {showCourseMenu && (
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId((prev) => (prev === course.id ? null : course.id));
                              }}
                              className="w-7 h-7 flex items-center justify-center text-gray-500 rounded-md hover:bg-gray-100"
                              aria-label="Course actions"
                            >
                              ...
                            </button>

                            {openMenuId === course.id && (
                              <div
                                className="absolute right-0 mt-1 w-36 bg-white border rounded-md shadow-lg text-xs z-50"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {courseCanEdit && (
                                  <button
                                    onClick={() => {
                                      setOpenMenuId(null);
                                      handleEditCourse(course);
                                    }}
                                    className="w-full text-left px-3 py-2 hover:bg-gray-100"
                                  >
                                    Update
                                  </button>
                                )}
                                {!courseCanEdit && courseCanRename && (
                                  <button
                                    onClick={() => {
                                      setOpenMenuId(null);
                                      handleOpenRename(course);
                                    }}
                                    className="w-full text-left px-3 py-2 hover:bg-gray-100"
                                  >
                                    Rename
                                  </button>
                                )}
                                {courseCanDelete && (
                                  <button
                                    onClick={() => {
                                      setOpenMenuId(null);
                                      handleDeleteCourse(course.id);
                                    }}
                                    className="w-full text-left px-3 py-2 text-red-600 hover:bg-red-50"
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition flex flex-col h-60 relative">
                      <div
                        className={`relative h-28 ${courseBannerClass} flex items-center justify-center overflow-hidden rounded-t-lg`}
                      >
                        <img
                          src={brandLogo || spectropyLogo}
                          alt={`${brandName} Logo`}
                          className="h-10 w-auto opacity-70"
                        />

                        {showStatus &&
                          (course.published ? (
                            <span className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-md font-medium bg-green-600 text-white cursor-default">
                              Published
                            </span>
                          ) : courseCanPublish ? (
                            <button
                              onClick={() => openPublishModal(course.id)}
                              className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-md font-medium bg-orange-500 text-white hover:bg-orange-600"
                              title="Click to publish"
                            >
                              Draft
                            </button>
                          ) : (
                            <span className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-md font-medium bg-orange-500 text-white cursor-default">
                              Draft
                            </span>
                          ))}
                      </div>

                      <div className="px-4 py-3 flex flex-col flex-1">
                        {editingCourseId === course.id && courseCanEdit ? (
                          <div className="flex flex-col flex-1">
                            <div className="space-y-2 mb-2">
                              <input
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                className="w-full p-1.5 text-[13px] border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-900"
                                placeholder="Course title"
                                autoFocus
                              />
                              <textarea
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                className="w-full p-1.5 text-[12px] border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-900"
                                placeholder="Description"
                                rows={2}
                              />
                              {courseCanPublish && showStatus && (
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] font-medium">Published:</span>
                                  <button
                                    type="button"
                                    onClick={() => setEditPublished(!editPublished)}
                                    className={`relative inline-flex h-5 w-9 items-center rounded-full ${editPublished ? "bg-green-500" : "bg-gray-300"
                                      }`}
                                  >
                                    <span
                                      className={`inline-block h-3 w-3 transform rounded-full bg-white transition ${editPublished ? "translate-x-4" : "translate-x-1"
                                        }`}
                                    />
                                  </button>
                                </div>
                              )}
                            </div>

                            {createdLabel && (
                              <div className="text-[11px] text-gray-500 mb-2">{createdLabel}</div>
                            )}

                            <div className="mt-auto flex gap-2">
                              <button
                                onClick={() => handleSaveEdit(course.id)}
                                className="flex-1 bg-green-600 text-white text-[11px] py-1.5 rounded-md hover:bg-green-700"
                              >
                                Save
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="flex-1 bg-gray-200 text-gray-700 text-[11px] py-1.5 rounded-md hover:bg-gray-300"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-start justify-between gap-2 relative">
                              <h3 className="font-semibold text-[15px] leading-snug line-clamp-2 pr-8">
                                {course.title.toUpperCase()}
                              </h3>

                              {showCourseMenu && (
                                <div className="relative">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenMenuId((prev) => (prev === course.id ? null : course.id));
                                    }}
                                    className="w-7 h-7 flex items-center justify-center text-gray-500 rounded-md hover:bg-gray-100 transition"
                                    aria-label="Course actions"
                                  >
                                    ...
                                  </button>

                                  {openMenuId === course.id && (
                                    <div className="absolute right-0 mt-1 w-36 bg-white border rounded-md shadow-lg text-xs z-50 overflow-hidden">
                                      {courseCanEdit && (
                                        <button
                                          onClick={() => {
                                            setOpenMenuId(null);
                                            handleEditCourse(course);
                                          }}
                                          className="w-full text-left px-3 py-2 hover:bg-gray-100"
                                        >
                                          Update
                                        </button>
                                      )}
                                      {!courseCanEdit && courseCanRename && (
                                        <button
                                          onClick={() => {
                                            setOpenMenuId(null);
                                            handleOpenRename(course);
                                          }}
                                          className="w-full text-left px-3 py-2 hover:bg-gray-100"
                                        >
                                          Rename
                                        </button>
                                      )}
                                      {courseCanDelete && (
                                        <button
                                          onClick={() => {
                                            setOpenMenuId(null);
                                            handleDeleteCourse(course.id);
                                          }}
                                          className="w-full text-left px-3 py-2 text-red-600 hover:bg-red-50"
                                        >
                                          Delete
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {createdLabel && (
                              <div className="text-[11px] text-gray-500 mb-1">{createdLabel}</div>
                            )}

                            <div className="mb-1 flex flex-wrap items-center gap-2">
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-700">
                                {scopeLabel}
                              </span>
                              {assignedSchoolsLabel && (
                                <span className="text-[10px] text-slate-500">
                                  {assignedSchoolsLabel}
                                </span>
                              )}
                            </div>

                            {course.description && (
                              <div className="relative group overflow-visible">
                                <p className="text-xs text-gray-600 line-clamp-2 cursor-default">
                                  {course.description}
                                </p>
                                <div className="absolute left-0 top-full mt-2 hidden group-hover:block bg-gray-500 text-white text-xs rounded-md px-3 py-2 max-w-xs shadow-xl z-50">
                                  {course.description}
                                  <span className="absolute -top-1 left-3 w-2 h-2 bg-gray-500 rotate-45" />
                                </div>
                              </div>
                            )}

                            <div className="mt-auto grid grid-cols-3 gap-2">
                              {courseCanManageContent && onManageContent && (
                                <button
                                  onClick={() => onManageContent(course.id)}
                                  className="flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] border rounded-md hover:bg-gray-50"
                                >
                                  <GrChapterAdd className="text-xs" />
                                  Content
                                </button>
                              )}

                              {showViewAction && onViewCourse && (
                                <button
                                  onClick={() => onViewCourse(course.id)}
                                  className="flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] border rounded-md hover:bg-gray-50"
                                >
                                  View
                                </button>
                              )}

                              {courseCanEnroll && onEnroll && (
                                <button
                                  onClick={() => onEnroll(course.id)}
                                  className="flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] border rounded-md hover:bg-gray-50"
                                >
                                  <PiUsersBold className="text-xs" />
                                  Enroll
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      {publishModalOpen && mergedPermissions.canPublish && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-[90%]">
            <h3 className="text-lg font-semibold mb-3">Publish Course?</h3>
            <p className="text-gray-700 mb-5">
              Are you sure you want to publish this course? It will become visible to learners.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={closePublishModal}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
              >
                No
              </button>
              <button
                onClick={handlePublish}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Yes, Publish
              </button>
            </div>
          </div>
        </div>
      )}
      {renamingCourseId !== null && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-[90%]">
            <h3 className="text-lg font-semibold mb-3">Rename Assigned Course</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Course Title</label>
                <input
                  value={renameTitle}
                  onChange={(e) => setRenameTitle(e.target.value)}
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 border-gray-300 focus:ring-blue-900 focus:border-transparent"
                  placeholder="Enter course title"
                  autoFocus
                />
              </div>
              <p className="text-xs text-slate-500">
                This only changes the course name for your client view. It will not rename the platform course globally.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={handleCloseRename}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={() => void handleSaveRename()}
                  className="px-4 py-2 bg-blue-900 text-white rounded hover:bg-blue-700"
                >
                  Save Name
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
