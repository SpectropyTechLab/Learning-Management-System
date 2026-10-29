import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import api from '@/lib/api';
import axios from 'axios';
import spectropyLogo from "/logo.png";
import { PiUsersBold } from "react-icons/pi";

type EnrollUsersProps = {
  apiPrefix?: string;
  backRoute?: string;
  backLabel?: string;
};

export default function EnrollUsers({
  apiPrefix = "/admin",
  backRoute,
  backLabel,
}: EnrollUsersProps) {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const normalizedApiPrefix = apiPrefix.startsWith('/') ? apiPrefix : `/${apiPrefix}`;
  const activeTab = (location.state as { activeTab?: 'courses' | 'home' | 'users' } | null)?.activeTab;
  const brandLogo = spectropyLogo;
  const shellClass = 'min-h-screen bg-slate-50';
  const layoutClass = 'mx-auto flex min-h-screen w-full max-w-[1920px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:flex-row';
  const sidebarThemeClass = 'bg-white border-gray-200';
  const sidebarHeaderBorder = 'border-gray-200';
  const navActiveClass = 'bg-blue-50 text-blue-900 border-l-4 border-blue-900';
  const navInactiveClass = 'text-gray-700 hover:bg-gray-100';
  const navIconClass = 'text-lg text-black';
  const headerBorderClass = 'border-gray-200';
  const primaryButtonClass = 'bg-blue-900 text-white hover:bg-blue-700';
  const resolvedBackLabel =
    backLabel ?? (normalizedApiPrefix.includes('/school-owner')
      ? 'Back To School Owner Courses'
      : 'Back To Admin Dashboard');

  const [role, setRole] = useState<'student' | 'teacher' | null>(null);
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // For three-dot menu
  const [openMenuUserId, setOpenMenuUserId] = useState<number | null>(null);
  // For loading states (optional but nice)
  const [removingUserId, setRemovingUserId] = useState<number | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);

  // Store full enrollment list
  const [allEnrollments, setAllEnrollments] = useState<Array<{
    user_id: number;
    name: string;
    email: string;
    role: 'student' | 'teacher';
    enrolled_at: string;
  }> | null>(null);

  const [loadingEnrollments, setLoadingEnrollments] = useState(true);
  const panelTitle =
    role === 'student' ? 'Enroll Student' : role === 'teacher' ? 'Enroll Teacher' : 'Manage Enrollments';
  const panelDescription =
    role === 'student'
      ? 'Add students to this course by entering their email.'
      : role === 'teacher'
        ? 'Add teachers to this course by entering their email.'
        : 'Choose a role to enroll new users or review existing enrollments.';

  // Fetch all enrollments for the course
  useEffect(() => {
    const fetchEnrollments = async () => {
      if (!courseId) return;
      setLoadingEnrollments(true);
      try {
        const response = await api.get(`${normalizedApiPrefix}/courses/${courseId}/enrollments`);
        setAllEnrollments(response.data);
      } catch (err) {
        console.error('Failed to load enrollments:', err);
        setMessage({ type: 'error', text: 'Failed to load enrolled users.' });
      } finally {
        setLoadingEnrollments(false);
      }
    };

    fetchEnrollments();
  }, [courseId, normalizedApiPrefix]);

  // Compute displayed enrollments based on selected role
  const displayedEnrollments = useMemo(() => {
    if (!allEnrollments) return [];
    if (role === 'student') {
      return allEnrollments.filter(e => e.role === 'student');
    } else if (role === 'teacher') {
      return allEnrollments.filter(e => e.role === 'teacher');
    } else {
      // Show all: students first, then teachers (already sorted by backend: ORDER BY role, email)
      // But ensure deterministic order in case backend changes
      const students = allEnrollments.filter(e => e.role === 'student');
      const teachers = allEnrollments.filter(e => e.role === 'teacher');
      return [...students, ...teachers];
    }
  }, [allEnrollments, role]);

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role || !email.trim()) return;

    setSubmitting(true);
    setMessage(null);

    try {
      await api.post(`${normalizedApiPrefix}/courses/${courseId}/enroll-by-email`, {
        email: email.trim(),
        role,
      });

      setMessage({ type: 'success', text: `${role === 'student' ? 'Student' : 'Teacher'} enrolled successfully!` });
      setEmail('');

      // Refetch full enrollment list to update UI
      const response = await api.get(`${normalizedApiPrefix}/courses/${courseId}/enrollments`);
      setAllEnrollments(response.data);

      // Auto-close modal after success
      setTimeout(() => {
        setShowModal(false);
        setMessage(null);
      }, 1500);
    } catch (err: unknown) {
      const errorMsg = axios.isAxiosError(err)
        ? err.response?.data?.error ||
          err.message ||
          `Failed to enroll ${role}. Make sure the user exists and is not already enrolled.`
        : `Failed to enroll ${role}. Make sure the user exists and is not already enrolled.`;
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setSubmitting(false);
    }
  };
  
  // Remove user from course
