import { useState } from "react";
import type { StudioTransport, Workspace } from "./types";
import { SlideView } from "./SlideView";

export function DraftReview({
  workspace,
  transport,
  projectId,
}: {
  workspace: Workspace;
  transport: StudioTransport;
  projectId: string;
}) {
  const [selected, setSelected] = useState("");
  const session =
    workspace.sessions.find((s) => s.id === selected) || workspace.sessions[0];
  return (
    <div className="ds-draft-review">
      <dl>
        {(
          [
            "program",
            "grade",
            "subject",
            "chapter",
            "topics",
            "language",
            "instructions",
          ] as const
        ).map(
          (key) =>
            workspace.metadata[key] && (
              <div key={key}>
                <dt>{key === "instructions" ? "Teaching brief" : key}</dt>
                <dd>{workspace.metadata[key]}</dd>
              </div>
            ),
        )}
      </dl>
      {!!workspace.sessions.length && (
        <label>
          Review session
          <select
            value={session?.id || ""}
            onChange={(e) => setSelected(e.target.value)}
          >
            {workspace.sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </label>
      )}
      {session && (
        <>
          <p>{session.duration} minutes</p>
          <h3>Learning objectives</h3>
          <p className="ds-preserve-lines">
            {session.objectives || "No objectives supplied."}
          </p>
          <details open={!session.slides.length}>
            <summary>Lesson plan</summary>
            <div className="ds-preserve-lines">
              {session.plan || "No plan supplied."}
            </div>
          </details>
          <details>
            <summary>Slide script</summary>
            <div className="ds-preserve-lines">
              {session.script || "No script supplied."}
            </div>
          </details>
          {session.slides.map((slide, i) => (
            <details key={slide.id}>
              <summary>
                Slide {i + 1}: {slide.title}
              </summary>
              <SlideView
                slide={slide}
                transport={transport}
                projectId={projectId}
              />
              <h4>Teacher notes</h4>
              <p className="ds-preserve-lines">{slide.notes}</p>
              {slide.visualBrief && (
                <>
                  <h4>Visual requirements</h4>
                  <p className="ds-preserve-lines">{slide.visualBrief}</p>
                </>
              )}
              {slide.warnings.map((warning, i) => (
                <p className="ds-warning" key={i}>
                  {warning}
                </p>
              ))}
            </details>
          ))}
        </>
      )}
    </div>
  );
}
