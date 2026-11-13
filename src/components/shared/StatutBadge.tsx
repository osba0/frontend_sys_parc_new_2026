import { cn } from "@/utils";
import type {
  StatutVehicule,
  StatutChauffeur,
  StatutDocument,
  NiveauAlerte,
  Gravite,
  TypeVehicule,
  TypeOperationPneu,
} from "@/types";

interface BadgeProps {
  className?: string;
}

// ── Statut Véhicule ───────────────────────────────────────────
export function StatutVehiculeBadge({
  statut,
  className,
}: { statut: StatutVehicule } & BadgeProps) {
  const styles: Record<StatutVehicule, string> = {
    actif: "badge-success",
    en_panne: "badge-danger",
    en_maintenance: "badge-warning",
    en_mission: "badge-info",
    cede: "badge-gray",
    hors_service: "badge-gray",
  };
  const labels: Record<StatutVehicule, string> = {
    actif: "Actif",
    en_panne: "En panne",
    en_maintenance: "En maintenance",
    en_mission: "En mission",
    cede: "Cédé",
    hors_service: "Hors service",
  };
  return (
    <span className={cn("badge", styles[statut], className)}>
      {labels[statut]}
    </span>
  );
}

// ── Type Véhicule ─────────────────────────────────────────────
export function TypeVehiculeBadge({
  type,
  className,
}: { type: TypeVehicule } & BadgeProps) {
  const styles: Record<TypeVehicule, string> = {
    livraison: "badge-info",
    administratif: "badge-gray",
    scooter: "badge-warning",
  };
  const labels: Record<TypeVehicule, string> = {
    livraison: "Livraison",
    administratif: "Administratif",
    scooter: "Scooter",
  };
  return (
    <span className={cn("badge", styles[type], className)}>{labels[type]}</span>
  );
}

// ── Statut Document ───────────────────────────────────────────
export function StatutDocumentBadge({
  statut,
  jours,
  className,
}: { statut: StatutDocument; jours?: number | null } & BadgeProps) {
  const styles: Record<StatutDocument, string> = {
    valide: "badge-success",
    warning: "badge-warning",
    critique: "badge-danger",
    expire: "badge-danger",
    inconnu: "badge-gray",
  };
  let label = {
    valide: "Valide",
    warning: "Attention",
    critique: "Critique",
    expire: "Expiré",
    inconnu: "—",
  }[statut];
  if (jours !== null && jours !== undefined) {
    if (statut === "expire") label += ` (${Math.abs(jours)}j)`;
    if (statut !== "valide" && statut !== "expire") label += ` (${jours}j)`;
  }
  return (
    <span className={cn("badge", styles[statut], className)}>{label}</span>
  );
}

// ── Niveau Alerte ─────────────────────────────────────────────
export function NiveauAlerteBadge({
  niveau,
  className,
}: { niveau: NiveauAlerte } & BadgeProps) {
  const styles: Record<NiveauAlerte, string> = {
    danger: "badge-danger",
    warning: "badge-warning",
    info: "badge-info",
  };
  return (
    <span className={cn("badge", styles[niveau], className)}>
      {niveau.toUpperCase()}
    </span>
  );
}

// ── Gravité Signalement ───────────────────────────────────────
export function GraviteBadge({
  gravite,
  className,
}: { gravite: Gravite } & BadgeProps) {
  const styles: Record<Gravite, string> = {
    critique: "badge-danger",
    haute: "badge-danger",
    moyenne: "badge-warning",
    faible: "badge-info",
  };
  const labels: Record<Gravite, string> = {
    critique: "Critique",
    haute: "Haute",
    moyenne: "Moyenne",
    faible: "Faible",
  };
  return (
    <span className={cn("badge", styles[gravite], className)}>
      {labels[gravite]}
    </span>
  );
}

// ── Statut Maintenance ────────────────────────────────────────
export function StatutMaintenanceBadge({
  statut,
  className,
}: { statut: string } & BadgeProps) {
  const map: Record<string, [string, string]> = {
    planifie: ["badge-info", "Planifié"],
    en_cours: ["badge-warning", "En cours"],
    termine: ["badge-success", "Terminé"],
    annule: ["badge-gray", "Annulé"],
  };
  const [style, label] = map[statut] ?? ["badge-gray", statut];
  return <span className={cn("badge", style, className)}>{label}</span>;
}

// ── Statut Bon de Commande ────────────────────────────────────
export function StatutBCBadge({
  statut,
  className,
}: { statut: string } & BadgeProps) {
  const map: Record<string, [string, string]> = {
    brouillon: ["badge-gray", "Brouillon"],
    soumis: ["badge-info", "Soumis"],
    approuve: ["badge-success", "Approuvé"],
    rejete: ["badge-danger", "Rejeté"],
    execute: ["badge-success", "Exécuté"],
    annule: ["badge-gray", "Annulé"],
  };
  const [style, label] = map[statut] ?? ["badge-gray", statut];
  return <span className={cn("badge", style, className)}>{label}</span>;
}

