import { useEffect, useMemo, useRef, useState } from "react";
import { AiOutlineExpand, AiOutlineFullscreen, AiOutlineZoomIn, AiOutlineZoomOut } from "react-icons/ai";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";
import pdfWorker from "pdfjs-dist/legacy/build/pdf.worker?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface PdfViewerProps {
    url: string;
    title?: string;
}

export default function PdfViewer({ url }: PdfViewerProps) {
    const [numPages, setNumPages] = useState(0);
    const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageInput, setPageInput] = useState("1");
    const [zoom, setZoom] = useState(1);
    const [fitMode, setFitMode] = useState<"width" | "page">("page");
    const [userRotation, setUserRotation] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [readerWidth, setReaderWidth] = useState(0);
    const [headerVisible, setHeaderVisible] = useState(true);

    const containerRef = useRef<HTMLDivElement>(null);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const pageCanvasRefs = useRef<Record<number, HTMLCanvasElement | null>>({});
    const pageWrapperRefs = useRef<Record<number, HTMLDivElement | null>>({});

    const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

    useEffect(() => {
        if (!url) return;

        let isMounted = true;
        setIsLoading(true);
        setPdfDoc(null);
        setNumPages(0);
        setCurrentPage(1);
        setPageInput("1");
        setZoom(1);
        setFitMode("page");
        setUserRotation(0);
        setHeaderVisible(true);

        const loadPdf = async () => {
            try {
                const pdf = await pdfjsLib.getDocument(url).promise;
                if (!isMounted) return;

                setPdfDoc(pdf);
                setNumPages(pdf.numPages);
            } catch (error) {
                console.error("Failed to load PDF:", error);
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        void loadPdf();

        return () => {
            isMounted = false;
        };
    }, [url]);

    useEffect(() => {
        const node = scrollAreaRef.current;
        if (!node) return;

        const updateWidth = () => {
            setReaderWidth(node.clientWidth);
        };

        updateWidth();
        const observer = new ResizeObserver(updateWidth);
        observer.observe(node);

        return () => observer.disconnect();
    }, []);

    const targetPageWidth = useMemo(() => {
        if (!readerWidth) return 0;
        const availableWidth = Math.max(readerWidth - 32, 240);
        return Math.min(availableWidth, 980);
    }, [readerWidth]);

    useEffect(() => {
        if (!pdfDoc || numPages === 0 || targetPageWidth === 0) return;

        let cancelled = false;

        const renderPages = async () => {
            for (let pageNumber = 1; pageNumber <= numPages; pageNumber += 1) {
                if (cancelled) return;

                const canvas = pageCanvasRefs.current[pageNumber];
                if (!canvas) continue;

                const page = await pdfDoc.getPage(pageNumber);
                if (cancelled) return;

                const normalizedRotation = (((page.rotate ?? 0) + userRotation) % 360 + 360) % 360;
                const baseViewport = page.getViewport({ scale: 1, rotation: normalizedRotation });
                const widthScale = targetPageWidth / baseViewport.width;
                const pageAvailableHeight = scrollAreaRef.current
                    ? Math.max(scrollAreaRef.current.clientHeight - 32, 280)
                    : baseViewport.height;
                const heightScale = pageAvailableHeight / baseViewport.height;
                const fitScale = fitMode === "page" ? Math.min(widthScale, heightScale) : widthScale;
                const finalScale = clamp(fitScale * zoom, 0.75, 3);
                const viewport = page.getViewport({ scale: finalScale, rotation: normalizedRotation });

                const context = canvas.getContext("2d");
                if (!context) continue;

                canvas.width = viewport.width;
                canvas.height = viewport.height;
                canvas.style.width = `${viewport.width}px`;
                canvas.style.height = `${viewport.height}px`;
                context.clearRect(0, 0, canvas.width, canvas.height);

                await page.render({
                    canvasContext: context,
                    viewport,
                }).promise;
            }
        };

        void renderPages();

        return () => {
            cancelled = true;
        };
    }, [pdfDoc, numPages, targetPageWidth, fitMode, userRotation, zoom]);

    useEffect(() => {
        setPageInput(String(currentPage));
    }, [currentPage]);

    useEffect(() => {
        if (!pdfDoc || numPages === 0 || !scrollAreaRef.current) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const visibleEntry = entries
                    .filter((entry) => entry.isIntersecting)
                    .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

                if (!visibleEntry) return;

                const pageNumber = Number(visibleEntry.target.getAttribute("data-page"));
                if (Number.isInteger(pageNumber) && pageNumber >= 1 && pageNumber <= numPages) {
                    setCurrentPage(pageNumber);
                }
            },
            { root: scrollAreaRef.current, threshold: [0.35, 0.6, 0.85] }
        );

        Object.values(pageWrapperRefs.current).forEach((node) => {
            if (node) observer.observe(node);
        });

        return () => observer.disconnect();
    }, [pdfDoc, numPages]);

    const goToPage = (pageNumber: number) => {
        if (pageNumber < 1 || pageNumber > numPages) return;
        pageWrapperRefs.current[pageNumber]?.scrollIntoView({ behavior: "smooth", block: "start" });
        setCurrentPage(pageNumber);
    };

    const handlePageInputCommit = () => {
        const parsed = Number(pageInput);
        if (Number.isInteger(parsed)) {
            goToPage(parsed);
        } else {
            setPageInput(String(currentPage));
        }
    };

    const zoomIn = () => setZoom((prev) => clamp(Number((prev + 0.1).toFixed(2)), 0.75, 2.25));
    const zoomOut = () => setZoom((prev) => clamp(Number((prev - 0.1).toFixed(2)), 0.75, 2.25));

    const rotateClockwise = () => setUserRotation((prev) => (prev + 90) % 360);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen().catch((error) => console.error(error));
            return;
        }

        void document.exitFullscreen();
    };

    return (
        <div ref={containerRef} className="flex h-full w-full flex-col bg-white">
            <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
                <div className="flex items-center justify-between gap-2 px-2 py-2 md:px-3">
                    <div className="flex min-w-0 items-center gap-2">
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                            Page {currentPage} / {numPages || 0}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => setHeaderVisible((prev) => !prev)}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                        {headerVisible ? "Hide controls" : "Show controls"}
                    </button>
                </div>

                {headerVisible && (
                    <div className="border-t border-slate-100 px-2 py-2 md:px-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <label className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-600">
                                <span>Page</span>
                                <input
                                    type="number"
                                    min={1}
                                    max={Math.max(numPages, 1)}
                                    value={pageInput}
                                    onChange={(event) => setPageInput(event.target.value)}
                                    onBlur={handlePageInputCommit}
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter") handlePageInputCommit();
                                    }}
                                    className="w-14 border-0 bg-transparent text-center font-medium text-slate-900 outline-none"
                                />
                            </label>

                            <button
                                type="button"
                                onClick={() => {
                                    setFitMode("width");
                                    setZoom(1);
                                }}
                                className={`rounded-full px-3 py-1.5 text-sm transition ${fitMode === "width" ? "bg-blue-900 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
                            >
                                Fit Width
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setFitMode("page");
                                    setZoom(1);
                                }}
                                className={`rounded-full px-3 py-1.5 text-sm transition ${fitMode === "page" ? "bg-blue-900 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
                            >
                                Fit Page
                            </button>

                            <button type="button" onClick={zoomOut} className="rounded-full border border-slate-200 p-2 text-slate-700 hover:bg-slate-50" title="Zoom out">
                                <AiOutlineZoomOut size={18} />
                            </button>

                            <span className="min-w-12 text-center text-sm font-medium text-slate-700">
                                {Math.round(zoom * 100)}%
                            </span>

                            <button type="button" onClick={zoomIn} className="rounded-full border border-slate-200 p-2 text-slate-700 hover:bg-slate-50" title="Zoom in">
                                <AiOutlineZoomIn size={18} />
                            </button>

                            <button type="button" onClick={rotateClockwise} className="rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50" title="Rotate page">
                                Rotate
                            </button>

                            <button type="button" onClick={toggleFullscreen} className="rounded-full border border-slate-200 p-2 text-slate-700 hover:bg-slate-50" title="Toggle fullscreen">
                                <AiOutlineExpand size={18} />
                            </button>

                            <button type="button" onClick={() => setZoom(1)} className="rounded-full border border-slate-200 p-2 text-slate-700 hover:bg-slate-50" title="Reset zoom">
                                <AiOutlineFullscreen size={18} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div ref={scrollAreaRef} className="flex-1 overflow-y-auto bg-slate-100 p-2 pb-24 md:p-3 md:pb-32">
                {isLoading ? (
                    <div className="flex h-full items-center justify-center text-sm text-slate-500">
                        Loading PDF...
                    </div>
                ) : (
                    <div className="mx-auto flex w-full max-w-[1100px] flex-col items-center gap-3">
                        {Array.from({ length: numPages }, (_, index) => {
                            const pageNumber = index + 1;

                            return (
                                <div
                                    key={pageNumber}
                                    data-page={pageNumber}
                                    ref={(node) => {
                                        pageWrapperRefs.current[pageNumber] = node;
                                    }}
                                    className="w-full scroll-mb-24 md:scroll-mb-32"
                                >
                                    <div className="flex justify-center overflow-x-auto">
                                        <canvas
                                            ref={(node) => {
                                                pageCanvasRefs.current[pageNumber] = node;
                                            }}
                                            className="block h-auto max-w-full"
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
