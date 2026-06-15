import supabase from "../config/supabaseClient.js";
import { query as dbQuery, getClient } from "../repositories/db.repository.js";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import * as fs from "fs";
import AdmZip from "adm-zip";
import { parseStringPromise } from "xml2js";
import mime from "mime-types"; // ✅ Add this at the top with your imports
import fsy from "fsy";
import { url } from "inspector";
import fetch from "node-fetch"; // add at top if not already
import { contentIsLinkedIntoCourse, userCanAccessContentItem } from "./clientContent.service.js";
import { ensureCourseActionAccess, getRequestCourseScope } from "./courseShared.service.js";


// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Temporary upload directory (local buffer before uploading to Supabase)
const uploadDir = path.join(__dirname, "../../uploads/temp");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

// Allow only videos, pdfs, and zip (SCORM)
const fileFilter = (req, file, cb) => {
  const allowed = [
    "video",
    "audio",
    "pdf",
    "zip",
    "application/zip",
    "text/plain",
    "text/html"
  ];
  const typeOk = allowed.some((t) => file.mimetype.includes(t));
  typeOk ? cb(null, true) : cb(new Error("Invalid file type"));
};

export const upload = multer({ storage, fileFilter });

const getSafeStorageExtension = (originalName = "") => {
  const rawExt = path.extname(String(originalName || "")).toLowerCase();
  return /^[.a-z0-9_-]+$/.test(rawExt) ? rawExt : "";
};

const buildSafeStorageKey = ({ courseId, itemId = null, originalName = "" }) => {
  const safeExt = getSafeStorageExtension(originalName);
  const uniquePart = itemId
    ? `${itemId}_${Date.now()}`
    : `${Date.now()}_${Math.round(Math.random() * 1e9)}`;

  return `${courseId}/${uniquePart}${safeExt}`;
};

const ensureContentAccessById = async (contentId, req) => {
  return userCanAccessContentItem({
    user: req.user,
    contentItemId: Number(contentId),
  });
};

const ensureContentAccessByPath = async (filePath, req) => {
  const role = req.user?.role;
  const isPlatformAdmin = role === "super_admin" || role === "content_authorizer";

  if (!isPlatformAdmin && !req.user?.client_id && !req.user?.id) {
    return false;
  }

  const normalizedPath = String(filePath || "").replace(/^\/+/, "");
  if (!normalizedPath || normalizedPath.includes('..') || normalizedPath.startsWith('http')) return false;

  const result = await dbQuery(
    `
    SELECT ci.id
    FROM content_items ci
    WHERE (
      ci.content_url = $1
      OR regexp_replace(ci.content_url, '/[^/]+$', '') = regexp_replace($1, '/[^/]+$', '')
      OR $1 LIKE (regexp_replace(ci.content_url, '/[^/]+$', '') || '/%')
    )
    ORDER BY
      CASE WHEN ci.content_url = $1 THEN 0 ELSE 1 END,
      LENGTH(ci.content_url) DESC
  `,
    [normalizedPath]
  );

  for (const row of result.rows) {
    if (await ensureContentAccessById(row.id, req)) {
      return true;
    }
  }

  return false;
};

/**
 * Upload content file (video/pdf/scorm) to Supabase Storage
 * and store metadata in PostgreSQL
 */
