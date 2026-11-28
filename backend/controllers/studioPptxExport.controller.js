import { exportImportedSessionPptx } from '../services/studioPptxExport.service.js';
import { handleStudioServiceError } from '../utils/errors.js';

export const exportPptx = async (req, res) => {
  try {
    const result = await exportImportedSessionPptx({ sessionId: req.params.sessionId, user: req.user });
    const encoded = encodeURIComponent(result.fileName);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    res.setHeader('Content-Disposition', `attachment; filename="presentation.pptx"; filename*=UTF-8''${encoded}`);
    res.setHeader('Content-Length', String(result.buffer.length));
    return res.send(result.buffer);
  } catch (error) {
    return handleStudioServiceError(res, error, 'PowerPoint export failed');
  }
};
