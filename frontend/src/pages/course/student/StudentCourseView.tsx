// src/pages/student/StudentCourseView.tsx
import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import axios from 'axios';
import { Outlet } from 'react-router-dom';
import spectropyLogo from "/logo.png";
import CourseProgressBar from "@/features/courses/components/player/CourseProgressBar";
import { TbPlayerTrackPrevFilled } from "react-icons/tb";
import { TbPlayerTrackNextFilled } from "react-icons/tb";
import { GrFormNext } from "react-icons/gr";
import { MdExpandMore } from "react-icons/md";

// ✅ Updated interface with completion_status
interface ContentItem {
  id: number;
  title: string;
  item_type: 'video' | 'pdf' | 'text' | 'scorm' | 'audio' | string;
  content_url: string | null;
  metadata?: Record<string, unknown> | null;
  //completion_status?: 'completed' | 'incomplete' | null; // ✅ ADD THIS
  completion_status?: string | null;
}

interface Chapter {
  id: number;
  title: string;
  position: number;
  content_items: ContentItem[];
}

interface CourseData {
  id: number;
  title: string;
  description: string | null;
  chapters: Chapter[];
}

export default function StudentCourseView() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<CourseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedChapters, setExpandedChapters] = useState<Set<number>>(new Set());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!courseId) {
      setError('Invalid course ID');
      setLoading(false);
      return;
    }

    const fetchCourse = async () => {
      try {
        const res = await api.get<CourseData>(`/student/course/${courseId}`);
        setCourse(res.data);
      } catch (err: unknown) {
        const msg = axios.isAxiosError(err)
          ? err.response?.data?.error || err.message || 'Failed to load course content.'
          : 'Failed to load course content.';
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [courseId]);

  const toggleChapter = (chapterId: number) => {
    const newExpanded = new Set(expandedChapters);
    if (newExpanded.has(chapterId)) {
      newExpanded.delete(chapterId);
    } else {
      newExpanded.add(chapterId);
    }
    setExpandedChapters(newExpanded);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 text-slate-900">
        <div className="flex min-h-screen flex-col lg:flex-row">
          <aside className="w-full border-b border-blue-100 bg-white lg:w-72 lg:border-b-0 lg:border-r">
            <div className="p-6 border-b border-blue-100">
              <div className="flex items-center space-x-2 cursor-pointer">
                <img
                  src={spectropyLogo}
                  alt="Spectropy Logo"
                  className="h-10 w-auto md:h-10 lg:h-12 rounded-md"
                />
              </div>
              <p className="text-xs uppercase tracking-[0.3em] text-blue-700 mt-2">
                SPECTROPY
              </p>
              <h1 className="text-lg font-semibold">Course View</h1>
            </div>
            <div className="px-4 py-3 border-b border-blue-100">
              <p className="text-sm text-slate-600">Loading course content...</p>
            </div>
            <div className="p-4 border-t border-blue-100">
              <Link
                to="/student/dashboard"
                className="w-full flex items-center justify-center rounded-full border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
              >
                ← Back
              </Link>
            </div>
          </aside>
          <section className="flex-1 p-6 flex items-center justify-center">
            <p className="text-slate-600">Loading...</p>
          </section>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 text-slate-900">
        <div className="flex min-h-screen flex-col lg:flex-row">
          <aside className="w-full border-b border-blue-100 bg-white lg:w-72 lg:border-b-0 lg:border-r">
            <div className="p-6 border-b border-blue-100">
              <div className="flex items-center space-x-2 cursor-pointer">
                <img
                  src={spectropyLogo}
                  alt="Spectropy Logo"
                  className="h-10 w-auto md:h-10 lg:h-12 rounded-md"
                />
              </div>
              <p className="text-xs uppercase tracking-[0.3em] text-blue-700 mt-2">
                SPECTROPY
              </p>
              <h1 className="text-lg font-semibold">Course View</h1>
            </div>
            <div className="px-4 py-3 border-b border-blue-100">
              <p className="text-red-600">Error: {error}</p>
            </div>
            <div className="p-4 border-t border-blue-100">
              <Link
                to="/student/dashboard"
                className="w-full flex items-center justify-center rounded-full border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
              >
                ← Back
              </Link>
            </div>
          </aside>
          <section className="flex-1 p-6 flex items-center justify-center">
            <p className="text-red-600">Error: {error}</p>
          </section>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gray-50 text-slate-900">
        <div className="flex min-h-screen flex-col lg:flex-row">
          <aside className="w-full border-b border-blue-100 bg-white lg:w-72 lg:border-b-0 lg:border-r">
            <div className="p-6 border-b border-blue-100">
              <div className="flex items-center space-x-2 cursor-pointer">
                <img
                  src={spectropyLogo}
                  alt="Spectropy Logo"
                  className="h-10 w-auto md:h-10 lg:h-12 rounded-md"
                />
              </div>
              <p className="text-xs uppercase tracking-[0.3em] text-blue-700 mt-2">
                SPECTROPY
              </p>
              <h1 className="text-lg font-semibold">Course View</h1>
            </div>
            <div className="px-4 py-3 border-b border-blue-100">
              <p>Course not found.</p>
            </div>
            <div className="p-4 border-t border-blue-100">
              <Link
                to="/student/dashboard"
                className="w-full flex items-center justify-center rounded-full border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
              >
                ← Back
              </Link>
            </div>
          </aside>
          <section className="flex-1 p-6 flex items-center justify-center">
            <p>Course not found.</p>
          </section>
        </div>
      </div>
    );
  }

  // ✅ Flatten all content items for navigation and progress
  const allContentItems = course.chapters.flatMap(chapter => chapter.content_items);
  const totalItems = allContentItems.length;
  const completedItems = allContentItems.filter(
    item => item.completion_status === 'completed'
  ).length;

  console.log("complete item", completedItems);

  // ✅ Mark item as completed via API
  const markItemCompleted = async (itemId: number) => {
    try {
      await api.post(`/student/item-attempt`, {
        content_item_id: itemId,
        completion_status: "completed"
      });
    } catch (err) {
      console.error("❌ Failed to mark item completed", err);
    }
  };

  // Find current content ID from URL (if any)
  const currentPath = window.location.pathname;
  const contentIdMatch = currentPath.match(/\/content\/(\d+)/);
  const currentContentId = contentIdMatch ? parseInt(contentIdMatch[1]) : null;

  // Determine current chapter and content title
  let currentChapterTitle = '';
  let currentContentTitle = '';
  if (currentContentId) {
    for (const chapter of course.chapters) {
      const item = chapter.content_items.find(i => i.id === currentContentId);
      if (item) {
        currentChapterTitle = chapter.title;
        currentContentTitle = item.title;
        break;
      }
    }
  }

  // Get current index for Previous/Next
  const currentIndex = currentContentId
    ? allContentItems.findIndex(item => item.id === currentContentId)
    : -1;

  const goToPrevious = () => {
    if (currentIndex > 0) {
      const prevItem = allContentItems[currentIndex - 1];
      navigate(`content/${prevItem.id}`);
    }
  };

  /*const goToNext = () => {
    if (currentIndex < allContentItems.length - 1) {
      const nextItem = allContentItems[currentIndex + 1];
      navigate(`content/${nextItem.id}`);
    }
  };*/

  const goToNext = async () => {
    if (currentIndex < 0 || currentIndex >= allContentItems.length - 1) return;

    const currentItem = allContentItems[currentIndex];

    if (currentItem.item_type !== "exam") {
      await markItemCompleted(currentItem.id);

      setCourse(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          chapters: prev.chapters.map(chapter => ({
            ...chapter,
            content_items: chapter.content_items.map(item =>
              item.id === currentItem.id
                ? { ...item, completion_status: 'completed' }
                : item
            )
          }))
        };
      });
    }

    const nextItem = allContentItems[currentIndex + 1];
    navigate(`content/${nextItem.id}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-slate-900">
      <div className="flex min-h-screen flex-col lg:flex-row">
        {mobileMenuOpen ? (
          <button
            type="button"
            aria-label="Close course menu overlay"
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 z-30 bg-slate-950/30 lg:hidden"
          />
        ) : null}

        {/* LEFT BAR - Navigation & Progress */}
        <div className={`fixed inset-y-0 left-0 z-40 flex w-[88vw] max-w-xs flex-col border-r border-blue-100 bg-white transition-transform lg:static lg:z-auto lg:w-72 lg:max-w-none lg:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          {/* Logo/Brand */}
          <div className="p-6 border-b border-blue-100">
            <div className="flex items-center space-x-2 cursor-pointer">
              <img
                src={spectropyLogo}
                alt="Spectropy Logo"
                className="h-10 w-auto md:h-10 lg:h-12 rounded-md"
              />
            </div>
            <p className="text-xs uppercase tracking-[0.3em] text-blue-700 mt-2">
              SPECTROPY
            </p>
            <h1 className="text-lg font-semibold">Course View</h1>
          </div>

          {/* ✅ PROGRESS BAR — placed exactly like admin panel */}
          <div className="px-4 pb-3 border-b border-blue-100">
            <CourseProgressBar completed={completedItems} total={totalItems} />
          </div>

          {/* Chapters & Content Items List */}
          <div className="flex-1 overflow-y-auto pr-2">
            {course.chapters.map((chapter) => (
              <div key={chapter.id} className="mb-3">
                {/* Chapter Header (Toggle) */}
                <div
                  className="font-semibold text-lg mb-1.8 flex items-center cursor-pointer p-1 rounded hover:bg-blue-50"
                  onClick={() => toggleChapter(chapter.id)}
                >
                  <span className="mr-2">
                    {expandedChapters.has(chapter.id) ? <MdExpandMore /> : <GrFormNext />}
                  </span>
                  {chapter.title}
                </div>

                {/* Content Items (Only if expanded) */}
                {expandedChapters.has(chapter.id) && (
                  <div className="pl-5 space-y-1.5">
                    {chapter.content_items.map((item) => (
                      <div
                        key={item.id}
                        className="font-semibold text-base mb-1.8 flex items-center gap-2 py-1 px-2 rounded hover:bg-blue-50 cursor-pointer"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          navigate(`content/${item.id}`);
                        }}
                      >
                        {/* ✅ Completion Tick */}
                        {item.completion_status === 'completed' && (
                          <span className="text-green-500 text-sm">✓</span>
                        )}

                        <span className="text-sm flex-1">{item.title}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-blue-100">
            <Link
              to="/student/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center justify-center rounded-full border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-2"
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
              Back to My Courses
            </Link>
          </div>
        </div>

        {/* RIGHT BAR - Content Viewer */}
        <div className="flex-1 overflow-y-auto">
          {/* Header */}
          <div className="border-b border-blue-100 bg-white px-4 py-4 sm:px-6 sm:py-6">
            <div className="mb-3 flex items-center justify-between gap-3 lg:hidden">
              <button
                type="button"
                aria-label="Open course menu"
                onClick={() => setMobileMenuOpen(true)}
                className="inline-flex items-center rounded-xl border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="mr-2 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
                Menu
              </button>
            </div>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                {/* ✅ Dynamic title: Course — Chapter: Content */}
                {currentChapterTitle && currentContentTitle ? (
                  <h1 className="text-xl font-bold">
                    {course.title} - {currentChapterTitle} : {currentContentTitle}
                  </h1>
                ) : (
                  <h1 className="text-2xl font-bold">{course.title}</h1>
                )}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  onClick={goToPrevious}
                  disabled={currentIndex <= 0}
                  className={`px-4 py-2 text-sm rounded-full border ${currentIndex <= 0
                    ? 'border-blue-100 bg-blue-50 text-blue-300 cursor-not-allowed'
                    : 'border-blue-200 text-blue-900 hover:bg-blue-50'
                    }`}
                >
                  <div className="flex items-center">
                    <TbPlayerTrackPrevFilled className="mr-1" />
                    <span>Previous</span>
                  </div>
                </button>
                <button
                  onClick={goToNext}
                  disabled={currentIndex >= allContentItems.length - 1}
                  className={`px-4 py-2 text-sm rounded-full ${currentIndex >= allContentItems.length - 1
                    ? 'bg-blue-200 text-blue-700 cursor-not-allowed'
                    : 'bg-blue-900 text-white hover:bg-blue-700'
                    }`}
                >
                  <div className="flex items-center">
                    <span className="mr-1" >Next</span>
                    <TbPlayerTrackNextFilled />
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-auto bg-white h-full">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}





