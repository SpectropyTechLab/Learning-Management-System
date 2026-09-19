import { StudioError } from "./contracts.mjs";

// Initial authoring catalogue uses the author's own scope, including platform
// records for platform authors. It never grants tenant-wide content access.
const queries = {
  program:
    "SELECT p.id,p.name FROM programs p WHERE p.client_id IS NOT DISTINCT FROM $1 AND p.is_active=true ORDER BY p.name LIMIT 1000",
  grade:
    "SELECT g.id,g.grade_number::text AS name FROM grades g JOIN programs p ON p.id=g.program_id WHERE p.client_id IS NOT DISTINCT FROM $1 AND p.is_active=true AND g.is_active=true AND p.id=$2 ORDER BY g.grade_number LIMIT 1000",
  subject:
    "SELECT s.id,s.name FROM subjects s JOIN grades g ON g.id=s.grade_id JOIN programs p ON p.id=g.program_id WHERE p.client_id IS NOT DISTINCT FROM $1 AND s.client_id IS NOT DISTINCT FROM $1 AND p.is_active=true AND g.is_active=true AND s.is_active=true AND g.id=$2 ORDER BY s.name LIMIT 1000",
  chapter:
    "SELECT c.id,c.name FROM chapters c JOIN subjects s ON s.id=c.subject_id JOIN grades g ON g.id=s.grade_id JOIN programs p ON p.id=g.program_id WHERE p.client_id IS NOT DISTINCT FROM $1 AND s.client_id IS NOT DISTINCT FROM $1 AND c.is_active=true AND s.is_active=true AND g.is_active=true AND p.is_active=true AND s.id=$2 ORDER BY c.chapter_number LIMIT 1000",
  topic:
    "SELECT t.id,t.name FROM topics t JOIN chapters c ON c.id=t.chapter_id JOIN subjects s ON s.id=c.subject_id JOIN grades g ON g.id=s.grade_id JOIN programs p ON p.id=g.program_id WHERE p.client_id IS NOT DISTINCT FROM $1 AND s.client_id IS NOT DISTINCT FROM $1 AND t.is_active=true AND c.is_active=true AND s.is_active=true AND g.is_active=true AND p.is_active=true AND c.id=$2 ORDER BY t.topic_number LIMIT 1000",
};
export async function curriculumOptions(db, user, kind, parent) {
  if (!Object.hasOwn(queries, kind))
    throw new StudioError("Unknown curriculum level");
  if (kind !== "program" && !/^\d+$/.test(String(parent || "")))
    throw new StudioError("Select a curriculum parent first");
  return (
    await db.query(
      queries[kind],
      kind === "program"
        ? [user.client_id ?? null]
        : [user.client_id ?? null, Number(parent)],
    )
  ).rows.map((r) => ({ id: String(r.id), name: r.name }));
}
export async function validateCurriculum(db, user, value) {
  let parent;
  for (const kind of ["program", "grade", "subject", "chapter"]) {
    const id = value[`${kind}Id`];
    if (id) {
      const options = await curriculumOptions(db, user, kind, parent);
      if (!options.some((o) => o.id === id))
        throw new StudioError(
          "Curriculum selection is unavailable in your scope. Reselect it.",
        );
    }
    parent = id;
  }
  if (value.topicIds.length) {
    const options = await curriculumOptions(db, user, "topic", value.chapterId);
    if (value.topicIds.some((id) => !options.some((o) => o.id === id)))
      throw new StudioError("A selected topic does not belong to this chapter");
  }
}
