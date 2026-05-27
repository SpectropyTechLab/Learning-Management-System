import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import SidebarNav from "@/components/layout/SidebarNav";
import { getDashboardTheme } from "@/components/layout/dashboardTheme";
import api from "@/lib/api";
import spectropyLogo from "/logo.png";
import { RiCalendarCheckLine, RiFileList3Line, RiHome2Line } from "react-icons/ri";
import { BiBookOpen } from "react-icons/bi";
import { HiOutlineBuildingOffice2 } from "react-icons/hi2";
import ContentViewer from "@/features/courses/components/player/ContentViewer";

type LicensedPack = {
  id: number;
  name: string;
  description?: string | null;
  item_count: number;
};

type LicensedItem = {
  id: number;
  title: string;
  item_type: string;
  content_url?: string | null;
  metadata?: Record<string, unknown> | null;
  download_allowed?: boolean;
};

type ClientUser = {
  logo?: string;
  client_name?: string;
};

export default function LicensedContentPage() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const theme = getDashboardTheme(false);

  const clientUser = user as (typeof user & ClientUser) | null;
  const brandLogo = clientUser?.logo || spectropyLogo;
  const brandName = clientUser?.client_name || "Spectropy";
  const clientMeta = clientUser?.client_name ? `${clientUser.client_name} Client` : null;
  const userFullName = user?.full_name || "Client Administrator";
  const userEmail = user?.email || "admin@lms.com";

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [packs, setPacks] = useState<LicensedPack[]>([]);
  const [selectedPackId, setSelectedPackId] = useState<number | null>(null);
  const [items, setItems] = useState<LicensedItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<LicensedItem | null>(null);
  const [loadingPacks, setLoadingPacks] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);

  const navItems = [
    {
      key: "home",
      label: "Home",
      icon: <RiHome2Line />,
      active: false,
      onClick: () => navigate("/admin/dashboard"),
    },
    {
      key: "org",
      label: "Organization",
      icon: <HiOutlineBuildingOffice2 />,
      active: false,
      onClick: () => navigate("/admin/org"),
    },
    {
      key: "courses",
      label: "Courses",
      icon: <BiBookOpen />,
      active: false,
      onClick: () => navigate("/admin/dashboard"),
    },
    {
      key: "licensed",
      label: "Licensed Content",
      icon: <RiFileList3Line />,
      active: true,
      onClick: () => navigate("/admin/licensed-content"),
    },
    {
      key: "teaching-sessions",
      label: "Teacher Session Tracker",
      icon: <RiCalendarCheckLine />,
      active: false,
      onClick: () => navigate("/admin/teaching-sessions/setup"),
    },
    {
      key: "question-bank",
      label: "Question Bank",
      icon: <RiFileList3Line />,
      active: false,
      onClick: () => navigate("/question-bank"),
    },
  ];

  const handleBackToLogin = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  useEffect(() => {
    let cancelled = false;
    const loadPacks = async () => {
      setLoadingPacks(true);
      try {
        const res = await api.get("/client/licensed-packs", {
          params: { page: 1, page_size: 100 },
        });
        if (cancelled) return;
        const nextPacks = Array.isArray(res.data?.data) ? res.data.data : [];
        setPacks(nextPacks);
        setSelectedPackId((prev) => prev ?? (nextPacks[0] ? Number(nextPacks[0].id) : null));
      } catch (err) {
        console.error("Failed to load licensed packs", err);
      } finally {
        if (!cancelled) setLoadingPacks(false);
      }
    };

    void loadPacks();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedPackId) {
      setItems([]);
      setSelectedItem(null);
      return;
    }

    let cancelled = false;
    const loadItems = async () => {
      setLoadingItems(true);
      try {
        const res = await api.get(`/client/licensed-packs/${selectedPackId}/items`, {
          params: { page: 1, page_size: 200 },
        });
        if (cancelled) return;
        const nextItems = Array.isArray(res.data?.data) ? res.data.data : [];
        setItems(nextItems);
        setSelectedItem(nextItems[0] ?? null);
      } catch (err) {
        console.error("Failed to load licensed items", err);
      } finally {
        if (!cancelled) setLoadingItems(false);
      }
    };

    void loadItems();
    return () => {
      cancelled = true;
    };
  }, [selectedPackId]);

  const selectedPack = useMemo(
    () => packs.find((pack) => pack.id === selectedPackId) ?? null,
    [packs, selectedPackId]
  );

  const previewPanel = selectedItem?.item_type === "exam"
    ? (
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Preview</p>
        <h3 className="mt-2 text-lg font-semibold text-slate-900">{selectedItem.title}</h3>
        <p className="mt-3 text-sm text-slate-600">
          Exam content is licensed and can be linked into client courses, but preview is limited to the course runtime.
        </p>
      </div>
    )
    : selectedItem
      ? <ContentViewer item={selectedItem} />
      : <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-500">Select an item to preview.</div>;

  return (
    <DashboardLayout
      shellClass={theme.shellClass}
      layoutClass={theme.layoutClass}
      sidebarOpen={sidebarOpen}
      onSidebarClose={() => setSidebarOpen(false)}
      contentClassName="p-6"
      sidebar={(
        <SidebarNav
          brandLogo={brandLogo}
          brandName={brandName}
          title="Admin Dashboard"
          brandTag={clientUser?.client_name}
          navItems={navItems}
          userInfo={{ name: userFullName, email: userEmail, meta: clientMeta }}
          onProfileClick={() => navigate("/admin/profile")}
          onLogout={handleBackToLogin}
          sidebarOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          theme={theme}
        />
      )}
      header={(
        <div className={theme.headerClass}>
          <button
            onClick={() => setSidebarOpen(true)}
            className={`mr-3 rounded-lg border p-2 md:hidden ${theme.secondaryBorderClass}`}
            aria-label="Open menu"
          >
            Menu
          </button>
          <div>
            <h1 className="text-xl font-bold md:text-2xl">Licensed Content</h1>
            <p className="mt-1 text-sm text-gray-600 md:text-base">
              Browse active pack entitlements and preview the read-only content your client can attach into courses.
            </p>
          </div>
        </div>
      )}
    >
      <div className="grid gap-6 lg:grid-cols-[280px_320px_1fr]">
        <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">Licensed Packs</p>
          </div>
          <div className="max-h-[70vh] overflow-y-auto p-3">
            {loadingPacks ? (
              <p className="text-sm text-slate-500">Loading packs...</p>
            ) : packs.length === 0 ? (
              <p className="text-sm text-slate-500">No active pack entitlements found.</p>
            ) : (
              packs.map((pack) => (
                <button
                  key={pack.id}
                  type="button"
                  onClick={() => setSelectedPackId(pack.id)}
                  className={`mb-2 w-full rounded-lg border px-3 py-3 text-left transition ${
                    selectedPackId === pack.id
                      ? "border-blue-900 bg-blue-50 text-blue-900"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{pack.name}</p>
                      {pack.description && <p className="mt-1 text-xs text-slate-500">{pack.description}</p>}
                    </div>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                      {pack.item_count}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">{selectedPack?.name ?? "Licensed Items"}</p>
            <p className="mt-1 text-xs text-slate-500">Read-only licensed items. Use the course editor to place them into chapters.</p>
          </div>
          <div className="max-h-[70vh] overflow-y-auto p-3">
            {loadingItems ? (
              <p className="text-sm text-slate-500">Loading items...</p>
            ) : items.length === 0 ? (
              <p className="text-sm text-slate-500">No items available in this pack.</p>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedItem(item)}
                  className={`mb-2 w-full rounded-lg border px-3 py-3 text-left transition ${
                    selectedItem?.id === item.id
                      ? "border-blue-900 bg-blue-50 text-blue-900"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{item.title}</p>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                      Read-only
                    </span>
                  </div>
                  <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">{item.item_type}</p>
                </button>
              ))
            )}
          </div>
        </section>

        <section className="min-h-[60vh] rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          {previewPanel}
        </section>
      </div>
    </DashboardLayout>
  );
}
