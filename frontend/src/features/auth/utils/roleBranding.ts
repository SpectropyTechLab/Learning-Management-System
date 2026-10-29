import type { User } from "@/features/auth/hooks/useAuth";

export const getRoleDisplayTitle = (role?: string | null) => {
  switch (role) {
    case "client_admin":
      return "Client Admin";
    case "school_owner":
      return "School Admin";
    case "teacher":
      return "Teacher";
    case "student":
      return "Student";
    case "content_authorizer":
      return "Content Authorizer";
    case "super_admin":
      return "Super Admin";
    default:
      return "User";
  }
};

export const getOrganizationLabel = (user?: User | null) => {
  if (!user) return "Spectropy";

  if (user.role === "client_admin") {
    return user.client_name || "Spectropy";
  }

  if (user.role === "school_owner" || user.role === "teacher" || user.role === "student") {
    return user.school_name || "Spectropy";
  }

  return user.client_name || "Spectropy";
};
