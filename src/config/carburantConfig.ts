/**
 * Configuration des prix de carburant par défaut
 *
 * Centralisation pour faciliter les mises à jour futures.
 *
 * Évolutions prévues :
 * - Prix par agence → stocker dans la table config_entreprise ou une table dédiée
 * - Historique des prix → table prix_carburant(type, prix, date_debut, date_fin, agence_id)
 * - API de mise à jour depuis l'interface Administration
 */

export interface PrixCarburant {
  /** Prix en FCFA par litre */
  prix: number;
  /** Libellé affiché à l'utilisateur */
  label: string;
  /** Unité (L par défaut, kWh pour électrique) */
  unite: string;
}

/**
 * Prix officiels Sénégal — à mettre à jour selon les décrets
 * Source : Comité de suivi des prix des hydrocarbures
 */
export const PRIX_CARBURANT_DEFAUT: Record<string, PrixCarburant> = {
  Diesel: { prix: 990, label: "Diesel", unite: "L" },
  Essence: { prix: 1075, label: "Essence", unite: "L" },
  // 'SP95':       { prix: 1075,  label: 'SP95',         unite: 'L' },
  // 'SP98':       { prix: 1100,  label: 'SP98',         unite: 'L' },
  // 'GPL':        { prix: 600,   label: 'GPL',          unite: 'L' },
  Electrique: { prix: 150, label: "Électrique", unite: "kWh" },
};

/**
 * Retourne le prix par défaut pour un type de carburant donné.
 * Retourne null si le type n'est pas dans la liste (ex: carburant custom).
 */
export function getPrixDefaut(typeCarburant: string): number | null {
  return PRIX_CARBURANT_DEFAUT[typeCarburant]?.prix ?? null;
}

/**
 * Calcule le montant total depuis litres × prix unitaire.
 * Arrondi à l'entier le plus proche (FCFA = pas de centimes).
 */
export function calculerMontant(litres: number, prixUnitaire: number): number {
  return Math.round(litres * prixUnitaire);
}

/**
 * Calcule le prix unitaire depuis montant / litres.
 * Arrondi à 2 décimales.
 */
export function calculerPrixUnitaire(montant: number, litres: number): number {
  if (litres <= 0) return 0;
  return Math.round((montant / litres) * 100) / 100;
}
