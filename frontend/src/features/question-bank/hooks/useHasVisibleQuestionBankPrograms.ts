import { useEffect, useState } from "react";
import api from "@/lib/api";
import type { CurriculumItem } from "@/types/questionBank";

export const useHasVisibleQuestionBankPrograms = (canRead: boolean) => {
  const [hasVisiblePrograms, setHasVisiblePrograms] = useState(false);

  useEffect(() => {
    let isMounted = true;

    if (!canRead) {
      setHasVisiblePrograms(false);
      return () => {
        isMounted = false;
      };
    }

    api
      .get<CurriculumItem[]>("/programs", { params: { assigned_only: "1" } })
      .then((response) => {
        if (!isMounted) return;
        setHasVisiblePrograms((response.data ?? []).length > 0);
      })
      .catch(() => {
        if (isMounted) setHasVisiblePrograms(false);
      });

    return () => {
      isMounted = false;
    };
  }, [canRead]);

  return canRead && hasVisiblePrograms;
};
