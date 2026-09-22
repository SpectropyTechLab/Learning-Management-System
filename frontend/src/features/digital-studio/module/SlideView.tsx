import { useEffect, useState, useRef } from "react";
import type { CSSProperties, PointerEvent } from "react";
import type { Slide, Element, StudioTransport } from "./types";
import { ActivityView } from "./ActivityView";
import { MotionView } from "./MotionScene";
import { CompositionView } from "./CompositionView";

export function AssetView({
  id,
  projectId,
  transport,
  video = false,
}: {
  id: string;
  projectId: string;
  transport: StudioTransport;
  video?: boolean;
}) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    let alive = true,
      objectUrl = "";
    setUrl("");
    transport
      .blob(`/projects/${projectId}/assets/${id}`)
      .then((b) => {
        objectUrl = URL.createObjectURL(b);
        if (alive) setUrl(objectUrl);
        else URL.revokeObjectURL(objectUrl);
      })
      .catch(() => {});
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id, projectId, transport]);
  return url ? (
    video ? (
      <video src={url} controls />
    ) : (
      <img src={url} alt="Lesson visual" />
    )
  ) : (
    <span className="ds-asset-placeholder">Media unavailable</span>
  );
}
export function SlideView({
  slide,
  projectId,
  transport,
  selected,
  onSelect,
  onTransform,
  teaching = false,
}: {
  slide: Slide;
  projectId: string;
  transport: StudioTransport;
  selected?: string;
  onSelect?: (id: string) => void;
  onTransform?: (
    id: string,
    box: Pick<Element, "x" | "y" | "width" | "height">,
  ) => void;
  teaching?: boolean;
}) {
  const [answer, setAnswer] = useState(""),
    [reveal, setReveal] = useState(false),
    [play, setPlay] = useState(false);
  useEffect(() => {
    setAnswer("");
    setReveal(false);
    setPlay(false);
  }, [slide.id]);
  const interaction = slide.interaction;
  const drag = useRef<{
    id: string;
    startX: number;
    startY: number;
    rect: DOMRect;
    original: Element;
    resize: boolean;
  } | null>(null);
  const [preview, setPreview] = useState<Pick<
    Element,
    "id" | "x" | "y" | "width" | "height"
  > | null>(null);
  const begin = (event: PointerEvent<HTMLDivElement>, element: Element) => {
    if (
      teaching ||
      element.locked ||
      !onTransform ||
      (event.target as HTMLElement).closest("video")
    )
      return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    onSelect?.(element.id);
    drag.current = {
      id: element.id,
      startX: event.clientX,
      startY: event.clientY,
      rect: event.currentTarget.parentElement!.getBoundingClientRect(),
      original: element,
      resize: !!(event.target as HTMLElement).closest("[data-resize]"),
    };
  };
  const boxAt = (event: PointerEvent<HTMLDivElement>) => {
    const d = drag.current!;
    const dx = ((event.clientX - d.startX) / d.rect.width) * 100,
      dy = ((event.clientY - d.startY) / d.rect.height) * 100,
      e = d.original;
    return {
      id: d.id,
      x: d.resize ? e.x : Math.max(0, Math.min(95, 100 - e.width, e.x + dx)),
      y: d.resize ? e.y : Math.max(0, Math.min(95, 100 - e.height, e.y + dy)),
      width: d.resize
        ? Math.max(1, Math.min(100 - e.x, e.width + dx))
        : e.width,
      height: d.resize
        ? Math.max(1, Math.min(100 - e.y, e.height + dy))
        : e.height,
    };
  };

  if (slide.composition) return <CompositionView key={slide.id} slide={slide} projectId={projectId} transport={transport} selected={selected} onSelect={onSelect} onTransform={onTransform} teaching={teaching} />;
  return (
    <div
      className={`ds-slide ${slide.activity && slide.activity.kind !== "none" ? "ds-has-activity" : ""} ds-template-${slide.template} ds-transition-${teaching ? slide.transition : "none"}`}
      style={{ background: slide.background }}
    >
      <span className="ds-slide-eyebrow">
        SPECTROPY / {slide.template.replace("-", " ")}
      </span>
      <h2>{slide.title}</h2>
      <div className="ds-slide-body">{slide.body}</div>
      {slide.scene && <MotionView key={`${slide.id}:${JSON.stringify(slide.scene)}`} config={slide.scene} />}
      {slide.activity && <ActivityView key={`${slide.id}:${JSON.stringify(slide.activity)}`} activity={slide.activity} background={slide.activity.imageId ? <AssetView id={slide.activity.imageId} projectId={projectId} transport={transport} /> : undefined} />}
      {interaction.type === "quiz" && (
        <div className="ds-activity">
          <strong>{interaction.prompt}</strong>
          <div className="ds-options">
            {interaction.options.map((o, i) => (
              <button
                key={i}
                onClick={() => setAnswer(o)}
                className={answer === o ? "selected" : ""}
              >
                {String.fromCharCode(65 + i)} · {o}
              </button>
            ))}
          </div>
          {answer && (
            <p role="status">
              {answer === interaction.answer ? "Correct. " : "Try again. "}
              {answer === interaction.answer ? interaction.feedback : ""}
            </p>
          )}
        </div>
      )}
      {interaction.type === "reveal" && (
        <div className="ds-activity">
          <button onClick={() => setReveal(!reveal)}>
            {reveal ? "Hide explanation" : "Reveal explanation"}
          </button>
          {reveal && <p>{interaction.feedback}</p>}
        </div>
      )}
      {interaction.type === "comparison" && (
        <div className="ds-comparison">
          {interaction.options.map((o, i) => (
            <div key={i}>
              <small>COMPARE {i + 1}</small>
              <p>{o}</p>
            </div>
          ))}
        </div>
      )}
      {interaction.type === "orbit" && (
        <div className="ds-orbit-wrap">
          <div
            className={`ds-orbit ${play ? "playing" : ""}`}
            style={
              {
                "--orbit-duration": `${8 / interaction.speed}s`,
              } as CSSProperties
            }
          >
            <span className="ds-centre" />
            <span className="ds-orbiter" />
          </div>
          <div>
            <strong>Observe the changing direction</strong>
            <p>Illustrative uniform circular motion</p>
            <button onClick={() => setPlay(!play)}>
              {play ? "Pause" : "Play"} motion
            </button>
          </div>
        </div>
      )}
      {slide.elements.map((original) => {
        const e =
          preview?.id === original.id ? { ...original, ...preview } : original;
        return (
          <div
            key={e.id}
            role={!teaching ? "button" : undefined}
            tabIndex={!teaching ? 0 : undefined}
            aria-label={!teaching ? `Select ${e.kind} element` : undefined}
            onKeyDown={(ev) => {
              if (ev.key === "Enter") onSelect?.(e.id);
            }}
            onClick={() => !teaching && onSelect?.(e.id)}
            onPointerDown={(event) => begin(event, original)}
            onPointerMove={(event) => {
              if (drag.current?.id === e.id) setPreview(boxAt(event));
            }}
            onPointerUp={(event) => {
              if (drag.current?.id !== e.id) return;
              const box = boxAt(event);
              drag.current = null;
              setPreview(null);
              if (event.currentTarget.hasPointerCapture(event.pointerId))
                event.currentTarget.releasePointerCapture(event.pointerId);
              onTransform?.(box.id, {
                x: box.x,
                y: box.y,
                width: box.width,
                height: box.height,
              });
            }}
            onPointerCancel={() => {
              drag.current = null;
              setPreview(null);
            }}
            className={`ds-element ${selected === e.id && !teaching ? "selected" : ""}`}
            style={{
              left: `${e.x}%`,
              top: `${e.y}%`,
              width: `${e.width}%`,
              height: `${e.height}%`,
              fontSize: `${e.fontSize / 16}cqw`,
              color: e.color,
              background: e.kind === "shape" ? e.color : undefined,
            }}
          >
            {e.kind === "image" || e.kind === "video" ? (
              <AssetView
                id={e.assetId}
                projectId={projectId}
                transport={transport}
                video={e.kind === "video"}
              />
            ) : e.kind === "text" ? (
              e.text
            ) : null}
            {!teaching && !e.locked && selected === e.id && (
              <span
                data-resize
                className="ds-resize-handle"
                aria-hidden="true"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
