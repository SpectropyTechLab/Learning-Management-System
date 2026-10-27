import { useAuth } from "@/features/auth/hooks/useAuth";

export const useHasVisibleExams = (canRead: boolean) => {
  const { moduleVisibility } = useAuth();
  return canRead && moduleVisibility?.exams === true;
};
