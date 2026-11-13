import { NavLink, useLocation } from "react-router-dom";
import { useState } from "react";
import {
  LayoutDashboard,
  Car,
  Users,
  ArrowLeftRight,
  ClipboardCheck,
  AlertTriangle,
  Wrench,
  Fuel,
  FileText,
  ShoppingCart,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Bell,
  CircleDot,
  History,
  Building2,
  Megaphone,
} from "lucide-react";
import { useUiStore } from "@/stores/uiStore";
import { useAuthStore } from "@/stores/authStore";
import { useAppStore } from "@/stores/appStore";
import { useConfigStore } from "@/stores/configStore";
import { cn } from "@/utils";
import { useQuery } from "@tanstack/react-query";
import { alertesApi } from "@/api/finance.api";
import { authApi } from "@/api/auth.api";
import type { Role } from "@/types";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  iconColor?: string; // couleur du fond de l'icône : ex 'bg-blue-500'
  roles?: Role[];
  children?: { label: string; path: string; roles?: Role[] }[];
}

// ─────────────────────────────────────────────────────────────
// Configuration RBAC — menus par rôle
// ─────────────────────────────────────────────────────────────

const ALL_NAV_ITEMS: NavItem[] = [
  // ── Commun à tous ─────────────────────────────────────────
  {
    label: "Tableau de bord",
    path: "/dashboard",
    icon: <LayoutDashboard size={16} />,
    iconColor: "bg-emerald-500",
  },
  {
    label: "Alertes",
    path: "/alertes",
    icon: <Bell size={16} />,
    iconColor: "bg-red-500",
    roles: ["super_admin", "directeur", "resp_parc", "resp_agence"],
  },

  // ── Terrain ───────────────────────────────────────────────
  {
    label: "Mon véhicule",
    path: "/mon-vehicule",
    icon: <Car size={16} />,
    iconColor: "bg-blue-500",
    roles: ["chauffeur", "attributaire"],
  },
  {
    label: "Checklists",
    path: "/checklists",
    icon: <ClipboardCheck size={16} />,
    iconColor: "bg-teal-500",
    roles: [
      "super_admin",
      "directeur",
      "resp_parc",
      "resp_agence",
      "chauffeur",
      "attributaire",
    ],
  },
  {
    label: "Signalements",
    path: "/signalements",
    icon: <AlertTriangle size={16} />,
    iconColor: "bg-orange-500",
    roles: [
      "super_admin",
      "directeur",
      "resp_parc",
      "resp_agence",
      "chauffeur",
      "attributaire",
    ],
  },
  {
    label: "Affectations",
    path: "/affectations",
    icon: <ArrowLeftRight size={16} />,
    iconColor: "bg-purple-500",
    roles: [
      "super_admin",
      "directeur",
      "resp_parc",
      "resp_agence",
      "chauffeur",
      "attributaire",
    ],
  },

  // ── Gestion du parc ───────────────────────────────────────
  {
    label: "Véhicules",
    path: "/vehicules",
    icon: <Car size={16} />,
    iconColor: "bg-blue-500",
    roles: ["super_admin", "directeur", "resp_parc", "resp_agence"],
  },
  {
    label: "Chauffeurs",
    path: "/chauffeurs",
    icon: <Users size={16} />,
    iconColor: "bg-indigo-500",
    roles: ["super_admin", "directeur", "resp_parc", "resp_agence"],
  },
  {
    label: "Maintenance",
    path: "/maintenances",
    icon: <Wrench size={16} />,
    iconColor: "bg-yellow-500",
    roles: ["super_admin", "directeur", "resp_parc", "resp_agence"],
    children: [
      { label: "Journal", path: "/maintenances" },
      { label: "Statistiques", path: "/maintenances/stats" },
    ],
  },
  {
    label: "Documents",
    path: "/documents",
    icon: <FileText size={16} />,
    iconColor: "bg-cyan-500",
    roles: ["super_admin", "directeur", "resp_parc", "resp_agence"],
  },

  // ── Finance ───────────────────────────────────────────────
  {
    label: "Carburant",
    path: "/carburant",
    icon: <Fuel size={16} />,
    iconColor: "bg-violet-500",
    roles: [
      "super_admin",
      "directeur",
      "resp_parc",
      "resp_agence",
      "comptable",
    ],
    children: [
      { label: "Consommations", path: "/carburant" },
      { label: "Dotations", path: "/carburant/dotations" },
      { label: "Statistiques", path: "/carburant/stats" },
    ],
  },
  {
    label: "Pneumatiques",
    path: "/pneumatiques",
    icon: <CircleDot size={16} />,
    iconColor: "bg-slate-500",
    roles: ["super_admin", "directeur", "resp_parc", "resp_agence"],
    children: [
      { label: "Opérations", path: "/pneumatiques" },
      { label: "Statistiques", path: "/pneumatiques/stats" },
    ],
  },
  {
    label: "Bons de commande",
    path: "/bons-commande",
    icon: <ShoppingCart size={16} />,
    iconColor: "bg-pink-500",
    roles: [
      "super_admin",
      "directeur",
      "resp_parc",
      "resp_agence",
      "comptable",
    ],
  },
  {
    label: "Fournisseurs",
    path: "/fournisseurs",
    icon: <Building2 size={16} />,
    iconColor: "bg-amber-500",
    roles: [
      "super_admin",
      "directeur",
      "resp_parc",
      "resp_agence",
      "comptable",
    ],
  },

  // ── Rapports ──────────────────────────────────────────────
  {
    label: "Rapports",
    path: "/rapports",
    icon: <BarChart3 size={16} />,
    iconColor: "bg-green-500",
    roles: ["super_admin", "directeur", "resp_parc", "comptable"],
    children: [
      { label: "Maintenance", path: "/rapports/maintenance" },
      { label: "Carburant", path: "/rapports/carburant" },
      { label: "TCO Parc", path: "/rapports/tco" },
      { label: "Axes de livraison", path: "/rapports/axes" },
    ],
  },

  // ── Communication ─────────────────────────────────────────
  {
    label: "Communication",
    path: "/communication/annonces",
    icon: <Megaphone size={16} />,
    iconColor: "bg-rose-500",
    roles: [
      "super_admin",
      "directeur",
      "resp_parc",
      "resp_agence",
      "comptable",
    ],
    children: [
      { label: "Annonces", path: "/communication/annonces" },
      { label: "Notes de service", path: "/communication/notes-service" },
      { label: "Historique", path: "/communication/historique" },
    ],
  },

  // ── Audit ─────────────────────────────────────────────────
  {
    label: "Journal d'audit",
    path: "/audit-logs",
    icon: <History size={16} />,
    iconColor: "bg-gray-500",
    roles: [
      "super_admin",
      "directeur",
      "resp_parc",
      "resp_agence",
      "comptable",
    ],
  },

  // ── Administration ────────────────────────────────────────
  {
    label: "Administration",
    path: "/admin",
    icon: <Settings size={16} />,
    iconColor: "bg-gray-600",
    roles: ["super_admin", "directeur"],
    children: [
      { label: "Utilisateurs", path: "/admin" },
      { label: "Axes de livraison", path: "/admin/axes-livraison" },
      { label: "Configuration", path: "/admin/config", roles: ["super_admin"] },
    ],
  },
];

