// ============================================================
// Types de base API
// ============================================================

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
  };
}

// ============================================================
// Auth & Utilisateurs
// ============================================================

export type Role =
  | "super_admin"
  | "directeur"
  | "resp_parc"
  | "resp_agence"
  | "chauffeur"
  | "attributaire"
  | "comptable";

export interface User {
  id: number;
  name: string;
  prenom: string | null;
  nom_complet: string;
  email: string;
  telephone: string | null;
  fonction: string | null;
  est_actif: boolean;
  last_login_at: string | null;
  agence_id: number | null;
  agence: { id: number; nom: string; code: string } | null;
  roles: string[];
  role: Role | null;
  permissions: string[];
  created_at: string;
  // Fiche chauffeur — présente quand role = 'chauffeur'
  chauffeur: {
    id: number;
    matricule_interne: string | null;
    statut: string;
    statut_permis: string;
    date_expiration_permis: string | null;
    jours_avant_expiration_permis: number | null;
    vehicule_actuel: {
      vehicule_id: number;
      immatriculation: string;
      marque_modele: string;
      depuis: string | null;
    } | null;
    vehicules_actifs: Array<{
      affectation_id: number;
      vehicule_id: number;
      immatriculation: string;
      marque_modele: string;
      type_carburant: string | null;
      agence_id: number | null;
      depuis: string | null;
    }>;
  } | null;
}

export interface AuthState {
  token: string | null;
  user: User | null;
  role: Role | null;
  agence_id: number | null;
}

// ============================================================
// Agences & Axes
// ============================================================

export interface Agence {
  id: number;
  nom: string;
  code: string;
  ville: string;
  adresse: string | null;
  telephone: string | null;
  email: string | null;
  est_active: boolean;
}

export interface AxeLivraison {
  id: number;
  agence_id: number;
  nom: string;
  code: string;
  zone: string | null;
  est_actif: boolean;
}

// ============================================================
// Véhicules
// ============================================================

export type TypeVehicule = "livraison" | "administratif" | "scooter";
export type StatutVehicule =
  | "actif"
  | "en_panne"
  | "en_maintenance"
  | "en_mission"
  | "cede"
  | "hors_service";
export type StatutDocument =
  | "valide"
  | "warning"
  | "critique"
  | "expire"
  | "inconnu";

export interface Vehicule {
  id: number;
  immatriculation: string;
  marque: string;
  modele: string;
  type_vehicule: TypeVehicule;
  categorie: string | null;
  annee_fabrication: number | null;
  date_mise_circulation: string | null;
  couleur: string | null;
  numero_chassis: string | null;
  energie: string | null;
  statut: StatutVehicule;
  kilometrage_actuel: number;
  prochain_entretien_km: number | null;
  prochain_entretien_date: string | null;
  intervalle_entretien_km: number;
  date_derniere_visite_tech: string | null;
  date_prochaine_visite_tech: string | null;
  date_expiration_assurance: string | null;
  numero_assurance: string | null;
  compagnie_assurance: string | null;
  statut_vt: StatutDocument;
  statut_assurance: StatutDocument;
  jours_avant_vt: number | null;
  jours_avant_assurance: number | null;
  numero_carte_carburant: string | null;
  type_carburant: string | null;
  agence_id: number;
  agence: Pick<Agence, "id" | "nom" | "code"> | null;
  affectation_active: {
    id: number;
    type: string;
    date_debut: string;
    chauffeur: { id: number; nom: string; telephone: string | null } | null;
    axe: string | null;
  } | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  photo_principale_url: string | null;
  // Plaque d'immatriculation
  style_plaque: "nouvelle" | "ancienne" | null;
  plaque_ville: string | null;
  plaque_code_ville: string | null;
}

// ============================================================
// Chauffeurs
// ============================================================

export type StatutChauffeur = "actif" | "suspendu" | "quitte" | "conge";
export type StatutPermis =
  | "valide"
  | "warning"
  | "critique"
  | "expire"
  | "inconnu";