// ── Statut Checklist ──────────────────────────────────────────
export function StatutChecklistBadge({
  statut,
  className,
}: { statut: string } & BadgeProps) {
  const map: Record<string, [string, string]> = {
    brouillon: ["badge-gray", "Brouillon"],
    soumis: ["badge-info", "Soumis"],
    valide: ["badge-success", "Validé"],
    rejete: ["badge-danger", "Rejeté"],
  };
  const [style, label] = map[statut] ?? ["badge-gray", statut];
  return <span className={cn("badge", style, className)}>{label}</span>;
}

// ── Résultat Checklist ────────────────────────────────────────
export function ResultatChecklistBadge({
  resultat,
  className,
}: { resultat: string } & BadgeProps) {
  const map: Record<string, [string, string]> = {
    conforme: ["badge-success", "✓ Conforme"],
    non_conforme: ["badge-danger", "✗ Non conforme"],
    en_attente: ["badge-gray", "En attente"],
  };
  const [style, label] = map[resultat] ?? ["badge-gray", resultat];
  return <span className={cn("badge", style, className)}>{label}</span>;
}

// ── Type Opération Pneumatique ──────────────────────────────────
export function TypeOperationPneuBadge({
  type,
  className,
}: { type: TypeOperationPneu } & BadgeProps) {
  const styles: Record<TypeOperationPneu, string> = {
    achat_neuf: "badge-success",
    rechape: "badge-info",
    rotation: "badge-gray",
    reparation: "badge-warning",
    reforme: "badge-danger",
  };
  const labels: Record<TypeOperationPneu, string> = {
    achat_neuf: "Achat neuf",
    rechape: "Rechapé",
    rotation: "Rotation",
    reparation: "Réparation",
    reforme: "Réforme",
  };
  return (
    <span className={cn("badge", styles[type], className)}>{labels[type]}</span>
  );
}

// ── Type Fournisseur ─────────────────────────────────────────
const TYPE_FOURNISSEUR_STYLES: Record<string, string> = {
  garage: "bg-blue-50 text-blue-700",
  concessionnaire: "bg-indigo-50 text-indigo-700",
  pneu: "bg-gray-50 text-gray-700",
  carburant: "bg-purple-50 text-purple-700",
  carrosserie: "bg-orange-50 text-orange-700",
  electricite: "bg-yellow-50 text-yellow-700",
};

const TYPE_FOURNISSEUR_LABELS: Record<string, string> = {
  garage: "Garage",
  concessionnaire: "Concessionnaire",
  pneu: "Pneumatiques",
  carburant: "Carburant",
  carrosserie: "Carrosserie",
  electricite: "Électricité",
};

export function TypeFournisseurBadge({
  type,
  className,
}: { type: string | null } & BadgeProps) {
  if (!type)
    return (
      <span className={cn("badge bg-gray-50 text-gray-500", className)}>
        Non spécifié
      </span>
    );
  return (
    <span
      className={cn(
        "badge",
        TYPE_FOURNISSEUR_STYLES[type] ?? "bg-gray-50 text-gray-600",
        className,
      )}
    >
      {TYPE_FOURNISSEUR_LABELS[type] ?? type}
    </span>
  );
}

// ── Gravité Communication ────────────────────────────────────
const GRAVITE_COMM_STYLES: Record<string, string> = {
  info: "bg-blue-50 text-blue-700",
  importante: "bg-orange-50 text-orange-700",
  critique: "bg-red-50 text-red-700",
};
const GRAVITE_COMM_LABELS: Record<string, string> = {
  info: "Info",
  importante: "Importante",
  critique: "Critique",
};
export function GraviteCommunicationBadge({
  gravite,
  className,
}: { gravite: string } & BadgeProps) {
  return (
    <span
      className={cn(
        "badge",
        GRAVITE_COMM_STYLES[gravite] ?? "bg-gray-50 text-gray-600",
        className,
      )}
    >
      {GRAVITE_COMM_LABELS[gravite] ?? gravite}
    </span>
  );
}

// ── Type Communication ───────────────────────────────────────
const TYPE_COMM_STYLES: Record<string, string> = {
  annonce: "bg-cyan-50 text-cyan-700",
  note_service: "bg-indigo-50 text-indigo-700",
};
const TYPE_COMM_LABELS: Record<string, string> = {
  annonce: "Annonce",
  note_service: "Note de service",
};
export function TypeCommunicationBadge({
  type,
  className,
}: { type: string } & BadgeProps) {
  return (
    <span
      className={cn(
        "badge",
        TYPE_COMM_STYLES[type] ?? "bg-gray-50 text-gray-600",
        className,
      )}
    >
      {TYPE_COMM_LABELS[type] ?? type}
    </span>
  );
}

// ── Statut Communication ─────────────────────────────────────
const STATUT_COMM_STYLES: Record<string, string> = {
  brouillon: "bg-gray-50 text-gray-500",
  publie: "bg-green-50 text-green-700",
  archive: "bg-slate-50 text-slate-500",
};
const STATUT_COMM_LABELS: Record<string, string> = {
  brouillon: "Brouillon",
  publie: "Publié",
  archive: "Archivé",
};
export function StatutCommunicationBadge({
  statut,
  className,
}: { statut: string } & BadgeProps) {
  return (
    <span
      className={cn(
        "badge",
        STATUT_COMM_STYLES[statut] ?? "bg-gray-50 text-gray-600",
        className,
      )}
    >
      {STATUT_COMM_LABELS[statut] ?? statut}
    </span>
  );
}
