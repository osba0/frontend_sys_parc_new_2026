import { useEffect } from "react";
import { authApi } from "@/api/auth.api";
import { useAuthStore } from "@/stores/authStore";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "@/layouts/components/Sidebar";
import Topbar from "@/layouts/components/Topbar";
import { useUiStore } from "@/stores/uiStore";
import { useConfigStore } from "@/stores/configStore";
import { useAppStore } from "@/stores/appStore";
import { useDynamicFavicon } from "@/hooks/useDynamicFavicon";
import CommunicationModalObligatoire from "@/components/shared/CommunicationModalObligatoire";
import { cn } from "@/utils";

export default function AppLayout() {
  const { sidebarCollapsed, sidebarMobileOpen, closeMobileSidebar } =
    useUiStore();
  const { fetchConfig } = useConfigStore();
  const { fetchAppInfo } = useAppStore();
  const { setUser } = useAuthStore();
  const location = useLocation();

  useDynamicFavicon();

  useEffect(() => {
    fetchConfig();
    fetchAppInfo();
    // Rafraîchir les données utilisateur (véhicules affectés, permis, etc.)
    // à chaque montage de l'app — le cache localStorage peut être obsolète
    authApi
      .me()
      .then((r) => setUser(r.data.data))
      .catch(() => {});
  }, [fetchConfig, fetchAppInfo, setUser]);

  // Fermer la sidebar mobile à chaque navigation
  useEffect(() => {
    closeMobileSidebar();
  }, [location.pathname, closeMobileSidebar]);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* ── Modal obligatoire — communications critiques non lues ── */}
      <CommunicationModalObligatoire />

      {/* ── Overlay mobile ── */}
      {sidebarMobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={closeMobileSidebar}
        />
      )}

      {/* ── Sidebar ── */}
      <Sidebar />

      {/* ── Zone principale ── */}
      <div
        className={cn(
          "flex flex-col flex-1 min-w-0 transition-all duration-300",
          // Desktop : décalage selon état collapsed
          "lg:ml-64",
          sidebarCollapsed && "lg:ml-16",
          // Mobile : pas de marge (sidebar en overlay)
          "ml-0",
        )}
      >
        <Topbar />

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 max-w-screen-2xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
