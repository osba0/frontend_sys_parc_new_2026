import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import AppLayout from "@/layouts/components/AppLayout";
import AuthLayout from "@/layouts/components/AuthLayout";
import ProtectedRoute from "./ProtectedRoute";
import LoadingPage from "@/components/shared/LoadingPage";
import RouterErrorPage from "@/pages/RouterErrorPage";
import { useAuthStore } from "@/stores/authStore";

// ─────────────────────────────────────────────────────────────
// Lazy loading — chemin vérifié contre src/pages/**
// ─────────────────────────────────────────────────────────────

// Auth
const LoginPage = lazy(() => import("@/pages/Auth/LoginPage"));
const ProfilePage = lazy(() => import("@/pages/Auth/ProfilePage"));
const AlertesPageLazy = lazy(() => import("@/pages/Alertes/AlertesPage"));

// Dashboard
const Dashboard = lazy(() => import("@/pages/Dashboard/DashboardPage"));

// Véhicules
const VehiculeList = lazy(() => import("@/pages/Vehicules/VehiculeListPage"));
const VehiculeDetail = lazy(
  () => import("@/pages/Vehicules/VehiculeDetailPage"),
);
const VehiculeDetailChauffeur = lazy(
  () => import("@/pages/Vehicules/VehiculeDetailChauffeurPage"),
);
const VehiculeFicheVie = lazy(
  () => import("@/pages/Vehicules/VehiculeFicheViePage"),
);
const VehiculeForm = lazy(() => import("@/pages/Vehicules/VehiculeFormPage"));
const MonVehicule = lazy(() => import("@/pages/Vehicules/MonVehiculePage"));

// ── Dispatcher RBAC pour /vehicules/:id ──────────────────────
// Chauffeur/attributaire → vue minimaliste
// Autres rôles           → vue complète gestionnaire
function VehiculeDetailRouter() {
  const { role } = useAuthStore();
  const isTerrain = role === "chauffeur" || role === "attributaire";
  return (
    <Suspense fallback={<LoadingPage />}>
      {isTerrain ? <VehiculeDetailChauffeur /> : <VehiculeDetail />}
    </Suspense>
  );
}

// Chauffeurs
const ChauffeurList = lazy(
  () => import("@/pages/Chauffeurs/ChauffeurListPage"),
);
const ChauffeurDetail = lazy(
  () => import("@/pages/Chauffeurs/ChauffeurDetailPage"),
);
const ChauffeurForm = lazy(
  () => import("@/pages/Chauffeurs/ChauffeurFormPage"),
);

// Affectations
const AffectationList = lazy(
  () => import("@/pages/Affectations/AffectationListPage"),
);
const AffectationForm = lazy(
  () => import("@/pages/Affectations/AffectationFormPage"),
);

// Checklists
const ChecklistList = lazy(
  () => import("@/pages/Checklists/ChecklistListPage"),
);
const ChecklistDetail = lazy(
  () => import("@/pages/Checklists/ChecklistDetailPage"),
);

// Signalements
const SignalementList = lazy(
  () => import("@/pages/Signalements/SignalementListPage"),
);
const SignalementDetail = lazy(
  () => import("@/pages/Signalements/SignalementDetailPage"),
);
const SignalementForm = lazy(
  () => import("@/pages/Signalements/SignalementFormPage"),
);

// Maintenance
const MaintenanceList = lazy(
  () => import("@/pages/Maintenance/MaintenanceListPage"),
);
const MaintenanceForm = lazy(
  () => import("@/pages/Maintenance/MaintenanceFormPage"),
);
const MaintenanceDetail = lazy(
  () => import("@/pages/Maintenance/MaintenanceDetailPage"),
);
const MaintenanceStats = lazy(
  () => import("@/pages/Maintenance/MaintenanceStatsPage"),
);

