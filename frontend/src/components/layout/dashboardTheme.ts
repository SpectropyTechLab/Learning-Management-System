export interface DashboardTheme {
  shellClass: string;
  layoutClass: string;
  sidebarThemeClass: string;
  sidebarHeaderBorder: string;
  navActiveClass: string;
  navInactiveClass: string;
  navRadiusClass: string;
  navIconClass: string;
  userInfoWrapperClass: string;
  userInfoInnerClass: string;
  avatarClass: string;
  avatarTextClass: string;
  headerClass: string;
  primaryButtonClass: string;
  secondaryBorderClass: string;
  logoutButtonClass: string;
  brandTagClass: string;
}

export const getDashboardTheme = (isGvjbClient: boolean): DashboardTheme => {
  if (isGvjbClient) {
    return {
      shellClass:
        "min-h-screen bg-[radial-gradient(circle_at_top,_#fff7ed,_#ffffff_45%,_#fef9f3_100%)] text-slate-900",
      layoutClass: "flex min-h-screen flex-col lg:flex-row",
      sidebarThemeClass: "bg-white/90 border-amber-100 backdrop-blur",
      sidebarHeaderBorder: "border-amber-100",
      navActiveClass: "bg-amber-100 text-amber-900 border-l-4 border-amber-600",
      navInactiveClass: "text-slate-700 hover:bg-amber-50",
      navRadiusClass: "rounded-2xl",
      navIconClass: "text-lg text-amber-700 mr-3",
      userInfoWrapperClass: "px-4 pb-4",
      userInfoInnerClass:
        "flex items-center rounded-2xl border border-amber-200 bg-amber-50/90 p-3 shadow-sm transition hover:bg-amber-100",
      avatarClass:
        "h-12 w-12 rounded-full bg-amber-200 flex items-center justify-center",
      avatarTextClass: "text-amber-900 font-semibold text-xl",
      headerClass:
        "sticky top-0 z-40 border-b border-amber-100 bg-white/70 px-6 py-6 backdrop-blur",
      primaryButtonClass: "bg-amber-400 text-slate-900 hover:bg-amber-500",
      secondaryBorderClass: "border-amber-200",
      logoutButtonClass:
        "rounded-full border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50",
      brandTagClass:
        "text-xs uppercase tracking-[0.3em] text-amber-700 mt-2",
    };
  }

  return {
    shellClass: "min-h-screen bg-gray-50",
    layoutClass: "flex min-h-screen",
    sidebarThemeClass: "bg-white border-gray-200",
    sidebarHeaderBorder: "border-gray-200",
    navActiveClass: "bg-blue-50 text-blue-900 border-l-4 border-blue-900",
    navInactiveClass: "text-gray-700 hover:bg-gray-100",
    navRadiusClass: "rounded-lg",
    navIconClass: "text-lg text-black mr-2.5",
    userInfoWrapperClass: "mb-2.5 flex items-center px-2.5",
    userInfoInnerClass:
      "flex w-full items-center rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-sm transition hover:bg-gray-50",
    avatarClass:
      "h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center ml-1",
    avatarTextClass: "text-blue-900 font-medium text-xl",
    headerClass: "sticky top-0 z-40 px-4 py-4 lg:px-6 lg:py-5 border-b border-gray-200 bg-white",
    primaryButtonClass: "bg-blue-900 text-white hover:bg-blue-700",
    secondaryBorderClass: "border-gray-300",
    logoutButtonClass: "px-3 py-2 text-sm text-blue-900 hover:text-blue-600",
    brandTagClass: "",
  };
};
