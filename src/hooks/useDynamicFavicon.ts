import { useEffect } from 'react'
import { useConfigStore } from '@/stores/configStore'
import { useAppStore } from '@/stores/appStore'
import { mediaUrl } from '@/utils'

/**
 * Met à jour dynamiquement le favicon (et le titre de l'onglet) en
 * fonction de la configuration entreprise.
 *
 * Sources, par ordre de priorité :
 *   1. configStore (chargé après authentification, le plus à jour)
 *   2. appStore    (endpoint public /app-info, disponible avant connexion)
 *
 * Favicon, par ordre de priorité :
 *   1. logo_app_url (logo application — Sidebar)
 *   2. logo_url     (logo entreprise — Topbar/PDF)
 *   3. /favicon.svg (favicon par défaut, statique)
 *
 * Le favicon par défaut est restauré automatiquement si aucun logo
 * n'est configuré (ex: avant le premier chargement, ou après suppression).
 */
export function useDynamicFavicon() {
  const { config }   = useConfigStore()
  const appInfo      = useAppStore()

  const logoAppUrl = config?.logo_app_url ?? appInfo.logoAppUrl
  const logoUrl    = config?.logo_url     ?? appInfo.logoUrl
  const nom        = config?.nom          ?? appInfo.appName

  useEffect(() => {
    const logo = mediaUrl(logoAppUrl) ?? mediaUrl(logoUrl)
    setFavicon(logo ?? '/favicon.svg')

    if (nom) {
      document.title = `${nom} — Gestion du Parc Automobile`
    }
  }, [logoAppUrl, logoUrl, nom])
}

/**
 * Remplace (ou crée) le <link rel="icon"> du document avec l'URL fournie.
 * Gère les formats SVG, PNG, JPG, ICO en laissant le navigateur déduire
 * le type via une extension par défaut si l'URL n'en contient pas.
 */
function setFavicon(href: string): void {
  const existingLinks = document.querySelectorAll<HTMLLinkElement>("link[rel*='icon']")
  existingLinks.forEach((link) => link.remove())

  const link = document.createElement('link')
  link.rel  = 'icon'
  link.type = guessMimeType(href)
  link.href = href
  document.head.appendChild(link)
}

function guessMimeType(url: string): string {
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'svg':  return 'image/svg+xml'
    case 'png':  return 'image/png'
    case 'jpg':
    case 'jpeg': return 'image/jpeg'
    case 'webp': return 'image/webp'
    case 'ico':  return 'image/x-icon'
    default:     return 'image/png'
  }
}