const handleRemoveUser = async (userId: number) => {
  if (!confirm('Are you sure you want to remove this user from the course?')) return;

  setRemovingUserId(userId);
  try {
    await api.delete(`${normalizedApiPrefix}/courses/${courseId}/enrollments/${userId}`);
    // Optimistically update UI
    setAllEnrollments(prev => prev?.filter(e => e.user_id !== userId) || null);
    setMessage({ type: 'success', text: 'User removed successfully!' });
    setTimeout(() => setMessage(null), 2000);
  } catch (err: unknown) {
    const errorMsg = axios.isAxiosError(err)
      ? err.response?.data?.error || err.message || 'Failed to remove user.'
      : 'Failed to remove user.';
    setMessage({ type: 'error', text: errorMsg });
  } finally {
    setRemovingUserId(null);
    setOpenMenuUserId(null);
  }
};

// Update user role (student <-> teacher)
const handleUpdateRole = async (userId: number, currentRole: 'student' | 'teacher') => {
  const newRole = currentRole === 'student' ? 'teacher' : 'student';
  
  if (!confirm(`Change this user's role to "${newRole}"?`)) return;

  setUpdatingUserId(userId);
  try {
    await api.patch(`${normalizedApiPrefix}/courses/${courseId}/enrollments/${userId}`, { role: newRole });
    // Optimistically update UI
    setAllEnrollments(prev =>
      prev?.map(e => (e.user_id === userId ? { ...e, role: newRole } : e)) || null
    );
    setMessage({ type: 'success', text: `Role updated to "${newRole}"!` });
    setTimeout(() => setMessage(null), 2000);
  } catch (err: unknown) {
    const errorMsg = axios.isAxiosError(err)
      ? err.response?.data?.error || err.message || 'Failed to update role.'
      : 'Failed to update role.';
    setMessage({ type: 'error', text: errorMsg });
  } finally {
    setUpdatingUserId(null);
    setOpenMenuUserId(null);
  }
};

  const handleBack = () => {
    if (role) {
      setRole(null);
      setMessage(null);
    } else {
      const targetRoute =
        backRoute ?? (normalizedApiPrefix.includes('/school-owner') ? '/school-owner/courses' : '/admin/dashboard');

      if (normalizedApiPrefix.includes('/school-owner')) {
        navigate(targetRoute);
        return;
      }

      navigate(targetRoute, {
        state: { activeTab: activeTab ?? 'courses' },
      });
    }
  };

  return (
    <div className={shellClass}>
    <div className={layoutClass}>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Left Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-[78vw] max-w-[16rem] shrink-0 border-r bg-white lg:static lg:w-72 lg:max-w-none lg:border-b-0 lg:translate-x-0 ${sidebarThemeClass} flex h-full min-h-0 flex-col overflow-hidden transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:border-r`}>
        {/* Logo/Brand */}
        <div className={`px-5 py-4 lg:px-6 lg:py-5 border-b ${sidebarHeaderBorder}`}>
          <div className="flex items-center space-x-2 cursor-pointer">
                <img
                    src={brandLogo}
                    alt="Brand Logo"
                    className="h-9 w-auto md:h-9 lg:h-10 rounded-md"
                />
            </div>
          <h1 className="mt-3 text-xl font-bold tracking-tight text-slate-950 lg:text-lg">Enroll Users</h1>
        </div>

        {/* Role Selection */}
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
              }}
              className={`w-full rounded-lg px-3 py-3 text-sm font-medium transition-colors lg:px-4 ${
                role === 'student'
                  ? `${navActiveClass} border-l-4`
                  : navInactiveClass
              }`}
            >
            <div className="flex items-center space-x-2.5">
                                <PiUsersBold  className={navIconClass}/>
                                <span>Enroll student</span>
                                </div>
            </button>
            <button
              onClick={() => {
                setRole('teacher');
                setSidebarOpen(false);
              }}
              className={`w-full rounded-lg px-3 py-3 text-sm font-medium transition-colors lg:px-4 ${
                role === 'teacher'
                  ? `${navActiveClass} border-l-4`
                  : navInactiveClass
              }`}
            >
              <div className="flex items-center space-x-2.5">
                                <PiUsersBold  className={navIconClass}/>
                                <span>Enroll Teacher</span>
                                </div>
            </button>
          </div>
        </nav>

      </div>

      {/* Right Panel - Content Area */}
      <div className="flex-1 overflow-y-auto bg-slate-50">
        {/* Header */}
        <div className={`border-b ${headerBorderClass} bg-white px-5 py-4 lg:px-6 lg:py-5`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <button
                onClick={() => setSidebarOpen(true)}
                className="mb-3 inline-flex rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-gray-50 lg:hidden"
              >
                Menu
              </button>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 lg:text-xl">{panelTitle}</h1>
              <p className="mt-1.5 max-w-2xl text-sm leading-7 text-slate-600 lg:text-base">
                {panelDescription}
              </p>
            </div>
            {role && (
              <button
                onClick={() => setShowModal(true)}
                className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm sm:w-auto ${primaryButtonClass}`}
              >
                Add User
              </button>
            )}
          </div>
        </div>

        {/* Enrollment List */}
        <div className="p-5 lg:p-6">
          {loadingEnrollments ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-10 text-center text-slate-500 shadow-sm">Loading enrollments...</div>
          ) : displayedEnrollments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center text-base text-slate-500 shadow-sm">
              {role
                ? `No ${role}s enrolled in this course yet.`
                : 'No enrollments yet.'}
            </div>
          ) : (
            <div className="space-y-3">
               {displayedEnrollments.map((enrollment) => (
  <div
    key={enrollment.user_id}
    className="relative flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
  >
    {/* User Info */}
    <div className="flex-1 min-w-0">
      <p className="truncate text-base font-semibold text-slate-900">{enrollment.name}</p>
      <p className="truncate text-sm text-slate-600">{enrollment.email}</p>
    </div>

    {/* Role Badge + Menu */}
    <div className="flex items-center gap-2 sm:ml-4">
      <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold capitalize text-blue-800">
        {enrollment.role}
      </span>

      {/* Three-dot menu */}
      <div className="relative">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setOpenMenuUserId((prev) => (prev === enrollment.user_id ? null : enrollment.user_id));
          }}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100"
        aria-label="User actions"
      >
          ...
        </button>

        {/* Dropdown */}
        {openMenuUserId === enrollment.user_id && (
          <div
            className="absolute right-0 z-10 mt-1 w-44 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
            onClick={(e) => e.stopPropagation()}
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

      {/* Email Input Modal */}
      {showModal && role && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-xl">
            <div className="p-5 sm:p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-slate-900">
                  Enroll {role === 'student' ? 'Student' : 'Teacher'}
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setMessage(null);
                  }}
                  className="rounded-lg p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                >
                  ×
                </button>
              </div>

              {message && (
                <div
                  className={`mb-4 p-3 rounded ${
                    message.type === 'success'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {message.text}
                </div>
              )}

              <form onSubmit={handleEnroll} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Email *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2.5"
                    placeholder={`e.g. ${role}@example.com`}
                    required
                    autoFocus
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setMessage(null);
                    }}
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
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}


