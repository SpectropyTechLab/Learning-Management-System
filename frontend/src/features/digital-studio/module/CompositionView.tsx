import { useState, useRef } from "react";
import type { PointerEvent } from "react";
import type { Slide, StudioTransport } from "./types";
import type { BlockBox, StudioBlock } from "./composition";
import { ActivityView } from "./ActivityView";
import { MotionView } from "./MotionScene";
import { AssetView, SlideView } from "./SlideView";
import { arrangeBlocks, expandGroups } from "./blockCommands";

export function CompositionView({ slide, projectId, transport, selected, onSelect, onTransform, teaching = false }: {
  slide: Slide; projectId: string; transport: StudioTransport; selected?: string;
  onSelect?: (id: string) => void; onTransform?: (id: string, box: BlockBox) => void; teaching?: boolean;
}) {
  const drag = useRef<{ block: StudioBlock; x: number; y: number; rect: DOMRect; resize: boolean } | null>(null);
  const [preview, setPreview] = useState<{ id: string; box: BlockBox } | null>(null);
  const position = (event: PointerEvent) => {
    const d = drag.current!, b = d.block.box;
    const dx = (event.clientX - d.x) * 100 / d.rect.width, dy = (event.clientY - d.y) * 100 / d.rect.height;
    return d.resize ? { ...b, width: Math.max(1, Math.min(100 - b.x, b.width + dx)), height: Math.max(1, Math.min(100 - b.y, b.height + dy)) } :
      { ...b, x: Math.max(0, Math.min(100 - b.width, b.x + dx)), y: Math.max(0, Math.min(100 - b.height, b.y + dy)) };
  };
  return <div className="ds-slide ds-composition" style={{ background: slide.background }} aria-label="Multi-block slide">
    {(preview && drag.current?.block.groupId ? arrangeBlocks(slide.composition!.blocks, [preview.id], { type: "move", dx: preview.box.x - drag.current.block.box.x, dy: preview.box.y - drag.current.block.box.y }) : slide.composition!.blocks).map(block => {
      const content = block.content, box = preview?.id === block.id && !block.groupId ? preview.box : block.box;
      const style = block.textStyle ? { fontSize: `${block.textStyle.size / 16}cqw`, color: block.textStyle.color, fontWeight: block.textStyle.bold ? 700 : 400, fontStyle: block.textStyle.italic ? "italic" : "normal", textAlign: block.textStyle.align } : undefined;
      return <div key={block.id} className={`ds-block ${selected === block.id && !teaching ? "selected" : ""}`}
        style={{ left: `${box.x}%`, top: `${box.y}%`, width: `${box.width}%`, height: `${box.height}%` }}>
        {!teaching && <button className="ds-block-handle" aria-label={`Select ${content.kind} block`} onClick={() => onSelect?.(block.id)}
          onPointerDown={event => {
            onSelect?.(block.id);
            if (block.locked || !onTransform || slide.composition!.blocks.some(b => expandGroups(slide.composition!.blocks, [block.id]).includes(b.id) && b.locked) || (block.groupId && event.shiftKey)) return;
            event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId);
            drag.current = { block, x: event.clientX, y: event.clientY, rect: event.currentTarget.parentElement!.parentElement!.getBoundingClientRect(), resize: event.shiftKey };
          }} onPointerMove={event => { if (drag.current?.block.id === block.id) setPreview({ id: block.id, box: position(event) }); }}
          onPointerUp={event => { if (drag.current?.block.id !== block.id) return; const box = position(event); drag.current = null; setPreview(null); onTransform?.(block.id, box); }}
          onPointerCancel={() => { drag.current = null; setPreview(null); }}>{content.kind}{block.locked ? " · locked" : " · move"}</button>}
        <div className="ds-block-content">
          {content.kind === "title" && <h2 style={style}>{content.text}</h2>}
          {content.kind === "body" && <div className="ds-block-text" style={style}>{content.text}</div>}
          {content.kind === "element" && (content.element.kind === "image" || content.element.kind === "video" ?
            <AssetView id={content.element.assetId} projectId={projectId} transport={transport} video={content.element.kind === "video"} /> :
            <div style={{ width: "100%", height: "100%", color: content.element.color, background: content.element.kind === "shape" ? content.element.color : undefined, fontSize: `${content.element.fontSize / 16}cqw`, whiteSpace: "pre-wrap", ...style }}>{content.element.kind === "text" ? content.element.text : ""}</div>)}
          {content.kind === "activity" && <ActivityView key={JSON.stringify(content.activity)} activity={content.activity} background={content.activity.imageId ? <AssetView id={content.activity.imageId} projectId={projectId} transport={transport} /> : undefined} />}
          {content.kind === "scene" && <MotionView key={JSON.stringify(content.scene)} config={content.scene} />}
          {content.kind === "interaction" && <SlideView key={JSON.stringify(content.interaction)} slide={{ ...slide, composition: undefined, activity: undefined, scene: undefined, title: "", body: "", elements: [], interaction: content.interaction }} projectId={projectId} transport={transport} teaching />}
        </div>
      </div>;
    })}
  </div>;
}
