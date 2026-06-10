import React, { useEffect, useState } from "react";
import {
    DragDropContext,
    Droppable,
    Draggable,
    type DropResult,
} from "@hello-pangea/dnd";

import { BsThreeDotsVertical } from "react-icons/bs";
import { FiChevronDown, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { MdAdd } from "react-icons/md";
import { AiOutlineArrowLeft } from "react-icons/ai";
import CourseProgressBar from "@/features/courses/components/player/CourseProgressBar";
import api from "@/lib/api";

//import { useNavigate } from "react-router-dom";

import {
    FaVideo,
    FaFilePdf,
    FaFileAlt,
    FaMusic,
    FaFolder,
    FaBoxOpen,
    FaClipboardList
} from "react-icons/fa";


interface CourseItem {
    id: number;
    course_id: number;
    parent_id: number | null;
    item_type: string;
    title: string;
    content_url?: string | null;
    order_index: number;
    created_at: string;
    completion_status?: string | null;
    is_linked_content?: boolean;
    linked_content_id?: number | null;
}

interface TopicFolder {
    id: number;
    title: string;
    items: CourseItem[];
}

interface Chapter {
    id: number;
    title: string;
    items: CourseItem[];
    topics: TopicFolder[];
}

interface Props {
    courseId: string | number;
    chapters: Chapter[];
    allItems: CourseItem[];
    onSelectItem: (item: CourseItem) => void;
    onAddChapter: () => void;
    onAddTopic: (chapterId: number, chapterTitle: string) => void;
    onAddItem: (parentId: number, parentLabel: string) => void;
    onAddLicensedContent?: (parentId: number, parentLabel: string) => void;
    onReorderChapters: (newChapters: Chapter[]) => void;
    onReorderTopics: (chapterId: number, newTopics: TopicFolder[]) => void;
    onReorderItems: (chapterId: number, newItems: CourseItem[]) => void;
    onReorderTopicItems: (topicId: number, newItems: CourseItem[]) => void;
    onUpdateFile: (item: CourseItem) => void;
    onRemoveLinkedItem?: (item: CourseItem) => void | Promise<void>;
    onRefreshContent: () => void | Promise<void>;
    selectedItemId?: number;
    isGvjbClient?: boolean;
    apiPrefix?: string;
    readOnly?: boolean;
    onBack?: () => void;
    panelTitle?: string;
    hideProgress?: boolean;
    collapsed?: boolean;
    onToggleCollapsed?: () => void;
}

const LeftPanel: React.FC<Props> = ({
    courseId,
    chapters,
    allItems,
    onSelectItem,
    onAddChapter,
    onAddTopic,
    onAddItem,
    onAddLicensedContent,
    onReorderChapters,
    onReorderTopics,
    onReorderItems,
    onReorderTopicItems,
    onUpdateFile,
    onRemoveLinkedItem,
    onRefreshContent,
    selectedItemId,
    isGvjbClient = false,
    apiPrefix = "/admin",
    readOnly = false,
    onBack,
    panelTitle = "Course Content",
    hideProgress = false,
    collapsed = false,
    onToggleCollapsed,
}) => {
    const [expanded, setExpanded] = useState<number | null>(null);
    const [expandedTopics, setExpandedTopics] = useState<number[]>([]);
    const [openMenu, setOpenMenu] = useState<number | null>(null);
    const [openTopicMenu, setOpenTopicMenu] = useState<number | null>(null);
    const [openItemMenu, setOpenItemMenu] = useState<number | null>(null);
    const totalItems = allItems.length;
    const completedItems = allItems.filter(i => i.completion_status === "completed").length;
    const canEdit = !readOnly;
    const normalizedPrefix = apiPrefix.startsWith("/") ? apiPrefix : `/${apiPrefix}`;
    const resolvedCourseId = typeof courseId === "string" ? courseId : String(courseId);

    const toggleExpand = (chapterId: number) => {
        setExpanded(expanded === chapterId ? null : chapterId);
    };

    const toggleTopicExpand = (topicId: number) => {
        setExpandedTopics((prev) =>
            prev.includes(topicId) ? prev.filter((id) => id !== topicId) : [...prev, topicId],
        );
    };


    useEffect(() => {
        const handleClickOutside = () => {
            setOpenMenu(null);
            setOpenTopicMenu(null);
            setOpenItemMenu(null);
        };

        // Close when clicking anywhere
        window.addEventListener("click", handleClickOutside);

        return () => window.removeEventListener("click", handleClickOutside);
    }, []);

    // Automatically expand the chapter containing the selected item
    useEffect(() => {
        if (selectedItemId) {
            const activeChapter = chapters.find((ch) =>
                ch.items.some((item) => item.id === selectedItemId) ||
                ch.topics.some((topic) => topic.items.some((item) => item.id === selectedItemId))
            );
            if (activeChapter) {
                setExpanded(activeChapter.id);
                const activeTopic = activeChapter.topics.find((topic) =>
                    topic.items.some((item) => item.id === selectedItemId),
                );
                if (activeTopic) {
                    setExpandedTopics((prev) =>
                        prev.includes(activeTopic.id) ? prev : [...prev, activeTopic.id],
                    );
                }
            }
        }
    }, [selectedItemId, chapters]);


    const deleteChapter = async (chapterId: number) => {
        if (!canEdit) return;
        if (!window.confirm("Are you sure? This will delete the entire chapter and its items.")) return;

        try {
            if (!resolvedCourseId) {
                alert("Course ID missing. Delete aborted.");
                return;
            }
            await api.delete(`${normalizedPrefix}/courses/${resolvedCourseId}/content/${chapterId}`);
            await onRefreshContent();

        } catch (err) {
            console.error("âŒ Failed to delete chapter", err);
            alert("Failed to delete. Check console.");
        }
    };



    const deleteContentNode = async (itemId: number, promptText = "Delete this item?") => {
        if (!canEdit) return;
        if (!window.confirm(promptText)) return;

        try {
            if (!resolvedCourseId) {
                alert("Course ID missing. Delete aborted.");
                return;
            }

            await api.delete(`${normalizedPrefix}/courses/${resolvedCourseId}/content/${itemId}`);
            await onRefreshContent();

        } catch (err) {
            console.error("âŒ Failed to delete item", err);
            alert("Failed to delete. Check console.");
        }
    };

    const removeLinkedItem = async (item: CourseItem) => {
        if (!canEdit || !onRemoveLinkedItem) return;
        if (!window.confirm("Remove this licensed item from the course?")) return;
        await onRemoveLinkedItem(item);
    };

    // âœ¨ Rename Chapter
    const renameChapter = async (chapterId: number, newName: string) => {
        if (!canEdit) return;
        if (!resolvedCourseId) return;
        await api.put(`${normalizedPrefix}/courses/${resolvedCourseId}/content/${chapterId}/rename`, {
            title: newName,
        });
        await onRefreshContent();
    };

    const renameNode = async (itemId: number, newName: string) => {
        if (!canEdit) return;
        if (!resolvedCourseId) return;
        await api.put(`${normalizedPrefix}/courses/${resolvedCourseId}/content/${itemId}/rename`, {
            title: newName,
        });
        await onRefreshContent();
    };

    const getIconForType = (type: string) => {
        switch (type) {
            case "video":
                return <FaVideo className="text-sm" />;
            case "pdf":
                return <FaFilePdf className="text-sm" />;
            case "audio":
                return <FaMusic className="text-sm" />;
            case "text":
                return <FaFileAlt className="text-sm" />;
            case "scorm":
                return <FaBoxOpen className="text-sm" />;
            case "exam":
                return <FaClipboardList className="text-sm" />;
            default:
                return <FaFolder className="text-sm" />;
        }
    };

    const onDragEnd = (result: DropResult) => {
        if (!canEdit) return;
        const { source, destination, type } = result;
        if (!destination) return;

        if (type === "CHAPTER") {
            const reordered = Array.from(chapters);
            const [moved] = reordered.splice(source.index, 1);
            reordered.splice(destination.index, 0, moved);
            onReorderChapters(reordered);
            return;
        }

        if (type.startsWith("ITEM-")) {
            const chapterId = parseInt(type.split("-")[1]);
            const chapter = chapters.find((c) => c.id === chapterId);
            if (!chapter) return;

            const reorderedItems = Array.from(chapter.items);
            const [movedItem] = reorderedItems.splice(source.index, 1);
            reorderedItems.splice(destination.index, 0, movedItem);

            onReorderItems(chapterId, reorderedItems);
        }

        if (type.startsWith("TOPIC-")) {
            const chapterId = parseInt(type.split("-")[1]);
            const chapter = chapters.find((c) => c.id === chapterId);
            if (!chapter) return;

            const reorderedTopics = Array.from(chapter.topics);
            const [movedTopic] = reorderedTopics.splice(source.index, 1);
            reorderedTopics.splice(destination.index, 0, movedTopic);

            onReorderTopics(chapterId, reorderedTopics);
            return;
        }

        if (type.startsWith("TOPICITEM-")) {
            const topicId = parseInt(type.split("-")[1]);
            const parentTopic = chapters.flatMap((chapter) => chapter.topics).find((topic) => topic.id === topicId);
            if (!parentTopic) return;

            const reorderedItems = Array.from(parentTopic.items);
            const [movedItem] = reorderedItems.splice(source.index, 1);
            reorderedItems.splice(destination.index, 0, movedItem);

            onReorderTopicItems(topicId, reorderedItems);
        }
    };

    if (collapsed) {
        return (
            <div
                className={`w-full h-full border-r flex flex-col items-center py-3 ${isGvjbClient
                    ? "bg-white/90 border-amber-100"
                    : "bg-white border-gray-200"
                    }`}
            >
                <button
                    type="button"
                    onClick={onToggleCollapsed}
                    className={`hidden md:flex items-center justify-center rounded-md border p-2 ${isGvjbClient
                        ? "border-amber-200 text-amber-700 hover:bg-amber-50"
                        : "border-gray-300 text-slate-700 hover:bg-gray-50"
                        }`}
                    aria-label="Expand left panel"
                    title="Expand left panel"
                >
                    <FiChevronRight className="text-lg" />
                </button>
                <div className="mt-4 hidden md:block text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 [writing-mode:vertical-rl] [transform:rotate(180deg)]">
                    {panelTitle}
                </div>
            </div>
        );
    }

    const renderContentItem = (item: CourseItem, parentTitle: string) => (
        <div
            key={item.id}
            onClick={() => onSelectItem(item)}
            className={`flex justify-between items-start gap-2 p-1 my-1 relative group cursor-pointer 
                    ${selectedItemId === item.id
                    ? isGvjbClient
                        ? "bg-amber-100 border border-amber-200 rounded"
                        : "bg-blue-100 border border-blue-200 rounded"
                    : isGvjbClient
                        ? "hover:bg-amber-50 hover:rounded"
                        : "hover:bg-blue-50 hover:rounded"
                }
`}
        >
            <div className="flex min-w-0 flex-1 items-start gap-2">
                <div className="shrink-0 pt-0.5">{getIconForType(item.item_type)}</div>
                <span className="min-w-0 whitespace-normal break-words leading-snug text-gray-700 font-medium text-[14px]">
                    {item.title}
                </span>
                {item.is_linked_content && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                        Licensed
                    </span>
                )}
            </div>

            {canEdit && (
                <div
                    onClick={(e) => {
                        e.stopPropagation();
                        setOpenItemMenu(openItemMenu === item.id ? null : item.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition shrink-0 pt-0.5"
                >
                    <BsThreeDotsVertical className="text-gray-500 hover:text-black cursor-pointer" />
                </div>
            )}

            {canEdit && openItemMenu === item.id && (
                <div className={`absolute right-2 top-10 w-40 bg-white shadow-md border rounded-md z-50 ${isGvjbClient ? "border-amber-200" : "border-gray-200"}`}>
                    {!item.is_linked_content && (
                        <button
                            className={`w-full text-left px-3 py-2 text-sm ${isGvjbClient ? "hover:bg-amber-50" : "hover:bg-gray-100"}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                setOpenItemMenu(null);

                                const newName = prompt("Enter new item name:", item.title);
                                if (newName && newName.trim()) {
                                    void renameNode(item.id, newName.trim());
                                }
                            }}
                        >
                            Rename
                        </button>
                    )}

                    {!item.is_linked_content && ["video", "audio", "pdf", "scorm", "html", "text"].includes(item.item_type) && (
                        <button
                            className={`w-full text-left px-3 py-2 text-sm ${isGvjbClient ? "hover:bg-amber-50" : "hover:bg-gray-100"}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                setOpenItemMenu(null);
                                onUpdateFile(item);
                            }}
                        >
                            Update
                        </button>
                    )}

                    <button
                        className={`w-full text-left px-3 py-2 text-sm text-red-600 ${isGvjbClient ? "hover:bg-amber-50" : "hover:bg-gray-100"}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            setOpenItemMenu(null);
                            if (item.is_linked_content) {
                                void removeLinkedItem(item);
                            } else {
                                void deleteContentNode(item.id, `Delete "${item.title}" from ${parentTitle}?`);
                            }
                        }}
                    >
                        {item.is_linked_content ? "Remove from Course" : "Delete"}
                    </button>
                </div>
            )}
        </div>
    );

    const renderTopic = (topic: TopicFolder, chapter: Chapter, topicIndex: number) => {
        const isExpanded = expandedTopics.includes(topic.id);
        const parentLabel = `${chapter.title} / ${topic.title}`;

        return (
            <Draggable key={topic.id} draggableId={`topic-${chapter.id}-${topic.id}`} index={topicIndex}>
                {(topicProvided) => (
                    <div
                        ref={topicProvided.innerRef}
                        {...topicProvided.draggableProps}
                        className="mt-2 rounded border border-gray-200 bg-gray-50"
                    >
                        <div
                            className={`flex items-start justify-between gap-2 px-2 py-2 ${isGvjbClient ? "hover:bg-amber-50" : "hover:bg-gray-100"}`}
                        >
                            <button
                                type="button"
                                onClick={() => toggleTopicExpand(topic.id)}
                                {...topicProvided.dragHandleProps}
                                className="flex min-w-0 flex-1 items-start gap-1 text-left text-sm"
                            >
                                <span className="shrink-0 pt-0.5">
                                    {isExpanded ? <FiChevronDown className="text-sm" /> : <FiChevronRight className="text-sm" />}
                                </span>
                                <FaFolder className="mt-0.5 shrink-0 text-sm text-gray-500" />
                                <span className="min-w-0 whitespace-normal break-words leading-snug font-medium text-gray-800">{topic.title}</span>
                            </button>

                            {canEdit && (
                                <div
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenTopicMenu(openTopicMenu === topic.id ? null : topic.id);
                                    }}
                                    className="relative"
                                >
                                    <BsThreeDotsVertical className="text-gray-500 hover:text-black cursor-pointer" />

                                    {openTopicMenu === topic.id && (
                                        <div className={`absolute right-0 top-6 bg-white border shadow-md rounded-md w-40 z-20 ${isGvjbClient ? "border-amber-200" : "border-gray-200"}`}>
                                            <button
                                                className={`block w-full px-3 py-2 text-left text-sm ${isGvjbClient ? "hover:bg-amber-50" : "hover:bg-gray-100"}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setOpenTopicMenu(null);
                                                    const newName = prompt("Enter new topic name:", topic.title);
                                                    if (newName && newName.trim()) {
                                                        void renameNode(topic.id, newName.trim());
                                                    }
                                                }}
                                            >
                                                Rename
                                            </button>

                                            <button
                                                className={`block w-full px-3 py-2 text-left text-sm text-red-600 ${isGvjbClient ? "hover:bg-amber-50" : "hover:bg-gray-100"}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setOpenTopicMenu(null);
                                                    void deleteContentNode(
                                                        topic.id,
                                                        `Delete topic "${topic.title}" and all of its content?`,
                                                    );
                                                }}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {isExpanded && (
                            <Droppable droppableId={`topic-items-${topic.id}`} type={`TOPICITEM-${topic.id}`}>
                                {(topicDropProvided) => (
                                    <div
                                        className="border-t border-gray-200 bg-white px-3 py-2"
                                        ref={topicDropProvided.innerRef}
                                        {...topicDropProvided.droppableProps}
                                    >
                                        {topic.items.length === 0 ? (
                                            <p className="px-1 py-1 text-xs text-gray-500">No content added yet.</p>
                                        ) : (
                                            topic.items.map((item, itemIndex) => (
                                                <Draggable key={item.id} draggableId={`topic-item-${topic.id}-${item.id}`} index={itemIndex}>
                                                    {(itemProvided) => (
                                                        <div
                                                            ref={itemProvided.innerRef}
                                                            {...itemProvided.draggableProps}
                                                            {...itemProvided.dragHandleProps}
                                                        >
                                                            {renderContentItem(item, parentLabel)}
                                                        </div>
                                                    )}
                                                </Draggable>
                                            ))
                                        )}

                                        {topicDropProvided.placeholder}

                                        {canEdit && (
                                            <div className="mt-2 flex flex-col gap-1">
                                                <button
                                                    onClick={() => onAddItem(topic.id, parentLabel)}
                                                    className={`text-left text-sm hover:underline ${isGvjbClient ? "text-amber-700" : "text-blue-600"}`}
                                                >
                                                    + Add Content
                                                </button>
                                                {onAddLicensedContent && (
                                                    <button
                                                        onClick={() => onAddLicensedContent(topic.id, parentLabel)}
                                                        className={`text-left text-sm hover:underline ${isGvjbClient ? "text-amber-700" : "text-blue-600"}`}
                                                    >
                                                        + Add from Content Pack
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </Droppable>
                        )}
                    </div>
                )}
            </Draggable>
        );
    };

    return (
        <div
            className={`w-full h-full border-r flex flex-col ${isGvjbClient
                ? "bg-white/90 border-amber-100"
                : "bg-white border-gray-200"
                }`}
        >

            {/* Header WITHOUT Add Chapter button */}
            <div className={`shrink-0 flex flex-col ${isGvjbClient ? "border-amber-100" : "border-gray-200"}`}>
                {/* LEFT SIDE â€” BACK */}
                <div className={`px-4 py-3 border-b flex justify-between items-start gap-3 w-full ${isGvjbClient ? "border-amber-100" : "border-gray-200"}`}>
                    <div className="flex min-w-0 items-start gap-3">
                        {onBack ? (
                            <button
                                onClick={onBack}
                                className={`text-lg shrink-0 ${isGvjbClient ? "hover:text-amber-700" : "hover:text-lightmain"}`}
                            >
                                <AiOutlineArrowLeft />
                            </button>
                        ) : (
                            <div className="w-5 shrink-0" />
                        )}

                        <h1 className="whitespace-normal break-words leading-snug text-lg font-semibold">{panelTitle}</h1>
                    </div>

                    {onToggleCollapsed ? (
                        <button
                            type="button"
                            onClick={onToggleCollapsed}
                            className={`hidden shrink-0 md:flex items-center justify-center rounded-md border p-1.5 ${isGvjbClient
                                ? "border-amber-200 text-amber-700 hover:bg-amber-50"
                                : "border-gray-300 text-slate-700 hover:bg-gray-50"
                                }`}
                            aria-label="Collapse left panel"
                            title="Collapse left panel"
                        >
                            <FiChevronLeft className="text-base" />
                        </button>
                    ) : null}
                </div>
                {/* Progress Bar*/}
                {!hideProgress && (
                    <div className="w-full pt-4 px-4"><CourseProgressBar completed={completedItems} total={totalItems}
                    /></div>
                )}
            </div>

            <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="chapters" type="CHAPTER">
                    {(provided) => (
                        <div
                            className="p-3 flex-1 overflow-y-scroll"
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                        >
                            {chapters.map((chapter, chapterIndex) => (
                                <Draggable
                                    key={chapter.id}
                                    draggableId={`chapter-${chapter.id}`}
                                    index={chapterIndex}
                                >
                                    {(dragProvided) => (
                                        <div
                                            ref={dragProvided.innerRef}
                                            {...dragProvided.draggableProps}
                                            className="mb-1  bg-white cursor-pointer"
                                        >

                                            {/* Chapter Header */}
                                            <div
                                                className={`flex justify-between items-start gap-2 px-2 py-2 rounded-t-lg ${isGvjbClient ? "hover:bg-amber-50" : "hover:bg-gray-50"}`}
                                            >
                                                <div
                                                    {...dragProvided.dragHandleProps}
                                                    className="flex items-start gap-1 flex-1 text-sm "
                                                    onClick={() => toggleExpand(chapter.id)}
                                                >
                                                    <span className="shrink-0 pt-0.5">
                                                        {expanded === chapter.id ? (
                                                            <FiChevronDown className="text-sm" />
                                                        ) : (
                                                            <FiChevronRight className="text-sm" />
                                                        )}
                                                    </span>
                                                    <span className="min-w-0 whitespace-normal break-words leading-snug font-medium">{chapter.title}</span>
                                                </div>



                                                {canEdit && (
                                                    <div
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setOpenMenu(openMenu === chapter.id ? null : chapter.id);
                                                        }}
                                                        className="relative"
                                                    >
                                                        <BsThreeDotsVertical className="text-gray-600 hover:text-black cursor-pointer" />

                                                        {openMenu === chapter.id && (
                                                            <div className={`absolute right-0 top-6 bg-white border shadow-md rounded-md w-40 z-20 ${isGvjbClient ? "border-amber-200" : "border-gray-200"}`}>

                                                                {/* Rename */}
                                                                <button
                                                                    className={`block w-full px-3 py-2 text-left text-sm ${isGvjbClient ? "hover:bg-amber-50" : "hover:bg-gray-100"}`}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setOpenMenu(null);

                                                                        const newName = prompt("Enter new chapter name:", chapter.title);
                                                                        if (newName && newName.trim()) {
                                                                            renameChapter(chapter.id, newName.trim());
                                                                        }
                                                                    }}
                                                                >
                                                                    Rename
                                                                </button>

                                                                {/* Delete */}
                                                                <button
                                                                    className={`block w-full px-3 py-2 text-left text-sm text-red-600 ${isGvjbClient ? "hover:bg-amber-50" : "hover:bg-gray-100"}`}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setOpenMenu(null);
                                                                        deleteChapter(chapter.id);
                                                                    }}
                                                                >
                                                                    Delete
                                                                </button>
                                                            </div>
                                                        )}

                                                    </div>
                                                )}
                                            </div>

                                            {/* Items List */}
                                            {expanded === chapter.id && (
                                                <Droppable
                                                    droppableId={`items-${chapter.id}`}
                                                    type={`ITEM-${chapter.id}`}
                                                >
                                                    {(dropProvided) => (
                                                        <div
                                                            className={`px-4 py-2 bg-white border-t ${isGvjbClient ? "border-amber-200" : "border-gray-300"}`}
                                                            ref={dropProvided.innerRef}
                                                            {...dropProvided.droppableProps}
                                                        >
                                                            <Droppable droppableId={`topics-${chapter.id}`} type={`TOPIC-${chapter.id}`}>
                                                                {(topicDropProvided) => (
                                                                    <div
                                                                        ref={topicDropProvided.innerRef}
                                                                        {...topicDropProvided.droppableProps}
                                                                    >
                                                                        {chapter.topics.map((topic, topicIndex) => renderTopic(topic, chapter, topicIndex))}
                                                                        {topicDropProvided.placeholder}
                                                                    </div>
                                                                )}
                                                            </Droppable>

                                                            {chapter.items.map((item, itemIndex) => (
                                                                <Draggable
                                                                    key={item.id}
                                                                    draggableId={`item-${chapter.id}-${item.id}`}
                                                                    index={itemIndex}
                                                                >
                                                                    {(itemProvided) => (
                                                                        <div
                                                                            ref={itemProvided.innerRef}
                                                                            {...itemProvided.draggableProps}
                                                                            {...itemProvided.dragHandleProps}
                                                                            onClick={() => onSelectItem(item)}
                                                                            className={`flex justify-between items-start gap-2 p-1 my-1 relative group cursor-pointer 
                                                                                    ${selectedItemId === item.id
                                                                                    ? isGvjbClient
                                                                                        ? "bg-amber-100 border border-amber-200 rounded"
                                                                                        : "bg-blue-100 border border-blue-200 rounded"
                                                                                    : isGvjbClient
                                                                                        ? "hover:bg-amber-50 hover:rounded"
                                                                                        : "hover:bg-blue-50 hover:rounded"
                                                                                }
`}
                                                                        >
                                                                            <div className="flex min-w-0 flex-1 items-start gap-2">
                                                                                <div className="shrink-0 pt-0.5">{getIconForType(item.item_type)}</div>
                                                                                <span className="min-w-0 whitespace-normal break-words leading-snug text-gray-700 font-medium text-[14px]">
                                                                                    {item.title}
                                                                                </span>
                                                                                {item.is_linked_content && (
                                                                                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                                                                                        Licensed
                                                                                    </span>
                                                                                )}
                                                                            </div>

                                                                            {canEdit && (
                                                                                <div
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        setOpenItemMenu(
                                                                                            openItemMenu === item.id ? null : item.id
                                                                                        );
                                                                                    }}
                                                                                    className="opacity-0 group-hover:opacity-100 transition shrink-0 pt-0.5"
                                                                                >
                                                                                    <BsThreeDotsVertical className="text-gray-500 hover:text-black cursor-pointer" />
                                                                                </div>
                                                                            )}

                                                                            {canEdit && openItemMenu === item.id && (
                                                                                <div className={`absolute right-2 top-10 w-40 bg-white shadow-md border rounded-md z-50 ${isGvjbClient ? "border-amber-200" : "border-gray-200"}`}>

                                                                                    {!item.is_linked_content && (
                                                                                        <button
                                                                                            className={`w-full text-left px-3 py-2 text-sm ${isGvjbClient ? "hover:bg-amber-50" : "hover:bg-gray-100"}`}
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                setOpenItemMenu(null);

                                                                                                const newName = prompt("Enter new item name:", item.title);
                                                                                                if (newName && newName.trim()) {
                                                                                                    void renameNode(item.id, newName.trim());
                                                                                                }
                                                                                            }}
                                                                                        >
                                                                                            Rename
                                                                                        </button>
                                                                                    )}

                                                                                    {!item.is_linked_content && ["video", "audio", "pdf", "scorm", "html", "text"].includes(item.item_type) && (
                                                                                        <button
                                                                                            className={`w-full text-left px-3 py-2 text-sm ${isGvjbClient ? "hover:bg-amber-50" : "hover:bg-gray-100"}`}
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                setOpenItemMenu(null);
                                                                                                onUpdateFile(item);
                                                                                            }}
                                                                                        >
                                                                                            Update
                                                                                        </button>
                                                                                    )}

                                                                                    <button
                                                                                        className={`w-full text-left px-3 py-2 text-sm text-red-600 ${isGvjbClient ? "hover:bg-amber-50" : "hover:bg-gray-100"}`}
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            setOpenItemMenu(null);
                                                                                            if (item.is_linked_content) {
                                                                                                void removeLinkedItem(item);
                                                                                            } else {
                                                                                                void deleteContentNode(item.id, `Delete "${item.title}" from ${chapter.title}?`);
                                                                                            }
                                                                                        }}
                                                                                    >
                                                                                        {item.is_linked_content ? "Remove from Course" : "Delete"}
                                                                                    </button>
                                                                                </div>
                                                                            )}

                                                                        </div>
                                                                    )}
                                                                </Draggable>
                                                            ))}

                                                            {dropProvided.placeholder}

                                                            {canEdit && (
                                                                <div className="mt-2 flex flex-col gap-1">
                                                                    <button
                                                                        onClick={() => onAddTopic(chapter.id, chapter.title)}
                                                                        className={`text-left text-sm hover:underline ${isGvjbClient ? "text-amber-700" : "text-blue-600"}`}
                                                                    >
                                                                        + Add Topic
                                                                    </button>
                                                                    <button
                                                                        onClick={() => onAddItem(chapter.id, chapter.title)}
                                                                        className={`text-left text-sm hover:underline ${isGvjbClient ? "text-amber-700" : "text-blue-600"}`}
                                                                    >
                                                                        + Add Content
                                                                    </button>
                                                                    {onAddLicensedContent && (
                                                                        <button
                                                                            onClick={() => onAddLicensedContent(chapter.id, chapter.title)}
                                                                            className={`text-left text-sm hover:underline ${isGvjbClient ? "text-amber-700" : "text-blue-600"}`}
                                                                        >
                                                                            + Add from Content Pack
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </Droppable>
                                            )}
                                        </div>
                                    )}
                                </Draggable>
                            ))}

                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            </DragDropContext>

            {/* Bottom Add Chapter button */}
            {canEdit && (
                <div className={`p-3 border-t shrink-0 ${isGvjbClient ? "border-amber-100" : "border-gray-200"}`}>
                    <button
                        onClick={onAddChapter}
                        className={`flex items-center gap-1 px-3 py-2 rounded-md w-full justify-center ${isGvjbClient ? "bg-amber-400 text-slate-900 hover:bg-amber-500" : "bg-maincolor hover:bg-lightmain text-white"}`}
                    >
                        <MdAdd className="text-lg" />
                        Add Chapter
                    </button>
                </div>
            )}

        </div>


    );
};

export default LeftPanel;



