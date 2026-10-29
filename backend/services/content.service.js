import { query as dbQuery, getClient } from "../repositories/db.repository.js";
import { contentIsLinkedIntoCourse } from "./clientContent.service.js";
import { ensureCourseActionAccess, getRequestCourseScope } from "./courseShared.service.js";

const ensureCourseAccess = async (courseId, req) => {
    const access = await ensureCourseActionAccess({
        courseId,
        req,
        action: "manage_content",
        scope: getRequestCourseScope(req),
    });

    return access.ok;
};

export const deleteContentItem = async (req, res) => {
    const { id, courseId } = req.params;
    const userRole = req.user?.role;

    try {
        if (!userRole) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const canAccess = await ensureCourseAccess(courseId, req);
        if (!canAccess) {
            return res.status(403).json({ error: "Access denied" });
        }

        const linkedItem = await contentIsLinkedIntoCourse({ courseId, contentItemId: id });
        if (linkedItem) {
            return res.status(400).json({ error: "Linked licensed content must be removed from the course, not deleted." });
        }

        const check = await dbQuery(
            `SELECT id, item_type FROM content_items WHERE id = $1 AND course_id = $2`,
            [id, courseId]
        );

        if (check.rowCount === 0) {
            return res.status(404).json({ error: "Item not found or does not belong to this course." });
        }

        const itemType = check.rows[0].item_type;

        // Delete item (CASCADE will remove children if it's a folder)
        await dbQuery(`DELETE FROM content_items WHERE id = $1`, [id]);

        return res.json({
            success: true,
            message: itemType === "folder"
                ? "Folder and all its contents deleted successfully."
                : "Content item deleted successfully."
        });

    } catch (error) {
        console.error("❌ Error deleting content item:", error);
        res.status(500).json({ error: "Internal server error while deleting content." });
    }
};



export const renameContentItem = async (req, res) => {
    const { id, courseId } = req.params;
    const { title } = req.body;
    const userRole = req.user?.role;

    try {
        // Permissions
        if (!userRole) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const canAccess = await ensureCourseAccess(courseId, req);
        if (!canAccess) {
            return res.status(403).json({ error: "Access denied" });
        }

        if (!title || !title.trim()) {
            return res.status(400).json({ error: "Title cannot be empty." });
        }

        const linkedItem = await contentIsLinkedIntoCourse({ courseId, contentItemId: id });
        if (linkedItem) {
            return res.status(400).json({ error: "Linked licensed content is read-only." });
        }

        const existing = await dbQuery(
            `SELECT id FROM content_items WHERE id = $1 AND course_id = $2`,
            [id, courseId]
        );

        if (existing.rowCount === 0) {
            return res.status(404).json({ error: "Item not found or does not belong to this course." });
        }

        // Perform rename
        const updated = await dbQuery(
            `UPDATE content_items SET title = $1, updated_at = NOW()
             WHERE id = $2 AND course_id = $3 RETURNING *`,
            [title.trim(), id, courseId]
        );

        res.json({
            success: true,
            message: "Title renamed successfully.",
            item: updated.rows[0],
        });

    } catch (error) {
        console.error("❌ Error renaming content item:", error);
        res.status(500).json({ error: "Internal server error while renaming content." });
    }
};

export const reorderContentItems = async (req, res) => {
    const { courseId } = req.params;
    const userRole = req.user?.role;
    const rawParentId = req.body?.parent_id;
    const reorderScope = String(req.body?.reorder_scope ?? 'items').trim();
    const parentId =
        rawParentId === null || rawParentId === undefined || rawParentId === ""
            ? null
            : Number(rawParentId);
    const itemIds = Array.isArray(req.body?.item_ids) ? req.body.item_ids.map((value) => Number(value)) : [];

    try {
        if (!userRole) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const canAccess = await ensureCourseAccess(courseId, req);
        if (!canAccess) {
            return res.status(403).json({ error: "Access denied" });
        }

        if (parentId !== null && (!Number.isInteger(parentId) || parentId <= 0)) {
            return res.status(400).json({ error: "parent_id must be a valid content item id or null." });
        }

        if (itemIds.length === 0 || itemIds.some((id) => !Number.isInteger(id) || id <= 0)) {
            return res.status(400).json({ error: "item_ids must contain valid content item ids." });
        }

        if (new Set(itemIds).size !== itemIds.length) {
            return res.status(400).json({ error: "item_ids cannot contain duplicates." });
        }

        if (!["chapters", "topics", "folders", "items"].includes(reorderScope)) {
            return res.status(400).json({ error: "reorder_scope must be one of chapters, topics, folders, or items." });
        }

        if (parentId !== null) {
            const parentResult = await dbQuery(
                `SELECT id, item_type FROM content_items WHERE id = $1 AND course_id = $2 LIMIT 1`,
                [parentId, courseId]
            );

            if (parentResult.rowCount === 0) {
                return res.status(404).json({ error: "Parent folder not found." });
            }

            if (parentResult.rows[0].item_type !== "folder") {
                return res.status(400).json({ error: "Items can only be reordered within a folder." });
            }
        }

        const client = await getClient();

        try {
            await client.query("BEGIN");

            const localFilter =
                reorderScope === "items"
                    ? `item_type <> 'folder'`
                    : `item_type = 'folder'`;

            const localRows = await client.query(
                `
                    SELECT id
                    FROM content_items
                    WHERE course_id = $1
                      AND parent_id IS NOT DISTINCT FROM $2
                      AND ${localFilter}
                `,
                [courseId, parentId]
            );

            const linkedRows =
                reorderScope === "items"
                    ? await client.query(
                        `
                            SELECT content_item_id AS id
                            FROM course_linked_content
                            WHERE course_id = $1
                              AND parent_content_id IS NOT DISTINCT FROM $2
                              AND is_active = true
                        `,
                        [courseId, parentId]
                    )
                    : { rows: [] };

            const localSet = new Set(localRows.rows.map((row) => Number(row.id)));
            const linkedSet = new Set(linkedRows.rows.map((row) => Number(row.id)));
            const availableIds = [...localSet, ...linkedSet];

            if (availableIds.length !== itemIds.length) {
                await client.query("ROLLBACK");
                return res.status(400).json({ error: "item_ids must include every child for the selected folder." });
            }

            const availableIdSet = new Set(availableIds);
            if (itemIds.some((id) => !availableIdSet.has(id))) {
                await client.query("ROLLBACK");
                return res.status(400).json({ error: "item_ids contain items that do not belong to the selected folder." });
            }

            for (const [index, itemId] of itemIds.entries()) {
                if (localSet.has(itemId)) {
                    await client.query(
                        `
                            UPDATE content_items
                            SET order_index = $1,
                                updated_at = NOW()
                            WHERE id = $2
                              AND course_id = $3
                        `,
                        [index, itemId, courseId]
                    );
                    continue;
                }

                await client.query(
                    `
                        UPDATE course_linked_content
                        SET order_index = $1
                        WHERE course_id = $2
                          AND content_item_id = $3
                          AND parent_content_id IS NOT DISTINCT FROM $4
                          AND is_active = true
                    `,
                    [index, courseId, itemId, parentId]
                );
            }

            await client.query("COMMIT");
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }

        return res.json({
            success: true,
            course_id: Number(courseId),
            parent_id: parentId,
            reorder_scope: reorderScope,
            item_ids: itemIds,
        });
    } catch (error) {
        console.error("Error reordering course content:", error);
        return res.status(500).json({ error: "Internal server error while reordering content." });
    }
};


