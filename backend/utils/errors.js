// backend/utils/errors.js
export class AppError extends Error {
  constructor(message, status = 400, code = undefined, details = undefined) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const handleServiceError = (res, err, fallbackMessage = 'Request failed') => {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: err.message });
  }
  console.error(err);
  return res.status(500).json({ error: fallbackMessage });
};

const studioStatusCode = (status) => ({
  400: 'INVALID_REQUEST',
  401: 'AUTHENTICATION_REQUIRED',
  403: 'ACCESS_DENIED',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  413: 'PAYLOAD_TOO_LARGE',
  422: 'VALIDATION_FAILED',
}[status] || 'REQUEST_FAILED');

// Day 8 Studio contract: frontend-facing Studio APIs use one stable error shape
// without changing legacy LMS endpoints that still return a string error.
export const handleStudioServiceError = (res, err, fallbackMessage = 'Studio request failed') => {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: {
        code: err.code || studioStatusCode(err.status),
        message: err.message,
        ...(err.details === undefined ? {} : { details: err.details }),
      },
    });
  }
  console.error(err);
  return res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: fallbackMessage },
  });
};