// Carburant
const CarburantList = lazy(() => import("@/pages/Carburant/CarburantListPage"));
const CarburantForm = lazy(() => import("@/pages/Carburant/CarburantFormPage"));
const CarburantDotations = lazy(
  () => import("@/pages/Carburant/CarburantDotationsPage"),
);
const CarburantStats = lazy(
  () => import("@/pages/Carburant/CarburantStatsPage"),
);
const PneumatiqueList = lazy(
  () => import("@/pages/Pneumatiques/PneumatiqueListPage"),
);
const PneumatiqueForm = lazy(
  () => import("@/pages/Pneumatiques/PneumatiqueFormPage"),
);
const PneumatiqueStats = lazy(
  () => import("@/pages/Pneumatiques/PneumatiqueStatsPage"),
);
const PneumatiqueDetail = lazy(
  () => import("@/pages/Pneumatiques/PneumatiqueDetailPage"),
);
const FournisseurList = lazy(
  () => import("@/pages/Fournisseurs/FournisseurListPage"),
);
const FournisseurForm = lazy(
  () => import("@/pages/Fournisseurs/FournisseurFormPage"),
);
const FournisseurDetail = lazy(
  () => import("@/pages/Fournisseurs/FournisseurDetailPage"),
);
const CommunicationList = lazy(
  () => import("@/pages/Communication/CommunicationListPage"),
);
const CommunicationForm = lazy(
  () => import("@/pages/Communication/CommunicationFormPage"),
);
const CommunicationHistorique = lazy(
  () => import("@/pages/Communication/CommunicationHistoriquePage"),
);

// Documents
const DocumentList = lazy(() => import("@/pages/Documents/DocumentListPage"));

// Bons de commande
const BonCommandeList = lazy(
  () => import("@/pages/BonsCommande/BonCommandeListPage"),
);
const BonCommandeForm = lazy(
  () => import("@/pages/BonsCommande/BonCommandeFormPage"),
);
const BonCommandeDetail = lazy(
  () => import("@/pages/BonsCommande/BonCommandeDetailPage"),
);

// Rapports
const RapportMaintenance = lazy(
  () => import("@/pages/Rapports/RapportMaintenancePage"),
);
const RapportCarburant = lazy(
  () => import("@/pages/Rapports/RapportCarburantPage"),
);
const RapportTco = lazy(() => import("@/pages/Rapports/RapportTcoPage"));
const RapportAxes = lazy(() => import("@/pages/Rapports/RapportAxesPage"));

// Administration
const AdminUsers = lazy(() => import("@/pages/Admin/AdminUsersPage"));
const AdminConfig = lazy(() => import("@/pages/Admin/AdminConfigPage"));
const AuditLog = lazy(() => import("@/pages/Admin/AuditLogPage"));
const AxesLivraison = lazy(() => import("@/pages/Admin/AxesLivraisonPage"));

// Utilitaires
const NotFound = lazy(() => import("@/pages/NotFoundPage"));

// ─────────────────────────────────────────────────────────────
// Wrapper Suspense
// ─────────────────────────────────────────────────────────────

const S = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<LoadingPage />}>{children}</Suspense>
);

// ─────────────────────────────────────────────────────────────
// Groupes de rôles — source de vérité unique
// ─────────────────────────────────────────────────────────────

type RoleList = readonly string[];

const GESTIONNAIRES: RoleList = [
  "super_admin",
  "directeur",
  "resp_parc",
  "resp_agence",
];
const FINANCES: RoleList = [
  "super_admin",
  "directeur",
  "resp_parc",
  "resp_agence",
  "comptable",
];
const FINANCES_ET_CHAUFFEUR: RoleList = [
  "super_admin",
  "directeur",
  "resp_parc",
  "resp_agence",
  "comptable",
  "chauffeur",
];
const TERRAIN: RoleList = [
  "super_admin",
  "directeur",
  "resp_parc",
  "resp_agence",
  "chauffeur",
  "attributaire",
];
const DIRECTION: RoleList = ["super_admin", "directeur"];
const RAPPORTS_ROLES: RoleList = [
  "super_admin",
  "directeur",
  "resp_parc",
  "comptable",
];
const TOUS_ROLES: RoleList = [
  "super_admin",
  "directeur",
  "resp_parc",
  "resp_agence",
  "comptable",
  "chauffeur",
  "attributaire",
];

