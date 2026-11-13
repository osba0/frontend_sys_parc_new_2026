import { useState, useRef } from 'react'
import { Camera, Trash2 } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/api/axiosInstance'
import toast from 'react-hot-toast'

// ── Utilitaire initiales ─────────────────────────────────────

export function getInitiales(prenom?: string | null, nom?: string | null): string {
  const p = (prenom ?? '').trim()
  const n = (nom   ?? '').trim()
  return `${p[0] ?? ''}${n[0] ?? ''}`.toUpperCase() || '?'
}

// ── Couleurs déterministes par nom ───────────────────────────

const AVATAR_COLORS = [
  'bg-blue-500',   'bg-green-500',  'bg-purple-500',
  'bg-orange-500', 'bg-teal-500',   'bg-rose-500',
  'bg-indigo-500', 'bg-amber-500',  'bg-cyan-500',
  'bg-pink-500',
]

export function getAvatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

// ─────────────────────────────────────────────────────────────
// Composant Avatar — lecture seule
// ─────────────────────────────────────────────────────────────

interface AvatarProps {
  photoUrl?:  string | null
  prenom?:    string | null
  nom?:       string | null
  size?:      'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const SIZE_CLASSES = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-base',
  xl: 'w-20 h-20 text-xl',
}

export function ChauffeurAvatar({ photoUrl, prenom, nom, size = 'md', className = '' }: AvatarProps) {
  const initiales = getInitiales(prenom, nom)
  const couleur   = getAvatarColor(`${prenom}${nom}`)
  const sizeClass = SIZE_CLASSES[size]

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={`${prenom} ${nom}`}
        className={`${sizeClass} rounded-full object-cover flex-shrink-0 ${className}`}
        onError={(e) => {
          // Fallback aux initiales si l'image échoue
          e.currentTarget.style.display = 'none'
          const parent = e.currentTarget.parentElement
          if (parent) parent.innerHTML = `<div class="${sizeClass} ${couleur} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 ${className}">${initiales}</div>`
        }}
      />
    )
  }

  return (
    <div className={`${sizeClass} ${couleur} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 ${className}`}>
      {initiales}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Composant Avatar éditable — avec upload et suppression
// ─────────────────────────────────────────────────────────────

interface EditableAvatarProps {
  chauffeurId: number
  photoUrl?:   string | null
  prenom?:     string | null
  nom?:        string | null
  size?:       'lg' | 'xl'
  onUpdated?:  (newUrl: string | null) => void
}

export function ChauffeurAvatarEditable({
  chauffeurId,
  photoUrl,
  prenom,
  nom,
  size = 'xl',
  onUpdated,
}: EditableAvatarProps) {
  const qc       = useQueryClient()
  const fileRef  = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(photoUrl ?? null)

  const uploadMut = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData()
      fd.append('photo', file)
      return api.post(`/chauffeurs/${chauffeurId}/photo`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    },
    onSuccess: (res) => {
      const url = res.data.data?.photo_profil_url ?? null
      setPreview(url)
      onUpdated?.(url)
      qc.invalidateQueries({ queryKey: ['chauffeur', chauffeurId] })
      qc.invalidateQueries({ queryKey: ['chauffeurs'] })
      toast.success('Photo mise à jour.')
    },
    onError: () => toast.error('Erreur lors de l\'upload.'),
  })

  const deleteMut = useMutation({
    mutationFn: () => api.delete(`/chauffeurs/${chauffeurId}/photo`),
    onSuccess: () => {
      setPreview(null)
      onUpdated?.(null)
      qc.invalidateQueries({ queryKey: ['chauffeur', chauffeurId] })
      qc.invalidateQueries({ queryKey: ['chauffeurs'] })
      toast.success('Photo supprimée.')
    },
    onError: () => toast.error('Erreur lors de la suppression.'),
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPreview(URL.createObjectURL(file))
    uploadMut.mutate(file)
    e.target.value = ''
  }

  const sizeClass = SIZE_CLASSES[size]

  return (
    <div className="relative inline-block">
      <ChauffeurAvatar
        photoUrl={preview}
        prenom={prenom}
        nom={nom}
        size={size}
      />

      {/* Overlay actions */}
      <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-1 cursor-pointer">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="p-1.5 bg-white/90 rounded-full text-gray-700 hover:bg-white transition-colors"
          title="Changer la photo"
        >
          <Camera size={size === 'xl' ? 14 : 12} />
        </button>
        {preview && (
          <button
            type="button"
            onClick={() => deleteMut.mutate()}
            className="p-1.5 bg-red-500/90 rounded-full text-white hover:bg-red-500 transition-colors"
            title="Supprimer la photo"
          >
            <Trash2 size={size === 'xl' ? 14 : 12} />
          </button>
        )}
      </div>

      {/* Indicateur upload */}
      {uploadMut.isPending && (
        <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  )
}
