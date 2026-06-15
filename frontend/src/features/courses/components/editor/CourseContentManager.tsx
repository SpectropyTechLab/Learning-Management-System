import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import LeftPanel from "./LeftPanel";
import ContentViewer from "@/features/courses/components/player/ContentViewer";
import toast from "react-hot-toast";
import { SlControlPlay, SlControlRewind } from "react-icons/sl";

interface ContentItem {
  id: number;
  course_id: number;
  parent_id: number | null;
  item_type: string;
  title: string;
  content_url?: string | null;
  metadata?: Record<string, unknown> | null;
  order_index: number;
  created_at: string;
  completion_status?: string | null;
  is_linked_content?: boolean;
  linked_content_id?: number | null;
  source_pack_id?: number | null;
  download_allowed?: boolean;
  link_origin?: "course" | "licensed_pack";
  is_editable?: boolean;
  is_linked_to_course?: boolean;
}

interface ExamOption {
  id: number;
  title: string;
  status?: string | null;
}

interface FolderNode {
  id: number;
  title: string;
  items: ContentItem[];
  folders: FolderNode[];
}

type Chapter = FolderNode;

interface LicensedPack {
  id: number;
  name: string;
  description?: string | null;
  item_count: number;
}

const ITEM_TYPES = [
  { value: "folder", label: "Chapter (Folder)" },
  { value: "video", label: "Video" },
  { value: "audio", label: "Audio File" },
  { value: "pdf", label: "PDF Document" },
  { value: "scorm", label: "SCORM Package" },
  { value: "html", label: "HTML Lesson" },
  { value: "text", label: "Text File" },
  { value: "link", label: "External Link" },
  { value: "exam", label: "Exam" },
];

const FILE_UPLOAD_TYPES = ["video", "audio", "pdf", "scorm", "html", "text"];
const URL_ONLY_TYPES = ["link"];
const EXAM_ITEM_TYPES = ["exam"];

type CourseContentManagerProps = {
  courseId?: string | number;
  apiPrefix?: string;
  readOnly?: boolean;
  disableFetch?: boolean;
  initialItems?: ContentItem[];
  onBack?: () => void;
  panelTitle?: string;
};

