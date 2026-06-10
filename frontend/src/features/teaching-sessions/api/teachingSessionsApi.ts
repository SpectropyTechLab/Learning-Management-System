import api from '@/lib/api';
import type {
  BatchOption,
  ClientEntitlement,
  GradeOption,
  LessonPlannerSession,
  MicroScheduleRow,
  PlannerChecklist,
  ProgramOption,
  ProgramSessionTemplate,
  ProgramUpload,
  SchoolMembership,
  SubjectOption,
  TeacherTrackerPermission,
  TeachingAnalyticsSummary,
  TeachingSession,
  TeachingSessionUpdate,
} from '@/features/teaching-sessions/types';

export const teachingSessionsApi = {
  listPrograms: async (clientId?: string | number) => {
    const res = await api.get<ProgramOption[]>('/teaching-sessions/program-options', {
      params: clientId ? { client_id: clientId } : undefined,
    });
    return res.data;
  },

  listGrades: async (programId: string | number, clientId?: string | number) => {
    const res = await api.get<GradeOption[]>(`/teaching-sessions/program-options/${programId}/grades`, {
      params: clientId ? { client_id: clientId } : undefined,
    });
    return res.data;
  },

  listSubjects: async (programId: string | number, gradeId: string | number, clientId?: string | number) => {
    const res = await api.get<SubjectOption[]>(`/teaching-sessions/program-options/${programId}/grades/${gradeId}/subjects`, {
      params: clientId ? { client_id: clientId } : undefined,
    });
    return res.data;
  },

  listBatchOptions: async (schoolId: string | number) => {
    const res = await api.get<BatchOption[]>('/org/batches', {
      params: { school_id: schoolId },
    });
    return res.data;
  },

  listSchoolMemberships: async (schoolId: string | number) => {
    const res = await api.get<SchoolMembership[]>(`/org/schools/${schoolId}/memberships`);
    return res.data;
  },

  listMicroScheduleUploads: async (params?: { programId?: string | number; gradeId?: string | number; subjectId?: string | number }) => {
    const res = await api.get<ProgramUpload[]>('/teaching-sessions/programs/micro-schedules', {
      params:
        params && (params.programId || params.gradeId || params.subjectId)
          ? {
              program_id: params.programId,
              grade_id: params.gradeId,
              subject_id: params.subjectId,
            }
          : undefined,
    });
    return res.data;
  },

  uploadMicroSchedule: async (formData: FormData) => {
    const res = await api.post('/teaching-sessions/programs/micro-schedules', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  getMicroScheduleRows: async (uploadId: string | number) => {
    const res = await api.get<MicroScheduleRow[]>(`/teaching-sessions/programs/micro-schedules/${uploadId}/rows`);
    return res.data;
  },

  listLessonPlannerUploads: async (params?: { programId?: string | number; gradeId?: string | number; subjectId?: string | number }) => {
    const res = await api.get<ProgramUpload[]>('/teaching-sessions/programs/lesson-planners', {
      params:
        params && (params.programId || params.gradeId || params.subjectId || (params as Record<string, unknown>).microScheduleUploadId || (params as Record<string, unknown>).targetSessionNo)
          ? {
              program_id: params.programId,
              grade_id: params.gradeId,
              subject_id: params.subjectId,
              micro_schedule_upload_id: (params as Record<string, unknown>).microScheduleUploadId,
              target_session_no: (params as Record<string, unknown>).targetSessionNo,
            }
          : undefined,
    });
    return res.data;
  },

  uploadLessonPlanner: async (formData: FormData) => {
    const res = await api.post('/teaching-sessions/programs/lesson-planners', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  getLessonPlannerSessions: async (uploadId: string | number) => {
    const res = await api.get<LessonPlannerSession[]>(`/teaching-sessions/programs/lesson-planners/${uploadId}/sessions`);
    return res.data;
  },

  getPlannerChecklist: async (microScheduleUploadId: string | number) => {
    const res = await api.get<PlannerChecklist>(`/teaching-sessions/programs/micro-schedules/${microScheduleUploadId}/planner-checklist`);
    return res.data;
  },

  mapProgramTemplates: async (programId: string | number, payload: Record<string, unknown>) => {
    const res = await api.post(`/teaching-sessions/programs/${programId}/templates/map`, payload);
    return res.data;
  },

  listProgramTemplates: async (programId: string | number, params?: Record<string, unknown>) => {
    const res = await api.get<ProgramSessionTemplate[]>(`/teaching-sessions/programs/${programId}/templates`, {
      params,
    });
    return res.data;
  },

  publishProgramTemplates: async (programId: string | number, payload: { template_version_no: number; micro_schedule_upload_id: number }) => {
    const res = await api.post(`/teaching-sessions/programs/${programId}/templates/publish`, payload);
    return res.data;
  },

  listClientEntitlements: async (clientId?: string | number) => {
    const res = await api.get<ClientEntitlement[]>('/teaching-sessions/entitlements', {
      params: clientId ? { client_id: clientId } : undefined,
    });
    return res.data;
  },

  createClientEntitlement: async (payload: Record<string, unknown>) => {
    const res = await api.post<ClientEntitlement>('/teaching-sessions/entitlements', payload);
    return res.data;
  },

  updateClientEntitlement: async (id: string | number, payload: Record<string, unknown>) => {
    const res = await api.patch<ClientEntitlement>(`/teaching-sessions/entitlements/${id}`, payload);
    return res.data;
  },

  generateTeachingSessions: async (payload: Record<string, unknown>) => {
    const res = await api.post('/teaching-sessions/sessions/generate', payload);
    return res.data;
  },

  listTeachingSessions: async (params?: Record<string, unknown>) => {
    const res = await api.get<TeachingSession[]>('/teaching-sessions/sessions', { params });
    return res.data;
  },

  updateTeachingSession: async (id: string | number, payload: Record<string, unknown>) => {
    const res = await api.patch<TeachingSession>(`/teaching-sessions/sessions/${id}`, payload);
    return res.data;
  },

  listTeacherPermissions: async (params?: Record<string, unknown>) => {
    const res = await api.get<TeacherTrackerPermission[]>('/teaching-sessions/permissions', { params });
    return res.data;
  },

  createTeacherPermission: async (payload: Record<string, unknown>) => {
    const res = await api.post<TeacherTrackerPermission>('/teaching-sessions/permissions', payload);
    return res.data;
  },

  deleteTeacherPermission: async (id: string | number) => {
    const res = await api.delete(`/teaching-sessions/permissions/${id}`);
    return res.data;
  },

  listMyTeachingSessions: async (params?: Record<string, unknown>) => {
    const res = await api.get<TeachingSession[]>('/teaching-sessions/my-sessions', { params });
    return res.data;
  },

  getMyTeachingSession: async (id: string | number) => {
    const res = await api.get<{ session: TeachingSession; updates: TeachingSessionUpdate[] }>(`/teaching-sessions/my-sessions/${id}`);
    return res.data;
  },

  createTeachingSessionUpdate: async (id: string | number, payload: Record<string, unknown>) => {
    const res = await api.post<{ session: TeachingSession; update: TeachingSessionUpdate }>(`/teaching-sessions/my-sessions/${id}/updates`, payload);
    return res.data;
  },

  getAnalytics: async (params?: Record<string, unknown>) => {
    const res = await api.get<TeachingAnalyticsSummary>('/teaching-sessions/analytics', { params });
    return res.data;
  },
};
