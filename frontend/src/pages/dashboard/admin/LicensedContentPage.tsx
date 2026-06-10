import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function LicensedContentPage() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/admin/dashboard", {
      replace: true,
      state: { activeTab: "courses" },
    });
  }, [navigate]);

  return null;
}
