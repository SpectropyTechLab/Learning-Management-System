import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { PiUsersBold } from 'react-icons/pi';
import api from '@/lib/api';
import spectropyLogo from '/logo.png';

type EnrollUsersProps = {
  apiPrefix?: string;
  backRoute?: string;
};

type EnrollmentRole = 'student' | 'teacher';

type EnrollmentItem = {
  user_id: number;
  name: string;
  email: string;
  role: EnrollmentRole;
  enrolled_at: string;
};

type FlashMessage = {
  type: 'success' | 'error';
  text: string;
};

type BulkEnrollmentResult = {
  message: string;
  successCount: number;
  failureCount: number;
  successes: Array<{ row: number; email: string; user_id: number }>;
  failures: Array<{ row: number; email: string; error: string }>;
};

const buildTemplateBlob = () =>
  new Blob(['email\nuser1@example.com\nuser2@example.com\n'], {
    type: 'text/csv;charset=utf-8;',
  });

export default function EnrollUsersBulk({
  apiPrefix = '/admin',
  backRoute,
}: EnrollUsersProps) {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const normalizedApiPrefix = apiPrefix.startsWith('/') ? apiPrefix : `/${apiPrefix}`;
  const activeTab = (location.state as { activeTab?: 'courses' | 'home' | 'users' } | null)?.activeTab;

  const shellClass = 'min-h-screen bg-slate-50';
  const layoutClass =
    'mx-auto flex min-h-screen w-full max-w-[1920px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:flex-row';
  const sidebarThemeClass = 'bg-white border-gray-200';
  const sidebarHeaderBorder = 'border-gray-200';
  const navActiveClass = 'bg-blue-50 text-blue-900 border-l-4 border-blue-900';
  const navInactiveClass = 'text-gray-700 hover:bg-gray-100';
  const navIconClass = 'text-lg text-black';
  const headerBorderClass = 'border-gray-200';
  const primaryButtonClass = 'bg-blue-900 text-white hover:bg-blue-700';

  const [role, setRole] = useState<EnrollmentRole | null>(null);
  const [email, setEmail] = useState('');
  const [flashMessage, setFlashMessage] = useState<FlashMessage | null>(null);
  const [modalMessage, setModalMessage] = useState<FlashMessage | null>(null);
  const [bulkResult, setBulkResult] = useState<BulkEnrollmentResult | null>(null);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [modalMode, setModalMode] = useState<'single' | 'bulk'>('single');
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openMenuUserId, setOpenMenuUserId] = useState<number | null>(null);
  const [removingUserId, setRemovingUserId] = useState<number | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);
  const [allEnrollments, setAllEnrollments] = useState<EnrollmentItem[] | null>(null);
  const [loadingEnrollments, setLoadingEnrollments] = useState(true);

  const panelTitle =
    role === 'student' ? 'Enroll Student' : role === 'teacher' ? 'Enroll Teacher' : 'Manage Enrollments';
  const panelDescription =
    role === 'student'
      ? 'Add students to this course one-by-one or upload an Excel/CSV file.'
      : role === 'teacher'
        ? 'Add teachers to this course one-by-one or upload an Excel/CSV file.'
        : 'Choose a role to enroll new users or review existing enrollments.';

  const refreshEnrollments = async () => {
    if (!courseId) return;
    try {
      const response = await api.get(`${normalizedApiPrefix}/courses/${courseId}/enrollments`);
      setAllEnrollments(response.data);
    } catch (err) {
      console.error('Failed to load enrollments:', err);
      setFlashMessage({ type: 'error', text: 'Failed to load enrolled users.' });
    }
  };

  useEffect(() => {
    const loadEnrollments = async () => {
      if (!courseId) return;

      setLoadingEnrollments(true);
      try {
        const response = await api.get(`${normalizedApiPrefix}/courses/${courseId}/enrollments`);
        setAllEnrollments(response.data);
      } catch (err) {
        console.error('Failed to load enrollments:', err);
        setFlashMessage({ type: 'error', text: 'Failed to load enrolled users.' });
      } finally {
        setLoadingEnrollments(false);
      }
    };

    loadEnrollments();
  }, [courseId, normalizedApiPrefix]);

  const displayedEnrollments = useMemo(() => {
    if (!allEnrollments) return [];
    if (role === 'student') return allEnrollments.filter((entry) => entry.role === 'student');
    if (role === 'teacher') return allEnrollments.filter((entry) => entry.role === 'teacher');

    const students = allEnrollments.filter((entry) => entry.role === 'student');
    const teachers = allEnrollments.filter((entry) => entry.role === 'teacher');
    return [...students, ...teachers];
  }, [allEnrollments, role]);

  const resetModalState = () => {
    setEmail('');
    setBulkFile(null);
    setBulkResult(null);
    setModalMessage(null);
    setModalMode('single');
  };

  const closeModal = () => {
    setShowModal(false);
    resetModalState();
  };

  const handleEnroll = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!role || !email.trim()) return;

    setSubmitting(true);
    setModalMessage(null);

    try {
      await api.post(`${normalizedApiPrefix}/courses/${courseId}/enroll-by-email`, {
        email: email.trim(),
        role,
      });

      await refreshEnrollments();
      setEmail('');
      setModalMessage({
        type: 'success',
        text: `${role === 'student' ? 'Student' : 'Teacher'} enrolled successfully!`,
      });
      setFlashMessage({
        type: 'success',
        text: `${role === 'student' ? 'Student' : 'Teacher'} enrolled successfully!`,
      });

      window.setTimeout(() => {
        closeModal();
      }, 1200);
    } catch (err: unknown) {
      const errorText = axios.isAxiosError(err)
        ? err.response?.data?.error ||
          err.message ||
          `Failed to enroll ${role}. Make sure the user exists and is not already enrolled.`
        : `Failed to enroll ${role}. Make sure the user exists and is not already enrolled.`;
      setModalMessage({ type: 'error', text: errorText });
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkEnroll = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!role || !bulkFile) {
      setModalMessage({ type: 'error', text: 'Please choose a CSV or XLSX file.' });
      return;
    }

    setSubmitting(true);
    setModalMessage(null);
    setBulkResult(null);

    try {
      const formData = new FormData();
      formData.append('file', bulkFile);
      formData.append('role', role);

      const response = await api.post<BulkEnrollmentResult>(
        `${normalizedApiPrefix}/courses/${courseId}/enroll-bulk`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      setBulkResult(response.data);
      setModalMessage({
        type: response.data.failureCount === 0 ? 'success' : 'error',
        text: response.data.message,
      });
      setFlashMessage({
        type: response.data.failureCount === 0 ? 'success' : 'error',
        text: response.data.message,
      });
      await refreshEnrollments();
    } catch (err: unknown) {
      const errorText = axios.isAxiosError(err)
        ? err.response?.data?.error || err.message || 'Failed to process bulk enrollment.'
        : 'Failed to process bulk enrollment.';
      setModalMessage({ type: 'error', text: errorText });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadTemplate = () => {
    const url = window.URL.createObjectURL(buildTemplateBlob());
    const link = document.createElement('a');
    link.href = url;
    link.download = `course-enrollment-${role ?? 'users'}-template.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleRemoveUser = async (userId: number) => {
    if (!confirm('Are you sure you want to remove this user from the course?')) return;

    setRemovingUserId(userId);
    try {
      await api.delete(`${normalizedApiPrefix}/courses/${courseId}/enrollments/${userId}`);
      setAllEnrollments((prev) => prev?.filter((entry) => entry.user_id !== userId) ?? null);
      setFlashMessage({ type: 'success', text: 'User removed successfully!' });
    } catch (err: unknown) {
      const errorText = axios.isAxiosError(err)
        ? err.response?.data?.error || err.message || 'Failed to remove user.'
        : 'Failed to remove user.';
      setFlashMessage({ type: 'error', text: errorText });
    } finally {
      setRemovingUserId(null);
      setOpenMenuUserId(null);
    }
  };

  const handleUpdateRole = async (userId: number, currentRole: EnrollmentRole) => {
    const newRole: EnrollmentRole = currentRole === 'student' ? 'teacher' : 'student';
    if (!confirm(`Change this user's role to "${newRole}"?`)) return;

    setUpdatingUserId(userId);
    try {
      await api.patch(`${normalizedApiPrefix}/courses/${courseId}/enrollments/${userId}`, { role: newRole });
      setAllEnrollments(
        (prev) => prev?.map((entry) => (entry.user_id === userId ? { ...entry, role: newRole } : entry)) ?? null
      );
      setFlashMessage({ type: 'success', text: `Role updated to "${newRole}"!` });
    } catch (err: unknown) {
      const errorText = axios.isAxiosError(err)
        ? err.response?.data?.error || err.message || 'Failed to update role.'
        : 'Failed to update role.';
      setFlashMessage({ type: 'error', text: errorText });
    } finally {
      setUpdatingUserId(null);
      setOpenMenuUserId(null);
    }
  };

  const handleBack = () => {
    if (role) {
      setRole(null);
      setFlashMessage(null);
      return;
    }

    const targetRoute =
      backRoute ?? (normalizedApiPrefix.includes('/school-owner') ? '/school-owner/courses' : '/admin/dashboard');

    if (normalizedApiPrefix.includes('/school-owner')) {
      navigate(targetRoute);
      return;
    }

    navigate(targetRoute, {
      state: { activeTab: activeTab ?? 'courses' },
    });
  };

  return (
    <div className={shellClass}>
      <div className={layoutClass}>
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        <div
          className={`fixed inset-y-0 left-0 z-50 w-[78vw] max-w-[16rem] shrink-0 border-r bg-white lg:static lg:w-72 lg:max-w-none lg:border-b-0 lg:translate-x-0 ${sidebarThemeClass} flex h-full min-h-0 flex-col overflow-hidden transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:border-r`}
        >
          <div className={`border-b px-5 py-4 lg:px-6 lg:py-5 ${sidebarHeaderBorder}`}>
            <div className="flex items-center space-x-2">
              <img src={spectropyLogo} alt="Brand Logo" className="h-9 w-auto rounded-md md:h-9 lg:h-10" />
            </div>
            <h1 className="mt-3 text-xl font-bold tracking-tight text-slate-950 lg:text-lg">Enroll Users</h1>
          </div>

          <nav className="flex-1 px-3 py-4 lg:px-4 lg:py-5">
            <button
              onClick={handleBack}
              className="mb-2 flex w-full items-center rounded-lg px-3 py-3 text-left text-sm font-medium text-slate-800 transition-colors hover:bg-gray-100 lg:px-4"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="mr-3 h-4 w-4 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Back to Course
            </button>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
              <button
                onClick={() => {
                  setRole('student');
                  setSidebarOpen(false);
                  setFlashMessage(null);
                }}
                className={`w-full rounded-lg px-3 py-3 text-sm font-medium transition-colors lg:px-4 ${
                  role === 'student' ? `${navActiveClass} border-l-4` : navInactiveClass
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <PiUsersBold className={navIconClass} />
                  <span>Enroll student</span>
                </div>
              </button>
              <button
                onClick={() => {
                  setRole('teacher');
                  setSidebarOpen(false);
                  setFlashMessage(null);
                }}
                className={`w-full rounded-lg px-3 py-3 text-sm font-medium transition-colors lg:px-4 ${
                  role === 'teacher' ? `${navActiveClass} border-l-4` : navInactiveClass
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <PiUsersBold className={navIconClass} />
                  <span>Enroll Teacher</span>
                </div>
              </button>
            </div>
          </nav>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50">
          <div className={`border-b bg-white px-5 py-4 lg:px-6 lg:py-5 ${headerBorderClass}`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="mb-3 inline-flex rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-gray-50 lg:hidden"
                >
                  Menu
                </button>
                <h1 className="text-2xl font-bold tracking-tight text-slate-950 lg:text-xl">{panelTitle}</h1>
                <p className="mt-1.5 max-w-2xl text-sm leading-7 text-slate-600 lg:text-base">{panelDescription}</p>
              </div>
              {role && (
                <button
                  onClick={() => {
                    resetModalState();
                    setShowModal(true);
                  }}
                  className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm sm:w-auto ${primaryButtonClass}`}
                >
                  Add User
                </button>
              )}
            </div>
          </div>

          <div className="p-5 lg:p-6">
            {flashMessage && !showModal && (
              <div
                className={`mb-4 rounded-2xl border px-4 py-3 text-sm ${
                  flashMessage.type === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-rose-200 bg-rose-50 text-rose-700'
                }`}
              >
                {flashMessage.text}
              </div>
            )}

            {loadingEnrollments ? (
              <div className="rounded-2xl border border-slate-200 bg-white px-5 py-10 text-center text-slate-500 shadow-sm">
                Loading enrollments...
              </div>
            ) : displayedEnrollments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center text-base text-slate-500 shadow-sm">
                {role ? `No ${role}s enrolled in this course yet.` : 'No enrollments yet.'}
              </div>
            ) : (
              <div className="space-y-3">
                {displayedEnrollments.map((enrollment) => (
                  <div
                    key={enrollment.user_id}
                    className="relative flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-semibold text-slate-900">{enrollment.name}</p>
                      <p className="truncate text-sm text-slate-600">{enrollment.email}</p>
                    </div>

                    <div className="flex items-center gap-2 sm:ml-4">
                      <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold capitalize text-blue-800">
                        {enrollment.role}
                      </span>

                      <div className="relative">
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            setOpenMenuUserId((prev) => (prev === enrollment.user_id ? null : enrollment.user_id));
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100"
                          aria-label="User actions"
                        >
                          ...
                        </button>

                        {openMenuUserId === enrollment.user_id && (
                          <div
                            className="absolute right-0 z-10 mt-1 w-44 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <button
                              onClick={() => handleUpdateRole(enrollment.user_id, enrollment.role)}
                              disabled={updatingUserId === enrollment.user_id}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-gray-100 disabled:opacity-50"
                            >
                              Change Role
                            </button>
                            <button
                              onClick={() => handleRemoveUser(enrollment.user_id)}
                              disabled={removingUserId === enrollment.user_id}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {showModal && role && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white shadow-xl">
              <div className="p-5 sm:p-6">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      Enroll {role === 'student' ? 'Student' : 'Teacher'}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Use single email entry or upload a CSV/XLSX file with one `email` column.
                    </p>
                  </div>
                  <button
                    onClick={closeModal}
                    className="rounded-lg p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                  >
                    ×
                  </button>
                </div>

                <div className="mb-4 inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setModalMode('single');
                      setModalMessage(null);
                    }}
                    className={`rounded-lg px-4 py-2 text-sm font-medium ${
                      modalMode === 'single' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    Single
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setModalMode('bulk');
                      setModalMessage(null);
                    }}
                    className={`rounded-lg px-4 py-2 text-sm font-medium ${
                      modalMode === 'bulk' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    Bulk Upload
                  </button>
                </div>

                {modalMessage && (
                  <div
                    className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
                      modalMessage.type === 'success'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                        : 'border-rose-200 bg-rose-50 text-rose-700'
                    }`}
                  >
                    {modalMessage.text}
                  </div>
                )}

                {modalMode === 'single' ? (
                  <form onSubmit={handleEnroll} className="space-y-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium">Email *</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        className="w-full rounded-xl border border-gray-300 px-3 py-2.5"
                        placeholder={`e.g. ${role}@example.com`}
                        required
                        autoFocus
                      />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={closeModal}
                        className="rounded-xl px-4 py-2.5 text-gray-700 transition-colors hover:bg-gray-100"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className={`rounded-xl px-5 py-2.5 font-medium disabled:opacity-50 ${primaryButtonClass}`}
                      >
                        {submitting ? 'Enrolling...' : 'Enroll'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleBulkEnroll} className="space-y-4">
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">Upload template</div>
                          <p className="mt-1 text-xs text-slate-500">
                            Supported formats: `.csv` and `.xlsx`. The file should contain one `email` column.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleDownloadTemplate}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
                        >
                          Download Template
                        </button>
                      </div>

                      <label className="mt-4 inline-flex cursor-pointer items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100">
                        Choose File
                        <input
                          type="file"
                          accept=".csv,.xlsx"
                          className="hidden"
                          onChange={(event) => setBulkFile(event.target.files?.[0] ?? null)}
                        />
                      </label>

                      {bulkFile && (
                        <div className="mt-3 text-sm text-slate-600">
                          Selected: <span className="font-semibold">{bulkFile.name}</span>
                        </div>
                      )}
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                      <div className="font-semibold text-slate-900">Sample format</div>
                      <pre className="mt-2 overflow-x-auto rounded-xl bg-slate-50 p-3 text-xs text-slate-700">{`email\nuser1@example.com\nuser2@example.com`}</pre>
                      <p className="mt-2 text-xs text-slate-500">
                        The current {role} tab decides the role automatically, so the file only needs email values.
                      </p>
                    </div>

                    {bulkResult && (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex flex-wrap gap-3 text-sm">
                          <span className="rounded-full bg-emerald-100 px-3 py-1 font-semibold text-emerald-800">
                            Success: {bulkResult.successCount}
                          </span>
                          <span className="rounded-full bg-rose-100 px-3 py-1 font-semibold text-rose-700">
                            Failed: {bulkResult.failureCount}
                          </span>
                        </div>

                        {bulkResult.failures.length > 0 && (
                          <div className="mt-4 max-h-48 overflow-y-auto rounded-xl border border-rose-200 bg-white">
                            {bulkResult.failures.map((failure, index) => (
                              <div
                                key={`${failure.row}-${failure.email}-${index}`}
                                className="border-b border-rose-100 px-4 py-3 text-sm last:border-b-0"
                              >
                                <div className="font-semibold text-slate-900">
                                  Row {failure.row}: {failure.email || 'Blank email'}
                                </div>
                                <div className="mt-1 text-rose-700">{failure.error}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={closeModal}
                        className="rounded-xl px-4 py-2.5 text-gray-700 transition-colors hover:bg-gray-100"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className={`rounded-xl px-5 py-2.5 font-medium disabled:opacity-50 ${primaryButtonClass}`}
                      >
                        {submitting ? 'Uploading...' : 'Upload and Enroll'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
