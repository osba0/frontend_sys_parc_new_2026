import {
  format,
  parseISO,
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  isValid,
} from "date-fns";
import { fr } from "date-fns/locale";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type {
  StatutDocument,
  NiveauAlerte,
  Gravite,
  StatutVehicule,
} from "@/types";

// ============================================================
// Tailwind merge helper
// ============================================================
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// ============================================================
// Formatage monétaire FCFA
// ============================================================
export function formatCfa(montant: number | null | undefined): string {
  if (montant === null || montant === undefined) return "\u2014";
  return (
    new Intl.NumberFormat("fr-SN", {
      style: "decimal",
      maximumFractionDigits: 0,
    }).format(montant) + " FCFA"
  );
}

export function formatCfaCompact(montant: number): string {
  if (montant >= 1_000_000) return (montant / 1_000_000).toFixed(1) + " M FCFA";
  if (montant >= 1_000) return (montant / 1_000).toFixed(0) + " K FCFA";
  return formatCfa(montant);
}

// ============================================================
// Formatage des dates
// ============================================================
export function formatDate(
  date: string | null | undefined,
  fmt = "dd/MM/yyyy",
): string {
  if (!date) return "\u2014";
  try {
    const d = parseISO(date);
    if (!isValid(d)) return "\u2014";
    return format(d, fmt, { locale: fr });
  } catch {
    return "\u2014";
  }
}

export function formatDateTime(date: string | null | undefined): string {
  return formatDate(date, "dd/MM/yyyy HH:mm");
}

export function formatDateRelative(date: string | null | undefined): string {
  if (!date) return "\u2014";
  try {
    const d = parseISO(date);
    if (!isValid(d)) return "\u2014";
    const diff = differenceInDays(new Date(), d);
    if (diff === 0) return "Aujourd'hui";
    if (diff === 1) return "Hier";
    if (diff < 7) return `Il y a ${diff} jours`;
    return formatDate(date);
  } catch {
    return "\u2014";
  }
}

// ============================================================
// Formatage kilométrage
// ============================================================
export function formatKm(km: number | null | undefined): string {
  if (km === null || km === undefined) return "\u2014";
  return new Intl.NumberFormat("fr-SN").format(km) + " km";
}

// ============================================================
// Statut véhicule — couleurs et labels
// ============================================================
export function getStatutVehiculeColor(statut: StatutVehicule): string {
  const map: Record<StatutVehicule, string> = {
    actif: "badge-success",
    en_panne: "badge-danger",
    en_maintenance: "badge-warning",
    en_mission: "badge-info",
    cede: "badge-gray",
    hors_service: "badge-gray",
  };
  return map[statut] ?? "badge-gray";
}

export function getStatutVehiculeLabel(statut: StatutVehicule): string {
  const map: Record<StatutVehicule, string> = {
    actif: "Actif",
    en_panne: "En panne",
    en_maintenance: "En maintenance",
    en_mission: "En mission",
    cede: "Cédé",
    hors_service: "Hors service",
  };
  return map[statut] ?? statut;
}

// ============================================================
// Statut document — couleurs et labels
// ============================================================
export function getDocumentStatutColor(statut: StatutDocument): string {
  const map: Record<StatutDocument, string> = {
    valide: "badge-success",
    warning: "badge-warning",
    critique: "badge-danger",
    expire: "badge-danger",
    inconnu: "badge-gray",
  };
  return map[statut] ?? "badge-gray";
}

export function getDocumentStatutLabel(
  statut: StatutDocument,
  jours: number | null,
): string {
  if (statut === "expire") return `Expiré (${Math.abs(jours ?? 0)}j)`;
  if (statut === "critique") return `Critique (${jours}j)`;
  if (statut === "warning") return `Attention (${jours}j)`;
  return "Valide";
}

// ============================================================
// Alertes — couleurs
// ============================================================
export function getAlerteNiveauColor(niveau: NiveauAlerte): string {
  const map: Record<NiveauAlerte, string> = {
    danger: "text-red-600",
    warning: "text-yellow-600",
    info: "text-blue-600",
  };
  return map[niveau] ?? "text-gray-600";
}

export function getAlerteNiveauBg(niveau: NiveauAlerte): string {
  const map: Record<NiveauAlerte, string> = {
    danger: "bg-red-50 border-red-200",
    warning: "bg-yellow-50 border-yellow-200",
    info: "bg-blue-50 border-blue-200",
  };
  return map[niveau] ?? "bg-gray-50 border-gray-200";
}

// ============================================================
// Gravité signalement — couleur
// ============================================================
export function getGraviteColor(gravite: Gravite): string {
  const map: Record<Gravite, string> = {
    critique: "badge-danger",
    haute: "badge-danger",
    moyenne: "badge-warning",
    faible: "badge-info",
  };
  return map[gravite] ?? "badge-gray";
}

// ============================================================
// Labels lisibles
// ============================================================
export function getTypeVehiculeLabel(type: string): string {
  const map: Record<string, string> = {
    livraison: "Livraison",
    administratif: "Administratif",
    scooter: "Scooter",
  };
  return map[type] ?? type;
}