export default function CourseContentManager({
  courseId,
  apiPrefix = "/admin",
  readOnly = false,
  disableFetch = false,
  initialItems,
  onBack,
  panelTitle = "Course Content",
}: CourseContentManagerProps) {
  const navigate = useNavigate();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedParentId, setSelectedParentId] = useState<number | null>(null);
  const [selectedParentLabel, setSelectedParentLabel] = useState("");

  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [itemType, setItemType] = useState("video");
  const [itemTitle, setItemTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [publicUrl, setPublicUrl] = useState("");
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [examSearch, setExamSearch] = useState("");
  const [availableExams, setAvailableExams] = useState<ExamOption[]>([]);
  const [loadingExams, setLoadingExams] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [allItems, setAllItems] = useState<ContentItem[]>([]);

  const [showUpdateFileModal, setShowUpdateFileModal] = useState(false);
  const [itemToUpdate, setItemToUpdate] = useState<ContentItem | null>(null);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [leftPanelOpen, setLeftPanelOpen] = useState(false);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [showLicensedContentModal, setShowLicensedContentModal] = useState(false);
  const [licensedPacks, setLicensedPacks] = useState<LicensedPack[]>([]);
  const [selectedPackId, setSelectedPackId] = useState<number | null>(null);
  const [licensedItems, setLicensedItems] = useState<ContentItem[]>([]);
  const [licensedSearchResults, setLicensedSearchResults] = useState<ContentItem[]>([]);
  const [licensedSearch, setLicensedSearch] = useState("");
  const [loadingLicensedPacks, setLoadingLicensedPacks] = useState(false);
  const [loadingLicensedItems, setLoadingLicensedItems] = useState(false);
  const [linkingLicensedContent, setLinkingLicensedContent] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);
  const [isLandscape, setIsLandscape] = useState(() => window.matchMedia("(orientation: landscape)").matches);

  const [chapterTitle, setChapterTitle] = useState("");
  const [addingChapter, setAddingChapter] = useState(false);
  const [topicTitle, setTopicTitle] = useState("");
  const [addingTopic, setAddingTopic] = useState(false);
  const [topicParentFolderId, setTopicParentFolderId] = useState<number | null>(null);
  const [courseMeta, setCourseMeta] = useState<{ can_manage_content?: boolean } | null>(null);

  const normalizedPrefix = apiPrefix.startsWith("/") ? apiPrefix : `/${apiPrefix}`;
  const resolvedCourseId = courseId ? String(courseId) : "";
  const serverReadOnly = courseMeta?.can_manage_content === false;
  const canEdit = !readOnly && !serverReadOnly && !disableFetch;
  const canLinkLicensedContent = false;

  const items = useMemo(() => allItems, [allItems]);
  const filteredExamOptions = useMemo(() => {
    const q = examSearch.trim().toLowerCase();
    if (!q) return availableExams;
    return availableExams.filter((exam) => exam.title.toLowerCase().includes(q));
  }, [availableExams, examSearch]);
  const currentIndex = items.findIndex((i) => i.id === selectedItem?.id);
  const isFirstItem = currentIndex <= 0;
  const isPdfSelected = selectedItem?.item_type === "pdf";
  const isScormSelected = selectedItem?.item_type === "scorm";
  const isMobileLandscapeScorm = isScormSelected && viewportWidth < 1024 && isLandscape;

  useEffect(() => {
    const updateViewport = () => setViewportWidth(window.innerWidth);
    const mediaQuery = window.matchMedia("(orientation: landscape)");
    const updateOrientation = () => setIsLandscape(mediaQuery.matches);
    updateViewport();
    updateOrientation();
    window.addEventListener("resize", updateViewport);
    mediaQuery.addEventListener("change", updateOrientation);
    return () => {
      window.removeEventListener("resize", updateViewport);
      mediaQuery.removeEventListener("change", updateOrientation);
    };
  }, []);

  const goToNext = () => {
    if (!selectedItem) return;
    const index = items.findIndex((i) => i.id === selectedItem.id);
    if (index < items.length - 1) {
      setSelectedItem(items[index + 1]);
    }
  };

  const goToPrevious = () => {
    if (!selectedItem) return;
    const index = items.findIndex((i) => i.id === selectedItem.id);
    if (index > 0) {
      setSelectedItem(items[index - 1]);
    }
  };

  const closeMobileLeftPanel = () => {
    setLeftPanelOpen(false);
  };

  const syncContentState = (itemsToSync: ContentItem[]) => {
    const buildFolderTree = (parentId: number | null): FolderNode[] =>
      itemsToSync
        .filter((item) => item.parent_id === parentId && item.item_type === "folder")
        .map((folder) => ({
          id: folder.id,
          title: folder.title,
          items: itemsToSync.filter((item) => item.parent_id === folder.id && item.item_type !== "folder"),
          folders: buildFolderTree(folder.id),
        }));

    const chapterMap: Chapter[] = buildFolderTree(null);

    setChapters(chapterMap);
    setAllItems(itemsToSync.filter((i: ContentItem) => i.item_type !== "folder"));
  };

  const fetchContent = async () => {
    if (!resolvedCourseId) return;
    setLoading(true);
    try {
      const res = await api.get(`${normalizedPrefix}/courses/${resolvedCourseId}/content`);
      const payload = res.data;
      const itemsToSync = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.items)
          ? payload.items
          : [];

      setCourseMeta(!Array.isArray(payload) && payload?.course ? payload.course : null);
      syncContentState(itemsToSync);
    } catch (err) {
      console.error("Failed to load course content", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchExamOptions = async () => {
    if (!canEdit || loadingExams || availableExams.length > 0) return;
    setLoadingExams(true);
    try {
      const res = await api.get("/exams", {
        params: {
          page: 1,
          page_size: 200,
        },
      });

      const list = Array.isArray(res.data?.data) ? res.data.data : [];
      const normalized: ExamOption[] = list
        .map((item: Record<string, unknown>) => ({
          id: Number(item.id),
          title: String(item.title ?? "Untitled Exam"),
          status: item.status ? String(item.status) : null,
        }))
        .filter((item: ExamOption) => Number.isInteger(item.id) && item.id > 0);

      setAvailableExams(normalized);
    } catch (err) {
      console.error("Failed to load exam list", err);
      toast.error("Unable to load exams for selection.");
    } finally {
      setLoadingExams(false);
    }
  };

  const fetchLicensedPacks = async () => {
    if (!canLinkLicensedContent) return;
    setLoadingLicensedPacks(true);
    try {
      const res = await api.get("/client/licensed-packs", {
        params: { page: 1, page_size: 100 },
      });
      const packs = Array.isArray(res.data?.data) ? res.data.data : [];
      setLicensedPacks(packs);
      if (!selectedPackId && packs.length > 0) {
        setSelectedPackId(Number(packs[0].id));
      }
    } catch (err) {
      console.error("Failed to load licensed packs", err);
      toast.error("Unable to load licensed packs.");
    } finally {
      setLoadingLicensedPacks(false);
    }
  };

  const fetchLicensedPackItems = async (packId: number) => {
    if (!canLinkLicensedContent) return;
    setLoadingLicensedItems(true);
    try {
      const res = await api.get(`/client/licensed-packs/${packId}/items`, {
        params: { page: 1, page_size: 200, course_id: resolvedCourseId },
      });
      setLicensedItems(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err) {
      console.error("Failed to load licensed pack items", err);
      toast.error("Unable to load licensed pack items.");
    } finally {
      setLoadingLicensedItems(false);
    }
  };

  const searchLicensedContent = async (searchValue: string) => {
    if (!canLinkLicensedContent) return;
    const normalized = searchValue.trim();
    if (!normalized) {
      setLicensedSearchResults([]);
      return;
    }

    try {
      const res = await api.get("/client/licensed-content", {
        params: {
          q: normalized,
          page: 1,
          page_size: 50,
          pack_id: selectedPackId ?? undefined,
        },
      });
      setLicensedSearchResults(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err) {
      console.error("Failed to search licensed content", err);
      toast.error("Unable to search licensed content.");
    }
  };

  const handleLinkLicensedItem = async (item: ContentItem) => {
    if (!canLinkLicensedContent || selectedParentId === null || !resolvedCourseId) return;
    setLinkingLicensedContent(true);
    try {
      await api.post(`/admin/courses/${resolvedCourseId}/linked-content`, {
        content_item_id: item.id,
        source_pack_id: selectedPackId,
        parent_content_id: selectedParentId,
      });
      toast.success("Licensed content added to the course.");
      setShowLicensedContentModal(false);
      setLicensedSearch("");
      setLicensedSearchResults([]);
      await fetchContent();
    } catch (err: any) {
      const message = err?.response?.data?.error || "Failed to add licensed content.";
      toast.error(String(message));
    } finally {
      setLinkingLicensedContent(false);
    }
  };

  const handleLinkLicensedPack = async () => {
    if (!canLinkLicensedContent || selectedParentId === null || !resolvedCourseId || !selectedPackId) return;
    setLinkingLicensedContent(true);
    try {
      await api.post(`/admin/courses/${resolvedCourseId}/linked-content/bulk`, {
        pack_id: selectedPackId,
        parent_content_id: selectedParentId,
      });
      toast.success("Licensed pack added to the course.");
      setShowLicensedContentModal(false);
      await fetchContent();
    } catch (err: any) {
      const message = err?.response?.data?.error || "Failed to add licensed pack.";
      toast.error(String(message));
    } finally {
      setLinkingLicensedContent(false);
    }
  };

  const handleRemoveLinkedItem = async (item: ContentItem) => {
    if (!canLinkLicensedContent || !resolvedCourseId || !item.linked_content_id) return;
    try {
      await api.delete(`/admin/courses/${resolvedCourseId}/linked-content/${item.linked_content_id}`);
      toast.success("Licensed content removed from the course.");
      await fetchContent();
    } catch (err: any) {
      const message = err?.response?.data?.error || "Failed to remove licensed content.";
      toast.error(String(message));
    }
  };

  useEffect(() => {
    const savedState = window.localStorage.getItem("course-left-panel-collapsed");
    if (savedState === "true") {
      setLeftPanelCollapsed(true);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("course-left-panel-collapsed", leftPanelCollapsed ? "true" : "false");
  }, [leftPanelCollapsed]);

  useEffect(() => {
    if (!resolvedCourseId) return;

    if (disableFetch) {
      if (initialItems) {
        syncContentState(initialItems);
      } else {
        setChapters([]);
        setAllItems([]);
      }
      return;
    }

    fetchContent();
  }, [resolvedCourseId, disableFetch, initialItems]);

  useEffect(() => {
    if (!showAddItemModal) return;
    if (!EXAM_ITEM_TYPES.includes(itemType)) return;
    void fetchExamOptions();
  }, [showAddItemModal, itemType]);

  useEffect(() => {
    if (!showLicensedContentModal || !canLinkLicensedContent) return;
    void fetchLicensedPacks();
  }, [showLicensedContentModal, canLinkLicensedContent]);

  useEffect(() => {
    if (!showLicensedContentModal || !selectedPackId || !canLinkLicensedContent) return;
    void fetchLicensedPackItems(selectedPackId);
  }, [showLicensedContentModal, selectedPackId, canLinkLicensedContent]);

  useEffect(() => {
    if (!showLicensedContentModal || !canLinkLicensedContent) return;
    void searchLicensedContent(licensedSearch);
  }, [licensedSearch, selectedPackId, showLicensedContentModal, canLinkLicensedContent]);

  const handleReplaceFile = async () => {
    if (!itemToUpdate || !canEdit || !resolvedCourseId) return;
    setIsUpdating(true);

    const formData = new FormData();
    formData.append("title", itemToUpdate.title);
    if (newFile) {
      formData.append("file", newFile);
    }

    try {
      const res = await api.put(
        `${normalizedPrefix}/courses/${resolvedCourseId}/content/${itemToUpdate.id}/file`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      const updatedUrl = res.data?.content_url;
      const updatedType = res.data?.item?.item_type || itemToUpdate.item_type;

      setChapters((prev) =>
        prev.map((ch) => ({
          ...ch,
          items: ch.items.map((i: ContentItem) =>
            i.id === itemToUpdate.id
              ? {
                ...i,
                title: itemToUpdate.title,
                content_url: updatedUrl || i.content_url,
                item_type: updatedType,
              }
              : i
          ),
        }))
      );

      setAllItems((prev) =>
        prev.map((i) =>
          i.id === itemToUpdate.id
            ? {
              ...i,
              title: itemToUpdate.title,
              content_url: updatedUrl || i.content_url,
              item_type: updatedType,
            }
            : i
        )
      );

      if (selectedItem?.id === itemToUpdate.id) {
        setSelectedItem((prev) =>
          prev
            ? {
              ...prev,
              title: itemToUpdate.title,
              content_url: updatedUrl || prev.content_url,
              item_type: updatedType,
            }
            : null
        );
      }

      setShowUpdateFileModal(false);
      setItemToUpdate(null);
      setNewFile(null);
      alert("Item updated successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to update item");
    } finally {
      setIsUpdating(false);
    }
  };

  const openReplaceModal = (item: ContentItem) => {
    if (!canEdit) return;
    if (item.is_linked_content) {
      toast.error("Licensed content is read-only.");
      return;
    }
    setItemToUpdate(item);
    setShowUpdateFileModal(true);
  };

  const handleAddChapter = async () => {
    if (!canEdit || !resolvedCourseId) return;
    if (!chapterTitle.trim()) {
      alert("Enter a chapter title");
      return;
    }

    await api.post(`${normalizedPrefix}/courses/${resolvedCourseId}/content`, {
      item_type: "folder",
      title: chapterTitle.trim(),
      parent_id: null,
    });

    setChapterTitle("");
    setAddingChapter(false);
    fetchContent();
  };

  const handleAddTopic = async () => {
    if (!canEdit || !resolvedCourseId || topicParentFolderId === null) return;
    if (!topicTitle.trim()) {
      alert("Enter a topic title");
      return;
    }

    await api.post(`${normalizedPrefix}/courses/${resolvedCourseId}/content`, {
      item_type: "folder",
      title: topicTitle.trim(),
      parent_id: topicParentFolderId,
    });

    setTopicTitle("");
    setTopicParentFolderId(null);
    setAddingTopic(false);
    fetchContent();
  };

  const handleAddItem = async (parentId: number) => {
    if (!canEdit || !resolvedCourseId) {
      toast.error("Read-only mode");
      return;
    }

    const normalizedTitle = itemTitle.trim();

    if (!EXAM_ITEM_TYPES.includes(itemType) && !normalizedTitle) {
      toast.error("Enter a title");
      return;
    }

    setShowAddItemModal(false);
    try {
      if (FILE_UPLOAD_TYPES.includes(itemType)) {
        if (!selectedFile) {
          toast.error("Please select a file");
          return;
        }

        const uploadToast = toast.loading("Uploading content...");

        const formData = new FormData();
        formData.append("item_type", itemType);
        formData.append("title", normalizedTitle);
        formData.append("parent_id", parentId.toString());
        formData.append("file", selectedFile);

        await api.post(
          `${normalizedPrefix}/courses/${resolvedCourseId}/content/upload`,
          formData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );

        toast.success("Item added successfully!", { id: uploadToast });
      } else if (URL_ONLY_TYPES.includes(itemType)) {
        if (!publicUrl.trim()) {
          toast.error("Please enter a valid URL");
          return;
        }

        const uploadToast = toast.loading("Adding link...");

        await api.post(`${normalizedPrefix}/courses/${resolvedCourseId}/content`, {
          item_type: itemType,
          title: normalizedTitle,
          parent_id: parentId,
          content_url: publicUrl.trim(),
        });

        toast.success("Link added successfully!", { id: uploadToast });
      } else if (EXAM_ITEM_TYPES.includes(itemType)) {
        if (!selectedExamId) {
          toast.error("Select an exam");
          return;
        }

        const selectedExam = availableExams.find((exam) => exam.id === selectedExamId);
        const uploadToast = toast.loading("Adding exam...");

        await api.post(`${normalizedPrefix}/courses/${resolvedCourseId}/content`, {
          item_type: "exam",
          title: normalizedTitle || selectedExam?.title || "Exam",
          parent_id: parentId,
          exam_id: selectedExamId,
        });

        toast.success("Exam item added successfully!", { id: uploadToast });
      }

      setItemTitle("");
      setSelectedFile(null);
      setPublicUrl("");
      setSelectedExamId(null);
      setExamSearch("");
      fetchContent();
    } catch (err) {
      console.error("Failed to add item:", err);
      toast.error("Failed to add item");
    }
  };

  const persistReorder = async (
    parentId: number | null,
    itemIds: number[],
    reorderScope: "chapters" | "topics" | "items",
  ) => {
    if (!resolvedCourseId || !canEdit) return;

    try {
      await api.put(`${normalizedPrefix}/courses/${resolvedCourseId}/content/reorder`, {
        parent_id: parentId,
        reorder_scope: reorderScope,
        item_ids: itemIds,
      });
      await fetchContent();
    } catch (err) {
      console.error("Failed to persist course content order:", err);
      toast.error("Failed to save content order.");
      await fetchContent();
    }
  };

  const handleReorderChapters = (newOrder: Chapter[]) => {
    setChapters(newOrder);
    void persistReorder(null, newOrder.map((chapter) => chapter.id), "chapters");
  };

  const handleReorderItems = (chapterId: number, newItems: ContentItem[]) => {
    setChapters((prev) =>
      prev.map((ch) => (ch.id === chapterId ? { ...ch, items: newItems } : ch))
    );
    void persistReorder(chapterId, newItems.map((item) => item.id), "items");
  };

  const replaceFolderChildren = (folders: FolderNode[], targetId: number, newFolders: FolderNode[]): FolderNode[] =>
    folders.map((folder) =>
      folder.id === targetId
        ? { ...folder, folders: newFolders }
        : { ...folder, folders: replaceFolderChildren(folder.folders, targetId, newFolders) }
    );

  const replaceFolderItems = (folders: FolderNode[], targetId: number, newItems: ContentItem[]): FolderNode[] =>
    folders.map((folder) =>
      folder.id === targetId
        ? { ...folder, items: newItems }
        : {
            ...folder,
            folders: replaceFolderItems(folder.folders, targetId, newItems),
          }
    );

  const handleReorderTopics = (chapterId: number, newTopics: FolderNode[]) => {
    setChapters((prev) => replaceFolderChildren(prev, chapterId, newTopics));
    void persistReorder(chapterId, newTopics.map((topic) => topic.id), "topics");
  };

  const handleReorderTopicItems = (topicId: number, newItems: ContentItem[]) => {
    setChapters((prev) => replaceFolderItems(prev, topicId, newItems));
    void persistReorder(topicId, newItems.map((item) => item.id), "items");
  };

  if (!resolvedCourseId) {
    return (
      <div className="p-6 text-sm text-gray-500">
        Course not found. Please return to the courses page.
      </div>
    );
  }

  return (
    <div className={`flex h-screen w-full overflow-hidden bg-slate-50 ${isMobileLandscapeScorm ? "flex-col" : ""}`}>
      {!isMobileLandscapeScorm && leftPanelOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setLeftPanelOpen(false)}
        />
      )}

      <div
        className={`
          fixed md:static
          inset-y-0 left-0
          z-50
          w-[320px]
          border-r border-gray-200 bg-white
          shrink-0
          transform transition-transform duration-300
          ${leftPanelOpen ? "translate-x-0" : "-translate-x-full"}
          ${leftPanelCollapsed ? "md:w-16" : "md:w-[320px]"}
          md:translate-x-0
          ${isMobileLandscapeScorm ? "hidden" : ""}
        `}
      >
        <LeftPanel
          courseId={resolvedCourseId}
          chapters={chapters}
          allItems={items}
          selectedItemId={selectedItem?.id}
          readOnly={!canEdit}
          apiPrefix={normalizedPrefix}
          onBack={onBack || (() => {
            if (normalizedPrefix.includes("/admin")) {
              navigate("/admin/courses");
            } else if (normalizedPrefix.includes("/school-owner")) {
              navigate("/school-owner/courses");
            } else {
              navigate(`/courses/${resolvedCourseId}`);
            }
          })}
          panelTitle={panelTitle}
          collapsed={leftPanelCollapsed}
          onToggleCollapsed={() => setLeftPanelCollapsed((prev) => !prev)}
          onCloseMobile={closeMobileLeftPanel}
          onSelectItem={(item: ContentItem) => {
            setSelectedItem(item);
            setLeftPanelOpen(false);
          }}
          onAddChapter={() => {
            closeMobileLeftPanel();
            setAddingChapter(true);
          }}
          onAddTopic={(chapterId, chapterTitleValue) => {
            closeMobileLeftPanel();
            setTopicParentFolderId(chapterId);
            setTopicTitle("");
            setSelectedParentLabel(chapterTitleValue);
            setAddingTopic(true);
          }}
          onAddItem={(id, parentLabel) => {
            closeMobileLeftPanel();
            setSelectedParentId(id);
            setSelectedParentLabel(parentLabel);
            setItemType("video");
            setItemTitle("");
            setSelectedFile(null);
            setPublicUrl("");
            setSelectedExamId(null);
            setExamSearch("");
            setShowAddItemModal(true);
          }}
          onAddLicensedContent={canLinkLicensedContent ? (id, parentLabel) => {
            setSelectedParentId(id);
            setSelectedParentLabel(parentLabel);
            setLicensedSearch("");
            setLicensedSearchResults([]);
            setShowLicensedContentModal(true);
          } : undefined}
          onReorderChapters={handleReorderChapters}
          onReorderItems={handleReorderItems}
          onReorderTopics={handleReorderTopics}
          onReorderTopicItems={handleReorderTopicItems}
          onUpdateFile={openReplaceModal}
          onRemoveLinkedItem={canLinkLicensedContent ? handleRemoveLinkedItem : undefined}
          onRefreshContent={fetchContent}
          hideProgress
        />
      </div>

      <div className={`flex-1 shrink-0 overflow-hidden flex flex-col bg-white ${isMobileLandscapeScorm ? "w-full" : ""}`}>
        <div className={`w-full border-b border-gray-200 bg-white ${isMobileLandscapeScorm ? "hidden" : (isPdfSelected ? "px-3 pt-2 pb-1.5 md:px-4 md:pt-2.5 md:pb-1.5" : "px-4 pt-4 pb-2.5")}`}>
          <div className={`flex items-center gap-3 md:flex-row md:justify-between md:items-center ${isPdfSelected ? "mb-1" : "mb-3 md:mb-0"}`}>
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setLeftPanelOpen(true)}
                className={`md:hidden p-2 border rounded-md border-gray-300"
                  }`}
                aria-label="Open course syllabus"
              >
                Menu
              </button>

              <h1 className={`${isPdfSelected ? "text-base md:text-lg" : "text-lg md:text-xl"} font-semibold truncate`}>
                {selectedItem ? selectedItem.title.toUpperCase() : ""}
              </h1>
            </div>

            <div className="hidden md:flex items-center gap-4">
              <button
                onClick={goToPrevious}
                disabled={!selectedItem || isFirstItem}
                className={`flex items-center gap-2 py-2 rounded-md border justify-center transition-all duration-200 text-xs w-20 bg-blue-900 text-white
                  }
                ${!selectedItem || isFirstItem
                    ? "opacity-40 cursor-not-allowed"
                    : "hover:bg-blue-700 hover:border-gray-300 active:scale-95"
                  }`}
              >
                <SlControlRewind /> Previous
              </button>

              <button
                onClick={goToNext}
                disabled={!selectedItem}
                className={`flex items-center gap-2 py-2 rounded-md border justify-center transition-all duration-200 text-xs w-20 bg-blue-900 text-white
                  }
                ${!selectedItem
                    ? "opacity-40 cursor-not-allowed"
                    : "hover:bg-blue-700 hover:border-gray-300 active:scale-95"
                  }`}
              >
                Next <SlControlPlay />
              </button>
            </div>
          </div>

          <div className={`flex justify-end gap-3 md:hidden ${isPdfSelected ? "mt-1" : "mt-2"}`}>
            <button
              onClick={goToPrevious}
              disabled={!selectedItem || isFirstItem}
              className={`p-2 rounded-md border bg-blue-900 text-white"
                }
              ${!selectedItem || isFirstItem ? "opacity-40 cursor-not-allowed" : "active:scale-95"}`}
              aria-label="Previous"
            >
              <SlControlRewind />
            </button>

            <button
              onClick={goToNext}
              disabled={!selectedItem}
              className={`p-2 rounded-md border bg-blue-900 text-white"
                }
              ${!selectedItem ? "opacity-40 cursor-not-allowed" : "active:scale-95"}`}
              aria-label="Next"
            >
              <SlControlPlay />
            </button>
          </div>
        </div>

        {!selectedItem ? (
          <p className="text-gray-400 text-center mt-20">Select a chapter</p>
        ) : (
          <ContentViewer item={selectedItem} />
        )}
      </div>

      {showAddItemModal && canEdit && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center">
          <div
            className={`bg-white w-96 p-6 rounded shadow-lg 
              }`}
          >
            <h3 className="text-lg font-semibold mb-4">Add Item</h3>

            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Adding to {selectedParentLabel || "Selected Content Folder"}
            </p>

            <select
              value={itemType}
              onChange={(e) => setItemType(e.target.value)}
              className={`w-full p-2 border rounded mb-3 border-gray-300
                }`}
            >
              {ITEM_TYPES.filter((t) => t.value !== "folder").map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>

            <input
              type="text"
              value={itemTitle}
              onChange={(e) => setItemTitle(e.target.value)}
              placeholder={EXAM_ITEM_TYPES.includes(itemType) ? "Display title (optional)" : "Content Name"}
              className={`w-full p-2 border rounded mb-3 border-gray-300
                }`}
            />

            {EXAM_ITEM_TYPES.includes(itemType) && (
              <div className="mb-3">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Select Exam
                </label>
                <input
                  type="text"
                  value={examSearch}
                  onChange={(event) => setExamSearch(event.target.value)}
                  placeholder="Type exam name to filter"
                  className="mb-2 w-full rounded border border-gray-300 p-2 text-sm"
                />
                <select
                  value={selectedExamId ?? ""}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    const normalizedExamId = Number.isInteger(value) && value > 0 ? value : null;
                    setSelectedExamId(normalizedExamId);
                    if (!itemTitle.trim() && normalizedExamId) {
                      const selectedExam = availableExams.find((entry) => entry.id === normalizedExamId);
                      if (selectedExam) {
                        setItemTitle(selectedExam.title);
                      }
                    }
                  }}
                  className="w-full rounded border border-gray-300 p-2 text-sm"
                  disabled={loadingExams}
                >
                  <option value="">Choose exam</option>
                  {filteredExamOptions.map((exam) => (
                    <option key={exam.id} value={exam.id}>
                      {exam.title}
                      {exam.status ? ` (${exam.status})` : ""}
                    </option>
                  ))}
                </select>
                {loadingExams && <p className="mt-1 text-xs text-slate-500">Loading exams...</p>}
                {!loadingExams && filteredExamOptions.length === 0 && (
                  <p className="mt-1 text-xs text-slate-500">No exams match this name.</p>
                )}
              </div>
            )}

            {URL_ONLY_TYPES.includes(itemType) && (
              <input
                type="url"
                value={publicUrl}
                onChange={(e) => setPublicUrl(e.target.value)}
                placeholder="Enter external link (https://...)"
                className={`w-full p-2 border rounded mb-3 border-gray-300
                  }`}
              />
            )}

            {FILE_UPLOAD_TYPES.includes(itemType) && (
              <input
                type="file"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className={`w-full p-2 border rounded mb-3 border-gray-300"
                  }`}
              />
            )}

            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setShowAddItemModal(false)}
                className={`px-4 py-2 border rounded border-gray-300 hover:bg-gray-50
                  }`}
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  if (selectedParentId !== null) {
                    handleAddItem(selectedParentId);
                  }
                }}
                className={`px-4 py-2 rounded bg-blue-900 text-white hover:bg-blue-700
                  }`}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {addingChapter && canEdit && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center">
          <div
            className={`bg-white w-96 p-6 rounded shadow-lg 
              }`}
          >
            <h3 className="text-lg font-semibold mb-4">Add Chapter</h3>

            <input
              type="text"
              value={chapterTitle}
              onChange={(e) => setChapterTitle(e.target.value)}
              placeholder="Chapter title"
              className={`w-full p-2 border rounded mb-3 border-gray-300
                }`}
            />

            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setAddingChapter(false)}
                className={`px-4 py-2 border rounded border-gray-300 hover:bg-gray-50
                  }`}
              >
                Cancel
              </button>

              <button
                onClick={handleAddChapter}
                className={`px-4 py-2 rounded bg-blue-900 text-white hover:bg-blue-700
                  }`}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {addingTopic && canEdit && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center">
          <div
            className={`bg-white w-96 p-6 rounded shadow-lg 
              }`}
          >
            <h3 className="text-lg font-semibold mb-4">Add Topic</h3>

            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Chapter: {selectedParentLabel || "Selected Chapter"}
            </p>

            <input
              type="text"
              value={topicTitle}
              onChange={(e) => setTopicTitle(e.target.value)}
              placeholder="Topic title"
              className={`w-full p-2 border rounded mb-3 border-gray-300
                }`}
            />

            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => {
                  setAddingTopic(false);
                  setTopicParentFolderId(null);
                  setTopicTitle("");
                }}
                className={`px-4 py-2 border rounded border-gray-300 hover:bg-gray-50
                  }`}
              >
                Cancel
              </button>

              <button
                onClick={handleAddTopic}
                className={`px-4 py-2 rounded bg-blue-900 text-white hover:bg-blue-700
                  }`}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {showLicensedContentModal && canLinkLicensedContent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="flex max-h-[85vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Add From Content Pack</h3>
                <p className="text-sm text-slate-500">Licensed platform content is read-only and added into the selected chapter.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowLicensedContentModal(false)}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-gray-50"
              >
                Close
              </button>
            </div>

            <div className="grid flex-1 overflow-hidden md:grid-cols-[280px_1fr]">
              <div className="border-r border-gray-200 bg-slate-50">
                <div className="border-b border-gray-200 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Licensed Packs</p>
                </div>
                <div className="max-h-[60vh] overflow-y-auto p-3">
                  {loadingLicensedPacks ? (
                    <p className="text-sm text-slate-500">Loading packs...</p>
                  ) : licensedPacks.length === 0 ? (
                    <p className="text-sm text-slate-500">No licensed packs are active for this client.</p>
                  ) : (
                    licensedPacks.map((pack) => (
                      <button
                        key={pack.id}
                        type="button"
                        onClick={() => setSelectedPackId(pack.id)}
                        className={`mb-2 w-full rounded-lg border px-3 py-3 text-left transition ${
                          selectedPackId === pack.id
                            ? "border-blue-900 bg-blue-50 text-blue-900"
                            : "border-gray-200 bg-white hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">{pack.name}</p>
                            {pack.description && <p className="mt-1 text-xs text-slate-500">{pack.description}</p>}
                          </div>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                            {pack.item_count}
                          </span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div className="flex flex-1 flex-col overflow-hidden">
                <div className="border-b border-gray-200 px-6 py-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {selectedPackId
                          ? licensedPacks.find((pack) => pack.id === selectedPackId)?.name ?? "Licensed Items"
                          : "Licensed Items"}
                      </p>
                      <p className="text-xs text-slate-500">Link one item or add the full pack into the selected chapter.</p>
                    </div>
                    <div className="flex flex-col gap-2 md:flex-row">
                      <input
                        type="text"
                        value={licensedSearch}
                        onChange={(event) => setLicensedSearch(event.target.value)}
                        placeholder="Search licensed items"
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      />
                      <button
                        type="button"
                        disabled={!selectedPackId || linkingLicensedContent}
                        onClick={() => {
                          void handleLinkLicensedPack();
                        }}
                        className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {linkingLicensedContent ? "Adding..." : "Add Entire Pack"}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid flex-1 overflow-hidden md:grid-cols-[1.2fr_0.8fr]">
                  <div className="overflow-y-auto p-4">
                    {licensedSearch.trim().length > 0 && (
                      <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 px-3 py-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-700">Search Results</p>
                        {licensedSearchResults.length === 0 ? (
                          <p className="text-sm text-blue-700">No licensed items match this search.</p>
                        ) : (
                          <div className="space-y-2">
                            {licensedSearchResults.map((item) => (
                              <div key={`search-${item.id}`} className="flex items-center justify-between rounded-lg border border-blue-100 bg-white px-3 py-3">
                                <div>
                                  <p className="font-medium text-slate-900">{item.title}</p>
                                  <p className="text-xs uppercase tracking-wide text-slate-500">{item.item_type}</p>
                                </div>
                                <button
                                  type="button"
                                  disabled={linkingLicensedContent}
                                  onClick={() => {
                                    void handleLinkLicensedItem(item);
                                  }}
                                  className="rounded-md border border-blue-900 px-3 py-1.5 text-sm font-medium text-blue-900 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  Link Item
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {loadingLicensedItems ? (
                      <p className="text-sm text-slate-500">Loading licensed items...</p>
                    ) : licensedItems.length === 0 ? (
                      <p className="text-sm text-slate-500">This pack has no licensed items available for linking.</p>
                    ) : (
                      <div className="space-y-2">
                        {licensedItems.map((item) => (
                          <div key={item.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-slate-900">{item.title}</p>
                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                                  Licensed
                                </span>
                                {item.is_linked_to_course && (
                                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                                    Linked
                                  </span>
                                )}
                              </div>
                              <p className="text-xs uppercase tracking-wide text-slate-500">{item.item_type}</p>
                            </div>
                            <button
                              type="button"
                              disabled={Boolean(item.is_linked_to_course) || linkingLicensedContent}
                              onClick={() => {
                                void handleLinkLicensedItem(item);
                              }}
                              className="rounded-md border border-blue-900 px-3 py-1.5 text-sm font-medium text-blue-900 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {item.is_linked_to_course ? "Already Linked" : "Link Item"}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="border-l border-gray-200 bg-slate-50 p-4">
                    <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
                      <p className="font-semibold text-slate-900">How this works</p>
                      <p className="mt-2">Linked items stay platform-owned. Client admins can place them into a chapter, but cannot rename, replace, or download them.</p>
                      <p className="mt-3 text-xs uppercase tracking-wide text-slate-500">Selected content folder</p>
                      <p className="mt-1 font-medium text-slate-900">
                        {selectedParentId !== null
                          ? selectedParentLabel || "Selected Content Folder"
                          : "No content folder selected"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showUpdateFileModal && canEdit && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
          <div
            className={`bg-white w-96 p-6 rounded shadow-lg 
              }`}
          >
            <h3 className="text-lg font-semibold mb-4">
              Update Item - {itemToUpdate?.title}
            </h3>

            <label className="block text-sm font-medium mb-1">Item Name</label>
            <input
              type="text"
              value={itemToUpdate?.title || ""}
              onChange={(e) =>
                setItemToUpdate((prev) =>
                  prev ? { ...prev, title: e.target.value } : null
                )
              }
              className={`w-full p-2 border rounded mb-4 border-gray-300
                }`}
            />

            <label className="block text-sm font-medium mb-1">Select New File</label>
            <div className="mb-3 text-sm text-gray-600">
              Current Type: <span className="font-medium">{itemToUpdate?.item_type}</span>
            </div>

            <input
              type="file"
              onChange={(e) => setNewFile(e.target.files?.[0] || null)}
              className={`w-full p-2 border rounded mb-4 border-gray-300
                }`}
            />
            <p className="text-xs text-gray-500 mt-1">
              Uploading a different file type will automatically change the content type.
            </p>

            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => !isUpdating && setShowUpdateFileModal(false)}
                disabled={isUpdating}
                className={`px-4 py-2 border rounded disabled:opacity-50 border-gray-300 hover:bg-gray-50
                  }`}
              >
                Cancel
              </button>

              <button
                onClick={handleReplaceFile}
                disabled={isUpdating}
                className={`px-4 py-2 rounded ${isUpdating
                  ? "bg-gray-400 cursor-not-allowed text-white"
                  : "bg-maincolor text-white hover:bg-lightmain"
                  }`}
              >
                {isUpdating ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Updating...
                  </div>
                ) : (
                  "Update"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="text-center text-sm text-gray-400 py-1">
          Refreshing content...
        </div>
      )}
    </div>
  );
}

