import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, PointerEvent } from "react";
import type {
  Asset,
  Element,
  Job,
  Model,
  Project,
  Session,
  Slide,
  StudioTransport,
  Workspace,
} from "./types";
import { importScript, newId, newSession, newSlide, templates } from "./types";
import { CurriculumPicker } from "./CurriculumPicker";
import { BoardPicker } from "./BoardPicker";
import { ActivityEditor } from "./ActivityEditor";
import { MotionEditor } from "./MotionScene";
import { DraftReview } from "./DraftReview";
import { SlideView } from "./SlideView";
import { CompositionEditor } from "./CompositionEditor";
import { arrangeBlocks } from "./blockCommands";
import { composeLegacySlide, applyCompositionCommand, enableBlockEditing } from "./composition";
import "./studio.css";

const stages = ["Syllabus", "Lesson plan", "Slide script", "Design & teach"];
const humanError = (e: unknown) =>
  e instanceof Error ? e.message : "The operation could not be completed.";
export default function Studio({ transport }: { transport: StudioTransport }) {
  const [projects, setProjects] = useState<Project[]>([]),
    [project, setProject] = useState<Project | null>(null),
    [stage, setStage] = useState(0),
    [sessionId, setSessionId] = useState(""),
    [slideId, setSlideId] = useState("");
  const [busy, setBusy] = useState(""),
    [notice, setNotice] = useState(""),
    [dirty, setDirty] = useState(false),
    [tour, setTour] = useState(false),
    [models, setModels] = useState<Model[]>([]),
    [model, setModel] = useState(""),
    [aiEnabled, setAiEnabled] = useState(false),
    [provider, setProvider] = useState("");
  const [assets, setAssets] = useState<Asset[]>([]),
    [jobs, setJobs] = useState<Job[]>([]),
    [review, setReview] = useState<Job | null>(null),
    [selected, setSelected] = useState(""),
    [present, setPresent] = useState(false),
    [showNotes, setShowNotes] = useState(false),
    [tab, setTab] = useState("templates");
  const [history, setHistory] = useState<Workspace[]>([]),
    [future, setFuture] = useState<Workspace[]>([]),
    [revisionList, setRevisionList] = useState<
      { revision: number; created_at: string }[]
    >([]);
  const [source, setSource] = useState(""),
    [saveState, setSaveState] = useState("Saved"),
    [ink, setInk] = useState<string[]>([]),
    [pen, setPen] = useState(false);
  const currentPath = useRef(""),
    stageRef = useRef<HTMLDivElement>(null),
    saving = useRef(false),
    projectRef = useRef(project);
  projectRef.current = project;
  const [published, setPublished] = useState<Workspace | null>(null);
  const [scriptDraft, setScriptDraft] = useState<{sessionId: string; slides: Slide[]} | null>(null);
  const displayDocument = present && published ? published : project?.document;
  const session =
    displayDocument?.sessions.find((s) => s.id === sessionId) ||
    displayDocument?.sessions[0];
  const slide =
    session?.slides.find((s) => s.id === slideId) || session?.slides[0];
  const element = slide?.elements.find((e) => e.id === selected);
  const request = transport.request;
  useEffect(() => {
    if (!review && !revisionList.length && !scriptDraft) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>(
      '.ds-root [role="dialog"]',
    );
    if (!dialog) return;
    const focusable = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),summary,[tabindex="0"]',
        ),
      ).filter((e) => e.getClientRects().length);
    focusable()[0]?.focus();
    const handle = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setReview(null);
        setRevisionList([]);
        setScriptDraft(null);
      }
      if (event.key !== "Tab") return;
      const items = focusable(),
        first = items[0],
        last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    dialog.addEventListener("keydown", handle);
    return () => {
      dialog.removeEventListener("keydown", handle);
      previous?.focus();
    };
  }, [review?.id, revisionList.length, !!scriptDraft]);
  const operate = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setNotice(humanError(e));
    } finally {
      setBusy("");
    }
  };
  const list = useCallback(
    async () => setProjects(await request<Project[]>("GET", "/projects")),
    [request],
  );
  useEffect(() => {
    list().catch((e) => setNotice(humanError(e)));
    request<{ enabled: boolean; provider: string; defaultModel: string }>(
      "GET",
      "/config",
    )
      .then((c) => {
        setAiEnabled(c.enabled);
        setProvider(c.provider);
        setModel(c.defaultModel);
        if (c.enabled)
          request<Model[]>("GET", "/models")
            .then((m) => {
              setModels(m);
              setModel((v) => (m.some((x) => x.id === v) ? v : m[0]?.id || ""));
            })
            .catch((e) => setNotice(humanError(e)));
      })
      .catch((e) => setNotice(humanError(e)));
  }, [list, request]);
  useEffect(() => {
    if (!project?.id) return;
    let active = true;
    const id = project.id;
    const poll = () =>
      request<Job[]>("GET", `/projects/${id}/jobs`)
        .then((v) => {
          if (active) setJobs(v);
        })
        .catch(() => {});
    void poll();
    const timer = setInterval(poll, 3500);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [project?.id, request]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const edit = (fn: (w: Workspace) => void) => {
    const current = projectRef.current;
    if (!current || current.id !== project?.id || busy || present) return;
    const next = structuredClone(current.document);
    fn(next);
    setHistory((h) => [...h.slice(-24), current.document]);
    setFuture([]);
    setProject({ ...current, document: next });
    setDirty(true);
    setSaveState("Unsaved changes");
  };
  const editSession = (fn: (s: Session) => void) => {
    if (!session) return;
    edit((w) => {
      const s = w.sessions.find((x) => x.id === session.id);
      if (s) fn(s);
    });
  };
  const editSlide = (fn: (s: Slide) => void) => {
    if (!slide) return;
    editSession((s) => {
      const x = s.slides.find((x) => x.id === slide.id);
      if (x) fn(x);
    });
  };
  const save = useCallback(async () => {
    if (!projectRef.current || saving.current)
      throw Error("A save is already in progress");
    saving.current = true;
    setSaveState("Saving…");
    const snapshot = projectRef.current;
    try {
      const saved = await request<Project>("PUT", `/projects/${snapshot.id}`, {
        document: snapshot.document,
        revision: snapshot.revision,
      });
      setProject((current) => {
        if (!current || current.id !== snapshot.id) return current;
        if (current.document === snapshot.document) {
          setDirty(false);
          setSaveState("Saved");
          return saved;
        }
        setSaveState("Unsaved changes");
        return { ...current, revision: saved.revision };
      });
      return saved;
    } catch (e) {
      setSaveState("Save failed — changes remain here");
      throw e;
    } finally {
      saving.current = false;
    }
  }, [request]);
  useEffect(() => {
    if (!dirty) return;
    const timer = setTimeout(() => {
      if (!saving.current) void save().catch((e) => setNotice(humanError(e)));
    }, 1500);
    return () => clearTimeout(timer);
  }, [dirty, project?.document, project?.revision, save]);
  const load = async (id: string) => {
    const p = await request<Project>("GET", `/projects/${id}`);
    setProject(p);
    setSessionId(p.document.sessions[0]?.id || "");
    setSlideId("");
    setDirty(false);
    setHistory([]);
    setFuture([]);
    setSaveState("Saved");
    setJobs([]);
    setSource("");
    setAssets(await request<Asset[]>("GET", `/projects/${id}/assets`));
  };
  const ai = async (task: string) =>
    operate("Preparing AI draft", async () => {
      if (!project) return;
      const p = dirty ? await save() : project;
      if (!p) return;
      await request("POST", `/projects/${p.id}/jobs`, {
        task,
        model,
        revision: p.revision,
        sessionId: session?.id,
        sourceText:
          task === "interpret-plan"
            ? source || session?.plan || ""
            : task === "interpret-script"
              ? source || session?.script || ""
              : source,
      });
      setNotice(
        "Generation queued. You can keep working; the result will appear below for review.",
      );
    });
  const upload = async (e: ChangeEvent<HTMLInputElement>, media = false) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !project) return;
    await operate("Importing file", async () => {
      const data = new FormData();
      data.append("file", file);
      const a = await request<Asset>(
        "POST",
        `/projects/${project.id}/assets`,
        data,
      );
      setAssets((v) => [a, ...v]);
      if (media) {
        if (!slide) return;
        const el: Element = {
          id: newId(),
          kind: a.mime.startsWith("video") ? "video" : "image",
          text: "",
          assetId: a.id,
          x: 55,
          y: 40,
          width: 35,
          height: 40,
          fontSize: 28,
          color: "#ffffff",
          locked: false,
        };
        editSlide((s) => {
          if (s.composition) {
            if (s.composition.blocks.length >= 40) return;
            s.composition.blocks.push({ id: el.id, locked: false, box: { x: el.x, y: el.y, width: el.width, height: el.height }, content: { kind: "element", element: el } });
          } else s.elements.push(el);
        });
        setSelected(el.id);
        return;
      }
      let text = a.extracted_text;
      if (a.mime === "application/pdf") text = await transport.extractPdf(file);
      if (!text.trim()) {
        setNotice(
          "No readable text was found. For scanned documents, provide OCR text or paste the content below. The original file is saved.",
        );
        return;
      }
      if (text.length > 100000)
        throw Error(
          "Source exceeds 100,000 characters; split it by chapter or session.",
        );
      setSource(text);
      if (stage === 1) {
        if (!session) {
          const s = newSession();
          s.title = file.name.replace(/\.[^.]+$/, "");
          s.plan = text;
          edit((w) => w.sessions.push(s));
          setSessionId(s.id);
        } else
          editSession((s) => {
            s.plan = text;
          });
      } else if (stage === 2 && session) {
        const slides = importScript(text);
        editSession((s) => {
          s.script = text;
        });
        setScriptDraft({ sessionId: session.id, slides });
      }
      setNotice(
        "Source imported. Review the text and mapped drafts before applying them.",
      );
    });
  };
  const addElement = (kind: "text" | "shape") => {
    const el: Element = {
      id: newId(),
      kind,
      text: kind === "text" ? "Your text" : "",
      assetId: "",
      x: 10,
      y: 65,
      width: 35,
      height: 15,
      fontSize: 32,
      color: kind === "text" ? "#ffffff" : "#c7ed81",
      locked: false,
    };
    editSlide((s) => s.elements.push(el));
    setSelected(el.id);
  };
  const move = (delta: number) => {
    if (!slide) return;
    editSession((s) => {
      const i = s.slides.findIndex((x) => x.id === slide.id),
        j = i + delta;
      if (j < 0 || j >= s.slides.length) return;
      [s.slides[i], s.slides[j]] = [s.slides[j], s.slides[i]];
    });
  };
  const navigate = useCallback(
    (delta: number) => {
      if (!session) return;
      const i = session.slides.findIndex((s) => s.id === slide?.id);
      setSlideId(
        session.slides[
          Math.max(0, Math.min(session.slides.length - 1, i + delta))
        ]?.id || "",
      );
      setInk([]);
    },
    [session, slide?.id],
  );
  useEffect(() => {
    if (!present) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input,textarea,select,[contenteditable=true]")) return;
      if (e.key === "Escape") setPresent(false);
      if (e.key === "ArrowRight") navigate(1);
      if (e.key === "ArrowLeft") navigate(-1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [present, navigate]);
  const pointer = (e: PointerEvent<SVGSVGElement>) => {
    const b = e.currentTarget.getBoundingClientRect();
    return `${((e.clientX - b.left) / b.width) * 1600},${((e.clientY - b.top) / b.height) * 900}`;
  };
  const canAI = aiEnabled && !!model && !busy;
  const aiButton = (label: string, task: string) => (
    <button
      className="ds-ai"
      disabled={!canAI}
      title={
        !aiEnabled
          ? "Configure the backend AI key to enable generation"
          : undefined
      }
      onClick={() => ai(task)}
    >
      ✦ {label}
    </button>
  );
  const status = (
    <>
      {busy && (
        <span role="status" className="ds-busy">
          {busy}…
        </span>
      )}
      {notice && (
        <div className="ds-notice" role="status">
          {notice}
          <button aria-label="Dismiss message" onClick={() => setNotice("")}>
            ×
          </button>
        </div>
      )}
    </>
  );

  if (!project)
    return (
      <div className="ds-root">
        {status}
        <section className="ds-hero">
          <div>
            <span className="ds-eyebrow">SPECTROPY DIGITAL STUDIO</span>
            <h1>
              From a teaching idea
              <br />
              to a classroom experience.
            </h1>
            <p>Plan with purpose. Shape every slide. Bring concepts to life.</p>
            <div className="ds-actions">
              <button
                className="ds-primary"
                disabled={!!busy}
                onClick={() =>
                  operate("Creating project", async () => {
                    const p = await request<Project>("POST", "/projects");
                    setProject(p);
                    setStage(0);
                  })
                }
              >
                ＋ Create a lesson
              </button>
              <button onClick={() => setTour(!tour)}>
                Explore the workflow ↗
              </button>
            </div>
          </div>
          <div className="ds-hero-art">
            <div className="ds-art-orbit" />
            <div className="ds-art-card">
              <span>LEARNING IN MOTION</span>
              <strong>
                A little curiosity.
                <br />A lasting understanding.
              </strong>
              <small>PLAN · CREATE · TEACH</small>
            </div>
          </div>
        </section>
        {tour && (
          <div className="ds-tour">
            Start with your syllabus. Upload or generate a plan, choose a
            session, then create its script and editable slides. AI drafts
            always come back to you for review. Changes save automatically after
            a short pause; check the Saved status before leaving Studio.
          </div>
        )}
        <div className="ds-stages-overview">
          {stages.map((s, i) => (
            <div key={s}>
              <b>0{i + 1}</b>
              <h3>{s}</h3>
              <p>
                {
                  [
                    "Set the learning context",
                    "Shape the session journey",
                    "Map the teaching experience",
                    "Make it yours, then present",
                  ][i]
                }
              </p>
            </div>
          ))}
        </div>
        <div className="ds-section-heading">
          <h2>Your workspace</h2>
          <span>{projects.length} projects</span>
        </div>
        <div className="ds-projects">
          {projects.map((p) => (
            <button
              key={p.id}
              className="ds-project-card"
              onClick={() => operate("Opening project", () => load(p.id))}
            >
              <span className="ds-project-art">▧</span>
              <strong>{p.title}</strong>
              <small>
                Revision {p.revision} ·{" "}
                {new Date(p.updated_at).toLocaleDateString()}
              </small>
            </button>
          ))}
          {!projects.length && (
            <p className="ds-empty">
              Your lessons will appear here. Create your first project to begin.
            </p>
          )}
        </div>
      </div>
    );

  return (
    <div className="ds-root">
      {status}
      <header className="ds-project-header">
        <div>
          <button
            className="ds-link"
            onClick={() =>
              operate("Returning to library", async () => {
                if (dirty) await save();
                setProject(null);
                setAssets([]);
                await list();
              })
            }
          >
            ← All projects
          </button>
          <h2>{project.document.metadata.title}</h2>
        </div>
        <div className="ds-actions">
          <span aria-live="polite">{saveState}</span>
          <button
            disabled={!!busy || !dirty}
            onClick={() =>
              operate("Saving", async () => {
                await save();
              })
            }
          >
            Save
          </button>
          <button
            onClick={() =>
              operate("Loading history", async () =>
                setRevisionList(
                  await request("GET", `/projects/${project.id}/revisions`),
                ),
              )
            }
          >
            History
          </button>
          {slide && (
            <button
              className="ds-primary"
              onClick={() => {
                setPublished(null);
                setPresent(true);
                setInk([]);
              }}
            >
              ▷ Present draft
            </button>
          )}
        </div>
      </header>
      <nav className="ds-steps" aria-label="Authoring stages">
        {stages.map((s, i) => (
          <button
            key={s}
            className={stage === i ? "active" : ""}
            aria-current={stage === i ? "step" : undefined}
            onClick={() => {
              setStage(i);
              setSource("");
            }}
          >
            <b>{i + 1}</b>
            {s}
          </button>
        ))}
      </nav>
      <div className="ds-ai-bar">
        <span>✦ {provider || "AI"} workspace</span>
        {aiEnabled ? (
          <label>
            Model{" "}
            <select value={model} onChange={(e) => setModel(e.target.value)}>
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <span>
            AI connection awaits server configuration. Manual authoring is
            available.
          </span>
        )}
        <small>Generated content needs academic review.</small>
      </div>
      {stage === 0 && (
        <div className="ds-form-layout">
          <section className="ds-panel">
            <span className="ds-eyebrow">01 / SYLLABUS</span>
            <h2>What will you teach?</h2>
            <p>Set the context that guides your lesson and every AI draft.</p>
            <CurriculumPicker
              value={project.document}
              transport={transport}
              onChange={edit}
            />
            <div className="ds-form-grid">
              {(
                [
                  "title",
                  "program",
                  "grade",
                  "subject",
                  "chapter",
                  "topics",
                  "language",
                ] as const
              ).map((k) => (
                <label key={k}>
                  {k === "grade" ? "Class / grade" : k}
                  <input
                    value={project.document.metadata[k]}
                    onChange={(e) =>
                      edit((w) => {
                        w.metadata[k] = e.target.value;
                      })
                    }
                  />
                </label>
              ))}
              <BoardPicker value={project.document.metadata.boards || []} onChange={(boards) =>
                edit((w) => { w.metadata.boards = boards; })
              } />
            </div>
            <label>
              Teaching brief / requirements
              <textarea
                rows={5}
                value={project.document.metadata.instructions}
                onChange={(e) =>
                  edit((w) => {
                    w.metadata.instructions = e.target.value;
                  })
                }
                placeholder="Learning goals, prior knowledge, depth, language and the experience you want to create…"
              />
            </label>
            <div className="ds-actions">
              {aiButton("Refine brief", "metadata")}
              <button className="ds-primary" onClick={() => setStage(1)}>
                Continue to lesson plan →
              </button>
            </div>
          </section>
          <aside className="ds-guidance">
            <span>TEACHER FIRST</span>
            <h2>
              Your expertise.
              <br />
              More possibilities.
            </h2>
            <p>
              Start with what students should understand. AI helps draft the
              path; you decide what belongs in the classroom.
            </p>
            <ul>
              <li>Specify the concepts and intended depth.</li>
              <li>Keep scientific assumptions explicit.</li>
              <li>Review every generated draft.</li>
            </ul>
          </aside>
        </div>
      )}
      {(stage === 1 || stage === 2) && (
        <div className="ds-form-layout">
          <section className="ds-panel">
            <span className="ds-eyebrow">
              0{stage + 1} / {stages[stage]}
            </span>
            <h2>
              {stage === 1
                ? "Build the learning journey."
                : "Give every slide a purpose."}
            </h2>
            <p>
              {project.document.metadata.program} ·{" "}
              {project.document.metadata.grade} ·{" "}
              {project.document.metadata.subject} ·{" "}
              {project.document.metadata.chapter}
            </p>
            <div className="ds-actions">
              <label className="ds-upload">
                ↑ Upload {stage === 1 ? "lesson plan" : "script"}
                <input
                  type="file"
                  accept=".pdf,.docx,.md,.txt"
                  onChange={(e) => upload(e)}
                />
              </label>
              {aiButton(
                stage === 1 ? "Generate lesson plan" : "Generate slide script",
                stage === 1 ? "plan" : "script",
              )}
              <button
                onClick={() => {
                  const s = newSession();
                  s.title = `Session ${project.document.sessions.length + 1}`;
                  edit((w) => w.sessions.push(s));
                  setSessionId(s.id);
                }}
              >
                ＋ Session
              </button>
            </div>
            <label>
              Session
              <select
                value={session?.id || ""}
                onChange={(e) => {
                  setSessionId(e.target.value);
                  setSource("");
                }}
              >
                <option value="" disabled>
                  Select a session
                </option>
                {project.document.sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title} · {s.duration} min · {s.slides.length} slides
                  </option>
                ))}
              </select>
            </label>
            {session ? (
              <>
                <div className="ds-form-grid">
                  <label>
                    Session title
                    <input
                      value={session.title}
                      onChange={(e) =>
                        editSession((s) => {
                          s.title = e.target.value;
                        })
                      }
                    />
                  </label>
                  <label>
                    Duration (minutes)
                    <input
                      type="number"
                      min={1}
                      max={180}
                      value={session.duration}
                      onChange={(e) =>
                        editSession((s) => {
                          s.duration = Math.min(
                            180,
                            Math.max(1, Number(e.target.value)),
                          );
                        })
                      }
                    />
                  </label>
                </div>
                <label>
                  Learning objectives
                  <textarea
                    rows={3}
                    value={session.objectives}
                    onChange={(e) =>
                      editSession((s) => {
                        s.objectives = e.target.value;
                      })
                    }
                  />
                </label>
                <label>
                  {stage === 1 ? "Lesson plan" : "Slide script"}
                  <textarea
                    className="ds-source"
                    value={stage === 1 ? session.plan : session.script}
                    onChange={(e) =>
                      editSession((s) => {
                        if (stage === 1) s.plan = e.target.value;
                        else s.script = e.target.value;
                      })
                    }
                    placeholder="Paste content or upload a document. Different structures are supported through AI interpretation."
                  />
                </label>
                <div className="ds-actions">
                  {aiButton(
                    "Interpret this content",
                    stage === 1 ? "interpret-plan" : "interpret-script",
                  )}
                  {stage === 2 && (
                    <>
                      <button
                        onClick={() => {
                          try {
                            const slides = importScript(session.script);
                            setScriptDraft({ sessionId: session.id, slides });
                          } catch (e) {
                            setNotice(humanError(e));
                          }
                        }}
                      >
                        Create manual slide drafts
                      </button>
                      {aiButton("Generate editable slides", "slides")}
                    </>
                  )}
                  <button
                    className="ds-primary"
                    onClick={() => setStage(stage + 1)}
                  >
                    Continue →
                  </button>
                </div>
              </>
            ) : (
              <div className="ds-empty">
                Upload a plan, generate one with AI, or add a session to begin.
              </div>
            )}
          </section>
          <aside className="ds-guidance">
            <span>FLEXIBLE BY DESIGN</span>
            <h2>
              Your content.
              <br />
              Your structure.
            </h2>
            <p>
              PDF, DOCX, Markdown and text are reference sources. Review
              extracted material before asking AI to organize it.
            </p>
            <p>
              Detailed animation and 3D instructions are preserved as visual
              briefs. Studio identifies requests that need additional components
              or assets.
            </p>
            <small>
              Uploaded source files:{" "}
              {
                assets.filter(
                  (a) =>
                    !a.mime.startsWith("image") && !a.mime.startsWith("video"),
                ).length
              }
            </small>
          </aside>
        </div>
      )}
      {stage === 3 && (
        <>
          <div className="ds-editor-toolbar">
            <select
              aria-label="Choose session"
              value={session?.id || ""}
              onChange={(e) => {
                setSessionId(e.target.value);
                setSlideId("");
              }}
            >
              {project.document.sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
            <button
              disabled={!session}
              onClick={() => {
                const s = newSlide();
                editSession((x) => x.slides.push(s));
                setSlideId(s.id);
              }}
            >
              ＋ Slide
            </button>
            <button
              disabled={!history.length}
              onClick={() => {
                const prev = history[history.length - 1];
                setFuture((f) => [project.document, ...f]);
                setHistory((h) => h.slice(0, -1));
                setProject({ ...project, document: prev });
                setDirty(true);
                setSaveState("Unsaved changes");
              }}
            >
              ↶ Undo
            </button>
            <button
              disabled={!future.length}
              onClick={() => {
                setHistory((h) => [...h, project.document]);
                setProject({ ...project, document: future[0] });
                setFuture((f) => f.slice(1));
                setDirty(true);
                setSaveState("Unsaved changes");
              }}
            >
              ↷ Redo
            </button>
            {aiButton("Generate slides", "slides")}
            <button
              onClick={() =>
                operate("Publishing", async () => {
                  if (
                    !window.confirm(
                      "Confirm you reviewed all content for academic accuracy, asset rights and accessibility. Publish this revision?",
                    )
                  )
                    return;
                  const p = dirty ? await save() : project;
                  if (!p) return;
                  const r = await request<{ revision: number }>(
                    "POST",
                    `/projects/${p.id}/publish`,
                    { revision: p.revision, reviewed: true },
                  );
                  setNotice(
                    `Revision ${r.revision} published as an immutable snapshot.`,
                  );
                })
              }
            >
              Publish reviewed lesson
            </button>
            <button
              onClick={() =>
                operate("Opening published lesson", async () => {
                  const r = await request<{ document: Workspace }>(
                    "GET",
                    `/projects/${project.id}/releases/latest`,
                  );
                  setPublished(r.document);
                  setSessionId(r.document.sessions[0]?.id || "");
                  setSlideId("");
                  setInk([]);
                  setPresent(true);
                })
              }
            >
              Present published lesson
            </button>
          </div>
          <div className="ds-editor">
            <aside className="ds-slide-list">
              {session?.slides.map((s, i) => (
                <button
                  key={s.id}
                  className={slide?.id === s.id ? "active" : ""}
                  onClick={() => {
                    setSlideId(s.id);
                    setSelected("");
                  }}
                >
                  <span>{String(i + 1).padStart(2, "0")}</span>
                  <div style={{ background: s.background }}>
                    <strong>{s.title}</strong>
                    <small>{s.template}</small>
                  </div>
                </button>
              ))}
              <small>{session?.slides.length || 0} slides</small>
            </aside>
            <main className="ds-canvas-area">
              {slide ? (
                <>
                  <SlideView
                    slide={slide}
                    transport={transport}
                    projectId={project.id}
                    selected={selected}
                    onSelect={setSelected}
                    onTransform={(id, box) =>
                      editSlide((s) => {
                        if (s.composition) {
                          const block = s.composition.blocks.find(b => b.id === id);
                          if (block?.groupId) {
                            s.composition.blocks = arrangeBlocks(s.composition.blocks, [id], { type: "move", dx: box.x - block.box.x, dy: box.y - block.box.y });
                            return;
                          }
                          s.composition.blocks = applyCompositionCommand(composeLegacySlide(s), { type: "transform", id, box }).blocks;
                          return;
                        }
                        const e = s.elements.find((e) => e.id === id);
                        if (e && !e.locked) Object.assign(e, box);
                      })
                    }
                  />
                  <div className="ds-canvas-tools">
                    {!slide.composition ? <button onClick={() => {
                      if (!window.confirm("Enable multi-block editing for this slide only? Content is kept, but the layout changes. Undo restores the previous slide; History can restore a saved revision.")) return;
                      try {
                        const converted = enableBlockEditing(slide);
                        editSlide(s => { s.composition = converted.composition; });
                        setTab("blocks"); setSelected("");
                      } catch (e) { setNotice(humanError(e)); }
                    }}>Enable multi-block editing</button> : <span className="ds-editor-mode">Multi-block editing enabled</span>}
                    <button onClick={() => move(-1)}>← Earlier</button>
                    <button onClick={() => move(1)}>Later →</button>
                    <button
                      onClick={() => {
                        const dup = structuredClone(slide);
                        dup.id = newId();
                        dup.elements.forEach((e) => {
                          e.id = newId();
                        });
                        editSession((s) => s.slides.push(dup));
                        setSlideId(dup.id);
                      }}
                    >
                      Duplicate
                    </button>
                    <button
                      onClick={() => {
                        editSession((s) => {
                          s.slides = s.slides.filter((x) => x.id !== slide.id);
                        });
                        setSlideId("");
                      }}
                    >
                      Delete slide
                    </button>
                  </div>
                  <label>
                    Teacher notes
                    <textarea
                      rows={4}
                      value={slide.notes}
                      onChange={(e) =>
                        editSlide((s) => {
                          s.notes = e.target.value;
                        })
                      }
                    />
                  </label>
                  {slide.warnings.length > 0 && (
                    <div className="ds-warning">
                      <strong>Review before publishing</strong>
                      {slide.warnings.map((w, i) => (
                        <p key={i}>{w}</p>
                      ))}
                      <button
                        onClick={() => {
                          if (
                            window.confirm(
                              "Have you resolved every listed issue for this slide?",
                            )
                          )
                            editSlide((s) => {
                              s.warnings = [];
                            });
                        }}
                      >
                        Mark resolved
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="ds-empty">
                  Choose a session and add slides, or generate them from your
                  script.
                </div>
              )}
            </main>
            <aside className="ds-inspector">
              <div className="ds-tabs">
                {(slide?.composition ? ["blocks"] : ["templates", "content", "elements", "activity"]).map((t) => (
                  <button
                    key={t}
                    className={(slide?.composition ? t === "blocks" : (tab === "blocks" ? t === "templates" : tab === t)) ? "active" : ""}
                    onClick={() => setTab(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
              {slide && (
                <>
                  {slide.composition && <>
                    <CompositionEditor slide={slide} edit={editSlide} assets={assets} selected={selected} select={setSelected} />
                    {slide.composition && <label className="ds-upload">Upload block media<input type="file" accept="image/png,image/jpeg,image/gif,image/webp,video/mp4,video/webm" onChange={e => upload(e, true)} /></label>}
                  </>}
                  {!slide.composition && (tab === "templates" || tab === "blocks") && (
                    <>
                      <h3>Start with a layout</h3>
                      <div className="ds-template-grid">
                        {templates.map((t) => (
                          <button
                            key={t}
                            className={slide.template === t ? "active" : ""}
                            onClick={() =>
                              editSlide((s) => {
                                s.template = t;
                              })
                            }
                          >
                            <span>▤</span>
                            {t.replace("-", " ")}
                          </button>
                        ))}
                      </div>
                      <label>
                        Background
                        <input
                          type="color"
                          value={slide.background}
                          onChange={(e) =>
                            editSlide((s) => {
                              s.background = e.target.value;
                            })
                          }
                        />
                      </label>
                      <label>
                        Transition
                        <select
                          value={slide.transition}
                          onChange={(e) =>
                            editSlide((s) => {
                              s.transition = e.target
                                .value as Slide["transition"];
                            })
                          }
                        >
                          {["none", "fade", "rise"].map((t) => (
                            <option key={t}>{t}</option>
                          ))}
                        </select>
                      </label>
                    </>
                  )}
                  {!slide.composition && tab === "content" && (
                    <>
                      <label>
                        Title
                        <textarea
                          rows={3}
                          value={slide.title}
                          onChange={(e) =>
                            editSlide((s) => {
                              s.title = e.target.value;
                            })
                          }
                        />
                      </label>
                      <label>
                        Visible explanation
                        <textarea
                          rows={8}
                          value={slide.body}
                          onChange={(e) =>
                            editSlide((s) => {
                              s.body = e.target.value;
                            })
                          }
                        />
                      </label>
                      <label>
                        Visual / animation brief
                        <textarea
                          rows={6}
                          value={slide.visualBrief}
                          onChange={(e) =>
                            editSlide((s) => {
                              s.visualBrief = e.target.value;
                            })
                          }
                        />
                      </label>
                      <small>
                        A brief describes intent. Only supported components
                        render automatically.
                      </small>
                    </>
                  )}
                  {!slide.composition && tab === "elements" && (
                    <>
                      <div className="ds-actions">
                        <button onClick={() => addElement("text")}>
                          ＋ Text
                        </button>
                        <button onClick={() => addElement("shape")}>
                          ＋ Shape
                        </button>
                        <label className="ds-upload">
                          ↑ Media
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/gif,image/webp,video/mp4,video/webm"
                            onChange={(e) => upload(e, true)}
                          />
                        </label>
                      </div>
                      <select
                        aria-label="Select element"
                        value={selected}
                        onChange={(e) => setSelected(e.target.value)}
                      >
                        <option value="">Select an element</option>
                        {slide.elements.map((e, i) => (
                          <option key={e.id} value={e.id}>
                            {i + 1}. {e.kind} {e.text.slice(0, 20)}
                          </option>
                        ))}
                      </select>
                      {element && (
                        <>
                          <label>
                            <input
                              type="checkbox"
                              checked={element.locked}
                              onChange={(e) =>
                                editSlide((s) => {
                                  s.elements.find(
                                    (x) => x.id === selected,
                                  )!.locked = e.target.checked;
                                })
                              }
                            />{" "}
                            Lock element
                          </label>
                          <fieldset disabled={element.locked}>
                            {element.kind === "text" && (
                              <label>
                                Text
                                <textarea
                                  value={element.text}
                                  onChange={(e) =>
                                    editSlide((s) => {
                                      s.elements.find(
                                        (x) => x.id === selected,
                                      )!.text = e.target.value;
                                    })
                                  }
                                />
                              </label>
                            )}
                            {(
                              ["x", "y", "width", "height", "fontSize"] as const
                            ).map((k) => (
                              <label key={k}>
                                {k}
                                <input
                                  type="number"
                                  min={
                                    k === "fontSize"
                                      ? 12
                                      : k === "x" || k === "y"
                                        ? 0
                                        : 1
                                  }
                                  max={100}
                                  value={element[k]}
                                  onChange={(e) =>
                                    editSlide((s) => {
                                      const x = s.elements.find(
                                        (x) => x.id === selected,
                                      )!;
                                      const v = Number(e.target.value);
                                      x[k] = Math.max(
                                        k === "fontSize"
                                          ? 12
                                          : k === "x" || k === "y"
                                            ? 0
                                            : 1,
                                        Math.min(
                                          k === "x"
                                            ? Math.min(95, 100 - x.width)
                                            : k === "y"
                                              ? Math.min(95, 100 - x.height)
                                              : k === "width"
                                                ? 100 - x.x
                                                : k === "height"
                                                  ? 100 - x.y
                                                  : 100,
                                          v,
                                        ),
                                      );
                                    })
                                  }
                                />
                              </label>
                            ))}
                            <label>
                              Color
                              <input
                                type="color"
                                value={element.color}
                                onChange={(e) =>
                                  editSlide((s) => {
                                    s.elements.find(
                                      (x) => x.id === selected,
                                    )!.color = e.target.value;
                                  })
                                }
                              />
                            </label>
                            <button
                              onClick={() =>
                                editSlide((s) => {
                                  const e = s.elements.find(
                                    (x) => x.id === selected,
                                  )!;
                                  s.elements = s.elements.filter(
                                    (x) => x.id !== selected,
                                  );
                                  s.elements.push(e);
                                })
                              }
                            >
                              Bring to front
                            </button>
                            <button
                              onClick={() => {
                                editSlide((s) => {
                                  s.elements = s.elements.filter(
                                    (x) => x.id !== selected,
                                  );
                                });
                                setSelected("");
                              }}
                            >
                              Remove element
                            </button>
                          </fieldset>
                        </>
                      )}
                    </>
                  )}
                  {!slide.composition && tab === "activity" && (
                    <>
                      <ActivityEditor slide={slide} edit={editSlide} assets={assets} />
                      <MotionEditor slide={slide} edit={editSlide} />
                      {!slide.scene && (!slide.activity || slide.activity.kind === "none") && <>
                      <label>
                        Component
                        <select
                          value={slide.interaction.type}
                          onChange={(e) =>
                            editSlide((s) => {
                              s.interaction.type = e.target
                                .value as Slide["interaction"]["type"];
                              if (
                                s.interaction.type === "quiz" &&
                                s.interaction.options.length < 2
                              ) {
                                s.interaction.options = [
                                  "Option A",
                                  "Option B",
                                ];
                                s.interaction.answer = "Option A";
                              }
                            })
                          }
                        >
                          {[
                            "none",
                            "quiz",
                            "reveal",
                            "comparison",
                            "orbit",
                          ].map((v) => (
                            <option key={v}>{v}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Prompt
                        <textarea
                          value={slide.interaction.prompt}
                          onChange={(e) =>
                            editSlide((s) => {
                              s.interaction.prompt = e.target.value;
                            })
                          }
                        />
                      </label>
                      {slide.interaction.type === "comparison" ? <>
                        {slide.interaction.options.map((value, index) => <label key={index}>
                          Comparison card {index + 1}
                          <textarea rows={5} maxLength={1000} value={value} onChange={(e) => editSlide((s) => { s.interaction.options[index] = e.target.value; })} />
                          <button onClick={() => editSlide((s) => { s.interaction.options.splice(index, 1); })}>Remove card {index + 1}</button>
                        </label>)}
                        <button disabled={slide.interaction.options.length >= 8} onClick={() => editSlide((s) => { s.interaction.options.push("New comparison card"); })}>Add comparison card</button>
                      </> : <label>
                        Options (one per line)
                        <textarea
                          rows={4}
                          value={slide.interaction.options.join("\n")}
                          onChange={(e) =>
                            editSlide((s) => {
                              s.interaction.options = e.target.value
                                .split("\n")
                                .slice(0, 8);
                            })
                          }
                        />
                      </label>}
                      <label>
                        Correct answer
                        <select
                          value={slide.interaction.answer}
                          onChange={(e) =>
                            editSlide((s) => {
                              s.interaction.answer = e.target.value;
                            })
                          }
                        >
                          <option value="">Choose answer</option>
                          {slide.interaction.options.map((v, i) => (
                            <option key={i}>{v}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Explanation / reveal
                        <textarea
                          value={slide.interaction.feedback}
                          onChange={(e) =>
                            editSlide((s) => {
                              s.interaction.feedback = e.target.value;
                            })
                          }
                        />
                      </label>
                      </>}
                    </>
                  )}
                </>
              )}
            </aside>
          </div>
        </>
      )}
      {jobs.length > 0 && (
        <section className="ds-jobs">
          <h3>AI drafts</h3>
          {jobs.map((j) => (
            <div key={j.id}>
              <span className={`ds-job-status ${j.status}`}>{j.status}</span>
              <span>
                {j.result?.model || "Generation"} ·{" "}
                {new Date(j.created_at).toLocaleTimeString()}
              </span>
              {j.error && <p>{j.error}</p>}
              {j.result && (
                <button onClick={() => setReview(j)}>Review draft</button>
              )}
            </div>
          ))}
        </section>
      )}
      {scriptDraft && (
        <div className="ds-modal-backdrop">
          <section className="ds-modal" role="dialog" aria-modal="true" aria-label="Review script drafts">
            <button className="ds-close" onClick={() => setScriptDraft(null)}>Close ×</button>
            <span className="ds-eyebrow">SCRIPT / STORYBOARD REVIEW</span>
            <h2>{scriptDraft.slides.length} editable drafts</h2>
            <p>Review the mapping below. Your existing slides stay unchanged until you apply these drafts. Unavailable features are listed for manual follow-up.</p>
            {scriptDraft.slides.map((draft, index) => (
              <article className="ds-script-card" key={draft.id}>
                <h3>{index + 1}. {draft.title}</h3>
                <p>Layout: {draft.template} · Activity: {draft.activity?.kind || draft.interaction.type}</p>
                {draft.scene && <p>2D/3D motion scene: {draft.scene.firstLeg} m + {draft.scene.secondLeg} m perpendicular journey; {draft.scene.duration} s illustrative playback.</p>}
                {draft.activity && <ul>{draft.activity.items.map((item) => <li key={item.id}>{item.label} — {item.value}{item.extra ? ` / ${item.extra}` : ""}</li>)}</ul>}
                <p className="ds-script-text">{draft.body || draft.interaction.prompt || "No visible explanation mapped."}</p>
                {draft.interaction.options.length > 0 && <ul>{draft.interaction.options.map((option, i) => <li key={i}>{option}</li>)}</ul>}
                {draft.interaction.type === "quiz" && <p>Author answer key: {draft.interaction.answer}</p>}
                {draft.notes && <details><summary>Teacher notes</summary><p className="ds-script-text">{draft.notes}</p></details>}
                {draft.visualBrief && <details><summary>Visual requirements (not generated)</summary><p className="ds-script-text">{draft.visualBrief}</p></details>}
                {draft.warnings.map((warning, i) => <p className="ds-warning" key={i}>{warning}</p>)}
              </article>
            ))}
            <div className="ds-actions">
              {(["append", "replace"] as const).map((mode) => <button key={mode} onClick={() => {
                const target = project.document.sessions.find((s) => s.id === scriptDraft.sessionId);
                if (!target) { setNotice("The source session is no longer available."); return; }
                if (mode === "append" && target.slides.length + scriptDraft.slides.length > 80) {
                  setNotice("A session supports up to 80 slides. Split the session or choose replacement."); return;
                }
                if (mode === "replace" && target.slides.length && !window.confirm("Replace existing slides with these reviewed drafts? Undo is available in this editing session.")) return;
                edit((w) => {
                  const s = w.sessions.find((item) => item.id === target.id)!;
                  s.slides = mode === "append" ? [...s.slides, ...scriptDraft.slides] : scriptDraft.slides;
                });
                setSessionId(target.id); setSlideId(scriptDraft.slides[0].id);
                setSelected(""); setScriptDraft(null); setStage(3);
              }}>{mode === "append" ? "Append drafts" : "Replace slides with drafts"}</button>)}
            </div>
          </section>
        </div>
      )}
      {review?.result && (
        <div className="ds-modal-backdrop">
          <section
            className="ds-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Review AI draft"
          >
            <button className="ds-close" onClick={() => setReview(null)}>
              Close ×
            </button>
            <span className="ds-eyebrow">AI DRAFT / REVIEW REQUIRED</span>
            <h2>{review.result.workspace.metadata.title}</h2>
            {review.result.warnings.map((w, i) => (
              <p className="ds-warning" key={i}>
                {w}
              </p>
            ))}
            <p>
              {review.result.workspace.sessions.length} sessions ·{" "}
              {review.result.workspace.sessions.reduce(
                (n, s) => n + s.slides.length,
                0,
              )}{" "}
              slides
            </p>
            <DraftReview
              workspace={review.result.workspace}
              transport={transport}
              projectId={project.id}
            />
            <button
              className="ds-primary"
              disabled={dirty || review.status !== "completed"}
              onClick={() =>
                operate("Applying draft", async () => {
                  const p = await request<Project>(
                    "POST",
                    `/projects/${project.id}/jobs/${review.id}/apply`,
                  );
                  setProject(p);
                  setDirty(false);
                  setHistory([]);
                  setFuture([]);
                  setReview(null);
                  setNotice(
                    "Draft applied. Review its academic content and supported visuals before publishing.",
                  );
                })
              }
            >
              Accept draft
            </button>
            {dirty && (
              <p>
                Save your manual edits first. Stale AI drafts cannot overwrite a
                newer revision.
              </p>
            )}
          </section>
        </div>
      )}
      {revisionList.length > 0 && (
        <div className="ds-modal-backdrop">
          <section
            className="ds-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Revision history"
          >
            <button className="ds-close" onClick={() => setRevisionList([])}>
              Close ×
            </button>
            <h2>Revision history</h2>
            {revisionList.map((r) => (
              <div className="ds-history-row" key={r.revision}>
                <span>
                  Revision {r.revision} ·{" "}
                  {new Date(r.created_at).toLocaleString()}
                </span>
                <button
                  disabled={dirty}
                  onClick={() =>
                    operate("Restoring revision", async () => {
                      const p = await request<Project>(
                        "POST",
                        `/projects/${project.id}/restore`,
                        {
                          restoreRevision: r.revision,
                          revision: project.revision,
                        },
                      );
                      setProject(p);
                      setRevisionList([]);
                      setHistory([]);
                      setFuture([]);
                      setDirty(false);
                      setNotice("Restored as a new revision.");
                    })
                  }
                >
                  Restore
                </button>
              </div>
            ))}
          </section>
        </div>
      )}
      {present && slide && (
        <div className="ds-present" ref={stageRef}>
          <div className="ds-present-canvas">
            <SlideView
              slide={slide}
              projectId={project.id}
              transport={transport}
              teaching
            />
            <svg
              className={`ds-ink ${pen ? "enabled" : ""}`}
              viewBox="0 0 1600 900"
              onPointerDown={(e) => {
                if (!pen) return;
                e.currentTarget.setPointerCapture(e.pointerId);
                currentPath.current = `M${pointer(e)}`;
                setInk((v) => [...v, currentPath.current]);
              }}
              onPointerMove={(e) => {
                if (!pen || !e.currentTarget.hasPointerCapture(e.pointerId))
                  return;
                currentPath.current += ` L${pointer(e)}`;
                setInk((v) => [...v.slice(0, -1), currentPath.current]);
              }}
              onPointerUp={(e) => {
                if (e.currentTarget.hasPointerCapture(e.pointerId))
                  e.currentTarget.releasePointerCapture(e.pointerId);
              }}
            >
              {ink.map((d, i) => (
                <path
                  key={i}
                  d={d}
                  fill="none"
                  stroke="#ffd76c"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
              ))}
            </svg>
          </div>
          <div className="ds-present-controls">
            <span>{published ? "PUBLISHED LESSON" : "DRAFT PREVIEW"}</span>
            <button onClick={() => navigate(-1)}>←</button>
            <span>
              {session!.slides.findIndex((s) => s.id === slide.id) + 1} /{" "}
              {session!.slides.length}
            </span>
            <button onClick={() => navigate(1)}>→</button>
            <button onClick={() => setPen(!pen)}>
              {pen ? "Use pointer" : "Pen"}
            </button>
            <button onClick={() => setInk((v) => v.slice(0, -1))}>
              Undo ink
            </button>
            <button onClick={() => setInk([])}>Clear ink</button>
            <button onClick={() => setShowNotes(!showNotes)}>
              Teacher notes
            </button>
            <button
              onClick={() =>
                stageRef.current
                  ?.requestFullscreen()
                  .catch(() =>
                    setNotice("Fullscreen is unavailable in this browser."),
                  )
              }
            >
              Fullscreen
            </button>
            <button
              onClick={() => {
                if (document.fullscreenElement) void document.exitFullscreen();
                setPresent(false);
              }}
            >
              Exit
            </button>
          </div>
          {showNotes && (
            <div className="ds-present-notes">
              <strong>Teacher notes — visible on this screen</strong>
              <p>{slide.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
