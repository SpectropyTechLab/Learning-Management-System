import { useEffect, useState } from "react";
import type { StudioTransport, Workspace } from "./types";

type Option = { id: string; name: string };
export function CurriculumPicker({
  value,
  transport,
  onChange,
}: {
  value: Workspace;
  transport: StudioTransport;
  onChange: (update: (w: Workspace) => void) => void;
}) {
  const [options, setOptions] = useState<Record<string, Option[]>>({}),
    [error, setError] = useState("");
  const ids = value.curriculum;
  useEffect(() => {
    let active = true;
    setError("");
    const parents: Record<string, string | undefined> = {
      program: undefined,
      grade: ids.programId,
      subject: ids.gradeId,
      chapter: ids.subjectId,
      topic: ids.chapterId,
    };
    Promise.all(
      Object.entries(parents).map(
        async ([kind, parent]) =>
          [
            kind,
            kind === "program" || parent
              ? await transport.request<Option[]>(
                  "GET",
                  `/curriculum/${kind}${parent ? `?parent=${encodeURIComponent(parent)}` : ""}`,
                )
              : [],
          ] as const,
      ),
    )
      .then((entries) => {
        if (active) setOptions(Object.fromEntries(entries));
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [ids.programId, ids.gradeId, ids.subjectId, ids.chapterId, transport]);
  const select = (
    kind: "program" | "grade" | "subject" | "chapter",
    id: string,
  ) =>
    onChange((w) => {
      const levels = ["program", "grade", "subject", "chapter"] as const;
      levels.slice(levels.indexOf(kind)).forEach((k) => {
        w.curriculum[`${k}Id`] = k === kind ? id : "";
        w.metadata[k] =
          k === kind ? options[k]?.find((o) => o.id === id)?.name || "" : "";
      });
      w.curriculum.topicIds = [];
      w.metadata.topics = "";
    });
  return (
    <fieldset className="ds-curriculum">
      <legend>Link to OS curriculum</legend>
      <p>
        Select existing records, or leave these blank for an unlinked draft.
      </p>
      {error && <p role="alert">{error}</p>}
      <div className="ds-form-grid">
        {(["program", "grade", "subject", "chapter"] as const).map((kind) => (
          <label key={kind}>
            OS {kind}
            <select
              value={ids[`${kind}Id`]}
              onChange={(e) => select(kind, e.target.value)}
            >
              <option value="">Select {kind}</option>
              {options[kind]?.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      {!!options.topic?.length && (
        <label>
          OS topics (multiple selection)
          <select
            multiple
            value={ids.topicIds}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions).map(
                (o) => o.value,
              );
              onChange((w) => {
                w.curriculum.topicIds = selected;
                w.metadata.topics = options.topic
                  .filter((o) => selected.includes(o.id))
                  .map((o) => o.name)
                  .join(", ");
              });
            }}
          >
            {options.topic.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
      )}
    </fieldset>
  );
}
