import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { X, Lightbulb, ChevronRight } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { getAideContextuelle } from '@/data/aideContextuelle'

interface Props {
  open:    boolean
  onClose: () => void
}

export default function AideDrawer({ open, onClose }: Props) {
  const { role } = useAuthStore()
  const { pathname } = useLocation()

  const aide = getAideContextuelle(role, pathname)

  // Fermer sur Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Bloquer le scroll quand ouvert
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px] transition-opacity duration-200 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-sm bg-white shadow-2xl flex flex-col
          transition-transform duration-300 ease-in-out ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-primary-700 to-primary-600 flex-shrink-0">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <Lightbulb size={16} className="text-yellow-300" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm leading-tight truncate">{aide.titre}</p>
            <p className="text-primary-200 text-xs mt-0.5">Aide contextuelle SysPark</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors flex-shrink-0"
            aria-label="Fermer l'aide"
          >
            <X size={16} />
          </button>
        </div>

        {/* Intro */}
        {aide.intro && (
          <div className="px-5 py-3 bg-primary-50 border-b border-primary-100">
            <p className="text-sm text-primary-700 leading-relaxed">{aide.intro}</p>
          </div>
        )}

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {aide.sections.map((section, si) => (
            <div key={si}>
              {/* Titre section */}
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                {section.titre}
              </h4>

              {/* Conseils */}
              <div className="space-y-2">
                {section.conseils.map((conseil, ci) => (
                  <div
                    key={ci}
                    className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 hover:bg-primary-50/50 transition-colors"
                  >
                    <span className="text-xl flex-shrink-0 mt-0.5" role="img" aria-label="">
                      {conseil.emoji}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 leading-snug">
                        {conseil.titre}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                        {conseil.texte}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex-shrink-0">
          <p className="text-xs text-gray-400 text-center">
            💡 Le contenu s'adapte automatiquement à la page consultée
          </p>
        </div>
      </div>
    </>
  )
}
