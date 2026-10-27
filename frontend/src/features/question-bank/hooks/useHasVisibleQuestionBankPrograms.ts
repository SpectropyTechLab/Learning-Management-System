import { useAuth } from "@/features/auth/hooks/useAuth";

export const useHasVisibleQuestionBankPrograms = (canRead: boolean) => {
  const { moduleVisibility } = useAuth();
  return canRead && moduleVisibility?.question_bank === true;
};