export interface Chauffeur {
  id: number;
  nom: string;
  prenom: string;
  nom_complet: string;
  telephone: string | null;
  email: string | null;
  date_naissance: string | null;
  adresse: string | null;
  cni: string | null;
  fonction: string | null;
  numero_permis: string | null;
  categorie_permis: string | null;
  date_delivrance_permis: string | null;
  date_expiration_permis: string | null;
  jours_avant_expiration_permis: number | null;
  statut_permis: StatutPermis;
  date_embauche: string | null;
  matricule_interne: string | null;
  statut: StatutChauffeur;
  photo: string | null;
  photo_profil_url: string | null;
  agence_id: number;
  agence: Pick<Agence, "id" | "nom" | "code"> | null;
  vehicule_actuel: {
    affectation_id: number;
    vehicule_id: number;
    immatriculation: string;
    marque_modele: string;
    axe: string | null;
    depuis: string;
  } | null;
  vehicules_actifs?: Array<{
    affectation_id: number;
    vehicule_id: number;
    immatriculation: string;
    marque_modele: string;
    type_carburant: string | null;
    agence_id: number | null;
    depuis: string | null;
  }>;
  user_id: number | null;
  a_un_compte: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Affectations
// ============================================================

export type TypeAffectation = "livraison" | "administratif" | "mission";
export type StatutAffectation = "active" | "terminee" | "suspendue";

export interface Affectation {
  id: number;
  vehicule_id: number;
  chauffeur_id: number | null;
  attributaire_id: number | null;
  agence_id: number;
  axe_livraison_id: number | null;
  date_debut: string;
  date_fin: string | null;
  kilometrage_debut: number;
  kilometrage_fin: number | null;
  km_parcourus: number | null;
  duree_jours: number;
  type_affectation: TypeAffectation;
  statut: StatutAffectation;
  vehicule: Pick<
    Vehicule,
    "id" | "immatriculation" | "marque" | "modele" | "type_vehicule"
  > | null;
  chauffeur: { id: number; nom: string; telephone: string | null } | null;
  agence: Pick<Agence, "id" | "nom" | "code"> | null;
  axe_livraison: { id: number; nom: string; code: string } | null;
  validee_par: string | null;
  validee_le: string | null;
  notes: string | null;
  created_at: string;
}

// ============================================================
// Checklists
// ============================================================

export type TypeChecklist =
  | "hebdomadaire_vehicule"
  | "hebdomadaire_scooter"
  | "visite_technique"
  | "passation"
  | "attribution";
export type StatutChecklist = "brouillon" | "soumis" | "valide" | "rejete";
export type ResultatChecklist = "conforme" | "non_conforme" | "en_attente";

export interface NonConformite {
  section: string;
  item: string;
  valeur: string;
  critique: boolean;
}

export interface Checklist {
  id: number;
  type_checklist: TypeChecklist;
  date: string;
  kilometrage: number | null;
  statut: StatutChecklist;
  resultat_global: ResultatChecklist;
  est_conforme: boolean;
  nb_non_conformites: number;
  non_conformites: NonConformite[];
  data_json: Record<string, Record<string, string | null>>;
  observations: string | null;
  vehicule_id: number;
  vehicule: Pick<
    Vehicule,
    "id" | "immatriculation" | "marque" | "modele"
  > | null;
  chauffeur_id: number | null;
  chauffeur: { id: number; nom: string } | null;
  agence_id: number;
  valide_par: string | null;
  valide_le: string | null;
  commentaire_validation: string | null;
  motif_rejet: string | null;
  signalement_genere_id: number | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Signalements
// ============================================================

export type TypeDefaut =
  | "panne_moteur"
  | "probleme_freins"
  | "probleme_pneu"
  | "probleme_electrique"
  | "probleme_carrosserie"
  | "probleme_eclairage"
  | "fuite"
  | "surchauffe"
  | "bruit_anormal"
  | "probleme_document"
  | "autre";
export type Gravite = "faible" | "moyenne" | "haute" | "critique";
export type StatutSignalement =
  | "nouveau"
  | "en_cours"
  | "maintenance_creee"
  | "resolu"
  | "ferme";

export interface Signalement {
  id: number;
  origine: string;
  date_signalement: string;
  kilometrage: number | null;
  type_defaut: TypeDefaut;
  gravite: Gravite;
  titre: string;
  description: string;
  etat_elements: Record<string, string> | null;
  statut: StatutSignalement;
  photos: { id: number; url: string; nom: string }[];
  vehicule_id: number;
  vehicule: Pick<
    Vehicule,
    "id" | "immatriculation" | "marque" | "modele"
  > | null;
  chauffeur_id: number | null;
  chauffeur: { id: number; nom: string; telephone: string | null } | null;
  agence_id: number;
  maintenance_id: number | null;
  checklist_id: number | null;
  pris_en_charge_par: string | null;
  pris_en_charge_le: string | null;
  resolu_par: string | null;
  resolu_le: string | null;
  commentaire_resolution: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Maintenances
// ============================================================

export type TypeOperation =
  | "entretien"
  | "reparation"
  | "pneu"
  | "equipement"
  | "contravention"
  | "carrosserie"
  | "visite_technique";
export type StatutMaintenance = "planifie" | "en_cours" | "termine" | "annule";

export interface Maintenance {
  id: number;
  date_travaux: string;
  date_entree: string | null;
  date_sortie: string | null;
  kilometrage: number;
  type_operation: TypeOperation;
  categorie_travaux: string | null;
  titre: string;
  description_travaux: string;
  fournitures_mo: string | null;
  montant_ht: number;
  tva: number;
  montant_ttc: number;
  numero_facture: string | null;
  date_facture: string | null;
  statut: StatutMaintenance;
  necessite_approbation: boolean;
  facture_url: string | null;
  vehicule_id: number;
  vehicule:
    | (Pick<Vehicule, "id" | "immatriculation" | "marque" | "modele"> & {
        agence: string | null;
        kilometrage_actuel: number | null;
      })
    | null;
  fournisseur_id: number | null;
  fournisseur: { id: number; nom: string; type: string | null } | null;
  chauffeur_id: number | null;
  chauffeur: { id: number; nom: string } | null;
  agence_id: number;
  axe_livraison_id: number | null;
  bon_commande_id: number | null;
  signalement_id: number | null;
  approuve_par: string | null;
  approuve_le: string | null;
  created_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Carburant
// ============================================================

export interface Carburant {
  id: number;
  date: string;
  litres: number;
  montant: number;
  prix_unitaire: number | null;
  type_carburant: string | null;
  kilometrage: number | null;
  km_precedent: number | null;
  conso_100km: number | null;
  numero_transaction: string | null;
  station: string | null;
  est_complet: boolean;
  vehicule_id: number;
  vehicule: Pick<
    Vehicule,
    "id" | "immatriculation" | "marque" | "modele"
  > | null;
  chauffeur_id: number | null;
  chauffeur: { id: number; nom: string } | null;
  agence_id: number;
  axe_livraison_id: number | null;
  axe_livraison: string | null;
  notes: string | null;
  created_at: string;
}

export interface DotationCarburant {
  id: number;
  vehicule_id: number;
  immatriculation: string | null;
  marque_modele: string | null;
  mois: number;
  annee: number;
  montant_dote: number;
  montant_consomme: number;
  ecart: number;
  taux_consommation: number;
}

// ============================================================
// Documents
// ============================================================

export type TypeDocument =
  | "carte_grise"
  | "assurance"
  | "visite_technique"
  | "autorisation_circulation"
  | "carte_carburant"
  | "autre";
export type StatutDocumentVehicule =
  | "valide"
  | "a_renouveler"
  | "expire"
  | "manquant";

export interface DocumentVehicule {
  id: number;
  type_document: TypeDocument;
  intitule: string | null;
  numero: string | null;
  date_emission: string | null;
  date_expiration: string | null;
  organisme_emetteur: string | null;
  statut: StatutDocumentVehicule;
  statut_calcule: "valide" | "warning" | "critique" | "expire";
  jours_avant_expiration: number | null;
  est_actif: boolean;
  fichier_nom: string | null;
  fichier_url: string | null;
  vehicule_id: number;
  vehicule:
    | (Pick<Vehicule, "id" | "immatriculation" | "marque" | "modele"> & {
        agence: string | null;
      })
    | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Bons de Commande
// ============================================================

export type StatutBonCommande =
  | "brouillon"
  | "soumis"
  | "approuve"
  | "rejete"
  | "execute"
  | "annule";

export interface LigneBonCommande {
  description: string;
  quantite: number;
  unite: string | null;
  prix_unitaire: number;
  total: number;
}

export interface BonCommande {
  id: number;
  numero_bc: string;
  statut: StatutBonCommande;
  date_commande: string;
  date_livraison_prevue: string | null;
  date_livraison_reelle: string | null;
  lignes: LigneBonCommande[];
  montant_ht: number;
  tva: number;
  montant_ttc: number;
  agence_id: number;
  agence: Pick<Agence, "id" | "nom"> | null;
  fournisseur_id: number | null;
  fournisseur: {
    id: number;
    nom: string;
    type: string | null;
    telephone: string | null;
  } | null;
  vehicule_id: number | null;
  vehicule: { id: number; immatriculation: string } | null;
  cree_par: string | null;
  approuve_par: string | null;
  approuve_le: string | null;
  motif_rejet: string | null;
  observations: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Fournisseurs
// ============================================================

export interface Fournisseur {
  id: number;
  nom: string;
  type: string | null;
  telephone: string | null;
  email: string | null;
  adresse: string | null;
  ville: string | null;
  specialite: string | null;
  ninea: string | null;
  est_actif: boolean;
  notes: string | null;
  created_at: string;
}

// ============================================================
// Alertes
// ============================================================

export type TypeAlerte =
  | "visite_technique"
  | "assurance"
  | "permis_chauffeur"
  | "entretien_km"
  | "entretien_periodique"
  | "carburant_depassement"
  | "signalement_ouvert"
  | "checklist_manquante"
  | "vehicule_immobilise"
  | "bon_commande_en_attente"
  | "document_manquant";
export type NiveauAlerte = "info" | "warning" | "danger";
export type StatutAlerte = "active" | "lue" | "traitee" | "ignoree";

export interface Alerte {
  id: number;
  type_alerte: TypeAlerte;
  titre: string;
  message: string;
  niveau: NiveauAlerte;
  echeance: string | null;
  jours_restants: number | null;
  statut: StatutAlerte;
  vehicule: { id: number; immatriculation: string } | null;
  chauffeur: { id: number; nom: string } | null;
  created_at: string;
}

// ============================================================
// Dashboard KPIs
// ============================================================

export interface DashboardStats {
  periode: { mois: number; annee: number };
  vehicules: {
    total: number;
    actifs: number;
    en_panne: number;
    en_maintenance: number;
    hors_service: number;
    vt_prochaine_30j: number;
    assurance_prochaine_30j: number;
    entretien_echu: number;
  };
  maintenance: {
    depenses_mois: number;
    nb_interventions: number;
    en_attente_approbation: number;
  };
  carburant: {
    depenses_mois: number;
    litres_mois: number;
    dotation_mois: number;
    taux_conso: number | null;
  };
  pneus: {
    depenses_mois: number;
    nb_operations: number;
  };
  signalements: {
    total_ouverts: number;
    critiques: number;
    hauts: number;
  };
  alertes: {
    danger: number;
    warning: number;
    info: number;
    total: number;
  };
  chauffeurs: {
    total: number;
    permis_expirant_30j: number;
  };
}

export interface KpiMensuel {
  mois: string;
  mois_num: number;
  maintenance: number;
  entretien: number;
  reparation: number;
  pneus: number;
  pneumatiques_module: number;
  nb_operations_pneus: number;
  nb_interventions: number;
  carburant: number;
  litres: number;
  dotation: number;
  total_depenses: number;
  nb_signalements: number;
}

// ── Pneumatiques ─────────────────────────────────────────────

export type TypeOperationPneu =
  | "achat_neuf"
  | "rechape"
  | "rotation"
  | "reforme"
  | "reparation";

export interface Pneumatique {
  id: number;
  date: string;
  type_operation: TypeOperationPneu;
  position: string | null;
  marque_pneu: string | null;
  dimension: string | null;
  quantite: number;
  prix_unitaire: number | null;
  montant_total: number;
  kilometrage: number | null;
  commentaire: string | null;
  vehicule_id: number;
  vehicule: Pick<
    Vehicule,
    "id" | "immatriculation" | "marque" | "modele"
  > | null;
  chauffeur_id: number | null;
  chauffeur: { id: number; nom_complet: string } | null;
  fournisseur_id: number | null;
  fournisseur: { id: number; nom: string } | null;
  agence_id: number;
  saisi_par: number | null;
  created_at: string;
  updated_at: string;
}

export interface PneumatiqueStats {
  annee: number;
  total_global: number;
  par_type: Array<{
    type: TypeOperationPneu;
    total: number;
    nb: number;
    qte: number;
  }>;
  par_mois: Array<{
    mois: number;
    total: number;
    nb: number;
  }>;
  par_vehicule: Array<{
    vehicule_id: number;
    immatriculation: string;
    marque_modele: string;
    total: number;
    nb: number;
  }>;
}

// ── Fournisseurs ─────────────────────────────────────────────

export type TypeFournisseur =
  | "garage"
  | "concessionnaire"
  | "pneu"
  | "carburant"
  | "carrosserie"
  | "electricite"
  | string;

export interface Fournisseur {
  id: number;
  nom: string;
  type: TypeFournisseur | null;
  telephone: string | null;
  email: string | null;
  adresse: string | null;
  ville: string | null;
  specialite: string | null;
  ninea: string | null;
  est_actif: boolean;
  notes: string | null;
  logo_url: string | null;
  created_at: string;
}

export interface FournisseurIntervention {
  id: number;
  date_travaux: string;
  type_operation: string;
  titre: string;
  montant_ttc: number;
  statut: string;
  vehicule: Pick<
    Vehicule,
    "id" | "immatriculation" | "marque" | "modele"
  > | null;
}

export interface FournisseurStats {
  fournisseur_id: number;
  nom: string;
  annee: number;
  global: {
    total_all_time: number;
    nb_all_time: number;
    moyenne_facture: number;
  };
  par_type: Array<{ type: string; total: number; nb: number }>;
  par_mois: Array<{ mois: number; total: number; nb: number }>;
}

// ── Communication (Annonces / Notes de service) ─────────────

export type TypeCommunication = "annonce" | "note_service";
export type GraviteCommunication = "info" | "importante" | "critique";
export type StatutCommunication = "brouillon" | "publie" | "archive";

export interface Communication {
  id: number;
  titre: string;
  contenu: string;
  type: TypeCommunication;
  gravite: GraviteCommunication;
  roles_cibles: string[] | null;
  agences_cibles: number[] | null;
  date_publication: string | null;
  date_expiration: string | null;
  accuse_lecture_requis: boolean;
  statut: StatutCommunication;
  piece_jointe_url: string | null;
  piece_jointe_nom: string | null;
  auteur?: {
    id: number;
    nom_complet: string;
  };
  nb_destinataires?: number;
  nb_lectures?: number;
  lu: boolean | null;
  lu_at: string | null;
  created_at: string;
  updated_at: string;
}
