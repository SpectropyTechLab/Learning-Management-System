import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import Spinner from '@/components/ui/Spinner';
import type { Role } from '@/features/auth/types';
import ProtectedRoute from './ProtectedRoute';

// Auth pages
import LoginPage from '@/pages/auth/LoginPage';
import Courses from '@/pages/course/CoursesPage';

// SuperAdmin
import PlatformDashboard from '@/pages/dashboard/superadmin/PlatformDashboard';
import RegisterAdmin from '@/pages/dashboard/superadmin/RegisterAdmin';
import ClientsPage from '@/pages/dashboard/superadmin/ClientsPage';
import PacksPage from '@/pages/dashboard/superadmin/PacksPage';
import PackManagePage from '@/pages/dashboard/superadmin/PackManagePage';
import EntitlementsPage from '@/pages/dashboard/superadmin/EntitlementsPage';
import QuestionBankEntitlementsPage from '@/pages/dashboard/superadmin/QuestionBankEntitlementsPage';
import ExamEntitlementsPage from '@/pages/dashboard/superadmin/ExamEntitlementsPage';
import UsersPage from '@/pages/dashboard/superadmin/UsersPage';
import PermissionsPage from '@/pages/dashboard/superadmin/PermissionsPage';

// Admin / Client / School
import AdminDashboard from '@/pages/dashboard/admin/admindashboard';
import OrgDashboard from '@/pages/dashboard/admin/OrgDashboard';
import CourseContent from '@/pages/course/admin/CourseContent';
import EnrollUsers from '@/pages/course/admin/EnrollUsers';

// Teacher
import TeacherDashboard from '@/pages/dashboard/teacher/Dashboard';

// Student
import StudentDashboard from '@/pages/dashboard/student/StudentDashboard';
import StudentCourseView from '@/pages/course/student/StudentCourseView';
import StudentExamResultPlaceholderPage from '@/pages/exams/student/StudentExamResultPlaceholderPage';
import StudentExamRuntimePage from '@/pages/exams/student/StudentExamRuntimePage';

