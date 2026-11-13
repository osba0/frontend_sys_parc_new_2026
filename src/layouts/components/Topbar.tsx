import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Bell,
  LogOut,
  User,
  ChevronDown,
  Search,
  Menu,
  Lightbulb,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useUiStore } from "@/stores/uiStore";
import { useConfigStore } from "@/stores/configStore";
import { useNotificationStore } from "@/stores/notificationStore";
import { useQuery } from "@tanstack/react-query";
import { authApi } from "@/api/auth.api";
import { notificationsApi } from "@/api/notifications.api";
import NotificationPanel from "@/components/shared/NotificationPanel";
import AideDrawer from "@/components/shared/AideDrawer";
import { cn, formatDate } from "@/utils";
import toast from "react-hot-toast";

// ── Fil d'Ariane automatique ──────────────────────────────────
const BREADCRUMBS: Record<string, string> = {
  dashboard: "Tableau de bord",
  vehicules: "Véhicules",
  chauffeurs: "Chauffeurs",
  affectations: "Affectations",
  checklists: "Checklists",
  signalements: "Signalements",
  maintenances: "Maintenance",
  carburant: "Carburant",
  documents: "Documents",
  "bons-commande": "Bons de commande",
  rapports: "Rapports",
  admin: "Administration",
  nouveau: "Nouveau",
  nouvelle: "Nouvelle",
  stats: "Statistiques",
  dotations: "Dotations",
  profil: "Mon profil",
};

function Breadcrumb() {
  const location = useLocation();
  const parts = location.pathname.split("/").filter(Boolean);

  return (
    <nav className="flex items-center gap-1.5 text-sm">
      {parts.map((part, i) => {
        const isLast = i === parts.length - 1;
        const isId = /^\d+$/.test(part);
        const label = isId ? "#" + part : (BREADCRUMBS[part] ?? part);
        return (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-gray-400">/</span>}
            <span
              className={cn(
                "capitalize",
                isLast ? "text-gray-900 font-medium" : "text-gray-500",
              )}
            >
              {label}
            </span>
          </span>
        );
      })}
    </nav>
  );
}

// ── Topbar ────────────────────────────────────────────────────
export default function Topbar() {
  const navigate = useNavigate();
  const { user, clearAuth } = useAuthStore();
  const { toggleSidebar, toggleMobileSidebar } = useUiStore();
  const { config } = useConfigStore();
  const { nonLues, setNonLues } = useNotificationStore();
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [aideOpen, setAideOpen] = useState(false);

  // Compteur notifications — polling 60s + retry en cas d'échec réseau
  // (évite qu'une requête manquée au montage laisse la cloche à 0 jusqu'au
  // prochain intervalle de 60s, alors que le dropdown refetch toujours
  // une donnée fraîche à l'ouverture)
  const { data: compteurData } = useQuery({
    queryKey: ["notif-compteur"],
    queryFn: () => notificationsApi.compteur().then((r) => r.data.data),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    retry: 3,
    retryDelay: 1_000,
  });

  useEffect(() => {
    if (compteurData?.non_lues !== undefined) {
      setNonLues(compteurData.non_lues);
    }
  }, [compteurData, setNonLues]);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      /* token expiré */
    }
    clearAuth();
    navigate("/login");
    toast.success("Déconnexion réussie.");
  };

  return (
    <>
      <header className="h-16 bg-white border-b border-gray-200 flex items-center px-6 gap-4 flex-shrink-0 z-20 sticky top-0">
        {/* Logo + nom entreprise */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <button onClick={toggleMobileSidebar} className="btn-icon lg:hidden">
            <Menu size={20} />
          </button>
          <button onClick={toggleSidebar} className="btn-icon hidden lg:flex">
            <Menu size={20} />
          </button>
          {config?.logo_url ? (
            <img
              src={config.logo_url}
              alt={config.nom}
              className="h-8 w-auto object-contain max-w-[120px]"
            />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-primary-700 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">
                {(config?.nom ?? "PA").slice(0, 2).toUpperCase()}
              </span>
            </div>
          )}
          <span className="hidden sm:block text-sm font-semibold text-gray-800 truncate max-w-[120px] md:max-w-[160px]">
            {config?.nom ?? "Parc Auto"}
          </span>
        </div>

        {/* Fil d'Ariane */}
        <div className="flex-1 min-w-0">
          <div className="hidden md:block">
            <Breadcrumb />
          </div>
        </div>

        {/* Actions droite */}
        <div className="flex items-center gap-2">
          {/* 💡 Aide contextuelle */}
          <button
            onClick={() => {
              setAideOpen(true);
              setNotifOpen(false);
              setUserOpen(false);
            }}
            className="btn-icon"
            title="Aide et bonnes pratiques"
          >
            <Lightbulb
              size={20}
              className={aideOpen ? "text-yellow-500" : ""}
            />
          </button>

          {/* 🔔 Notifications */}
          <div className="relative">
            <button
              onClick={() => {
                setNotifOpen(!notifOpen);
                setUserOpen(false);
                setAideOpen(false);
              }}
              className="btn-icon relative"
              title="Notifications"
            >
              <Bell size={20} />
              {nonLues > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                  {nonLues > 99 ? "99+" : nonLues}
                </span>
              )}
            </button>
            {notifOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setNotifOpen(false)}
                />
                <NotificationPanel onClose={() => setNotifOpen(false)} />
              </>
            )}
          </div>

          {/* Séparateur */}
          <div className="w-px h-6 bg-gray-200" />

          {/* Menu utilisateur */}
          <div className="relative">
            <button
              onClick={() => {
                setUserOpen(!userOpen);
                setNotifOpen(false);
              }}
              className="flex items-center gap-2 pl-1 pr-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-primary-700 flex items-center justify-center text-white text-sm font-semibold">
                {user?.prenom?.[0]}
                {user?.name?.[0]}
              </div>
              <div className="hidden md:block text-left">
                <div className="text-sm font-medium text-gray-900 leading-tight">
                  {user?.prenom} {user?.name}
                </div>
                <div className="text-xs text-gray-500 capitalize leading-tight">
                  {user?.role?.replace(/_/g, " ")}
                </div>
              </div>
              <ChevronDown size={14} className="text-gray-400" />
            </button>

            {userOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setUserOpen(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                    <div className="text-sm font-medium text-gray-900">
                      {user?.nom_complet}
                    </div>
                    <div className="text-xs text-gray-500">{user?.email}</div>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => {
                        navigate("/profil");
                        setUserOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <User size={15} /> Mon profil
                    </button>
                    <div className="border-t border-gray-100 my-1" />
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut size={15} /> Déconnexion
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 💡 Drawer d'aide contextuelle */}
      <AideDrawer open={aideOpen} onClose={() => setAideOpen(false)} />
    </>
  );
}
