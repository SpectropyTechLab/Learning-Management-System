import React from "react";
import UserInfoCard from "./UserInfoCard";
import type { DashboardTheme } from "./dashboardTheme";

export interface SidebarNavItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}

interface SidebarNavProps {
  brandLogo: string;
  brandName: string;
  title: string;
  brandTag?: string;
  topAction?: React.ReactNode;
  navItems: SidebarNavItem[];
  userInfo: {
    name: string;
    email: string;
    meta?: string | null;
  };
  onProfileClick?: () => void;
  onLogout?: () => void;
  logoutLabel?: string;
  logoutIcon?: React.ReactNode;
  showUserInfo?: boolean;
  showLogout?: boolean;
  sidebarOpen: boolean;
  onClose: () => void;
  theme: DashboardTheme;
}

export default function SidebarNav({
  brandLogo,
  brandName,
  title,
  brandTag,
  topAction,
  navItems,
  userInfo,
  onProfileClick,
  onLogout,
  logoutLabel = "Logout",
  logoutIcon,
  showUserInfo = true,
  showLogout = true,
  sidebarOpen,
  onClose,
  theme,
}: SidebarNavProps) {
  return (
    <div
      className={`
        fixed md:static
        inset-y-0 left-0
        z-50
        w-[78vw] max-w-[16rem] lg:w-64 xl:w-72 lg:max-w-none
        ${theme.sidebarThemeClass}
        border-r
        flex h-full min-h-0 flex-col overflow-hidden
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        md:translate-x-0
      `}
    >
      <div className={`shrink-0 px-4 py-4 lg:px-5 lg:py-5 border-b ${theme.sidebarHeaderBorder}`}>
        <div className="flex items-center space-x-2 cursor-pointer">
          <img
            src={brandLogo}
            alt={`${brandName} Logo`}
            className="h-9 w-auto md:h-10 lg:h-11 rounded-md"
          />
        </div>
        {brandTag && <p className={theme.brandTagClass}>{brandTag}</p>}
        <h1 className="text-base font-semibold lg:text-lg">{title}</h1>
      </div>

      {topAction ? (
        <div className="shrink-0 px-3 py-2.5 lg:px-4 lg:py-3">
          {topAction}
        </div>
      ) : null}

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-3 space-y-1.5 lg:p-4 lg:space-y-2">
        {navItems.map((item) => (
          <button
            key={item.key}
            onClick={() => {
              item.onClick();
              onClose();
            }}
            className={`w-full flex items-center px-3 py-2.5 lg:px-4 lg:py-3 text-sm font-medium ${theme.navRadiusClass} transition-colors ${
              item.active ? theme.navActiveClass : theme.navInactiveClass
            }`}
          >
            <span className={theme.navIconClass}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      {showUserInfo &&
        (onProfileClick ? (
          <button
            type="button"
            onClick={onProfileClick}
            className="shrink-0 w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/60 focus-visible:ring-offset-2 transition"
            aria-label="Open profile"
          >
            <UserInfoCard
              name={userInfo.name}
              email={userInfo.email}
              meta={userInfo.meta}
              wrapperClassName={theme.userInfoWrapperClass}
              innerClassName={theme.userInfoInnerClass}
              avatarClassName={theme.avatarClass}
              avatarTextClassName={theme.avatarTextClass}
            />
          </button>
        ) : (
          <UserInfoCard
            name={userInfo.name}
            email={userInfo.email}
            meta={userInfo.meta}
            wrapperClassName={theme.userInfoWrapperClass}
            innerClassName={theme.userInfoInnerClass}
            avatarClassName={theme.avatarClass}
            avatarTextClassName={theme.avatarTextClass}
          />
        ))}

      {showLogout && onLogout && (
        <div
          className={`shrink-0 border-t ${
            theme.brandTagClass ? "mt-auto border-amber-100 px-4 py-2" : "border-gray-200 p-4"
          }`}
        >
          <button
            onClick={onLogout}
            className={`w-full flex items-center justify-center ${theme.logoutButtonClass}`}
          >
            {logoutIcon ? (
              <span className="mr-2 inline-flex items-center">{logoutIcon}</span>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
            )}
            {logoutLabel}
          </button>
        </div>
      )}
    </div>
  );
}