export const uploadContentFile = async (req, res) => {
  const { courseId } = req.params;
  const { item_type, title, parent_id = null } = req.body;

  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  try {
    const access = await ensureCourseActionAccess({
      courseId,
      req,
      action: "manage_content",
      scope: getRequestCourseScope(req),
    });
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }

    const filePath = req.file.path;
    const bucket = process.env.SUPABASE_BUCKET || "courses";
    let storagePath = "";
    let launchFile = "";
    let uploadFolder = "";

    // ---------- SCORM ZIP Handling ----------
    if (item_type === "scorm") {
      // 1️⃣ Unzip SCORM package
      const zip = new AdmZip(filePath);
      const tempFolder = filePath.replace(".zip", "_unzipped");
      zip.extractAllTo(tempFolder, true);

      // 2️⃣ Parse imsmanifest.xml
      const manifestPath = path.join(tempFolder, "imsmanifest.xml");
      if (!fs.existsSync(manifestPath))
        throw new Error("imsmanifest.xml not found");

      const xmlData = fs.readFileSync(manifestPath, "utf8");
      const parsedManifest = await parseStringPromise(xmlData);
      launchFile = parsedManifest.manifest.resources[0].resource[0].$.href;

      // 3️⃣ Upload all files to Supabase Storage (PRIVATE)
      uploadFolder = `${courseId}/${Date.now()}`;
      const uploadRecursively = async (dirPath, relativePath = "") => {
        for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
          const fullPath = path.join(dirPath, entry.name);
          const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

          if (entry.isDirectory()) {
            await uploadRecursively(fullPath, relPath);
          } else {
            const buffer = fs.readFileSync(fullPath);
            const contentType = mime.lookup(entry.name) || "application/octet-stream";

            const { error } = await supabase.storage
              .from(bucket)
              .upload(`${uploadFolder}/${relPath}`, buffer, {
                contentType,
                upsert: true,
              });

            if (error) console.error(`❌ Upload failed for ${relPath}`, error);
          }
        }
      };

      await uploadRecursively(tempFolder);

      // 4️⃣ Save base path (not public)
      storagePath = `${uploadFolder}/${launchFile}`;

      // Cleanup
      fs.rmSync(tempFolder, { recursive: true, force: true });
      fs.unlinkSync(filePath);
    } else {
      // ---------- Non-SCORM file ----------
      const fileBuffer = fs.readFileSync(filePath);
      const fileName = buildSafeStorageKey({
        courseId,
        originalName: req.file.originalname,
      });
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, fileBuffer, {
          contentType: req.file.mimetype,
          upsert: false,
        });
      if (uploadError) throw uploadError;

      storagePath = fileName;
      fs.unlinkSync(filePath);
    }

    // 5️⃣ Save in DB (private path only)
    const result = await dbQuery(
      `INSERT INTO content_items (course_id, parent_id, item_type, title, content_url)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [courseId, parent_id, item_type, title?.trim() || req.file.originalname, storagePath]
    );

    return res.status(201).json({
      success: true,
      message: "File uploaded successfully",
      file: result.rows[0],
    });
  } catch (err) {
    console.error("❌ File upload + DB error:", err);
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(500).json({ error: "Failed to upload and save content" });
  }
};



export const updateContentFile = async (req, res) => {
  const { courseId, itemId } = req.params;
  const { title } = req.body;
  const newFile = req.file; // Multer file
  const bucket = process.env.SUPABASE_BUCKET || "courses";

  try {
    const access = await ensureCourseActionAccess({
      courseId,
      req,
      action: "manage_content",
      scope: getRequestCourseScope(req),
    });
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }

    const linkedItem = await contentIsLinkedIntoCourse({ courseId, contentItemId: itemId });
    if (linkedItem) {
      return res.status(400).json({ error: "Linked licensed content is read-only." });
    }

    // 1️⃣ Fetch existing item
    const existing = await dbQuery(
      `SELECT * FROM content_items WHERE id = $1 AND course_id = $2`,
      [itemId, courseId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Content item not found" });
    }

    const oldItem = existing.rows[0];
    const oldStoragePath = oldItem.content_url;

    let newStoragePath = oldStoragePath;
    let newType = oldItem.item_type; // default old type
    let launchFile = "";

    // -------------------------------------------------
    // 2️⃣ Detect new file type (critical fix)
    // -------------------------------------------------
    if (newFile) {
      const mimeType = newFile.mimetype;

      if (mimeType.includes("zip")) {
        newType = "scorm";
      }
      else if (mimeType === "application/pdf") {
        newType = "pdf";
      }
      else if (mimeType.startsWith("video/")) {
        newType = "video";
      }
      else if (mimeType.startsWith("audio/")) {
        newType = "audio";
      }
      else if (mimeType === "text/html") {
        newType = "html";
      }
      else if (mimeType === "text/plain") {
        newType = "text";
      }
      else {
        throw new Error(`Unsupported file type: ${mimeType}`);
      }
    }


    // -------------------------------------------------
    // 3️⃣ IF NEW FILE UPLOADED → Process it
    // -------------------------------------------------
    if (newFile) {
      const filePath = newFile.path;

      // ============= SCORM HANDLING =============
      if (newType === "scorm") {
        const zip = new AdmZip(filePath);
        const tempFolder = filePath.replace(".zip", `_unzipped_${Date.now()}`);
        zip.extractAllTo(tempFolder, true);

        const manifestPath = path.join(tempFolder, "imsmanifest.xml");
        if (!fs.existsSync(manifestPath)) {
          return res.status(400).json({ error: "Invalid SCORM package: imsmanifest.xml missing" });
        }

        const xmlData = fs.readFileSync(manifestPath, "utf8");
        const parsedManifest = await parseStringPromise(xmlData);

        launchFile = parsedManifest.manifest.resources[0].resource[0].$.href;

        const uploadFolder = `${courseId}/${Date.now()}`;

        // Recursively upload SCORM files
        const uploadRecursively = async (dirPath, relativePath = "") => {
          for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
            const fullPath = path.join(dirPath, entry.name);
            const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

            if (entry.isDirectory()) {
              await uploadRecursively(fullPath, relPath);
            } else {
              const buffer = fs.readFileSync(fullPath);
              const contentType = mime.lookup(entry.name) || "application/octet-stream";

              const { error } = await supabase.storage
                .from(bucket)
                .upload(`${uploadFolder}/${relPath}`, buffer, {
                  upsert: true,
                  contentType,
                });

              if (error) console.error("SCORM upload failed:", relPath, error);
            }
          }
        };

        await uploadRecursively(tempFolder);

        newStoragePath = `${uploadFolder}/${launchFile}`;

        // Cleanup
        fs.rmSync(tempFolder, { recursive: true, force: true });
        fs.unlinkSync(filePath);
      }

      // ============= NORMAL FILE (video/audio/pdf) =============
      else {
        const fileBuffer = fs.readFileSync(filePath);
        const finalPath = buildSafeStorageKey({
          courseId,
          itemId,
          originalName: newFile.originalname,
        });

        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(finalPath, fileBuffer, {
            upsert: true,
            contentType: newFile.mimetype,
          });

        if (uploadError) {
          console.error(uploadError);
          throw uploadError;
        }

        newStoragePath = finalPath;

        fs.unlinkSync(filePath);
      }

      // Remove old file from Supabase
      if (oldStoragePath) {
        await supabase.storage.from(bucket).remove([oldStoragePath]);
      }
    }

    // -------------------------------------------------
    // 4️⃣ Update DB (title, item_type, content_url)
    // -------------------------------------------------
    const updated = await dbQuery(
      `
      UPDATE content_items
      SET title = $1,
          item_type = $2,
          content_url = $3
      WHERE id = $4
      RETURNING *
      `,
      [
        title || oldItem.title,
        newType,
        newStoragePath,
        itemId
      ]
    );

    return res.json({
      success: true,
      message: "File updated successfully",
      content_url: updated.rows[0].content_url,
      item: updated.rows[0],
    });

  } catch (err) {
    console.error("❌ Update file error:", err);
    return res.status(500).json({
      error: "Failed to update content item",
    });
  }
};


// backend/controllers/scorm.controller.js
export const saveScormProgress = async (req, res) => {
  const { userId, contentId, data, attemptNo = 1 } = req.body;
  const requesterId = req.user?.id;
  const requesterRole = req.user?.role;
  const parsedUserId = Number(userId);
  const parsedContentId = Number(contentId);
  const parsedAttemptNo = Number(attemptNo);

  if (!Number.isInteger(parsedUserId) || parsedUserId <= 0) {
    return res.status(400).json({ success: false, message: "Invalid userId" });
  }
  if (!Number.isInteger(parsedContentId) || parsedContentId <= 0) {
    return res.status(400).json({ success: false, message: "Invalid contentId" });
  }
  if (!Number.isInteger(parsedAttemptNo) || parsedAttemptNo <= 0) {
    return res.status(400).json({ success: false, message: "Invalid attemptNo" });
  }
  if (!data || typeof data !== 'object') {
    return res.status(400).json({ success: false, message: "Invalid SCORM payload" });
  }

  const score = parseFloat(data["cmi.core.score.raw"] || 0);
  const status = data["cmi.core.lesson_status"] || "incomplete";
  const suspendData = data["cmi.suspend_data"] || null;
  const totalTime = data["cmi.core.total_time"] || null;

  try {
    if (!requesterId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    if (requesterRole !== "super_admin" && requesterId !== parsedUserId) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    const hasAccess = await ensureContentAccessById(parsedContentId, req);
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    await dbQuery(
      `
      INSERT INTO scorm_attempts (
        user_id, content_item_id, attempt_no, score_raw, completion_status, suspend_data, total_time, finished_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (user_id, content_item_id, attempt_no)
      DO UPDATE
        SET score_raw = EXCLUDED.score_raw,
            completion_status = EXCLUDED.completion_status,
            suspend_data = EXCLUDED.suspend_data,
            total_time = EXCLUDED.total_time,
            finished_at = NOW();
      `,
      [parsedUserId, parsedContentId, parsedAttemptNo, score, status, suspendData, totalTime]
    );

    res.status(200).json({ success: true, message: "SCORM progress saved." });
  } catch (err) {
    console.error("❌ Error saving SCORM progress:", err);
    res.status(500).json({ success: false, message: "Error saving SCORM progress" });
  }
};


export const getScormProgress = async (req, res) => {
  const { userId, contentId } = req.params;
  const requesterId = req.user?.id;
  const requesterRole = req.user?.role;
  const parsedUserId = Number(userId);
  const parsedContentId = Number(contentId);

  try {
    if (!requesterId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (!Number.isInteger(parsedUserId) || parsedUserId <= 0 || !Number.isInteger(parsedContentId) || parsedContentId <= 0) {
      return res.status(400).json({ message: "Invalid request" });
    }
    if (requesterRole !== "super_admin" && requesterId !== parsedUserId) {
      return res.status(403).json({ message: "Access denied" });
    }
    const hasAccess = await ensureContentAccessById(parsedContentId, req);
    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied" });
    }

    const result = await dbQuery(
      `SELECT suspend_data FROM scorm_attempts
       WHERE user_id = $1 AND content_item_id = $2
       ORDER BY attempt_no DESC LIMIT 1`,
      [parsedUserId, parsedContentId]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ message: "No progress found" });

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error fetching SCORM progress:", err);
    res.status(500).json({ message: "Error fetching progress" });
  }
};

export const getSignedContentUrl = async (req, res) => {
  try {
    const { path } = req.query; // e.g. "8/1762597630232/res/index.html"
    const filePath = String(path || "").replace(/^\/+/, "");
    const bucket = process.env.SUPABASE_BUCKET || "courses";
    if (!filePath) {
      return res.status(400).json({ error: "Missing file path" });
    }
    if (!req.user?.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const hasAccess = await ensureContentAccessByPath(filePath, req);
    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Generate a signed URL that lasts 1 hour
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, 60 * 60);

    if (error || !data) {
      console.error("Error creating signed URL:", error);
      return res.status(500).json({ error: "Failed to generate signed URL" });
    }
    res.json({ url: data.signedUrl });
  } catch (err) {
    console.error("Server error generating signed URL:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const viewScormFile = async (req, res) => {
  try {
    const filePath = String(req.params[0] || "").replace(/^\/+/, "");
    if (!filePath) return res.status(400).send("Missing file");
    if (!req.user?.id) return res.status(401).send("Unauthorized");
    const hasAccess = await ensureContentAccessByPath(filePath, req);
    if (!hasAccess) return res.status(403).send("Access denied");

    const bucket = process.env.SUPABASE_BUCKET || "course-files";
    const { data: signedData, error: signedError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, 60);

    if (signedError || !signedData?.signedUrl) {
      console.error("SCORM signed URL error:", signedError);
      return res.status(404).send("File not found");
    }

    const upstreamResponse = await fetch(signedData.signedUrl);
    if (!upstreamResponse.ok) {
      return res.status(upstreamResponse.status === 404 ? 404 : 502).send("File not found");
    }

    const upstreamContentType = upstreamResponse.headers.get("content-type");
    const inferredMimeType = mime.lookup(filePath);
    const inferredContentType = inferredMimeType ? mime.contentType(inferredMimeType) : false;
    const shouldPreferInferredType =
      Boolean(inferredContentType) &&
      (!upstreamContentType ||
        upstreamContentType.startsWith("text/plain") ||
        upstreamContentType.startsWith("application/octet-stream"));

    const contentType =
      (shouldPreferInferredType ? inferredContentType : upstreamContentType) ||
      inferredContentType ||
      "application/octet-stream";

    res.setHeader("Content-Type", contentType);
    res.setHeader(
      "Content-Security-Policy",
      "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;"
    );

    const buffer = Buffer.from(await upstreamResponse.arrayBuffer());
    res.send(buffer);

  } catch (err) {
    console.error("SCORM file serve error:", {
      filePath: req.params?.[0],
      message: err instanceof Error ? err.message : String(err),
    });
    res.status(500).send("Server Error");
  }
};
