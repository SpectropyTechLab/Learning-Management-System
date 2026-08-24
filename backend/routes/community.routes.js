// backend/routes/community.routes.js
import express from 'express';
import multer from 'multer';
import {
  createCommunityContent,
  getCommunityContent,
  uploadCommunityMedia,
} from '../controllers/community.controller.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const communityMediaMaxSizeMb = 50;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: communityMediaMaxSizeMb * 1024 * 1024 },
});

const uploadCommunityFile = (req, res, next) => {
  upload.single('file')(req, res, (error) => {
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        error: `File is too large. Maximum allowed size is ${communityMediaMaxSizeMb} MB.`,
      });
    }

    if (error) return next(error);
    return next();
  });
};

router.post('/community', authenticateToken, createCommunityContent);
router.get('/community/content', getCommunityContent);
router.post('/upload/media', authenticateToken, uploadCommunityFile, uploadCommunityMedia);

export default router;
