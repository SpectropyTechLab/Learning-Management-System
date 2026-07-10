import { useEffect, useState } from "react";
import { fetchExams } from "@/features/exams/api";

export const useHasVisibleExams = (canRead: boolean) => {
  const [hasVisibleExams, setHasVisibleExams] = useState(false);

  useEffect(() => {
    let isMounted = true;

    if (!canRead) {
      setHasVisibleExams(false);
      return () => {
        isMounted = false;
      };
    }

    fetchExams({}, 1, 1)
      .then((response) => {
        if (!isMounted) return;
        const total = Number(response.total || 0);
        setHasVisibleExams(total > 0 || response.data.length > 0);
      })
      .catch(() => {
        if (isMounted) setHasVisibleExams(false);
      });

    return () => {
      isMounted = false;
    };
  }, [canRead]);

  return canRead && hasVisibleExams;
};