export function getTypeOperationLabel(type: string): string {
  const map: Record<string, string> = {
    entretien: "Entretien",
    reparation: "Réparation",
    pneu: "Pneumatique",
    equipement: "Équipement",
    contravention: "Contravention",
    carrosserie: "Carrosserie",
    visite_technique: "Visite technique",
  };
  return map[type] ?? type;
}

export function getTypeDocumentLabel(type: string): string {
  const map: Record<string, string> = {
    carte_grise: "Carte grise",
    assurance: "Assurance",
    visite_technique: "Visite technique",
    autorisation_circulation: "Autorisation circulation",
    carte_carburant: "Carte carburant",
    autre: "Autre",
  };
  return map[type] ?? type;
}

/**
 * Formate une échéance en libellé lisible et toujours en nombres entiers
 * (jamais de décimales) :
 *  - > 1 jour  → "Dans 12j" / "Expiré il y a 3j"
 *  - < 24h     → "Dans 5h 30min" (précision heures/minutes pour les
 *                échéances imminentes, plus utile qu'un "0j" ambigu)
 *  - < 1 min   → "Expire maintenant" / "Expiré à l'instant"
 *
 * Calcule directement depuis la date d'échéance brute plutôt que depuis
 * un champ jours_restants potentiellement imprécis (legacy/float).
 */
export function formatEcheance(
  echeance: string | null | undefined,
): string | null {
  if (!echeance) return null;
  const date = parseISO(echeance);
  if (!isValid(date)) return null;

  const maintenant = new Date();
  const totalMinutes = differenceInMinutes(date, maintenant);
  const estPasse = totalMinutes < 0;
  const absMinutes = Math.abs(totalMinutes);

  // Moins d'une minute
  if (absMinutes < 1) {
    return estPasse ? "Expiré à l'instant" : "Expire maintenant";
  }

  // Moins de 24h → précision heures/minutes
  if (absMinutes < 24 * 60) {
    const heures = Math.floor(absMinutes / 60);
    const minutes = absMinutes % 60;
    const duree =
      heures > 0
        ? `${heures}h${minutes > 0 ? ` ${minutes}min` : ""}`
        : `${minutes}min`;
    return estPasse ? `Expiré il y a ${duree}` : `Dans ${duree}`;
  }

  // Au-delà de 24h → jours entiers (tronqués, jamais arrondis vers le haut
  // pour éviter d'annoncer une échéance plus éloignée qu'elle ne l'est)
  const jours = Math.floor(absMinutes / (24 * 60));
  if (jours === 0) {
    return estPasse ? "Expiré aujourd'hui" : "Expire aujourd'hui";
  }
  return estPasse ? `Expiré il y a ${jours}j` : `Dans ${jours}j`;
}

export function getMoisLabel(mois: number): string {
  const labels = [
    "Janvier",
    "Février",
    "Mars",
    "Avril",
    "Mai",
    "Juin",
    "Juillet",
    "Août",
    "Septembre",
    "Octobre",
    "Novembre",
    "Décembre",
  ];
  return labels[mois - 1] ?? "\u2014";
}

// ============================================================
// Couleurs graphiques Recharts
// ============================================================
export const CHART_COLORS: Record<string, string> = {
  maintenance: "#2E86C1",
  entretien: "#27AE60",
  reparation: "#E74C3C",
  pneus: "#F39C12",
  carburant: "#8E44AD",
  dotation: "#95A5A6",
  equipement: "#1ABC9C",
};

// ============================================================
// URL médias — résolution cross-origin dev / production
// ============================================================
/**
 * Construit une URL absolue vers un fichier media servi par le backend Laravel.
 *
 * En développement : frontend :5173, backend :8000.
 * Une URL relative "/storage/..." résolue contre :5173 donne 404.
 * Ce helper préfixe avec VITE_API_URL pour pointer vers le backend.
 *
 * En production (même domaine) : laisser VITE_API_URL vide.
 */
export function mediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const origin = import.meta.env.VITE_API_URL ?? "";
  return `${origin}${url}`;
}

// ============================================================
// Téléchargement blob (exports Excel/PDF)
// ============================================================
/**
 * Déclenche le téléchargement d'un Blob dans le navigateur.
 *
 * @example
 *   const res = await rapportsApi.excelMaintenance()
 *   downloadBlob(res.data as Blob, 'maintenance_2025.xlsx')
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

/**
 * Détermine si un élément est "nouveau" — créé il y a moins de N jours.
 * Utilisé pour afficher un badge "Nouveau" dans les listes (véhicules,
 * chauffeurs, documents, signalements, etc.) sans colonne BDD dédiée.
 *
 * @param createdAt  Date de création (created_at)
 * @param jours      Période de fraîcheur en jours (défaut: 7)
 */
export function isNouveau(
  createdAt: string | null | undefined,
  jours = 7,
): boolean {
  if (!createdAt) return false;
  const cree = new Date(createdAt).getTime();
  if (Number.isNaN(cree)) return false;
  const seuil = Date.now() - jours * 24 * 60 * 60 * 1000;
  return cree > seuil;
}