// ─────────────────────────────────────────────────────────────
// Helper — wrapping ProtectedRoute conditionnel
// P(roles, element) → protège si roles défini, sinon passe-plat
// ─────────────────────────────────────────────────────────────

const P = (roles: RoleList, element: React.ReactNode) => (
  <ProtectedRoute roles={roles as any}>{element}</ProtectedRoute>
);

// ─────────────────────────────────────────────────────────────
// Router
// ─────────────────────────────────────────────────────────────

export const router = createBrowserRouter([
  // ── Authentification (layout sans sidebar) ─────────────────
  {
    element: <AuthLayout />,
    errorElement: <RouterErrorPage />,
    children: [
      {
        path: "/login",
        element: (
          <S>
            <LoginPage />
          </S>
        ),
      },
    ],
  },

  // ── Application (layout avec sidebar, auth obligatoire) ────
  {
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    errorElement: <RouterErrorPage />,
    children: [
      // Redirection racine
      { index: true, element: <Navigate to="/dashboard" replace /> },

      // ── Commun à tous les rôles ───────────────────────────
      {
        path: "/dashboard",
        element: (
          <S>
            <Dashboard />
          </S>
        ),
      },
      {
        path: "/profil",
        element: (
          <S>
            <ProfilePage />
          </S>
        ),
      },
      {
        path: "/alertes",
        element: (
          <S>
            <AlertesPageLazy />
          </S>
        ),
      },

      // Signalements — accessible à tous (chauffeur peut signaler)
      {
        path: "/signalements",
        element: P(
          TERRAIN,
          <S>
            <SignalementList />
          </S>,
        ),
      },
      {
        path: "/signalements/nouveau",
        element: P(
          TERRAIN,
          <S>
            <SignalementForm />
          </S>,
        ),
      },
      {
        path: "/signalements/:id",
        element: P(
          TERRAIN,
          <S>
            <SignalementDetail />
          </S>,
        ),
      },

      // Checklists — terrain (gestionnaires + chauffeur)
      {
        path: "/checklists",
        element: P(
          TERRAIN,
          <S>
            <ChecklistList />
          </S>,
        ),
      },
      {
        path: "/checklists/:id",
        element: P(
          TERRAIN,
          <S>
            <ChecklistDetail />
          </S>,
        ),
      },

      // Affectations — terrain (gestionnaires + chauffeur peut voir les siennes)
      {
        path: "/affectations",
        element: P(
          TERRAIN,
          <S>
            <AffectationList />
          </S>,
        ),
      },
      {
        path: "/affectations/nouvelle",
        element: P(
          GESTIONNAIRES,
          <S>
            <AffectationForm />
          </S>,
        ),
      },

      // ── Gestionnaires (resp_parc, resp_agence, directeur, super_admin) ──
      {
        path: "/vehicules",
        element: P(
          GESTIONNAIRES,
          <S>
            <VehiculeList />
          </S>,
        ),
      },
      {
        path: "/vehicules/:id/fiche-vie",
        element: P(
          GESTIONNAIRES,
          <S>
            <VehiculeFicheVie />
          </S>,
        ),
      },
      {
        path: "/vehicules/nouveau",
        element: P(
          GESTIONNAIRES,
          <S>
            <VehiculeForm />
          </S>,
        ),
      },
      {
        path: "/mon-vehicule",
        element: P(
          TERRAIN,
          <S>
            <MonVehicule />
          </S>,
        ),
      },
      {
        path: "/vehicules/:id",
        element: (
          <ProtectedRoute>
            <VehiculeDetailRouter />
          </ProtectedRoute>
        ),
      },
      {
        path: "/vehicules/:id/modifier",
        element: P(
          GESTIONNAIRES,
          <S>
            <VehiculeForm />
          </S>,
        ),
      },

      {
        path: "/chauffeurs",
        element: P(
          GESTIONNAIRES,
          <S>
            <ChauffeurList />
          </S>,
        ),
      },
      {
        path: "/chauffeurs/nouveau",
        element: P(
          GESTIONNAIRES,
          <S>
            <ChauffeurForm />
          </S>,
        ),
      },
      {
        path: "/chauffeurs/:id",
        element: P(
          GESTIONNAIRES,
          <S>
            <ChauffeurDetail />
          </S>,
        ),
      },
      {
        path: "/chauffeurs/:id/modifier",
        element: P(
          GESTIONNAIRES,
          <S>
            <ChauffeurForm />
          </S>,
        ),
      },

      {
        path: "/maintenances",
        element: P(
          GESTIONNAIRES,
          <S>
            <MaintenanceList />
          </S>,
        ),
      },
      {
        path: "/maintenances/nouvelle",
        element: P(
          GESTIONNAIRES,
          <S>
            <MaintenanceForm />
          </S>,
        ),
      },
      {
        path: "/maintenances/stats",
        element: P(
          GESTIONNAIRES,
          <S>
            <MaintenanceStats />
          </S>,
        ),
      },
      {
        path: "/maintenances/:id",
        element: P(
          GESTIONNAIRES,
          <S>
            <MaintenanceDetail />
          </S>,
        ),
      },
      {
        path: "/maintenances/:id/modifier",
        element: P(
          GESTIONNAIRES,
          <S>
            <MaintenanceForm />
          </S>,
        ),
      },

      {
        path: "/documents",
        element: P(
          GESTIONNAIRES,
          <S>
            <DocumentList />
          </S>,
        ),
      },

      // ── Finances (gestionnaires + comptable) ─────────────
      {
        path: "/carburant",
        element: P(
          FINANCES_ET_CHAUFFEUR,
          <S>
            <CarburantList />
          </S>,
        ),
      },
      {
        path: "/carburant/nouveau",
        element: P(
          FINANCES_ET_CHAUFFEUR,
          <S>
            <CarburantForm />
          </S>,
        ),
      },
      {
        path: "/carburant/dotations",
        element: P(
          FINANCES,
          <S>
            <CarburantDotations />
          </S>,
        ),
      },
      {
        path: "/carburant/stats",
        element: P(
          FINANCES,
          <S>
            <CarburantStats />
          </S>,
        ),
      },

      // ── Pneumatiques (gestionnaires) ──────────────────────
      {
        path: "/pneumatiques",
        element: P(
          GESTIONNAIRES,
          <S>
            <PneumatiqueList />
          </S>,
        ),
      },
      {
        path: "/pneumatiques/nouveau",
        element: P(
          GESTIONNAIRES,
          <S>
            <PneumatiqueForm />
          </S>,
        ),
      },
      {
        path: "/pneumatiques/stats",
        element: P(
          GESTIONNAIRES,
          <S>
            <PneumatiqueStats />
          </S>,
        ),
      },
      {
        path: "/pneumatiques/:id",
        element: P(
          GESTIONNAIRES,
          <S>
            <PneumatiqueDetail />
          </S>,
        ),
      },
      {
        path: "/pneumatiques/:id/modifier",
        element: P(
          GESTIONNAIRES,
          <S>
            <PneumatiqueForm />
          </S>,
        ),
      },

      // ── Fournisseurs (gestionnaires) ──────────────────────
      {
        path: "/fournisseurs",
        element: P(
          GESTIONNAIRES,
          <S>
            <FournisseurList />
          </S>,
        ),
      },
      {
        path: "/fournisseurs/nouveau",
        element: P(
          GESTIONNAIRES,
          <S>
            <FournisseurForm />
          </S>,
        ),
      },
      {
        path: "/fournisseurs/:id",
        element: P(
          GESTIONNAIRES,
          <S>
            <FournisseurDetail />
          </S>,
        ),
      },
      {
        path: "/fournisseurs/:id/modifier",
        element: P(
          GESTIONNAIRES,
          <S>
            <FournisseurForm />
          </S>,
        ),
      },

      // ── Communication (tous rôles — gestion scopée par policy backend) ──
      {
        path: "/communication/annonces",
        element: P(
          TOUS_ROLES,
          <S>
            <CommunicationList type="annonce" />
          </S>,
        ),
      },
      {
        path: "/communication/annonces/nouveau",
        element: P(
          GESTIONNAIRES,
          <S>
            <CommunicationForm />
          </S>,
        ),
      },
      {
        path: "/communication/notes-service",
        element: P(
          TOUS_ROLES,
          <S>
            <CommunicationList type="note_service" />
          </S>,
        ),
      },
      {
        path: "/communication/notes-service/nouveau",
        element: P(
          GESTIONNAIRES,
          <S>
            <CommunicationForm />
          </S>,
        ),
      },
      {
        path: "/communication/edit/:id",
        element: P(
          GESTIONNAIRES,
          <S>
            <CommunicationForm />
          </S>,
        ),
      },
      {
        path: "/communication/historique",
        element: P(
          TOUS_ROLES,
          <S>
            <CommunicationHistorique />
          </S>,
        ),
      },

      {
        path: "/bons-commande",
        element: P(
          FINANCES,
          <S>
            <BonCommandeList />
          </S>,
        ),
      },
      {
        path: "/bons-commande/nouveau",
        element: P(
          FINANCES,
          <S>
            <BonCommandeForm />
          </S>,
        ),
      },
      {
        path: "/bons-commande/:id",
        element: P(
          FINANCES,
          <S>
            <BonCommandeDetail />
          </S>,
        ),
      },
      {
        path: "/bons-commande/:id/modifier",
        element: P(
          FINANCES,
          <S>
            <BonCommandeForm />
          </S>,
        ),
      },

      // ── Rapports (direction + comptable + resp_parc) ─────
      {
        path: "/rapports/maintenance",
        element: P(
          RAPPORTS_ROLES,
          <S>
            <RapportMaintenance />
          </S>,
        ),
      },
      {
        path: "/rapports/carburant",
        element: P(
          RAPPORTS_ROLES,
          <S>
            <RapportCarburant />
          </S>,
        ),
      },
      {
        path: "/rapports/tco",
        element: P(
          RAPPORTS_ROLES,
          <S>
            <RapportTco />
          </S>,
        ),
      },
      {
        path: "/rapports/axes",
        element: P(
          RAPPORTS_ROLES,
          <S>
            <RapportAxes />
          </S>,
        ),
      },

      // ── Administration (direction uniquement) ────────────
      {
        path: "/admin",
        element: P(
          DIRECTION,
          <S>
            <AdminUsers />
          </S>,
        ),
      },
      {
        path: "/admin/config",
        element: P(
          ["super_admin"],
          <S>
            <AdminConfig />
          </S>,
        ),
      },
      {
        path: "/audit-logs",
        element: P(
          TOUS_ROLES,
          <S>
            <AuditLog />
          </S>,
        ),
      },
      {
        path: "/admin/axes-livraison",
        element: P(
          DIRECTION,
          <S>
            <AxesLivraison />
          </S>,
        ),
      },
    ],
  },

  // ── 404 ────────────────────────────────────────────────────
  {
    path: "*",
    element: (
      <S>
        <NotFound />
      </S>
    ),
    errorElement: <RouterErrorPage />,
  },
]);
