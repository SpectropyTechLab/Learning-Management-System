import { Image, Play, Shapes } from 'lucide-react';
import type { StudioGapBridgeTarget } from '../api/studioGapBridgesApi';

type PreviewElement = StudioGapBridgeTarget['preview_screen']['elements'][number];

const numberValue = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const textValue = (content: Record<string, unknown>) => {
  for (const key of ['text', 'title', 'label', 'question', 'caption']) {
    const value = content[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
};

function PreviewContent({ element }: { element: PreviewElement }) {
  const content = element.content_json || {};
  const resource = element.resource_mapping;
  const type = String(element.element_type || '').toLowerCase();
  const text = textValue(content);
  const externalUrl = resource?.external_url;

  if (externalUrl && (resource?.resource_type === 'image' || type === 'image')) {
    return <img src={externalUrl} alt="" className="h-full w-full object-cover" />;
  }
  if (text) {
    return (
      <span className="block h-full overflow-hidden whitespace-pre-wrap text-[4px] font-semibold leading-tight text-slate-700">
        {text}
      </span>
    );
  }
  if (resource?.resource_type === 'video' || type === 'video') {
    return <Play className="h-1/2 w-1/2 fill-current text-blue-700" />;
  }
  if (resource?.resource_type === 'image' || type === 'image') {
    return <Image className="h-1/2 w-1/2 text-emerald-700" />;
  }
  return <Shapes className="h-1/2 w-1/2 text-violet-600" />;
}

export default function StudioPublishedScreenThumbnail({
  target,
}: {
  target: StudioGapBridgeTarget;
}) {
  const preview = target.preview_screen;
  const width = numberValue(preview?.layout?.canvas_width, 1280);
  const height = numberValue(preview?.layout?.canvas_height, 720);
  const settings = preview?.screen_settings_json || {};
  const background = String(settings.backgroundColor || settings.background_color || '#ffffff');

  return (
    <span
      aria-label={`Preview of ${target.screen_title}`}
      className="relative block aspect-video w-36 shrink-0 overflow-hidden rounded-md border border-slate-300 shadow-sm"
      style={{ background }}
    >
      {(preview?.elements || [])
        .slice()
        .sort((left, right) => Number(left.display_order || 0) - Number(right.display_order || 0))
        .map((element, index) => {
          const position = element.position_json || {};
          const x = numberValue(position.x, 80);
          const y = numberValue(position.y, 60 + index * 45);
          const elementWidth = numberValue(position.width, 320);
          const elementHeight = numberValue(position.height, 90);
          const content = element.content_json || {};
          const fill = String(content.fill || content.backgroundColor || 'rgba(226,232,240,.75)');
          return (
            <span
              key={element.element_key || index}
              className="absolute flex items-center justify-center overflow-hidden rounded-[1px]"
              style={{
                left: `${Math.max(0, (x / width) * 100)}%`,
                top: `${Math.max(0, (y / height) * 100)}%`,
                width: `${Math.max(2, (elementWidth / width) * 100)}%`,
                height: `${Math.max(2, (elementHeight / height) * 100)}%`,
                background: fill,
              }}
            >
              <PreviewContent element={element} />
            </span>
          );
        })}
      {!preview?.elements?.length ? (
        <span className="absolute inset-0 grid place-items-center text-[9px] font-semibold text-slate-400">
          Empty Screen
        </span>
      ) : null}
    </span>
  );
}
