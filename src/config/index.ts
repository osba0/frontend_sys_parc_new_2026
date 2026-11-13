/**
 * Configuration centralisée de l'application.
 *
 * Toutes les variables d'environnement Vite (VITE_*) sont lues ici.
 * Le reste de l'application importe depuis ce fichier — jamais
 * import.meta.env directement dans les composants.
 *
 * Ordre de chargement Vite :
 *   .env                 (toujours chargé)
 *   .env.local           (toujours chargé, ignoré par git)
 *   .env.[mode]          (.env.development ou .env.production)
 *   .env.[mode].local    (local override, ignoré par git)
 */

// ── Détection de l'environnement ─────────────────────────────
export const IS_DEV  = import.meta.env.DEV   // true pendant `npm run dev`
export const IS_PROD = import.meta.env.PROD  // true pendant `npm run build`
export const MODE    = import.meta.env.MODE  // "development" | "production"

// ── URL de l'API ──────────────────────────────────────────────
//
// Logique de résolution :
//
//   DEV  + VITE_API_URL vide  → "/api/v1"
//     Le proxy Vite (vite.config.ts) redirige /api → http://127.0.0.1:8000
//     C'est la configuration recommandée en développement.
//     Aucun problème CORS, la requête part sur la même origine.
//
//   DEV  + VITE_API_URL défini → VITE_API_URL + "/api/v1"
//     Utile pour pointer vers un serveur de dev distant ou
//     si le port Laravel n'est pas 8000.
//
//   PROD + VITE_API_URL         → VITE_API_URL + "/api/v1"
//     Obligatoire en production — pas de proxy Vite.
//     Exemple : https://api.parcauto.sn/api/v1
//
const rawApiUrl = import.meta.env.VITE_API_URL as string | undefined

export const API_BASE_URL = rawApiUrl
  ? `${rawApiUrl.replace(/\/$/, '')}/api/v1`   // trim slash final
  : '/api/v1'                                   // proxy Vite en dev

// ── Application ───────────────────────────────────────────────
export const APP_NAME    = (import.meta.env.VITE_APP_NAME as string | undefined) ?? 'Parc Auto'
export const APP_URL     = (import.meta.env.VITE_APP_URL  as string | undefined) ?? '/'
export const API_DEBUG   = import.meta.env.VITE_API_DEBUG === 'true'

// ── Timeouts & pagination ─────────────────────────────────────
export const API_TIMEOUT      = 30_000  // ms
export const DEFAULT_PER_PAGE = 25
