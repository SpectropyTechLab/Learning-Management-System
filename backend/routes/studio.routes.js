import {Router} from 'express';
import multer from 'multer';
import mammoth from 'mammoth';
import AdmZip from 'adm-zip';
import pool from '../config/db.js';
import {authenticateToken,attachClientContext,loadPermissions} from '../middleware/auth.js';
import {createStudioRouter,startStudioWorker} from '../studio/router.mjs';
export const stopStudioWorker=process.env.STUDIO_WORKER_ENABLED==='true'?startStudioWorker(pool):()=>{};
export default createStudioRouter({Router,multer,mammoth,AdmZip,pool,authenticateToken,attachClientContext,loadPermissions});
