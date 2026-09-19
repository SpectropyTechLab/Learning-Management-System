import { curriculumOptions, validateCurriculum } from "./curriculum.mjs";
import { randomUUID } from "node:crypto";
import {
  StudioError,
  authorize,
  scopeKey,
  validateWorkspace,
  emptyWorkspace,
} from "./contracts.mjs";
import { aiConfig, listModels, generate } from "./ai.mjs";

const uuid = (value) => {
  if (!/^[a-f\d-]{36}$/i.test(value || ""))
    throw new StudioError("Invalid resource ID");
  return value;
};
export function createStudioRouter({
  Router,
  multer,
  mammoth,
  AdmZip,
  pool,
  authenticateToken,
  attachClientContext,
  loadPermissions,
  env = process.env,
}) {
  const router = Router();
  const run = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res)).catch(next);
  router.use(
    authenticateToken,
    attachClientContext,
    loadPermissions,
    (req, res, next) => {
      try {
        authorize(req.user, req.permissions);
        next();
      } catch (e) {
        next(e);
      }
    },
  );
  const transaction = async (fn) => {
    const c = await pool.connect();
    try {
      await c.query("BEGIN");
      const result = await fn(c);
      await c.query("COMMIT");
      return result;
    } catch (e) {
      await c.query("ROLLBACK");
      throw e;
    } finally {
      c.release();
    }
  };
  const owned = async (db, req, lock = false) => {
    const result = await db.query(
      `SELECT * FROM studio_projects WHERE id=$1 AND owner_id=$2 AND scope_key=$3 ${lock ? "FOR UPDATE" : ""}`,
      [uuid(req.params.id), req.user.id, scopeKey(req.user)],
    );
    if (!result.rows[0]) throw new StudioError("Project not found", 404);
    return result.rows[0];
  };
  const audit = (db, req, action, details = {}) =>
    db.query(
      "INSERT INTO studio_audit(project_id,actor_id,action,details) VALUES($1,$2,$3,$4)",
      [req.params.id, req.user.id, action, details],
    );
  const save = async (db, req, project, document, revision) => {
    if (project.revision !== revision)
      throw new StudioError(
        "This project changed in another tab. Reload it before applying changes.",
        409,
      );
    validateWorkspace(document);
    await validateCurriculum(db, req.user, document.curriculum);
    const assetIds = [
      ...new Set(
        document.sessions
          .flatMap((s) =>
            s.slides.flatMap((x) => x.elements.map((e) => e.assetId)),
          )
          .filter(Boolean),
      ),
    ];
    if (assetIds.length) {
      assetIds.forEach(uuid);
      const found = await db.query(
        "SELECT id FROM studio_assets WHERE project_id=$1 AND id=ANY($2::uuid[])",
        [project.id, assetIds],
      );
      if (found.rows.length !== assetIds.length)
        throw new StudioError("Deck references an asset outside this project");
    }
    const result = await db.query(
      "UPDATE studio_projects SET document=$1,title=$2,revision=revision+1,updated_at=now() WHERE id=$3 RETURNING *",
      [document, document.metadata.title, project.id],
    );
    await db.query(
      "INSERT INTO studio_revisions(project_id,revision,document,actor_id) VALUES($1,$2,$3,$4)",
      [project.id, result.rows[0].revision, document, req.user.id],
    );
    await audit(db, req, "saved", { revision: result.rows[0].revision });
    return result.rows[0];
  };
  router.get(
    "/config",
    run(async (_req, res) =>
      res.json({
        ...aiConfig(env),
        enabled: aiConfig(env).enabled && env.STUDIO_WORKER_ENABLED === "true",
      }),
    ),
  );
  router.get(
    "/curriculum/:kind",
    run(async (req, res) =>
      res.json(
        await curriculumOptions(
          pool,
          req.user,
          req.params.kind,
          req.query.parent,
        ),
      ),
    ),
  );
  router.get(
    "/models",
    run(async (_req, res) => res.json(await listModels({ env }))),
  );
  router.get(
    "/projects",
    run(async (req, res) => {
      const result = await pool.query(
        "SELECT id,title,revision,updated_at FROM studio_projects WHERE owner_id=$1 AND scope_key=$2 ORDER BY updated_at DESC LIMIT 100",
        [req.user.id, scopeKey(req.user)],
      );
      res.json(result.rows);
    }),
  );
  router.post(
    "/projects",
    run(async (req, res) => {
      const id = randomUUID(),
        document = emptyWorkspace();
      const project = await transaction(async (db) => {
        const result = await db.query(
          "INSERT INTO studio_projects(id,owner_id,scope_key,title,document) VALUES($1,$2,$3,$4,$5) RETURNING *",
          [
            id,
            req.user.id,
            scopeKey(req.user),
            document.metadata.title,
            document,
          ],
        );
        await db.query(
          "INSERT INTO studio_revisions(project_id,revision,document,actor_id) VALUES($1,1,$2,$3)",
          [id, document, req.user.id],
        );
        return result.rows[0];
      });
      res.status(201).json(project);
    }),
  );
  router.get(
    "/projects/:id",
    run(async (req, res) => res.json(await owned(pool, req))),
  );
  router.put(
    "/projects/:id",
    run(async (req, res) =>
      res.json(
        await transaction(async (db) =>
          save(
            db,
            req,
            await owned(db, req, true),
            req.body.document,
            req.body.revision,
          ),
        ),
      ),
    ),
  );
  router.get(
    "/projects/:id/revisions",
    run(async (req, res) => {
      await owned(pool, req);
      res.json(
        (
          await pool.query(
            "SELECT revision,created_at FROM studio_revisions WHERE project_id=$1 ORDER BY revision DESC LIMIT 30",
            [req.params.id],
          )
        ).rows,
      );
    }),
  );
  router.post(
    "/projects/:id/restore",
    run(async (req, res) =>
      res.json(
        await transaction(async (db) => {
          const p = await owned(db, req, true);
          const r = await db.query(
            "SELECT document FROM studio_revisions WHERE project_id=$1 AND revision=$2",
            [p.id, req.body.restoreRevision],
          );
          if (!r.rows[0]) throw new StudioError("Revision not found", 404);
          return save(db, req, p, r.rows[0].document, req.body.revision);
        }),
      ),
    ),
  );
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 2 },
  });
  router.get(
    "/projects/:id/assets",
    run(async (req, res) => {
      await owned(pool, req);
      res.json(
        (
          await pool.query(
            "SELECT id,filename,mime,size,extracted_text FROM studio_assets WHERE project_id=$1 ORDER BY created_at DESC",
            [req.params.id],
          )
        ).rows,
      );
    }),
  );
  router.post(
    "/projects/:id/assets",
    (req, _res, next) => {
      owned(pool, req).then(() => next(), next);
    },
    upload.single("file"),
    run(async (req, res) => {
      const f = req.file;
      if (!f?.size) throw new StudioError("Choose a nonempty file");
      let text = "",
        mime = f.mimetype;
      const ext = f.originalname.split(".").pop().toLowerCase();
      const bytes = f.buffer;
      if (["md", "txt"].includes(ext)) {
        text = bytes.toString("utf8");
        mime = "text/plain";
        if (text.includes("\0")) throw new StudioError("Invalid text file");
      } else if (ext === "docx" && bytes.subarray(0, 2).toString() === "PK") {
        if (!AdmZip)
          throw new StudioError("DOCX inspection is unavailable", 503);
        const entries = new AdmZip(bytes).getEntries();
        if (
          entries.length > 2000 ||
          entries.reduce((n, e) => n + e.header.size, 0) > 20000000
        )
          throw new StudioError("DOCX expanded size exceeds the import limit");
        text = (await mammoth.extractRawText({ buffer: bytes })).value;
        mime =
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      } else if (ext === "pdf" && bytes.subarray(0, 5).toString() === "%PDF-") {
        mime = "application/pdf";
      } else if (
        ["png", "jpg", "jpeg", "webp", "gif", "mp4", "webm"].includes(ext)
      ) {
        const signatures = {
          png: bytes.subarray(0, 8).toString("hex") === "89504e470d0a1a0a",
          jpg: bytes[0] === 255 && bytes[1] === 216,
          jpeg: bytes[0] === 255 && bytes[1] === 216,
          gif: bytes.subarray(0, 3).toString() === "GIF",
          webp: bytes.subarray(8, 12).toString() === "WEBP",
          mp4: bytes.subarray(4, 8).toString() === "ftyp",
          webm: bytes.subarray(0, 4).toString("hex") === "1a45dfa3",
        };
        if (!signatures[ext])
          throw new StudioError("File contents do not match the extension");
        mime = {
          png: "image/png",
          jpg: "image/jpeg",
          jpeg: "image/jpeg",
          gif: "image/gif",
          webp: "image/webp",
          mp4: "video/mp4",
          webm: "video/webm",
        }[ext];
      } else
        throw new StudioError(
          "Use PDF, DOCX, MD, TXT, PNG, JPEG, WebP, GIF, MP4 or WebM",
        );
      if (text.length > 100000)
        throw new StudioError(
          "Document is too long. Upload one chapter/session at a time",
        );
      const id = randomUUID();
      await transaction(async (db) => {
        await owned(db, req, true);
        const quota = await db.query(
          "SELECT COALESCE(sum(size),0)::bigint AS total FROM studio_assets WHERE project_id=$1",
          [req.params.id],
        );
        if (Number(quota.rows[0].total) + f.size > 100 * 1024 * 1024)
          throw new StudioError("Project media quota is 100 MB");
        await db.query(
          "INSERT INTO studio_assets(id,project_id,filename,mime,size,bytes,extracted_text) VALUES($1,$2,$3,$4,$5,$6,$7)",
          [
            id,
            req.params.id,
            f.originalname.slice(0, 200),
            mime,
            f.size,
            bytes,
            text,
          ],
        );
        await audit(db, req, "uploaded", { assetId: id });
      });
      res.status(201).json({
        id,
        filename: f.originalname,
        mime,
        size: f.size,
        extracted_text: text,
      });
    }),
  );
  router.get(
    "/projects/:id/assets/:assetId",
    run(async (req, res) => {
      await owned(pool, req);
      const result = await pool.query(
        "SELECT bytes,mime FROM studio_assets WHERE id=$1 AND project_id=$2",
        [uuid(req.params.assetId), req.params.id],
      );
      if (!result.rows[0]) throw new StudioError("Asset not found", 404);
      res
        .set({
          "Content-Type": result.rows[0].mime,
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
          "Content-Security-Policy": "default-src 'none'; sandbox",
        })
        .send(Buffer.from(result.rows[0].bytes));
    }),
  );
  router.post(
    "/projects/:id/jobs",
    run(async (req, res) => {
      const config = aiConfig(env);
      if (env.STUDIO_WORKER_ENABLED !== "true")
        throw new StudioError("AI worker is not enabled on this server", 503);
      if (!config.enabled)
        throw new StudioError(
          "Configure the server AI key before generating",
          503,
        );
      const task = req.body.task;
      if (
        ![
          "metadata",
          "plan",
          "script",
          "slides",
          "interpret-plan",
          "interpret-script",
        ].includes(task)
      )
        throw new StudioError("Invalid AI task");
      const models = await listModels({ env });
      if (!models.some((m) => m.id === req.body.model))
        throw new StudioError("Select a supported model from the catalogue");
      const id = randomUUID();
      await transaction(async (db) => {
        await db.query("SELECT pg_advisory_xact_lock($1,$2)", [
          81392,
          req.user.id,
        ]);
        const p = await owned(db, req, true);
        if (p.revision !== req.body.revision)
          throw new StudioError(
            "Save/reload the project before generating",
            409,
          );
        const count = await db.query(
          "SELECT count(*)::int AS total,count(*) FILTER (WHERE status IN ('queued','running'))::int AS active FROM studio_ai_jobs WHERE owner_id=$1 AND created_at>now()-interval '24 hours'",
          [req.user.id],
        );
        if (
          count.rows[0].total >= config.dailyLimit ||
          count.rows[0].active >= 2
        )
          throw new StudioError(
            "Generation limit reached. Wait for active jobs or try later.",
            429,
          );
        if (
          ["script", "slides", "interpret-script"].includes(task) &&
          !p.document.sessions.some((s) => s.id === req.body.sessionId)
        )
          throw new StudioError("Select a session first");
        const sourceText = String(req.body.sourceText || "");
        if (sourceText.length > 100000)
          throw new StudioError("Source is too long");
        await db.query(
          "INSERT INTO studio_ai_jobs(id,project_id,owner_id,base_revision,input) VALUES($1,$2,$3,$4,$5)",
          [
            id,
            p.id,
            req.user.id,
            p.revision,
            {
              task,
              provider: config.provider,
              model: req.body.model,
              sessionId: req.body.sessionId,
              workspace: p.document,
              sourceText,
            },
          ],
        );
        await audit(db, req, "ai.queued", {
          jobId: id,
          task,
          model: req.body.model,
        });
      });
      res.status(202).json({ id, status: "queued" });
    }),
  );
  router.get(
    "/projects/:id/jobs",
    run(async (req, res) => {
      await owned(pool, req);
      res.json(
        (
          await pool.query(
            "SELECT id,status,base_revision,result,error,created_at FROM studio_ai_jobs WHERE project_id=$1 ORDER BY created_at DESC LIMIT 10",
            [req.params.id],
          )
        ).rows,
      );
    }),
  );
  router.post(
    "/projects/:id/jobs/:jobId/apply",
    run(async (req, res) =>
      res.json(
        await transaction(async (db) => {
          const p = await owned(db, req, true);
          const result = await db.query(
            "SELECT * FROM studio_ai_jobs WHERE id=$1 AND project_id=$2 FOR UPDATE",
            [uuid(req.params.jobId), p.id],
          );
          const job = result.rows[0];
          if (!job || job.status !== "completed")
            throw new StudioError("Completed draft not found", 404);
          if (p.revision !== job.base_revision)
            throw new StudioError(
              "Project changed since generation. Review the result and copy needed content manually, or regenerate.",
              409,
            );
          const saved = await save(
            db,
            req,
            p,
            job.result.workspace,
            job.base_revision,
          );
          await db.query(
            "UPDATE studio_ai_jobs SET status='applied' WHERE id=$1",
            [job.id],
          );
          await audit(db, req, "ai.applied", { jobId: job.id });
          return saved;
        }),
      ),
    ),
  );
  router.post(
    "/projects/:id/publish",
    run(async (req, res) =>
      res.json(
        await transaction(async (db) => {
          const p = await owned(db, req, true);
          if (p.revision !== req.body.revision)
            throw new StudioError("Save/reload before publishing", 409);
          if (req.body.reviewed !== true)
            throw new StudioError("Confirm academic review before publishing");
          validateWorkspace(p.document);
          if (
            !p.document.sessions.length ||
            p.document.sessions.some(
              (s) =>
                !s.slides.length || s.slides.some((x) => x.warnings.length),
            )
          )
            throw new StudioError(
              "Every session needs slides and all slide warnings must be resolved",
            );
          await db.query(
            "INSERT INTO studio_releases(id,project_id,revision,document,approved_by) VALUES($1,$2,$3,$4,$5) ON CONFLICT(project_id,revision) DO NOTHING",
            [randomUUID(), p.id, p.revision, p.document, req.user.id],
          );
          const release = await db.query(
            "SELECT id,revision,created_at FROM studio_releases WHERE project_id=$1 AND revision=$2",
            [p.id, p.revision],
          );
          await audit(db, req, "published", { revision: p.revision });
          return release.rows[0];
        }),
      ),
    ),
  );
  router.get(
    "/projects/:id/releases/latest",
    run(async (req, res) => {
      await owned(pool, req);
      const release = await pool.query(
        "SELECT id,revision,document,created_at FROM studio_releases WHERE project_id=$1 ORDER BY revision DESC LIMIT 1",
        [req.params.id],
      );
      if (!release.rows[0])
        throw new StudioError("No published revision yet", 404);
      res.json(release.rows[0]);
    }),
  );
  router.use((e, _req, res, _next) => {
    const status = e.status || (e.code === "LIMIT_FILE_SIZE" ? 413 : 500);
    res.status(status).json({
      error:
        status === 500
          ? "Studio operation failed. Verify the Studio migration and server configuration."
          : e.message,
    });
  });
  return router;
}