// Common
import ContentViewer from '@/features/courses/components/player/ContentViewer';
import Unauthorized from '@/pages/auth/Unauthorized';
import ContentAuthorizerProfile from '@/pages/dashboard/content_authorizer/Profile';
import ContentAuthorizerCourseContent from '@/pages/course/content_authorizer/CourseContent';
import ContentAuthorizerCourses from '@/pages/dashboard/content_authorizer/Courses';
import ContentAuthorizerDashboard from '@/pages/dashboard/content_authorizer/Dashboard';
import ContentAuthorizerPacksPage from '@/pages/dashboard/content_authorizer/PacksPage';
import ContentAuthorizerPackManagePage from '@/pages/dashboard/content_authorizer/PackManagePage';
import SchoolOwnerProfile from '@/pages/dashboard/school_owner/Profile';
import SchoolOwnerCourseContent from '@/pages/course/school_owner/CourseContent';
import SchoolOwnerEnrollUsers from '@/pages/course/school_owner/EnrollUsers';
import SchoolOwnerCourses from '@/pages/dashboard/school_owner/Courses';
import SchoolOwnerDashboard from '@/pages/dashboard/school_owner/Dashboard';
import AdminProfile from '@/pages/dashboard/admin/Profile';
import LicensedContentPage from '@/pages/dashboard/admin/LicensedContentPage';
import TeacherCourseContent from '@/pages/course/teacher/CourseContent';
import TeacherProfile from '@/pages/dashboard/teacher/Profile';
import TeacherHome from '@/pages/dashboard/teacher/TeacherHome';
import QuestionBankPage from '@/pages/questions/QuestionBankPage';
import QuestionCreatePage from '@/pages/questions/QuestionCreatePage';
import QuestionEditPage from '@/pages/questions/QuestionEditPage';
import QuestionDeletePage from '@/pages/questions/QuestionDeletePage';
import QuestionBulkUploadPage from '@/pages/questions/QuestionBulkUploadPage';
import QuestionConverterPage from '@/pages/questions/QuestionConverterPage';
import QuestionProgramsPage from '@/pages/questions/QuestionProgramsPage';
import QuestionProgramCreatePage from '@/pages/questions/QuestionProgramCreatePage';
import QuestionProgramEditPage from '@/pages/questions/QuestionProgramEditPage';
import QuestionGradesPage from '@/pages/questions/QuestionGradesPage';
import QuestionGradeCreatePage from '@/pages/questions/QuestionGradeCreatePage';
import QuestionGradeEditPage from '@/pages/questions/QuestionGradeEditPage';
import QuestionSubjectsPage from '@/pages/questions/QuestionSubjectsPage';
import QuestionSubjectCreatePage from '@/pages/questions/QuestionSubjectCreatePage';
import QuestionSubjectEditPage from '@/pages/questions/QuestionSubjectEditPage';
import QuestionFoldersPage from '@/pages/questions/QuestionFoldersPage';
import QuestionFolderDetailPage from '@/pages/questions/QuestionFolderDetailPage';
import QuestionFolderCreatePage from '@/pages/questions/QuestionFolderCreatePage';
import QuestionFolderEditPage from '@/pages/questions/QuestionFolderEditPage';
import QuestionChaptersPage from '@/pages/questions/QuestionChaptersPage';
import QuestionChapterCreatePage from '@/pages/questions/QuestionChapterCreatePage';
import QuestionChapterEditPage from '@/pages/questions/QuestionChapterEditPage';
import QuestionTopicsPage from '@/pages/questions/QuestionTopicsPage';
import QuestionTopicCreatePage from '@/pages/questions/QuestionTopicCreatePage';
import QuestionTopicEditPage from '@/pages/questions/QuestionTopicEditPage';
import QuestionPassagesPage from '@/pages/questions/QuestionPassagesPage';
import QuestionPassageCreatePage from '@/pages/questions/QuestionPassageCreatePage';
import QuestionPassageEditPage from '@/pages/questions/QuestionPassageEditPage';
import ExamListPage from '@/pages/exams/ExamListPage';
import ExamCreatePage from '@/pages/exams/ExamCreatePage';
import ExamBuilderPage from '@/pages/exams/ExamBuilderPage';
import ExamPaperPreviewPage from '@/pages/exams/ExamPaperPreviewPage';
import ExamSectionQuestionsPage from '@/pages/exams/ExamSectionQuestionsPage';
import BlueprintsPage from '@/pages/exams/BlueprintsPage';
import ProgramMicroScheduleUploadPage from '@/pages/teaching-sessions/ProgramMicroScheduleUploadPage';
import ProgramLessonPlannerUploadPage from '@/pages/teaching-sessions/ProgramLessonPlannerUploadPage';
import ProgramTemplateMappingPage from '@/pages/teaching-sessions/ProgramTemplateMappingPage';
import ClientEntitlementsPage from '@/pages/teaching-sessions/ClientEntitlementsPage';
import TeachingSessionSetupPage from '@/pages/teaching-sessions/TeachingSessionSetupPage';
import TeacherTrackerPermissionsPage from '@/pages/teaching-sessions/TeacherTrackerPermissionsPage';
import TeachingSessionsListPage from '@/pages/teaching-sessions/TeachingSessionsListPage';
import MyTeachingSessionsPage from '@/pages/teaching-sessions/MyTeachingSessionsPage';
import TeachingSessionDetailPage from '@/pages/teaching-sessions/TeachingSessionDetailPage';
import TeachingSessionAnalyticsPage from '@/pages/teaching-sessions/TeachingSessionAnalyticsPage';

