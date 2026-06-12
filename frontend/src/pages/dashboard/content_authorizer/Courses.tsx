import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/useAuth";
import AdminCourseManager from "@/features/courses/components/list/AdminCourseManager";
import { getDashboardTheme } from "@/components/layout/dashboardTheme";
import ContentAuthorizerShell from "./ContentAuthorizerShell";

export default function ContentAuthorizerCourses() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = getDashboardTheme(false);

  return (
    <ContentAuthorizerShell
      title="Courses"
      subtitle="Review and prepare platform-ready course structures."
    >
      <AdminCourseManager
        mode="admin"
        role={user?.role}
        permissionKeys={user?.permissions}
        theme={theme}
        brandLogo="/logo.png"
        brandName="Spectropy"
        courseBannerClass="bg-sky-100"
        listTitle="All Courses"
        emptyMessage="No courses found."
        onManageContent={(courseId) =>
          navigate(`/content-authorizer/courses/${courseId}/content`)
        }
        onEnroll={(courseId) => navigate(`/admin/courses/${courseId}/enroll`)}
      />
    </ContentAuthorizerShell>
  );
}