export function startStudioWorker(
  pool,
  { env = process.env, generateImpl = generate } = {},
) {
  let running = false,
    lastErrorAt = 0;
  async function tick() {
    if (running) return;
    running = true;
    try {
      await pool.query(
        "UPDATE studio_ai_jobs SET status='failed',error='Worker interrupted. Retry generation; saved content is unchanged.',finished_at=now() WHERE status='running' AND started_at<now()-interval '5 minutes'",
      );
      const result = await pool.query(
        "UPDATE studio_ai_jobs SET status='running',started_at=now() WHERE id=(SELECT id FROM studio_ai_jobs WHERE status='queued' ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING *",
      );
      const job = result.rows[0];
      if (!job) return;
      try {
        const actor = await pool.query(
          "SELECT u.id FROM users u JOIN studio_projects p ON p.owner_id=u.id WHERE p.id=$1 AND u.id=$2 AND u.is_active=true AND u.role='content_authorizer' AND p.scope_key=CASE WHEN u.client_id IS NULL THEN 'platform' ELSE 'client:'||u.client_id::text END AND COALESCE((SELECT granted FROM user_permissions WHERE user_id=u.id AND permission='studio.access' LIMIT 1),(SELECT granted FROM role_permissions WHERE role=u.role AND permission='studio.access' AND (client_id=u.client_id OR client_id IS NULL) ORDER BY client_id NULLS LAST LIMIT 1),false)=true",
          [job.project_id, job.owner_id],
        );
        if (!actor.rows.length)
          throw new StudioError("Studio access was revoked", 403);
        if (job.input.provider && job.input.provider !== aiConfig(env).provider)
          throw new StudioError(
            "AI provider changed since this job was queued. Generate a new draft.",
            409,
          );
        const output = await generateImpl(job.input, { env });
        await pool.query(
          "UPDATE studio_ai_jobs SET status='completed',result=$1,finished_at=now() WHERE id=$2 AND status='running'",
          [output, job.id],
        );
      } catch (e) {
        await pool.query(
          "UPDATE studio_ai_jobs SET status='failed',error=$1,finished_at=now() WHERE id=$2",
          [
            e instanceof StudioError
              ? e.message
              : "Generation failed. Review input and configuration.",
            job.id,
          ],
        );
      }
    } catch {
      if (Date.now() - lastErrorAt > 60000) {
        lastErrorAt = Date.now();
        console.error(
          "Studio worker database operation failed. Check migration and database availability.",
        );
      }
    } finally {
      running = false;
    }
  }
  const timer = setInterval(tick, 2500);
  timer.unref();
  // runOnce supports a scheduled worker and deterministic persistence tests.
  return Object.assign(() => clearInterval(timer), { runOnce: tick });
}
