// Composants et constantes partagés entre ChecklistListPage et VehiculeDetailPage

// ─────────────────────────────────────────────────────────────
// Sections data_json par type de checklist
// ─────────────────────────────────────────────────────────────

export const CHECKLIST_SECTIONS: Record<string, Record<string, Record<string, string>>> = {
  hebdomadaire_vehicule: {
    'Pneumatiques': { pneu_av: 'ok', pneu_ar: 'ok', pression: 'ok' },
    'Eclairage': { phare_av_g: 'ok', phare_av_d: 'ok', feu_stop: 'ok', clignotant_avg: 'ok', clignotant_avd: 'ok', clignotant_arg: 'ok', clignotant_ard: 'ok' },
    'Freinage': { frein_av: 'ok', frein_ar: 'ok' },
    'Niveaux': { huile_moteur: 'ok', liquide_refroid: 'ok', lave_glace: 'ok' },
    'Carrosserie': { etat_carrosserie: 'ok', retroviseur_g: 'ok', retroviseur_d: 'ok', pare_brise: 'ok' },
    'Documents de bord': { carte_grise: 'oui', assurance: 'oui', extincteur: 'oui', triangle: 'oui' },
    'Proprete': { interieur: 'ok', exterieur: 'ok' },
  },
  hebdomadaire_scooter: {
    'Pneumatiques': { pneu_av: 'ok', pneu_ar: 'ok', pression: 'ok' },
    'Eclairage': { phare_av: 'ok', feu_stop: 'ok', clignotants: 'ok' },
    'Freinage': { frein_av: 'ok', frein_ar: 'ok' },
    'Carenage': { carenage_av_g: 'ok', carenage_av_d: 'ok', carenage_ar_g: 'ok', carenage_ar_d: 'ok', garde_boue_av: 'ok', garde_boue_ar: 'ok', visiere: 'ok' },
    'Documents': { carte_grise: 'oui', assurance: 'oui', casque: 'oui', gilet: 'oui' },
    'Proprete': { etat_general: 'ok' },
  },
  visite_technique: {
    'Moteur': { moteur: 'ok', temperature: 'ok', huile_moteur: 'ok', fuite_moteur: 'non' },
    'Freinage': { frein_av: 'ok', frein_ar: 'ok', disque_frein_av: 'ok', disque_frein_ar: 'ok', frein_stationnement: 'ok' },
    'Direction': { direction: 'ok', suspension: 'ok', rotules: 'ok' },
    'Pneumatiques': { pneu_av: 'ok', pneu_ar: 'ok', profondeur_sculpture: 'ok' },
    'Eclairage': { phare_av_g: 'ok', phare_av_d: 'ok', feu_stop: 'ok', feux_ar: 'ok' },
    'Carrosserie': { carrosserie: 'ok', chassis: 'ok', pare_brise: 'ok' },
    'Niveaux': { huile_moteur: 'ok', liquide_refroid: 'ok', liquide_frein: 'ok' },
  },
  passation: {
    'Etat exterieur': { carrosserie: 'ok', vitrages: 'ok', retroviseurs: 'ok', pneumatiques: 'ok' },
    'Etat interieur': { siege: 'ok', tableau_bord: 'ok', ceintures: 'ok', proprete_int: 'ok' },
    'Mecanique': { moteur: 'ok', freins: 'ok', direction: 'ok', niveaux: 'ok' },
    'Documents': { carte_grise: 'oui', assurance: 'oui', cles: 'oui' },
    'Equipements': { extincteur: 'oui', triangle: 'oui', cric: 'oui', roue_secours: 'oui' },
  },
  attribution: {
    'Etat general': { carrosserie: 'ok', pneumatiques: 'ok', eclairage: 'ok', freinage: 'ok', moteur: 'ok' },
    'Documents remis': { carte_grise: 'oui', assurance: 'oui', carnet_entretien: 'oui' },
    'Equipements remis': { cles: 'oui', extincteur: 'oui', triangle: 'oui', cric: 'oui', roue_secours: 'oui', carte_carburant: 'non' },
    'Proprete': { exterieur: 'ok', interieur: 'ok' },
  },
}

// ─────────────────────────────────────────────────────────────
// Labels et couleurs des valeurs
// ─────────────────────────────────────────────────────────────

export const VALEUR_LABELS: Record<string, { label: string; color: string }> = {
  ok:      { label: 'OK',      color: 'bg-green-100 text-green-700 border-green-300'    },
  moyen:   { label: 'Moyen',   color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  mauvais: { label: 'Mauvais', color: 'bg-red-100 text-red-700 border-red-300'          },
  oui:     { label: 'Oui',     color: 'bg-green-100 text-green-700 border-green-300'    },
  non:     { label: 'Non',     color: 'bg-red-100 text-red-700 border-red-300'          },
  na:      { label: 'N/A',     color: 'bg-gray-100 text-gray-500 border-gray-200'       },
}

// ─────────────────────────────────────────────────────────────
// Composant item de checklist
// ─────────────────────────────────────────────────────────────

interface ChecklistItemProps {
  label:       string
  value:       string
  onChange:    (v: string) => void
  isBoolType:  boolean
}

export function ChecklistItem({ label, value, onChange, isBoolType }: ChecklistItemProps) {
  const options = isBoolType ? ['oui', 'non', 'na'] : ['ok', 'moyen', 'mauvais', 'na']

  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-700 capitalize flex-1 pr-3">
        {label.replace(/_/g, ' ')}
      </span>
      <div className="flex gap-1">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`px-2 py-0.5 text-xs rounded border font-medium transition-all ${
              value === opt
                ? VALEUR_LABELS[opt].color
                : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
            }`}
          >
            {VALEUR_LABELS[opt].label}
          </button>
        ))}
      </div>
    </div>
  )
}
