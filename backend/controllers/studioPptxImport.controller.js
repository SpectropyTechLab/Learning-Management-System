import { AppError, handleStudioServiceError } from '../utils/errors.js';
import { commitPptxImport, preflightPptxImport } from '../services/studioPptxImport.service.js';

const optionsFrom = (body = {}) => {
  if (!body.options) return {};
  if (typeof body.options === 'object') return body.options;
  try { return JSON.parse(body.options); } catch { throw new AppError('PowerPoint import options are invalid', 400, 'PPTX_OPTIONS_INVALID'); }
};

const requireFile = (req) => {
  if (!req.file) throw new AppError('Choose a .pptx file to import', 400, 'PPTX_FILE_REQUIRED');
  return req.file;
};

export const preflightPptx = async (req, res) => {
  try {
    const data = await preflightPptxImport({ file: requireFile(req), options: optionsFrom(req.body) });
    return res.json({ data });
  } catch (error) {
    return handleStudioServiceError(res, error, 'PowerPoint preflight failed');
  }
};

export const commitPptx = async (req, res) => {
  const controller = new AbortController();
  req.once('aborted', () => controller.abort());
  try {
    const data = await commitPptxImport({
      sessionId: req.params.sessionId,
      file: requireFile(req),
      options: optionsFrom(req.body),
      user: req.user,
      signal: controller.signal,
    });
    return res.status(201).json({ data });
  } catch (error) {
    return handleStudioServiceError(res, error, 'PowerPoint import failed');
  }
};
