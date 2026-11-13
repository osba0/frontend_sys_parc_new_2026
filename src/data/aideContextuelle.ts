/**
 * Aide contextuelle SysPark
 * Contenu indexé par [role][pathname_prefix]
 * Affiché dans le panneau d'aide de la Topbar selon la page courante et le profil.
 */

export interface ConseilAide {
  emoji:  string
  titre:  string
  texte:  string
}

export interface SectionAide {
  titre:    string
  conseils: ConseilAide[]
}

export interface PageAide {
  titre:    string     // Titre du panneau pour cette page
  intro?:   string     // Phrase d'intro optionnelle
  sections: SectionAide[]
}

// Clé de lookup : on cherche la clé la plus longue qui est un préfixe de pathname
type RoleAide = Record<string, PageAide>

// ─────────────────────────────────────────────────────────────────────────────
// CHAUFFEUR
// ─────────────────────────────────────────────────────────────────────────────
const aidesChauffeur: RoleAide = {
  '/dashboard': {
    titre: 'Bienvenue sur votre tableau de bord',
    intro: 'Voici un aperçu rapide de votre espace chauffeur et de ce que vous pouvez faire.',
    sections: [
      {
        titre: '🏠 Navigation',
        conseils: [
          { emoji: '🚗', titre: 'Mes véhicules',     texte: 'Accédez à la fiche de vos véhicules affectés : kilométrage, documents, état général.' },
          { emoji: '📋', titre: 'Mes checklists',    texte: 'Effectuez le contrôle de votre véhicule avant chaque départ et soumettez-le à votre responsable.' },
          { emoji: '⚠️', titre: 'Mes signalements',  texte: 'Signalez toute panne ou anomalie dès sa détection pour une prise en charge rapide.' },
          { emoji: '🔔', titre: 'Alertes',           texte: 'Les alertes en rouge sont urgentes (VT expirée, assurance) — contactez votre responsable immédiatement.' },
        ],
      },
      {
        titre: '✅ Bonnes pratiques quotidiennes',
        conseils: [
          { emoji: '🕐', titre: 'Avant de partir',   texte: 'Faites toujours votre checklist avant le premier départ de la journée.' },
          { emoji: '📱', titre: 'En cas de panne',   texte: 'Créez un signalement depuis l\'application dès que possible, même depuis votre smartphone.' },
          { emoji: '⛽', titre: 'Plein de carburant', texte: 'Saisissez votre plein immédiatement après la station pour un historique précis.' },
        ],
      },
    ],
  },

  '/mon-vehicule': {
    titre: 'Ma fiche véhicule',
    sections: [
      {
        titre: '📄 Documents à surveiller',
        conseils: [
          { emoji: '🔴', titre: 'Document expiré',    texte: 'Si la VT ou l\'assurance est expirée (rouge), signalez-le à votre responsable — ne prenez pas la route.' },
          { emoji: '🟡', titre: 'Expiration proche',  texte: 'Un badge jaune signale une échéance dans moins de 30 jours. Anticipez avec votre responsable.' },
          { emoji: '📷', titre: 'Photos du véhicule', texte: 'Si vous constatez un dommage visible, prenez une photo et créez un signalement.' },
        ],
      },
      {
        titre: '🔧 Kilométrage',
        conseils: [
          { emoji: '📊', titre: 'Mise à jour km',    texte: 'Mettez à jour le kilométrage régulièrement — c\'est essentiel pour les calculs d\'entretien.' },
          { emoji: '✅', titre: 'Saisie précise',    texte: 'Relevez le km exact sur le compteur, pas une estimation.' },
        ],
      },
    ],
  },

  '/checklists': {
    titre: 'Mes checklists',
    intro: 'La checklist est un contrôle visuel de votre véhicule avant utilisation. Prenez-le au sérieux !',
    sections: [
      {
        titre: '📋 Comment bien remplir',
        conseils: [
          { emoji: '⏱️', titre: 'Avant de démarrer',    texte: 'Effectuez la checklist avant chaque départ mensuel, moteur éteint, véhicule à l\'arrêt.' },
          { emoji: '👁️', titre: 'Vérification réelle',  texte: 'Ne cochez pas «OK» par défaut sans vérifier physiquement chaque point.' },
          { emoji: '📸', titre: 'Photo en cas de défaut', texte: 'Si vous constatez un dommage visible, joignez une photo via le signalement associé.' },
          { emoji: '📍', titre: 'Kilométrage exact',    texte: 'Relevez le km réel sur le compteur avant de valider la checklist.' },
          { emoji: '⚠️', titre: 'Anomalie = signalement', texte: 'Toute anomalie détectée doit être immédiatement signalée à votre responsable.' },
        ],
      },
      {
        titre: '🚫 Erreurs fréquentes à éviter',
        conseils: [
          { emoji: '❌', titre: 'Ne pas tout cocher OK', texte: 'Une checklist entièrement verte sur un véhicule défaillant engage votre responsabilité.' },
          { emoji: '❌', titre: 'Oublier la date',       texte: 'La date doit correspondre au jour du contrôle réel.' },
          { emoji: '❌', titre: 'Checklist en doublon',  texte: 'Vérifiez que vous n\'avez pas déjà soumis une checklist pour ce véhicule ce mois-ci.' },
        ],
      },
    ],
  },

  '/signalements': {
    titre: 'Mes signalements',
    intro: 'Un signalement bien rempli permet une prise en charge rapide et évite une immobilisation prolongée.',
    sections: [
      {
        titre: '📝 Comment signaler efficacement',
        conseils: [
          { emoji: '🔍', titre: 'Description précise',   texte: 'Décrivez ce que vous observez : bruits, voyants allumés, comportement anormal. Plus c\'est précis, plus c\'est facile à diagnostiquer.' },
          { emoji: '📸', titre: 'Ajoutez des photos',    texte: 'Une photo vaut mille mots. Photographiez la zone concernée (fuite, rayure, voyant...).' },
          { emoji: '🚨', titre: 'Gravité correcte',      texte: 'Freins, direction, moteur = Critique. Climatisation, rétroviseur = Faible. Calibrez bien la gravité.' },
          { emoji: '⏰', titre: 'Signalez sans attendre', texte: 'Ne différez jamais un signalement de sécurité. Chaque heure compte.' },
        ],
      },
      {
        titre: '🚫 À éviter absolument',
        conseils: [
          { emoji: '❌', titre: 'Signalements en doublon', texte: 'Vérifiez la liste avant de créer — si un signalement similaire est déjà ouvert, contactez votre responsable.' },
          { emoji: '❌', titre: 'Description vague',       texte: 'Évitez «voiture en panne» sans détails — ça ralentit le diagnostic et la réparation.' },
          { emoji: '🚗', titre: 'Ne conduisez pas',        texte: 'En cas de défaut mécanique grave (freins, direction, surchauffe), n\'utilisez pas le véhicule avant réparation.' },
        ],
      },
    ],
  },

  '/carburant': {
    titre: 'Mes pleins',
    intro: 'La saisie rapide et précise de vos pleins permet un suivi de consommation fiable.',
    sections: [
      {
        titre: '⛽ Saisie d\'un plein',
        conseils: [
          { emoji: '📱', titre: 'Saisir immédiatement',    texte: 'Enregistrez votre plein juste après la station, les informations sont encore fraîches.' },
          { emoji: '📊', titre: 'Kilométrage exact',       texte: 'Le km au compteur est crucial — il permet de calculer votre consommation aux 100km.' },
          { emoji: '🧾', titre: 'Conservez le ticket',     texte: 'Gardez le ticket de caisse jusqu\'à confirmation de la saisie dans SysPark.' },
          { emoji: '🔢', titre: 'Litres exacts',           texte: 'Saisissez le volume exact en litres, tel qu\'indiqué sur la pompe ou le ticket.' },
        ],
      },
      {
        titre: '📈 Votre consommation',
        conseils: [
          { emoji: '🟢', titre: 'Consommation normale',  texte: 'Si votre conso est stable d\'un plein à l\'autre, tout va bien.' },
          { emoji: '🔴', titre: 'Surconsommation',       texte: 'Une conso anormalement élevée peut indiquer une fuite ou un problème mécanique — signalez-le.' },
          { emoji: '💧', titre: 'Plein complet',         texte: 'Cochez «Plein complet» uniquement si vous avez rempli jusqu\'au bord — ça améliore la précision.' },
        ],
      },
    ],
  },

  '/affectations': {
    titre: 'Mes affectations',
    sections: [
      {
        titre: '🔑 Comprendre vos affectations',
        conseils: [
          { emoji: '🟢', titre: 'Affectation active',   texte: 'Un badge vert indique que vous êtes actuellement responsable de ce véhicule.' },
          { emoji: '📅', titre: 'Historique',           texte: 'L\'historique liste tous les véhicules qui vous ont été confiés par le passé.' },
          { emoji: '🚗', titre: 'Plusieurs véhicules',  texte: 'Il est possible que vous ayez plusieurs véhicules affectés en même temps — vérifiez les cartes actives.' },
          { emoji: '📌', titre: 'Km de départ',         texte: 'Le km de départ est celui relevé au moment de l\'affectation — vérifiez sa cohérence avec votre compteur.' },
        ],
      },
    ],
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// DIRECTEUR
// ─────────────────────────────────────────────────────────────────────────────
const aidesDirecteur: RoleAide = {
  '/dashboard': {
    titre: 'Tableau de bord Directeur',
    intro: 'Vue consolidée de l\'ensemble de la flotte. Identifiez rapidement les points d\'attention.',
    sections: [
      {
        titre: '📊 Indicateurs clés',
        conseils: [
          { emoji: '🔴', titre: 'KPIs en rouge',       texte: 'Toute carte rouge nécessite une action immédiate. Cliquez dessus pour accéder aux données détaillées.' },
          { emoji: '✅', titre: 'Validations en attente', texte: 'Les maintenances en attente d\'approbation sont à traiter en priorité pour éviter l\'immobilisation des véhicules.' },
          { emoji: '📈', titre: 'TCO mensuel',         texte: 'Le coût total de possession vous permet de détecter les véhicules anormalement coûteux à entretenir.' },
        ],
      },
      {
        titre: '🎯 Bonnes pratiques direction',
        conseils: [
          { emoji: '🕐', titre: 'Revue quotidienne',   texte: 'Consultez le dashboard chaque matin pour identifier les alertes critiques avant qu\'elles ne s\'aggravent.' },
          { emoji: '📋', titre: 'Rapports mensuels',   texte: 'Exportez les rapports TCO et carburant en fin de mois pour le bilan de flotte.' },
          { emoji: '🔄', titre: 'Renouvellement',      texte: 'Un TCO annuel élevé sur un vieux véhicule justifie souvent son remplacement plutôt que sa réparation.' },
        ],
      },
    ],
  },

  '/rapports': {
    titre: 'Rapports et analyses',
    sections: [
      {
        titre: '📑 Utiliser les rapports',
        conseils: [
          { emoji: '📊', titre: 'Rapport TCO',         texte: 'Comparez les coûts entre véhicules similaires pour identifier les anomalies de flotte.' },
          { emoji: '⛽', titre: 'Rapport carburant',   texte: 'Détectez les surconsommations par chauffeur ou par véhicule grâce au rapport carburant.' },
          { emoji: '🛣️', titre: 'Rapport axes',        texte: 'Identifiez les routes les plus coûteuses pour optimiser les affectations.' },
          { emoji: '📥', titre: 'Export Excel',        texte: 'Exportez en Excel pour des analyses personnalisées dans votre outil de reporting.' },
        ],
      },
    ],
  },

  '/maintenances': {
    titre: 'Gestion des maintenances',
    sections: [
      {
        titre: '🔧 Suivi des interventions',
        conseils: [
          { emoji: '✅', titre: 'Approuver rapidement', texte: 'Les maintenances en attente bloquent la remise en service du véhicule — traitez-les sous 24h.' },
          { emoji: '💰', titre: 'Contrôle des coûts',  texte: 'Vérifiez les montants avant approbation et comparez avec les devis habituels des prestataires.' },
          { emoji: '📈', titre: 'Tendances',           texte: 'Un véhicule qui revient souvent en maintenance peut indiquer un défaut structurel à analyser.' },
        ],
      },
    ],
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// RESP. PARC
// ─────────────────────────────────────────────────────────────────────────────
const aidesRespParc: RoleAide = {
  '/dashboard': {
    titre: 'Tableau de bord Resp. Parc',
    intro: 'Votre espace de pilotage de l\'ensemble de la flotte. Anticipez pour éviter les immobilisations.',
    sections: [
      {
        titre: '🚗 Gestion de la flotte',
        conseils: [
          { emoji: '📅', titre: 'VT et assurances',    texte: 'Anticipez les renouvellements dès l\'alerte «À renouveler» (30 jours) — pas quand c\'est expiré.' },
          { emoji: '🔧', titre: 'Entretiens',          texte: 'Un entretien planifié coûte moins cher qu\'une réparation d\'urgence. Respectez les seuils km.' },
          { emoji: '📊', titre: 'Taux de disponibilité', texte: 'Maintenez un taux élevé en clôturant rapidement les maintenances et en mettant les véhicules en service.' },
        ],
      },
      {
        titre: '✅ Routine quotidienne',
        conseils: [
          { emoji: '🕐', titre: 'Début de journée',    texte: 'Consultez les alertes critiques (rouge) dès l\'ouverture — elles nécessitent une action dans la journée.' },
          { emoji: '📋', titre: 'Checklists',          texte: 'Validez les checklists soumises par les chauffeurs et créez les maintenances si anomalie.' },
          { emoji: '⚠️', titre: 'Signalements',        texte: 'Aucun signalement ne doit rester sans réponse plus de 48h — surtout les gravités critiques.' },
        ],
      },
    ],
  },

  '/vehicules': {
    titre: 'Gestion des véhicules',
    sections: [
      {
        titre: '📋 Bonnes pratiques',
        conseils: [
          { emoji: '📷', titre: 'Photos à la réception', texte: 'Ajoutez des photos dès la réception d\'un nouveau véhicule pour documenter son état initial.' },
          { emoji: '🔢', titre: 'VIN obligatoire',      texte: 'Renseignez le numéro de châssis (VIN) — il est indispensable pour la traçabilité réglementaire.' },
          { emoji: '🗃️', titre: 'Archivage',           texte: 'Archivez les véhicules vendus ou réformés plutôt que de les supprimer — l\'historique est précieux.' },
          { emoji: '📊', titre: 'Statuts',              texte: 'Mettez à jour les statuts (Actif/En maintenance/En panne) en temps réel pour des stats fiables.' },
        ],
      },
    ],
  },

  '/maintenances': {
    titre: 'Maintenances',
    sections: [
      {
        titre: '🔧 Gestion des interventions',
        conseils: [
          { emoji: '⚡', titre: 'Créer dès l\'entrée',  texte: 'Créez la maintenance dès l\'entrée au garage, pas en attendant la facture — ça bloque le statut véhicule.' },
          { emoji: '🏢', titre: 'Renseignez le prestataire', texte: 'Le fournisseur est obligatoire pour les rapports par prestataire et le suivi des coûts.' },
          { emoji: '🏁', titre: 'Clôturer rapidement', texte: 'Clôturez la maintenance dès la sortie du garage pour remettre le véhicule en statut «Actif».' },
          { emoji: '🛣️', titre: 'Axe de livraison',   texte: 'Associez un axe pour savoir sur quelle route la panne s\'est produite — utile pour l\'analyse.' },
        ],
      },
    ],
  },

  '/signalements': {
    titre: 'Signalements',
    sections: [
      {
        titre: '⚠️ Traitement des signalements',
        conseils: [
          { emoji: '🔴', titre: 'Critique = immédiat',  texte: 'Freins, moteur, direction — traitement dans les 4h. Immobilisez le véhicule si nécessaire.' },
          { emoji: '📞', titre: 'Contacter le chauffeur', texte: 'Pour les signalements peu clairs, contactez le chauffeur pour plus de détails avant d\'agir.' },
          { emoji: '🔧', titre: 'Créer une maintenance', texte: 'Si l\'intervention est nécessaire, créez directement une maintenance depuis le signalement.' },
          { emoji: '✅', titre: 'Fermer proprement',    texte: 'Un signalement résolu doit être fermé avec une note explicative pour garder la traçabilité.' },
        ],
      },
    ],
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// RESP. AGENCE (hérite de resp_parc avec focus sur son périmètre)
// ─────────────────────────────────────────────────────────────────────────────
const aidesRespAgence: RoleAide = {
  ...aidesRespParc,
  '/dashboard': {
    titre: 'Tableau de bord Resp. Agence',
    intro: 'Votre vue est limitée à votre agence. Concentrez-vous sur votre périmètre.',
    sections: [
      {
        titre: '🏢 Votre agence',
        conseils: [
          { emoji: '📍', titre: 'Périmètre limité',    texte: 'Vous ne voyez que les véhicules et chauffeurs rattachés à votre agence — c\'est votre responsabilité directe.' },
          { emoji: '🚗', titre: 'Disponibilité',       texte: 'Maintenez un maximum de véhicules en statut «Actif» pour assurer les opérations de l\'agence.' },
          { emoji: '⚠️', titre: 'Escalade',            texte: 'Pour les problèmes dépassant votre agence (budget, flotte globale), remontez au Resp. Parc.' },
        ],
      },
      {
        titre: '✅ Routine quotidienne',
        conseils: [
          { emoji: '🕐', titre: 'Début de journée',    texte: 'Vérifiez les checklists soumises et les signalements ouverts de votre agence chaque matin.' },
          { emoji: '📋', titre: 'Affectations',        texte: 'Assurez-vous que chaque chauffeur actif a bien un véhicule affecté pour la journée.' },
          { emoji: '📅', titre: 'Documents',           texte: 'Anticipez les renouvellements VT et assurance — un véhicule sans papiers ne peut pas rouler.' },
        ],
      },
    ],
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPTABLE
// ─────────────────────────────────────────────────────────────────────────────
const aidesComptable: RoleAide = {
  '/dashboard': {
    titre: 'Tableau de bord Comptable',
    sections: [
      {
        titre: '💰 Suivi financier',
        conseils: [
          { emoji: '📊', titre: 'TCO mensuel',         texte: 'Le TCO agrège maintenance + carburant. Comparez mois par mois pour détecter les dérives.' },
          { emoji: '⛽', titre: 'Carburant',           texte: 'Vérifiez les dotations consommées vs allouées — un dépassement peut signaler une anomalie.' },
          { emoji: '🧾', titre: 'Bons de commande',    texte: 'Les BC en attente de validation sont à traiter en priorité pour ne pas bloquer les opérations.' },
        ],
      },
    ],
  },

  '/carburant': {
    titre: 'Suivi carburant',
    sections: [
      {
        titre: '⛽ Analyse de la consommation',
        conseils: [
          { emoji: '📈', titre: 'Coût au km',          texte: 'Comparez le coût/km entre véhicules similaires pour détecter les anomalies de consommation.' },
          { emoji: '🎯', titre: 'Dotations',           texte: 'Définissez des dotations réalistes basées sur les historiques — ni trop serrées ni trop larges.' },
          { emoji: '📥', titre: 'Export mensuel',      texte: 'Exportez les données carburant en Excel chaque fin de mois pour la réconciliation comptable.' },
          { emoji: '🚨', titre: 'Alertes dépassement', texte: 'Une consommation >30% au-dessus de la moyenne mérite une vérification terrain.' },
        ],
      },
    ],
  },

  '/rapports': {
    titre: 'Rapports financiers',
    sections: [
      {
        titre: '📑 Rapports à votre disposition',
        conseils: [
          { emoji: '💹', titre: 'Rapport TCO',         texte: 'Vue consolidée du coût de possession — idéal pour les budgets prévisionnels et les arbitrages.' },
          { emoji: '⛽', titre: 'Rapport carburant',   texte: 'Suivi des consommations par chauffeur et par véhicule avec coût au km.' },
          { emoji: '🛣️', titre: 'Rapport axes',        texte: 'Coûts par route — utile pour facturer les axes de livraison à vos clients.' },
          { emoji: '📥', titre: 'Export PDF/Excel',    texte: 'PDF pour la présentation, Excel pour vos propres analyses et retraitements.' },
        ],
      },
    ],
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// ATTRIBUTAIRE (proche du chauffeur)
// ─────────────────────────────────────────────────────────────────────────────
const aidesAttributaire: RoleAide = {
  ...aidesChauffeur,
  '/dashboard': {
    titre: 'Bienvenue, Attributaire',
    intro: 'En tant qu\'attributaire, vous disposez d\'un véhicule de service. Voici vos responsabilités.',
    sections: [
      {
        titre: '🚗 Votre véhicule de service',
        conseils: [
          { emoji: '📋', titre: 'Checklist mensuelle', texte: 'Effectuez la checklist mensuelle pour signaler tout problème sur votre véhicule de service.' },
          { emoji: '⚠️', titre: 'Signalement',        texte: 'Tout incident (accident, panne, dommage) doit être signalé immédiatement dans SysPark.' },
          { emoji: '📅', titre: 'Documents',           texte: 'Vérifiez régulièrement que les documents de votre véhicule (VT, assurance) sont valides.' },
          { emoji: '🔔', titre: 'Alertes VT',         texte: 'En cas d\'alerte sur votre véhicule (rouge), contactez votre responsable sans attendre.' },
        ],
      },
      {
        titre: '✅ Responsabilités',
        conseils: [
          { emoji: '🧹', titre: 'Propreté',           texte: 'Maintenez votre véhicule propre et en bon état général — c\'est un bien de l\'entreprise.' },
          { emoji: '⛽', titre: 'Carburant',           texte: 'Utilisez uniquement la dotation carburant allouée et respectez votre budget mensuel.' },
          { emoji: '📌', titre: 'Usage professionnel', texte: 'Le véhicule de service est réservé à l\'usage professionnel selon la politique de votre entreprise.' },
        ],
      },
    ],
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Aide générique (fallback toutes pages / tous rôles)
// ─────────────────────────────────────────────────────────────────────────────
const aideGenerique: PageAide = {
  titre: 'Aide SysPark',
  intro: 'Bienvenue dans l\'aide contextuelle. Naviguez vers une page pour obtenir des conseils adaptés.',
  sections: [
    {
      titre: '💡 Conseils généraux',
      conseils: [
        { emoji: '🔔', titre: 'Alertes',         texte: 'Consultez les alertes chaque jour — les rouges sont urgentes, les jaunes sont à planifier.' },
        { emoji: '📊', titre: 'Données à jour',  texte: 'La fiabilité des rapports dépend de la qualité et de la fraîcheur des données saisies.' },
        { emoji: '🔒', titre: 'Sécurité',        texte: 'Ne partagez jamais vos identifiants. Déconnectez-vous sur les postes partagés.' },
        { emoji: '📞', titre: 'Support',         texte: 'En cas de problème technique, contactez votre administrateur SysPark.' },
      ],
    },
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// Index principal
// ─────────────────────────────────────────────────────────────────────────────
const INDEX_AIDE: Record<string, RoleAide> = {
  chauffeur:   aidesChauffeur,
  attributaire: aidesAttributaire,
  directeur:   aidesDirecteur,
  resp_parc:   aidesRespParc,
  resp_agence: aidesRespAgence,
  comptable:   aidesComptable,
  super_admin: aidesRespParc, // fallback
}

/**
 * Retourne le contenu d'aide adapté au rôle et à la page courante.
 * Cherche la clé la plus spécifique (plus longue) qui est un préfixe du pathname.
 */
export function getAideContextuelle(role: string | null, pathname: string): PageAide {
  if (!role) return aideGenerique

  const aidesRole = INDEX_AIDE[role]
  if (!aidesRole) return aideGenerique

  // Trouver la clé la plus spécifique qui est un préfixe du pathname courant
  const clés = Object.keys(aidesRole).sort((a, b) => b.length - a.length)
  const clé  = clés.find(k => pathname === k || pathname.startsWith(k + '/') || pathname.startsWith(k))

  return clé ? aidesRole[clé] : aideGenerique
}
