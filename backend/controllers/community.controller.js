// backend/controllers/community.controller.js
import pool from '../config/db.js';
import supabase from '../config/supabaseClient.js';
import { randomUUID } from 'node:crypto';

export const uploadCommunityMedia = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file was provided.' });
    }

    const bucket = process.env.COMMUNITY_MEDIA_BUCKET || 'community-media';
    const safeName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${req.user.id}/${randomUUID()}-${safeName}`;

    const { error } = await supabase.storage.from(bucket).upload(storagePath, req.file.buffer, {
      contentType: req.file.mimetype,
      upsert: false,
    });

    if (error) {
      console.error('Community media upload error:', error);
      return res.status(502).json({ success: false, error: 'Unable to upload media.' });
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath);
    const type = req.file.mimetype.startsWith('image/')
      ? 'image'
      : req.file.mimetype.startsWith('video/')
        ? 'video'
        : req.file.mimetype === 'application/pdf'
          ? 'pdf'
          : 'link';

    return res.status(201).json({ success: true, url: data.publicUrl, type });
  } catch (error) {
    console.error('Community media upload error:', error);
    return res.status(500).json({ success: false, error: 'Unable to upload media.' });
  }
};

export const createCommunityContent = async (req, res) => {
  try {
    if (req.user?.role !== 'content_authorizer') {
      return res.status(403).json({ error: 'Only content authorizers can create community content.' });
    }

    const { school_name, area, state, date, session, title, description, media } = req.body;
    const userId = req.user.id; // ✅ This is a number like 13

    if (!school_name || !title) {
      return res.status(400).json({ error: "School Name and Title are required." });
    }

    const safeMedia = Array.isArray(media) ? media : [];

    const result = await pool.query(
      `
        INSERT INTO community_content 
        (school_name, area, state, date, session, title, description, media, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)
        RETURNING *
      `,
      [school_name, area, state, date, session, title, description, JSON.stringify(safeMedia), userId]
    );

    res.status(201).json({ success: true, data: result.rows[0] });

  } catch (err) {
    console.error("DB Error:", err);
    res.status(500).json({ error: "Failed to create content" });
  }
};

export const getCommunityContent = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        school_name AS school,
        TO_CHAR(date, 'YYYY-MM-DD') AS date,
        title,
        description,
        media
      FROM community_content
      ORDER BY date DESC
    `);

    // Transform media (JSONB array) into desired format
    const formattedData = result.rows.map(row => {
      const mediaArray = Array.isArray(row.media) ? row.media : [];
      const firstMedia = mediaArray[0] || null;

      return {
        id: row.id,
        school: row.school,
        date: row.date,
        title: row.title,
        description: row.description,
        type: firstMedia?.type || 'image', // assuming media items have { url, type }
        src: firstMedia?.url || '',
      };
    });

    res.status(200).json({ success: true, data: formattedData });
  } catch (err) {
    console.error("DB Fetch Error:", err);
    res.status(500).json({ error: "Failed to fetch community content" });
  }
};