export default function AppRoutes() {
  const { loading } = useAuth();

  if (loading) return <Spinner />;

  // Helper to group protected routes and reduce repetition
  const Protect = ({
    roles,
    permissions,
  }: {
    roles: Role[];
    permissions?: string[];
  }) => (
    <ProtectedRoute allowedRoles={roles} requiredPermissions={permissions}>
      <Outlet />
    </ProtectedRoute>
  );

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LoginPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/courses" element={<Courses />} />
      <Route path="/content/:contentId" element={<ContentViewer />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* SuperAdmin */}
      <Route element={<Protect roles={['super_admin']} />}>
        <Route path="/superadmin/dashboard" element={<PlatformDashboard />} />
        <Route path="/superadmin/clients" element={<ClientsPage />} />
        <Route path="/superadmin/packs" element={<PacksPage />} />
        <Route path="/superadmin/packs/:packId" element={<PackManagePage />} />
        <Route path="/superadmin/entitlements" element={<EntitlementsPage />} />
        <Route path="/superadmin/question-bank/entitlements" element={<QuestionBankEntitlementsPage />} />
        <Route path="/superadmin/exams/entitlements" element={<ExamEntitlementsPage />} />
        <Route path="/superadmin/teaching-sessions/entitlements" element={<ClientEntitlementsPage />} />
        <Route path="/superadmin/users" element={<UsersPage />} />
        <Route path="/superadmin/permissions" element={<PermissionsPage />} />
        <Route path="/superadmin/register" element={<RegisterAdmin />} />
      </Route>

      {/* Client / School (alias routes for SaaS separation) 
      <Route element={<Protect roles={['client_admin', 'content_authorizer']} />}>
        <Route path="/client/dashboard" element={<AdminDashboard />} />
      </Route>
      <Route element={<Protect roles={['school_owner']} />}>
        <Route path="/school/dashboard" element={<AdminDashboard />} />
      </Route>*/}

      {/* Admin */}
      <Route element={<Protect roles={['super_admin', 'client_admin', 'content_authorizer', 'school_owner']} />}>
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/profile" element={<AdminProfile />} />
      </Route>

      <Route
        element={
          <Protect
            roles={['super_admin', 'client_admin', 'content_authorizer']}
            permissions={['courses.read']}
          />
        }
      >
        <Route path="/admin/courses/:courseId/content" element={<CourseContent />} />
      </Route>

      <Route
        element={
          <Protect
            roles={['super_admin', 'client_admin', 'content_authorizer']}
            permissions={['courses.update']}
          />
        }
      >
        <Route path="/admin/courses/:courseId/enroll" element={<EnrollUsers />} />
      </Route>

      <Route element={<Protect roles={['client_admin']} />}>
        <Route path="/admin/licensed-content" element={<LicensedContentPage />} />
      </Route>

      <Route element={<Protect roles={['super_admin', 'client_admin', 'school_owner']} />}>
        <Route path="/admin/org" element={<OrgDashboard />} />
      </Route>

      {/* Content Authorizer */}
      <Route element={<Protect roles={['content_authorizer', 'super_admin']} />}>
        <Route path="/content-authorizer/dashboard" element={<ContentAuthorizerDashboard />} />
        <Route path="/content-authorizer/courses" element={<ContentAuthorizerCourses />} />
        <Route path="/content-authorizer/packs" element={<ContentAuthorizerPacksPage />} />
        <Route path="/content-authorizer/packs/:packId" element={<ContentAuthorizerPackManagePage />} />
        <Route path="/content-authorizer/courses/:courseId/content" element={<ContentAuthorizerCourseContent />} />
        <Route path="/content-authorizer/profile" element={<ContentAuthorizerProfile />} />
        <Route path="/content-authorizer/teaching-sessions/micro-schedules" element={<ProgramMicroScheduleUploadPage />} />
        <Route path="/content-authorizer/teaching-sessions/lesson-planners" element={<ProgramLessonPlannerUploadPage />} />
        <Route path="/content-authorizer/teaching-sessions/templates" element={<ProgramTemplateMappingPage />} />
      </Route>

      {/* School Owner */}
      <Route element={<Protect roles={['school_owner', 'client_admin', 'super_admin']} />}>
        <Route path="/school-owner/dashboard" element={<SchoolOwnerDashboard />} />
        <Route path="/school-owner/profile" element={<SchoolOwnerProfile />} />
        <Route path="/school-owner/teaching-sessions/analytics" element={<TeachingSessionAnalyticsPage />} />
      </Route>

      <Route element={<Protect roles={['school_owner', 'client_admin', 'super_admin']} permissions={['courses.read']} />}>
        <Route path="/school-owner/courses" element={<SchoolOwnerCourses />} />
      </Route>

      <Route
        element={
          <Protect
            roles={['school_owner', 'client_admin', 'super_admin']}
            permissions={['courses.read']}
          />
        }
      >
        <Route path="/school-owner/courses/:courseId/content" element={<SchoolOwnerCourseContent />} />
      </Route>

      <Route
        element={
          <Protect
            roles={['school_owner', 'client_admin', 'super_admin']}
            permissions={['courses.update']}
          />
        }
      >
        <Route path="/school-owner/courses/:courseId/enroll" element={<SchoolOwnerEnrollUsers />} />
      </Route>

      {/* Teacher */}
      <Route element={<Protect roles={['super_admin', 'client_admin', 'school_owner', 'teacher']} />}>

        <Route path="/teacher" element={<TeacherHome />} />
        <Route path="/teacher/dashboard" element={<TeacherHome />} />
        <Route path="/teacher/profile" element={<TeacherProfile />} />
        <Route path="/teacher/teaching-sessions" element={<MyTeachingSessionsPage />} />
        <Route path="/teacher/teaching-sessions/:id" element={<TeachingSessionDetailPage />} />
        <Route path="/teacher/teaching-sessions/analytics" element={<TeachingSessionAnalyticsPage />} />
      </Route>

      <Route element={<Protect roles={['super_admin', 'client_admin']} />}>
        <Route path="/admin/teaching-sessions/setup" element={<TeachingSessionSetupPage />} />
        <Route path="/admin/teaching-sessions/permissions" element={<TeacherTrackerPermissionsPage />} />
        <Route path="/admin/teaching-sessions/sessions" element={<TeachingSessionsListPage />} />
        <Route path="/admin/teaching-sessions/analytics" element={<TeachingSessionAnalyticsPage />} />
      </Route>

      <Route element={<Protect roles={['super_admin', 'client_admin', 'school_owner', 'teacher']} permissions={['courses.read']} />}>
        <Route path="/teacher/courses" element={<TeacherDashboard />} />
      </Route>

      <Route
        element={
          <Protect
            roles={['super_admin', 'client_admin', 'school_owner', 'teacher']}
            permissions={['courses.read']}
          />
        }
      >
        <Route path="/teacher/courses/:courseId/content" element={<TeacherCourseContent />} />
      </Route>

      {/* Student */}
      <Route element={<Protect roles={['student']} />}>
        <Route path="/student/dashboard" element={<StudentDashboard />} />
        <Route path="/student/exams/:examId/result" element={<StudentExamResultPlaceholderPage />} />
        <Route path="/student/exams/attempt/:attemptId" element={<StudentExamRuntimePage />} />
        <Route path="/student/course/:courseId" element={<StudentCourseView />}>
          <Route index element={<div className="p-6 text-gray-500">Select a topic from the left to view content.</div>} />
          <Route path="content/:contentId" element={<ContentViewer />} />
        </Route>
      </Route>

      {/* Question Bank */}
      <Route
        element={
          <Protect
            roles={[
              'super_admin',
              'client_admin',
              'content_authorizer',
              'school_owner',
              'teacher',
            ]}
            permissions={['questions.read']}
          />
        }
      >
        <Route path="/question-bank" element={<QuestionBankPage />} />
        <Route path="/question-bank/programs" element={<QuestionProgramsPage />} />
        <Route path="/question-bank/grades" element={<QuestionGradesPage />} />
        <Route path="/question-bank/subjects" element={<QuestionSubjectsPage />} />
        <Route path="/question-bank/chapters" element={<QuestionChaptersPage />} />
        <Route path="/question-bank/topics" element={<QuestionTopicsPage />} />
        <Route path="/question-bank/folders" element={<QuestionFoldersPage />} />
        <Route path="/question-bank/folders/:id" element={<QuestionFolderDetailPage />} />
        <Route path="/question-bank/passages" element={<QuestionPassagesPage />} />
      </Route>

      <Route
        element={
          <Protect
            roles={[
              'super_admin',
              'client_admin',
              'content_authorizer',
              'school_owner',
              'teacher',
            ]}
            permissions={['questions.create']}
          />
        }
      >
        <Route path="/question-bank/new" element={<QuestionCreatePage />} />
        <Route path="/question-bank/:id/edit" element={<QuestionEditPage />} />
        <Route path="/question-bank/converter" element={<QuestionConverterPage />} />
        <Route path="/question-bank/bulk-upload" element={<QuestionBulkUploadPage />} />
        <Route path="/question-bank/programs/new" element={<QuestionProgramCreatePage />} />
        <Route path="/question-bank/programs/:id/edit" element={<QuestionProgramEditPage />} />
        <Route path="/question-bank/grades/new" element={<QuestionGradeCreatePage />} />
        <Route path="/question-bank/grades/:id/edit" element={<QuestionGradeEditPage />} />
        <Route path="/question-bank/subjects/new" element={<QuestionSubjectCreatePage />} />
        <Route path="/question-bank/subjects/:id/edit" element={<QuestionSubjectEditPage />} />
        <Route path="/question-bank/chapters/new" element={<QuestionChapterCreatePage />} />
        <Route path="/question-bank/chapters/:id/edit" element={<QuestionChapterEditPage />} />
        <Route path="/question-bank/topics/new" element={<QuestionTopicCreatePage />} />
        <Route path="/question-bank/topics/:id/edit" element={<QuestionTopicEditPage />} />
        <Route path="/question-bank/folders/new" element={<QuestionFolderCreatePage />} />
        <Route path="/question-bank/folders/:id/edit" element={<QuestionFolderEditPage />} />
        <Route path="/question-bank/passages/new" element={<QuestionPassageCreatePage />} />
        <Route path="/question-bank/passages/:id/edit" element={<QuestionPassageEditPage />} />
      </Route>

      <Route
        element={
          <Protect
            roles={[
              'super_admin',
              'client_admin',
              'content_authorizer',
              'school_owner',
              'teacher',
            ]}
            permissions={['questions.delete']}
          />
        }
      >
        <Route path="/question-bank/:id/delete" element={<QuestionDeletePage />} />
      </Route>

      {/* Exam Management */}
      <Route
        element={
          <Protect
            roles={[
              'super_admin',
              'client_admin',
              'content_authorizer',
              'school_owner',
              'teacher',
            ]}
            permissions={['exams.read']}
          />
        }
      >
        <Route path="/exams" element={<ExamListPage />} />
        <Route path="/exams/blueprints" element={<BlueprintsPage />} />
      </Route>

      <Route
        element={
          <Protect
            roles={[
              'super_admin',
              'client_admin',
              'content_authorizer',
              'school_owner',
              'teacher',
            ]}
            permissions={['exams.create']}
          />
        }
      >
        <Route path="/exams/new" element={<ExamCreatePage />} />
      </Route>

      <Route
        element={
          <Protect
            roles={[
              'super_admin',
              'client_admin',
              'content_authorizer',
              'school_owner',
              'teacher',
            ]}
            permissions={['exams.update']}
          />
        }
      >
        <Route path="/exams/:id/builder" element={<ExamBuilderPage />} />
        <Route path="/exams/:id/paper-preview" element={<ExamPaperPreviewPage />} />
        <Route path="/exams/:id/sections/:sectionId/questions" element={<ExamSectionQuestionsPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />

    </Routes>
  );
}
