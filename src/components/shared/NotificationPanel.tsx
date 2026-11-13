import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, CheckCheck, Trash2, ExternalLink, X } from 'lucide-react'
import { notificationsApi, type AppNotification } from '@/api/notifications.api'
import { useNotificationStore } from '@/stores/notificationStore'
import { LoadingSpinner } from '@/components/shared/LoadingPage'
import { formatDate } from '@/utils'
import toast from 'react-hot-toast'

// ── Couleurs par niveau ──────────────────────────────────────

const NIVEAU_STYLE = {
  danger:  { bar: 'bg-red-500',    bg: 'bg-red-50',     dot: 'bg-red-400',    text: 'text-red-700'   },
  warning: { bar: 'bg-orange-400', bg: 'bg-orange-50',  dot: 'bg-orange-400', text: 'text-orange-700'},
  success: { bar: 'bg-green-500',  bg: 'bg-green-50',   dot: 'bg-green-400',  text: 'text-green-700' },
  info:    { bar: 'bg-blue-400',   bg: 'bg-blue-50',    dot: 'bg-blue-400',   text: 'text-blue-700'  },
} as const

// ── Item notification ────────────────────────────────────────

function NotifItem({ notif, onClose }: { notif: AppNotification; onClose: () => void }) {
  const navigate   = useNavigate()
  const qc         = useQueryClient()
  const { decrement } = useNotificationStore()
  const estLue     = !!notif.read_at
  const style      = NIVEAU_STYLE[notif.data.niveau] ?? NIVEAU_STYLE.info

  const lireMut = useMutation({
    mutationFn: () => notificationsApi.marquerLue(notif.id),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      qc.invalidateQueries({ queryKey: ['notif-compteur'] })
      if (!estLue) decrement()
    },
  })

  const supprimerMut = useMutation({
    mutationFn: () => notificationsApi.supprimer(notif.id),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      qc.invalidateQueries({ queryKey: ['notif-compteur'] })
      if (!estLue) decrement()
    },
    onError: () => toast.error('Erreur lors de la suppression.'),
  })

  const handleClick = () => {
    if (!estLue) lireMut.mutate()
    if (notif.data.lien) {
      navigate(notif.data.lien)
      onClose()
    }
  }

  return (
    <div className={`relative flex gap-3 px-4 py-3 border-b border-gray-50 transition-colors group ${
      estLue ? 'bg-white hover:bg-gray-50' : `${style.bg} hover:brightness-95`
    }`}>
      {/* Barre colorée gauche */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-r ${estLue ? 'bg-gray-200' : style.bar}`} />

      {/* Indicateur non-lu */}
      {!estLue && (
        <div className={`absolute top-3 right-3 w-2 h-2 rounded-full ${style.dot} flex-shrink-0`} />
      )}

      {/* Contenu cliquable */}
      <div className="flex-1 min-w-0 cursor-pointer pl-1" onClick={handleClick}>
        <p className={`text-sm font-semibold leading-tight ${estLue ? 'text-gray-700' : 'text-gray-900'}`}>
          {notif.data.titre}
        </p>
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-snug">
          {notif.data.message}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-gray-400">{formatDate(notif.created_at)}</span>
          {notif.data.lien && (
            <span className={`text-[10px] font-medium ${style.text} flex items-center gap-0.5`}>
              <ExternalLink size={9} /> Voir
            </span>
          )}
        </div>
      </div>

      {/* Actions hover */}
      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        {!estLue && (
          <button onClick={(e) => { e.stopPropagation(); lireMut.mutate() }}
            className="p-1 rounded text-gray-400 hover:text-green-600 hover:bg-white transition-colors"
            title="Marquer comme lu">
            <CheckCheck size={13} />
          </button>
        )}
        <button onClick={(e) => { e.stopPropagation(); supprimerMut.mutate() }}
          className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-white transition-colors"
          title="Supprimer">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

// ── Panneau principal ────────────────────────────────────────

export default function NotificationPanel({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const { reset } = useNotificationStore()
  const [filtre, setFiltre] = useState<'toutes' | 'non_lues'>('toutes')

  const { data, isLoading } = useQuery({
    queryKey:  ['notifications', filtre],
    queryFn:   () => notificationsApi.list({ filtre, page: 1 }).then(r => r.data),
    refetchInterval: 30_000,
  })

  const notifications = data?.data ?? []
  const nonLues       = data?.meta?.non_lues ?? 0

  const toutLireMut = useMutation({
    mutationFn: () => notificationsApi.toutLire(),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      qc.invalidateQueries({ queryKey: ['notif-compteur'] })
      reset()
      toast.success('Toutes les notifications ont été lues.')
    },
  })

  const viderMut = useMutation({
    mutationFn: () => notificationsApi.viderLues(),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      toast.success('Notifications lues supprimées.')
    },
  })

  return (
    <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden">

      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
        <div className="flex items-center gap-2">
          <Bell size={15} className="text-primary-600" />
          <span className="font-semibold text-gray-900 text-sm">Notifications</span>
          {nonLues > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
              {nonLues > 99 ? '99+' : nonLues}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {nonLues > 0 && (
            <button onClick={() => toutLireMut.mutate()} disabled={toutLireMut.isPending}
              className="text-xs text-primary-600 hover:text-primary-800 font-medium flex items-center gap-1"
              title="Tout marquer comme lu">
              <CheckCheck size={12} /> Tout lire
            </button>
          )}
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-0.5">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex border-b border-gray-100">
        {(['toutes', 'non_lues'] as const).map((f) => (
          <button key={f} onClick={() => setFiltre(f)}
            className={`flex-1 text-xs py-2 font-medium transition-colors ${
              filtre === f
                ? 'text-primary-700 border-b-2 border-primary-600 bg-primary-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}>
            {f === 'toutes' ? 'Toutes' : `Non lues${nonLues > 0 ? ` (${nonLues})` : ''}`}
          </button>
        ))}
      </div>

      {/* Liste */}
      <div className="max-h-[420px] overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="md" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-10 text-center">
            <Bell size={28} className="mx-auto text-gray-200 mb-2" />
            <p className="text-sm text-gray-400">
              {filtre === 'non_lues' ? 'Aucune notification non lue' : 'Aucune notification'}
            </p>
          </div>
        ) : (
          notifications.map((n) => (
            <NotifItem key={n.id} notif={n} onClose={onClose} />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-gray-100 flex items-center justify-between bg-gray-50">
        <button onClick={() => viderMut.mutate()} disabled={viderMut.isPending}
          className="text-[11px] text-gray-400 hover:text-red-500 flex items-center gap-1 transition-colors">
          <Trash2 size={10} /> Vider les lues
        </button>
        <span className="text-[11px] text-gray-400">
          {data?.meta?.total ?? 0} notification(s)
        </span>
      </div>
    </div>
  )
}
