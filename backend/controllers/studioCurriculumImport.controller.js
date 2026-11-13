import * as service from '../services/studioCurriculumImport.service.js';
import { handleStudioServiceError } from '../utils/errors.js';

const respond = (action, status = 200) => async (req, res) => {
  try {
    return res.status(status).json({ data: await action(req) });
  } catch (error) {
    return handleStudioServiceError(res, error, 'Studio curriculum import failed');
  }
};

export const previewCurriculumImport = respond((req) =>
  service.previewCurriculumImport({ file: req.file, user: req.user }));

export const confirmCurriculumImport = respond((req) =>
  service.confirmCurriculumImport({ body: req.body, user: req.user }), 201);

export const downloadCurriculumImportTemplate = async (_req, res) => {
  try {
    const buffer = await service.curriculumImportTemplate();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="studio-curriculum-import-template.xlsx"');
    return res.send(Buffer.from(buffer));
  } catch (error) {
    return handleStudioServiceError(res, error, 'Unable to create curriculum import template');
  }
};