// ─────────────────────────────────────────────────────────────
// Groupes de sections avec labels
// ─────────────────────────────────────────────────────────────

interface NavGroup {
  label: string;
  paths: string[]; // first path of each item in this group
}

const NAV_GROUPS: NavGroup[] = [
  { label: "GÉNÉRAL", paths: ["/dashboard", "/alertes", "/mon-vehicule"] },
  {
    label: "OPÉRATIONS",
    paths: [
      "/checklists",
      "/signalements",
      "/affectations",
      "/vehicules",
      "/chauffeurs",
      "/maintenances",
      "/documents",
    ],
  },
  {
    label: "FINANCE",
    paths: ["/carburant", "/pneumatiques", "/bons-commande", "/fournisseurs"],
  },
  {
    label: "ANALYTIQUE",
    paths: ["/rapports", "/communication/annonces", "/audit-logs"],
  },
  { label: "SYSTÈME", paths: ["/admin"] },
];

function getGroupLabel(path: string, items: NavItem[]): string | null {
  const idx = items.findIndex((i) => i.path === path);
  if (idx === 0) return null; // first group has no separator

  // Check if this path starts a new group
  for (const g of NAV_GROUPS) {
    if (g.paths[0] === path) return g.label;
    // find first path of group that appears in visible items
    const firstVisible = g.paths.find((p) => items.some((i) => i.path === p));
    if (firstVisible === path) return g.label;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────
// SidebarItem
// ─────────────────────────────────────────────────────────────

function SidebarItem({
  item,
  collapsed,
}: {
  item: NavItem;
  collapsed: boolean;
}) {
  const location = useLocation();
  const { role } = useAuthStore();

  const [open, setOpen] = useState(
    () =>
      item.children?.some(
        (c) =>
          location.pathname === c.path ||
          (c.path !== item.path && location.pathname.startsWith(c.path + "/")),
      ) ?? false,
  );

  const isActive = item.children
    ? item.children.some(
        (c) =>
          location.pathname === c.path ||
          (c.path !== item.path && location.pathname.startsWith(c.path + "/")),
      )
    : location.pathname === item.path ||
      (item.path !== "/dashboard" &&
        location.pathname.startsWith(item.path + "/")) ||
      (item.path === "/mon-vehicule" &&
        location.pathname.startsWith("/vehicules/"));

  // Icône colorée uniquement si actif, sinon transparente avec icône blanche
  const iconBox = (
    <span
      className={cn(
        "flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all",
        isActive
          ? cn("text-white", item.iconColor ?? "bg-primary-500")
          : "bg-transparent text-primary-300 group-hover:text-white",
      )}
    >
      {item.icon}
    </span>
  );

  if (item.children) {
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className={cn(
            "group flex items-center gap-3 w-full rounded-xl transition-all duration-150",
            collapsed ? "justify-center p-2" : "px-3 py-2",
            isActive ? "bg-white/10" : "hover:bg-white/5",
          )}
          title={collapsed ? item.label : undefined}
        >
          {iconBox}
          {!collapsed && (
            <>
              <span
                className={cn(
                  "flex-1 text-left text-sm font-medium",
                  isActive
                    ? "text-white"
                    : "text-primary-200 group-hover:text-white",
                )}
              >
                {item.label}
              </span>
              <span
                className={cn(
                  "text-primary-400",
                  isActive && "text-primary-200",
                )}
              >
                {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </span>
            </>
          )}
        </button>

        {!collapsed && open && (
          <div className="ml-10 mt-1 space-y-0.5">
            {item.children
              .filter(
                (child) => !child.roles || child.roles.includes(role as Role),
              )
              .map((child) => {
                const needsEnd =
                  item.children!.filter(
                    (c) =>
                      c.path !== child.path && c.path.startsWith(child.path),
                  ).length > 0;
                return (
                  <NavLink
                    key={child.path}
                    to={child.path}
                    end={needsEnd}
                    className={({ isActive }) =>
                      cn(
                        "block px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                        isActive
                          ? "text-white bg-white/10"
                          : "text-primary-300 hover:text-white hover:bg-white/5",
                      )
                    }
                  >
                    {child.label}
                  </NavLink>
                );
              })}
          </div>
        )}
      </div>
    );
  }

  return (
    <NavLink
      to={item.path}
      end={item.path === "/dashboard"}
      title={collapsed ? item.label : undefined}
      className={({ isActive: active }) =>
        cn(
          "group flex items-center gap-3 rounded-xl transition-all duration-150",
          collapsed ? "justify-center p-2" : "px-3 py-2",
          active || isActive ? "bg-white/10" : "hover:bg-white/5",
        )
      }
    >
      {iconBox}
      {!collapsed && (
        <span
          className={cn(
            "flex-1 text-sm font-medium transition-colors",
            isActive ? "text-white" : "text-primary-200 group-hover:text-white",
          )}
        >
          {item.label}
        </span>
      )}
    </NavLink>
  );
}

// ─────────────────────────────────────────────────────────────
// Sidebar
// ─────────────────────────────────────────────────────────────

export default function Sidebar() {
  const {
    sidebarCollapsed,
    setSidebarCollapsed,
    sidebarMobileOpen,
    closeMobileSidebar,
  } = useUiStore();
  const { appName } = useAppStore();
  const { config } = useConfigStore();
  const { user, role, hasRole, setUser } = useAuthStore();

  const { data: meData } = useQuery({
    queryKey: ["me-vehicules-actifs"],
    queryFn: () =>
      authApi.me().then((r) => {
        setUser(r.data.data);
        return r.data.data;
      }),
    enabled: role === "chauffeur",
    staleTime: 30_000,
  });
  const nbVehiculesActifs =
    (meData ?? user)?.chauffeur?.vehicules_actifs?.length ?? 0;

  const { data: alertesData } = useQuery({
    queryKey: ["alertes-non-lues"],
    queryFn: () => alertesApi.nonLues().then((r) => r.data),
    refetchInterval: 2 * 60 * 1000,
    enabled: hasRole("super_admin", "directeur", "resp_parc", "resp_agence"),
  });
  const nbAlertes = alertesData?.data?.total ?? 0;

  // Filtrage RBAC
  const baseItems = ALL_NAV_ITEMS.filter((item) => {
    if (!item.roles) return true;
    if (!role) return false;
    return item.roles.includes(role);
  });

  const visibleItems =
    role === "chauffeur" && config?.chauffeur_peut_saisir_carburant
      ? [
          ...baseItems,
          {
            label: "Carburant",
            path: "/carburant",
            icon: <Fuel size={16} />,
            iconColor: "bg-violet-500",
            roles: ["chauffeur"] as Role[],
          } as NavItem,
        ]
      : baseItems;

  // Labels chauffeur
  const LABELS_CHAUFFEUR: Record<string, string> = {
    "/mon-vehicule": nbVehiculesActifs > 1 ? "Mes véhicules" : "Mon véhicule",
    "/checklists": "Mes checklists",
    "/signalements": "Mes signalements",
    "/affectations": "Mes affectations",
    "/carburant": "Mes pleins",
  };

  const finalItems =
    role === "chauffeur"
      ? visibleItems.map((item) =>
          LABELS_CHAUFFEUR[item.path]
            ? { ...item, label: LABELS_CHAUFFEUR[item.path] }
            : item,
        )
      : visibleItems;

  const ROLE_LABELS: Partial<Record<Role, string>> = {
    super_admin: "Super Admin",
    directeur: "Directeur",
    resp_parc: "Resp. Parc",
    resp_agence: "Resp. Agence",
    chauffeur: "Chauffeur",
    attributaire: "Attributaire",
    comptable: "Comptable",
  };

  return (
    <>
      {/* Overlay mobile */}
      {sidebarMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={closeMobileSidebar}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 h-full flex flex-col z-40 transition-all duration-300",
          "bg-primary-800 shadow-xl",
          sidebarCollapsed ? "w-16" : "w-64",
          sidebarMobileOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0",
        )}
      >
        {/* ── Logo / Header ── */}
        <div
          className={cn(
            "flex items-center h-16 px-4 flex-shrink-0 border-b border-white/5",
            sidebarCollapsed ? "justify-center" : "justify-between",
          )}
        >
          {!sidebarCollapsed && (
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden shadow">
                {config?.logo_app_url ? (
                  <img
                    src={config.logo_app_url}
                    alt={appName}
                    className="w-full h-full object-contain p-0.5"
                  />
                ) : (
                  <Car size={16} className="text-primary-700" />
                )}
              </div>
              <div className="min-w-0">
                <div className="text-white font-bold text-sm leading-tight truncate">
                  {appName}
                </div>
                <div className="text-primary-400 text-[10px] truncate">
                  {user?.agence?.nom ?? "Gestion du parc"}
                </div>
              </div>
            </div>
          )}

          {sidebarCollapsed && (
            <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center overflow-hidden shadow">
              {config?.logo_app_url ? (
                <img
                  src={config.logo_app_url}
                  alt={appName}
                  className="w-full h-full object-contain p-0.5"
                />
              ) : (
                <Car size={16} className="text-primary-700" />
              )}
            </div>
          )}

          {!sidebarCollapsed && (
            <button
              onClick={() => setSidebarCollapsed(true)}
              className="p-1.5 rounded-lg text-primary-400 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
            >
              <ChevronLeft size={16} />
            </button>
          )}
        </div>

        {/* Bouton expand (mode collapsed) */}
        {sidebarCollapsed && (
          <button
            onClick={() => setSidebarCollapsed(false)}
            className="mx-auto mt-3 p-1.5 rounded-lg text-primary-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        )}

        {/* ── Navigation ── */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5 scrollbar-thin">
          {finalItems.map((item, idx) => {
            const groupLabel = !sidebarCollapsed
              ? getGroupLabel(item.path, finalItems)
              : null;
            return (
              <div key={item.path + idx}>
                {/* Label de groupe */}
                {groupLabel && idx > 0 && (
                  <div className="pt-4 pb-1.5 px-3">
                    <span className="text-[10px] font-semibold text-primary-500 tracking-widest uppercase">
                      {groupLabel}
                    </span>
                  </div>
                )}
                <SidebarItem item={item} collapsed={sidebarCollapsed} />
              </div>
            );
          })}
        </nav>

        {/* ── Badge alertes ── */}
        {nbAlertes > 0 &&
          !sidebarCollapsed &&
          hasRole("super_admin", "directeur", "resp_parc", "resp_agence") && (
            <div className="mx-3 mb-2 px-3 py-2 bg-red-500/20 border border-red-500/30 rounded-xl flex items-center gap-2">
              <AlertTriangle size={13} className="text-red-400 flex-shrink-0" />
              <span className="text-red-300 text-xs font-medium">
                {nbAlertes} alerte(s) active(s)
              </span>
            </div>
          )}

        {/* ── Footer utilisateur ── */}
        <div className="border-t border-white/5 p-3 flex-shrink-0">
          {sidebarCollapsed ? (
            <div className="flex justify-center">
              <div className="w-8 h-8 rounded-xl bg-primary-600 flex items-center justify-center text-white text-xs font-bold shadow">
                {user?.prenom?.[0]}
                {user?.name?.[0]}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 px-1">
              <div className="w-8 h-8 rounded-xl bg-primary-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow">
                {user?.prenom?.[0]}
                {user?.name?.[0]}
              </div>
              <div className="min-w-0">
                <div className="text-white text-xs font-semibold truncate">
                  {user?.prenom} {user?.name}
                </div>
                <div className="text-primary-400 text-[10px] truncate">
                  {role ? (ROLE_LABELS[role] ?? role) : "—"}
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
