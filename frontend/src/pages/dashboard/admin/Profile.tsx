import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import SidebarNav from "@/components/layout/SidebarNav";
import { getDashboardTheme } from "@/components/layout/dashboardTheme";
import ProfilePanel from "@/features/users/components/ProfilePanel";
import spectropyLogo from "/logo.png";
import { RiCalendarCheckLine, RiHome2Line, RiFileList3Line } from "react-icons/ri";
import { BiBookOpen } from "react-icons/bi";
import { HiOutlineBuildingOffice2 } from "react-icons/hi2";

type ClientUser = {
  logo?: string;
  client_name?: string;
};

export default function AdminProfile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const clientUser = user as (typeof user & ClientUser) | null;

  const theme = getDashboardTheme(false);
  const brandLogo = clientUser?.logo || spectropyLogo;
  const brandName = clientUser?.client_name || "Spectropy";
  const dashboardTitle = clientUser?.client_name ? `${clientUser.client_name} Dashboard` : "Admin Dashboard";

  const navItems = [
    {
      key: "home",
      label: "Home",
      icon: <RiHome2Line />,
      active: false,
      onClick: () => navigate("/admin/dashboard"),
    },
    {
      key: 'org',
      label: 'Organization',
      icon: <HiOutlineBuildingOffice2 />,
      active: false,
      onClick: () => navigate('/admin/org'),
    },
    {
      key: "courses",
      label: "Courses",
      icon: <BiBookOpen />,
      active: false,
      onClick: () => navigate("/admin/dashboard"),
    },
    {
      key: "question-bank",
      label: "Question Bank",
      icon: <RiFileList3Line />,
      active: false,
      onClick: () => navigate("/question-bank"),
    },
    {
      key: "teaching-sessions",
      label: "Teacher Session Tracker",
      icon: <RiCalendarCheckLine />,
      active: false,
      onClick: () => navigate("/admin/teaching-sessions/setup"),
    },
  ];

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <DashboardLayout
      shellClass={theme.shellClass}
      layoutClass={theme.layoutClass}
      sidebarOpen={sidebarOpen}
      onSidebarClose={() => setSidebarOpen(false)}
      contentClassName="p-0"
      sidebar={
        <SidebarNav
          brandLogo={brandLogo}
          brandName={brandName}
          title={dashboardTitle}
          brandTag={clientUser?.client_name}
          navItems={navItems}
          userInfo={{
            name: user?.full_name || "Administrator",
            email: user?.email || "admin@spectropy.com",
            meta: clientUser?.client_name ? `${clientUser.client_name} Client` : null,
          }}
          onLogout={handleLogout}
          sidebarOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          theme={theme}
        />
      }
      header={
        <div className={theme.headerClass}>
          <button
            onClick={() => setSidebarOpen(true)}
            className={`md:hidden mr-3 p-2 rounded-lg border ${theme.secondaryBorderClass}`}
            aria-label="Open menu"
          >
            Menu
          </button>
          <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center">
            <div>
              <h1 className="text-xl md:text-2xl font-bold">Profile</h1>
              <p className="mt-1 text-sm md:text-base text-gray-600">
                View and update your account details.
              </p>
            </div>
          </div>
        </div>
      }
    >
      <div className="p-6">
        <ProfilePanel />
      </div>
    </DashboardLayout>
  );
}
