/// <reference types="vite/client" />

/**
 * Typage des variables d'environnement Vite (import.meta.env).
 *
 * Vite expose par défaut :
 *   import.meta.env.MODE        string  — 'development' | 'production' | 'test'
 *   import.meta.env.BASE_URL    string  — base URL du projet (vite.config base)
 *   import.meta.env.PROD        boolean — true en production
 *   import.meta.env.DEV         boolean — true en développement
 *   import.meta.env.SSR         boolean — true en SSR
 *
 * Variables custom du projet (préfixe VITE_ obligatoire pour être exposées) :
 */
interface ImportMetaEnv {
  // URL du backend Laravel — obligatoire en dev (frontend :5173 ≠ backend :8000)
  // En production même domaine : laisser vide ou ne pas définir
  readonly VITE_API_URL:  string

  // Nom de l'application affiché dans le titre
  readonly VITE_APP_NAME: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
