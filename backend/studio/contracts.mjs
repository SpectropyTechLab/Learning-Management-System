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
// Independently versioned, additive activity data; legacy slides need no rewrite.
slideSchema.properties.activity = obj({
  version: num(1, 1),
  kind: choice(["none", "steps", "matching", "table", "hotspots", "sorting"]),
  prompt: str(2000),
  headers: arr(str(200), 2),
  items: arr(obj({ id: str(100), label: str(300), value: str(1000), extra: str(1000) }), 8),
});
slideSchema.properties.activity.properties.imageId = str(100);
slideSchema.properties.activity.properties.items.items.properties.x = num(5,95);
slideSchema.properties.activity.properties.items.items.properties.y = num(5,95);
slideSchema.properties.scene = obj({version:num(1,1),kind:choice(["motion-path"]),firstLeg:num(1,100),secondLeg:num(1,100),duration:num(2,60),yaw:num(-180,180),elevation:num(15,80),cinematic:{type:"boolean"},color:str(7)});
const blockContentSchema = obj({ kind: choice(["title", "body", "element", "activity", "scene", "interaction"]) });
Object.assign(blockContentSchema.properties, {
  text: str(12000), element: elementSchema, activity: slideSchema.properties.activity,
  scene: slideSchema.properties.scene, interaction: slideSchema.properties.interaction,
});
slideSchema.properties.composition = obj({ version: num(1, 1), blocks: arr(obj({
  id: str(300), box: obj({ x: num(0, 99), y: num(0, 99), width: num(1, 100), height: num(1, 100) }),
  locked: { type: "boolean" }, content: blockContentSchema,
}), 40) });
const blockSchema = slideSchema.properties.composition.properties.blocks.items;
blockSchema.properties.groupId = str(100);
blockSchema.properties.textStyle = obj({ size: num(12, 100), color: str(7), bold: { type: "boolean" }, italic: { type: "boolean" }, align: choice(["left", "center", "right"]) });
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

// Additive, optional metadata keeps existing saved revisions valid without migration.
workspaceSchema.properties.metadata.properties.boards = arr(
  choice(["CBSE/NCERT", "TGSCERT", "APSCERT", "KSEAB", "MSBTE"]), 5,
);

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
    }
    for (const k of Object.keys(value))
      validate(schema.properties[k], value[k], `${path}.${k}`);
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
  if (value.metadata.boards && new Set(value.metadata.boards).size !== value.metadata.boards.length)
    throw new StudioError("Select each board only once");
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
      if (slide.composition) {
        const blockIds = new Set();
        const groups = new Map();
        for (const block of slide.composition.blocks) {
          if (block.groupId !== undefined) {
            if (!block.groupId.trim()) throw new StudioError("Group identity cannot be empty");
            groups.set(block.groupId, (groups.get(block.groupId) ?? 0) + 1);
          }
          if (block.textStyle && (!/^#[a-f\d]{6}$/i.test(block.textStyle.color) || !(["title", "body"].includes(block.content.kind) || (block.content.kind === "element" && block.content.element?.kind === "text")))) throw new StudioError("Text styling requires a text block and hex color");
        }
        if ([...groups.values()].some(count => count < 2)) throw new StudioError("A group requires at least two blocks");
        for (const block of slide.composition.blocks) {
          if (!block.id || blockIds.has(block.id)) throw new StudioError("Blocks require unique IDs within their slide");
          blockIds.add(block.id);
          const { x, y, width, height } = block.box;
          if (x + width > 100.01 || y + height > 100.01) throw new StudioError("Block must fit within the canvas");
          const content = block.content, field = ["title", "body"].includes(content.kind) ? "text" : content.kind;
          if (Object.keys(content).length !== 2 || !(field in content)) throw new StudioError("Block content must match its kind");
          if (content.kind === "title" && content.text.length > 400) throw new StudioError("Block title exceeds 400 characters");
          // Reuse the same academic/asset shape checks as legacy slides. No nested compositions permitted.
          const sample = { ...slide, id: "block-slide", title: "Block", elements: [], interaction: { type: "none", prompt: "", options: [], answer: "", feedback: "", speed: 1 } };
          delete sample.composition; delete sample.activity; delete sample.scene;
          if (content.kind === "element") sample.elements = [content.element];
          if (["activity", "scene", "interaction"].includes(content.kind)) sample[content.kind] = content[field];
          validateWorkspace({ ...emptyWorkspace(), sessions: [{ id: "block-session", title: "Block", duration: 1, objectives: "", plan: "", script: "", slides: [sample] }] });
        }
      }
      if (slide.scene && (!/^#[a-f\d]{6}$/i.test(slide.scene.color) || slide.interaction.type !== "none" || (slide.activity && slide.activity.kind !== "none"))) throw new StudioError("A scene requires a hex color and its own slide");
      const activity = slide.activity;
      if (activity && activity.kind !== "none") {
        if (slide.interaction.type !== "none")
          throw new StudioError("Use one activity or legacy component per slide");
        if (activity.items.length < (activity.kind === "matching" ? 2 : 1) ||
            activity.headers.length !== (["table","sorting"].includes(activity.kind) ? 2 : 0))
          throw new StudioError("Activity requires valid items and column headings");
        if (new Set(activity.items.map((item) => item.id)).size !== activity.items.length ||
            activity.items.some((item) => !item.id || !item.label.trim() || !item.value.trim() || (activity.kind === "table" && !item.extra.trim())))
          throw new StudioError("Activity items require unique IDs and nonempty content");
        if (activity.kind === "matching" && ["label", "value"].some((field) => new Set(activity.items.map((item) => item[field].trim().toLowerCase())).size !== activity.items.length))
          throw new StudioError("Matching pairs require distinct labels and answers");
        if (activity.kind === "hotspots" && activity.items.some((i) => i.x == null || i.y == null)) throw new StudioError("Hotspots require X and Y coordinates");
        if (activity.kind === "sorting" && (activity.headers.some((h) => !h.trim()) || new Set(activity.headers.map((h) => h.trim().toLowerCase())).size !== 2 || activity.items.some((i) => !activity.headers.includes(i.value)))) throw new StudioError("Sorting requires distinct categories and valid answers");
      }
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
export function workspaceAssetIds(document) {
  return [...new Set(document.sessions.flatMap(s => s.slides.flatMap(slide => [
    ...slide.elements.map(e => e.assetId), slide.activity?.imageId,
    ...(slide.composition?.blocks ?? []).flatMap(({ content }) =>
      content.kind === "element" ? [content.element.assetId] : content.kind === "activity" ? [content.activity.imageId] : []),
  ])).filter(Boolean))];
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
