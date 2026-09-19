export class StudioError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}
const str = (maxLength = 20000) => ({ type: "string", maxLength });
const num = (minimum, maximum) => ({ type: "number", minimum, maximum });
const arr = (items, maxItems = 100) => ({ type: "array", items, maxItems });
const obj = (properties) => ({
  type: "object",
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});
const choice = (values) => ({ type: "string", enum: values });
export const templates = [
  "opener",
  "concept",
  "comparison",
  "worked-example",
  "evidence",
  "media",
  "quiz",
  "simulation",
  "exit",
];
export const elementSchema = obj({
  id: str(100),
  kind: choice(["text", "shape", "image", "video"]),
  text: str(6000),
  assetId: str(100),
  x: num(0, 95),
  y: num(0, 95),
  width: num(1, 100),
  height: num(1, 100),
  fontSize: num(12, 100),
  color: str(9),
  locked: { type: "boolean" },
});
export const slideSchema = obj({
  id: str(100),
  title: str(400),
  body: str(12000),
  notes: str(12000),
  template: choice(templates),
  background: str(9),
  transition: choice(["none", "fade", "rise"]),
  elements: arr(elementSchema, 60),
  interaction: obj({
    type: choice(["none", "quiz", "reveal", "orbit", "comparison"]),
    prompt: str(2000),
    options: arr(str(1000), 8),
    answer: str(1000),
    feedback: str(2000),
    speed: num(0.1, 3),
  }),
  visualBrief: str(12000),
  warnings: arr(str(2000), 30),
});
export const sessionSchema = obj({
  id: str(100),
  title: str(400),
  duration: num(1, 180),
  objectives: str(12000),
  plan: str(100000),
  script: str(100000),
  slides: arr(slideSchema, 80),
});
export const workspaceSchema = obj({
  schemaVersion: num(1, 1),
  curriculum: obj({
    programId: str(20),
    gradeId: str(20),
    subjectId: str(20),
    chapterId: str(20),
    topicIds: arr(str(20), 200),
  }),
  metadata: obj({
    title: str(300),
    program: str(200),
    grade: str(100),
    subject: str(200),
    chapter: str(300),
    topics: str(4000),
    language: str(100),
    instructions: str(12000),
  }),
  sessions: arr(sessionSchema, 30),
});
export const resultSchema = obj({
  workspace: workspaceSchema,
  warnings: arr(str(2000), 50),
});

// The same allowlisted contract validates saved documents and model outputs.
export function validate(schema, value, path = "document") {
  const fail = (reason) => {
    throw new StudioError(`${path}: ${reason}`);
  };
  if (schema.type === "object") {
    if (!value || typeof value !== "object" || Array.isArray(value))
      fail("expected object");
    for (const k of Object.keys(value))
      if (!(k in schema.properties)) fail(`unexpected field ${k}`);
    for (const k of schema.required) {
      if (!(k in value)) fail(`missing ${k}`);
      validate(schema.properties[k], value[k], `${path}.${k}`);
    }
  } else if (schema.type === "array") {
    if (!Array.isArray(value) || value.length > schema.maxItems)
      fail("invalid list size");
    value.forEach((v, i) => validate(schema.items, v, `${path}[${i}]`));
  } else {
    if (typeof value !== schema.type) fail(`expected ${schema.type}`);
    if (
      schema.type === "string" &&
      (value.length > (schema.maxLength ?? Infinity) ||
        (schema.enum && !schema.enum.includes(value)))
    )
      fail("invalid text or option");
    if (
      schema.type === "number" &&
      (!Number.isFinite(value) ||
        value < schema.minimum ||
        value > schema.maximum)
    )
      fail("outside permitted range");
  }
  return value;
}
export function validateWorkspace(value) {
  validate(workspaceSchema, value);
  if (!value.metadata.title.trim())
    throw new StudioError("Project title is required");
  const ids = new Set();
  for (const session of value.sessions) {
    for (const item of [
      session,
      ...session.slides,
      ...session.slides.flatMap((s) => s.elements),
    ]) {
      if (!item.id || ids.has(item.id))
        throw new StudioError(
          "Every session, slide and element requires a unique ID",
        );
      ids.add(item.id);
    }
    for (const slide of session.slides) {
      if (!/^#[a-f\d]{6}$/i.test(slide.background))
        throw new StudioError("Invalid slide background");
      for (const e of slide.elements) {
        if (
          !/^#[a-f\d]{6}$/i.test(e.color) ||
          e.x + e.width > 100.01 ||
          e.y + e.height > 100.01
        )
          throw new StudioError(
            "Element must fit within the canvas and use a hex color",
          );
      }
      if (
        slide.interaction.type === "quiz" &&
        (slide.interaction.options.length < 2 ||
          !slide.interaction.options.includes(slide.interaction.answer))
      )
        throw new StudioError(
          "Quiz requires two or more options and a matching answer",
        );
    }
  }
  if (Buffer.byteLength(JSON.stringify(value)) > 2_000_000)
    throw new StudioError(
      "Project exceeds 2 MB; split it into smaller projects",
    );
  return value;
}
export const emptyWorkspace = () => ({
  schemaVersion: 1,
  curriculum: {
    programId: "",
    gradeId: "",
    subjectId: "",
    chapterId: "",
    topicIds: [],
  },
  metadata: {
    title: "Untitled lesson",
    program: "",
    grade: "",
    subject: "",
    chapter: "",
    topics: "",
    language: "English",
    instructions: "",
  },
  sessions: [],
});
export function authorize(user, permissions) {
  if (user?.role !== "content_authorizer")
    throw new StudioError(
      "Digital Studio is currently available to Content Authorizers",
      403,
    );
  if (!permissions?.get?.("studio.access"))
    throw new StudioError("Digital Studio access has not been granted", 403);
}
export const scopeKey = (user) =>
  user.client_id == null ? "platform" : `client:${user.client_id}`;
