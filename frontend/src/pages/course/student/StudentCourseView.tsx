import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate, Outlet } from 'react-router-dom';
import api from '@/lib/api';
import axios from 'axios';
import spectropyLogo from "/logo.png";
import CourseProgressBar from "@/features/courses/components/player/CourseProgressBar";
import { TbPlayerTrackPrevFilled, TbPlayerTrackNextFilled } from "react-icons/tb";
import { GrFormNext } from "react-icons/gr";
import { MdExpandMore } from "react-icons/md";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

interface ContentItem {
  id: number;
  title: string;
  item_type: 'video' | 'pdf' | 'text' | 'scorm' | 'audio' | string;
  content_url: string | null;
  metadata?: Record<string, unknown> | null;
  completion_status?: string | null;
}

interface TopicFolder {
  id: number;
  title: string;
  position: number;
  content_items: ContentItem[];
}

interface Chapter {
  id: number;
  title: string;
  position: number;
  content_items: ContentItem[];
  topics: TopicFolder[];
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
  const [expandedTopics, setExpandedTopics] = useState<Set<number>>(new Set());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);

  useEffect(() => {
    const savedState = window.localStorage.getItem("student-course-left-panel-collapsed");
    if (savedState === "true") {
      setLeftPanelCollapsed(true);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("student-course-left-panel-collapsed", leftPanelCollapsed ? "true" : "false");
  }, [leftPanelCollapsed]);

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

  const toggleTopic = (topicId: number) => {
    const newExpanded = new Set(expandedTopics);
    if (newExpanded.has(topicId)) {
      newExpanded.delete(topicId);
    } else {
      newExpanded.add(topicId);
    }
    setExpandedTopics(newExpanded);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 text-slate-900">
        <div className="flex min-h-screen flex-col lg:flex-row">
          <aside className="w-full border-b border-blue-100 bg-white lg:w-72 lg:border-b-0 lg:border-r">
            <div className="border-b border-blue-100 p-6">
              <div className="flex items-center space-x-2 cursor-pointer">
                <img
                  src={spectropyLogo}
                  alt="Spectropy Logo"
                  className="h-10 w-auto md:h-10 lg:h-12 rounded-md"
                />
              </div>
              <p className="mt-2 text-xs uppercase tracking-[0.3em] text-blue-700">
                SPECTROPY
              </p>
              <h1 className="text-lg font-semibold">Course View</h1>
            </div>
            <div className="border-b border-blue-100 px-4 py-3">
              <p className="text-sm text-slate-600">Loading course content...</p>
            </div>
            <div className="border-t border-blue-100 p-4">
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
            <div className="border-b border-blue-100 p-6">
              <div className="flex items-center space-x-2 cursor-pointer">
                <img
                  src={spectropyLogo}
                  alt="Spectropy Logo"
                  className="h-10 w-auto md:h-10 lg:h-12 rounded-md"
                />
              </div>
              <p className="mt-2 text-xs uppercase tracking-[0.3em] text-blue-700">
                SPECTROPY
              </p>
              <h1 className="text-lg font-semibold">Course View</h1>
            </div>
            <div className="border-b border-blue-100 px-4 py-3">
              <p className="text-red-600">Error: {error}</p>
            </div>
            <div className="border-t border-blue-100 p-4">
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
            <div className="border-b border-blue-100 p-6">
              <div className="flex items-center space-x-2 cursor-pointer">
                <img
                  src={spectropyLogo}
                  alt="Spectropy Logo"
                  className="h-10 w-auto md:h-10 lg:h-12 rounded-md"
                />
              </div>
              <p className="mt-2 text-xs uppercase tracking-[0.3em] text-blue-700">
                SPECTROPY
              </p>
              <h1 className="text-lg font-semibold">Course View</h1>
            </div>
            <div className="border-b border-blue-100 px-4 py-3">
              <p>Course not found.</p>
            </div>
            <div className="border-t border-blue-100 p-4">
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

  const allContentItems = course.chapters.flatMap((chapter) => [
    ...chapter.content_items,
    ...chapter.topics.flatMap((topic) => topic.content_items),
  ]);
  const totalItems = allContentItems.length;
  const completedItems = allContentItems.filter(
    item => item.completion_status === 'completed'
  ).length;

  const markItemCompleted = async (itemId: number) => {
    try {
      await api.post(`/student/item-attempt`, {
        content_item_id: itemId,
        completion_status: "completed"
      });
    } catch (err) {
      console.error("Failed to mark item completed", err);
    }
  };

  const currentPath = window.location.pathname;
  const contentIdMatch = currentPath.match(/\/content\/(\d+)/);
  const currentContentId = contentIdMatch ? parseInt(contentIdMatch[1], 10) : null;

  let currentChapterTitle = '';
  let currentTopicTitle = '';
  let currentContentTitle = '';
  if (currentContentId) {
    for (const chapter of course.chapters) {
      const directItem = chapter.content_items.find((item) => item.id === currentContentId);
      if (directItem) {
        currentChapterTitle = chapter.title;
        currentContentTitle = directItem.title;
        break;
      }

      for (const topic of chapter.topics) {
        const topicItem = topic.content_items.find((item) => item.id === currentContentId);
        if (topicItem) {
          currentChapterTitle = chapter.title;
          currentTopicTitle = topic.title;
          currentContentTitle = topicItem.title;
          break;
        }
      }

      if (currentContentTitle) {
        break;
      }
    }
  }

  const currentIndex = currentContentId
    ? allContentItems.findIndex(item => item.id === currentContentId)
    : -1;

  const goToPrevious = () => {
    if (currentIndex > 0) {
      const prevItem = allContentItems[currentIndex - 1];
      navigate(`content/${prevItem.id}`);
    }
  };

  const goToNext = async () => {
    if (currentIndex < 0 || currentIndex >= allContentItems.length - 1) return;

    const currentItem = allContentItems[currentIndex];

    if (currentItem.item_type !== "exam") {
      await markItemCompleted(currentItem.id);

      setCourse(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          chapters: prev.chapters.map((chapter) => ({
            ...chapter,
            content_items: chapter.content_items.map((item) =>
              item.id === currentItem.id
                ? { ...item, completion_status: 'completed' }
                : item
            ),
            topics: chapter.topics.map((topic) => ({
              ...topic,
              content_items: topic.content_items.map((item) =>
                item.id === currentItem.id
                  ? { ...item, completion_status: 'completed' }
                  : item
              ),
            })),
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

        <div className={`fixed inset-y-0 left-0 z-40 flex w-[88vw] max-w-xs flex-col border-r border-blue-100 bg-white transition-transform lg:static lg:z-auto lg:max-w-none lg:translate-x-0 ${leftPanelCollapsed ? 'lg:w-16' : 'lg:w-72'} ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          {leftPanelCollapsed ? (
            <div className="hidden h-full flex-col items-center py-3 lg:flex">
              <button
                type="button"
                onClick={() => setLeftPanelCollapsed(false)}
                className="flex items-center justify-center rounded-md border border-blue-200 p-2 text-blue-700 hover:bg-blue-50"
                aria-label="Expand course panel"
              >
                <FiChevronRight className="text-lg" />
              </button>
              <div className="mt-4 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 [writing-mode:vertical-rl] [transform:rotate(180deg)]">
                Course View
              </div>
            </div>
          ) : (
            <>
              <div className="border-b border-blue-100 p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2 cursor-pointer">
                      <img
                        src={spectropyLogo}
                        alt="Spectropy Logo"
                        className="h-10 w-auto md:h-10 lg:h-12 rounded-md"
                      />
                    </div>
                    <p className="mt-2 text-xs uppercase tracking-[0.3em] text-blue-700">
                      SPECTROPY
                    </p>
                    <h1 className="text-lg font-semibold whitespace-normal break-words leading-snug">Course View</h1>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLeftPanelCollapsed(true)}
                    className="hidden shrink-0 lg:flex items-center justify-center rounded-md border border-blue-200 p-1.5 text-blue-700 hover:bg-blue-50"
                    aria-label="Collapse course panel"
                  >
                    <FiChevronLeft className="text-base" />
                  </button>
                </div>
              </div>

              <div className="border-b border-blue-100 px-4 pb-3">
                <CourseProgressBar completed={completedItems} total={totalItems} />
              </div>

              <div className="flex-1 overflow-y-auto pr-2">
                {course.chapters.map((chapter) => (
                  <div key={chapter.id} className="mb-3">
                    <div
                      className="mb-1.5 flex cursor-pointer items-start rounded p-1 font-semibold text-lg hover:bg-blue-50"
                      onClick={() => toggleChapter(chapter.id)}
                    >
                      <span className="mr-2 mt-0.5 shrink-0">
                        {expandedChapters.has(chapter.id) ? <MdExpandMore /> : <GrFormNext />}
                      </span>
                      <span className="min-w-0 whitespace-normal break-words leading-snug">{chapter.title}</span>
                    </div>

                    {expandedChapters.has(chapter.id) && (
                      <div className="pl-5 space-y-1.5">
                        {chapter.topics.map((topic) => (
                          <div key={topic.id} className="rounded border border-blue-100 bg-blue-50/40">
                            <button
                              type="button"
                              onClick={() => toggleTopic(topic.id)}
                              className="flex w-full items-start rounded px-2 py-2 text-left text-base font-semibold hover:bg-blue-50"
                            >
                              <span className="mr-2 mt-0.5 shrink-0">
                                {expandedTopics.has(topic.id) ? <MdExpandMore /> : <GrFormNext />}
                              </span>
                              <span className="min-w-0 whitespace-normal break-words leading-snug">{topic.title}</span>
                            </button>

                            {expandedTopics.has(topic.id) && (
                              <div className="space-y-1.5 border-t border-blue-100 bg-white px-3 py-2">
                                {topic.content_items.map((item) => (
                                  <div
                                    key={item.id}
                                    className="flex cursor-pointer items-start gap-2 rounded px-2 py-1 hover:bg-blue-50"
                                    onClick={() => {
                                      setMobileMenuOpen(false);
                                      navigate(`content/${item.id}`);
                                    }}
                                  >
                                    {item.completion_status === 'completed' && (
                                      <span className="mt-0.5 shrink-0 text-sm text-green-500">✓</span>
                                    )}
                                    <span className="min-w-0 flex-1 whitespace-normal break-words text-sm leading-snug">{item.title}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}

                        {chapter.content_items.map((item) => (
                          <div
                            key={item.id}
                            className="flex cursor-pointer items-start gap-2 rounded px-2 py-1 hover:bg-blue-50"
                            onClick={() => {
                              setMobileMenuOpen(false);
                              navigate(`content/${item.id}`);
                            }}
                          >
                            {item.completion_status === 'completed' && (
                              <span className="mt-0.5 shrink-0 text-sm text-green-500">✓</span>
                            )}
                            <span className="min-w-0 flex-1 whitespace-normal break-words text-sm font-semibold leading-snug">{item.title}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="border-t border-blue-100 p-4">
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
            </>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
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
                {currentChapterTitle && currentContentTitle ? (
                  <h1 className="text-xl font-bold whitespace-normal break-words leading-snug">
                    {course.title} - {currentChapterTitle}
                    {currentTopicTitle ? ` : ${currentTopicTitle}` : ""}
                    {` : ${currentContentTitle}`}
                  </h1>
                ) : (
                  <h1 className="text-2xl font-bold whitespace-normal break-words leading-snug">{course.title}</h1>
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

          <div className="flex-1 overflow-auto bg-white h-full">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
