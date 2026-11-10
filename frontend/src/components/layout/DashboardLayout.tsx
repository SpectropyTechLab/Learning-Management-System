import React from "react";

interface DashboardLayoutProps {
  shellClass: string;
  layoutClass: string;
  sidebarOpen: boolean;
  onSidebarClose: () => void;
  sidebar: React.ReactNode;
  header: React.ReactNode;
  children: React.ReactNode;
  contentClassName?: string;
}

export default function DashboardLayout({
  shellClass,
  layoutClass,
  sidebarOpen,
  onSidebarClose,
  sidebar,
  header,
  children,
  contentClassName = "p-6",
}: DashboardLayoutProps) {
  return (
    <div className={`${shellClass} h-screen overflow-hidden`}>
      <div className={`${layoutClass} h-full overflow-hidden`}>
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-40 md:hidden"
            onClick={onSidebarClose}
          />
        )}

        {sidebar}

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {header}
          <div className={`min-h-0 flex-1 overflow-y-auto ${contentClassName}`}>{children}</div>
        </div>
      </div>
    </div>
  );
}
