import { useState, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ChevronLeft, ChevronRight, Upload, Trash2,
  Star, StarOff, ZoomIn, X, ImagePlus,
} from 'lucide-react'
import { vehiculesApi } from '@/api/vehicules.api'
import { useAuthStore } from '@/stores/authStore'
import { LoadingSpinner } from '@/components/shared/LoadingPage'
import toast from 'react-hot-toast'

// ── Types ─────────────────────────────────────────────────────

interface Photo {
  id:         number
  url:        string
  thumb_url:  string
  nom:        string
  taille:     string
  principale: boolean
  created_at: string
}

// ── Lightbox ──────────────────────────────────────────────────

function Lightbox({ photos, index, onClose, onNext, onPrev }: {
  photos:  Photo[]
  index:   number
  onClose: () => void
  onNext:  () => void
  onPrev:  () => void
}) {
  const photo = photos[index]
  if (!photo) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Fermer */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white/70 hover:text-white p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all"
      >
        <X size={22} />
      </button>

      {/* Compteur */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/60 text-sm">
        {index + 1} / {photos.length}
      </div>

      {/* Prev */}
      {photos.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onPrev() }}
          className="absolute left-4 text-white/70 hover:text-white p-3 rounded-full bg-white/10 hover:bg-white/20 transition-all"
        >
          <ChevronLeft size={28} />
        </button>
      )}

      {/* Image */}
      <img
        src={photo.url}
        alt={photo.nom}
        className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />

      {/* Next */}
      {photos.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onNext() }}
          className="absolute right-4 text-white/70 hover:text-white p-3 rounded-full bg-white/10 hover:bg-white/20 transition-all"
        >
          <ChevronRight size={28} />
        </button>
      )}

      {/* Infos */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center">
        {photo.principale && (
          <span className="text-yellow-400 text-xs font-medium">⭐ Photo principale</span>
        )}
        <p className="text-white/40 text-xs mt-1">{photo.nom} · {photo.taille}</p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Composant principal
// ─────────────────────────────────────────────────────────────

export default function VehiculePhotos({ vehiculeId }: { vehiculeId: number }) {
  const qc            = useQueryClient()
  const { hasRole }   = useAuthStore()
  const peutModifier  = hasRole('super_admin', 'directeur', 'resp_parc', 'resp_agence')

  const [sliderIdx,  setSliderIdx]  = useState(0)
  const [lightbox,   setLightbox]   = useState<number | null>(null)
  const [dragging,   setDragging]   = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // ── Queries ──────────────────────────────────────────────────

  const { data: photos = [], isLoading } = useQuery({
    queryKey: ['vehicule-photos', vehiculeId],
    queryFn:  () => vehiculesApi.photos(vehiculeId).then(r => r.data.data as Photo[]),
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['vehicule-photos', vehiculeId] })

  const uploadMut = useMutation({
    mutationFn: (files: File[]) => vehiculesApi.uploadPhotos(vehiculeId, files),
    onSuccess: (res: any) => {
      invalidate()
      const nb = res.data.data?.length ?? 1
      toast.success(`${nb} photo(s) ajoutée(s).`)
      setSliderIdx(photos.length)  // aller à la nouvelle photo
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erreur upload.'),
  })

  const deleteMut = useMutation({
    mutationFn: (mediaId: number) => vehiculesApi.deletePhoto(vehiculeId, mediaId),
    onSuccess: () => {
      invalidate()
      setSliderIdx(s => Math.max(0, s - 1))
      toast.success('Photo supprimée.')
    },
    onError: () => toast.error('Erreur lors de la suppression.'),
  })

  const principaleMut = useMutation({
    mutationFn: (mediaId: number) => vehiculesApi.setPhotoPrincipale(vehiculeId, mediaId),
    onSuccess: () => { invalidate(); toast.success('Photo principale définie.') },
  })

  // ── Drag & Drop ───────────────────────────────────────────────

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const files = Array.from(e.dataTransfer.files).filter(
      f => ['image/jpeg', 'image/png', 'image/webp'].includes(f.type)
    )
    if (files.length) uploadMut.mutate(files)
  }, [uploadMut])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length) uploadMut.mutate(files)
    e.target.value = ''
  }

  // ── Navigation slider ─────────────────────────────────────────

  const currentIdx = Math.min(sliderIdx, Math.max(0, photos.length - 1))
  const current    = photos[currentIdx]
  const hasPrev    = currentIdx > 0
  const hasNext    = currentIdx < photos.length - 1

  // ── Lightbox navigation ───────────────────────────────────────

  const lightboxNext = () => setLightbox(i => i !== null ? (i + 1) % photos.length : null)
  const lightboxPrev = () => setLightbox(i => i !== null ? (i - 1 + photos.length) % photos.length : null)

  // ─────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="card p-8 text-center">
        <LoadingSpinner size="md" />
      </div>
    )
  }

  return (
    <div className="space-y-4">

      {/* Lightbox */}
      {lightbox !== null && (
        <Lightbox
          photos={photos}
          index={lightbox}
          onClose={() => setLightbox(null)}
          onNext={lightboxNext}
          onPrev={lightboxPrev}
        />
      )}

      {/* ── Slider principal ── */}
      {photos.length > 0 ? (
        <div className="card overflow-hidden p-0">
          {/* Grande image */}
          <div className="relative bg-gray-900 aspect-video md:aspect-[16/7] overflow-hidden">
            <img
              src={current?.url}
              alt={current?.nom}
              className="w-full h-full object-cover cursor-zoom-in transition-opacity duration-300"
              onClick={() => setLightbox(currentIdx)}
            />

            {/* Badge principale */}
            {current?.principale && (
              <div className="absolute top-3 left-3 bg-yellow-400 text-yellow-900 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow">
                <Star size={11} fill="currentColor" /> Photo principale
              </div>
            )}

            {/* Bouton zoom */}
            <button
              onClick={() => setLightbox(currentIdx)}
              className="absolute top-3 right-3 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full transition-all"
              title="Agrandir"
            >
              <ZoomIn size={16} />
            </button>

            {/* Navigation slider */}
            {hasPrev && (
              <button
                onClick={() => setSliderIdx(currentIdx - 1)}
                className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/70 text-white p-2.5 rounded-full transition-all shadow-lg"
              >
                <ChevronLeft size={20} />
              </button>
            )}
            {hasNext && (
              <button
                onClick={() => setSliderIdx(currentIdx + 1)}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/70 text-white p-2.5 rounded-full transition-all shadow-lg"
              >
                <ChevronRight size={20} />
              </button>
            )}

            {/* Compteur */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-3 py-1 rounded-full">
              {currentIdx + 1} / {photos.length}
            </div>
          </div>

          {/* Miniatures */}
          <div className="flex gap-2 p-3 overflow-x-auto bg-gray-50 border-t border-gray-100">
            {photos.map((photo, idx) => (
              <div
                key={photo.id}
                className={`relative flex-shrink-0 group cursor-pointer rounded-lg overflow-hidden transition-all ${
                  idx === currentIdx
                    ? 'ring-2 ring-primary-500 ring-offset-1'
                    : 'opacity-70 hover:opacity-100'
                }`}
                style={{ width: 72, height: 56 }}
                onClick={() => setSliderIdx(idx)}
              >
                <img
                  src={photo.thumb_url || photo.url}
                  alt={photo.nom}
                  className="w-full h-full object-cover"
                />
                {photo.principale && (
                  <div className="absolute top-0.5 right-0.5 w-3 h-3 bg-yellow-400 rounded-full" title="Principale" />
                )}

                {/* Actions au hover */}
                {peutModifier && (
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                    {!photo.principale && (
                      <button
                        onClick={(e) => { e.stopPropagation(); principaleMut.mutate(photo.id) }}
                        className="p-1 bg-yellow-400 rounded text-yellow-900 hover:bg-yellow-300 transition-colors"
                        title="Définir comme principale"
                      >
                        <Star size={11} />
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); if (confirm('Supprimer cette photo ?')) deleteMut.mutate(photo.id) }}
                      className="p-1 bg-red-500 rounded text-white hover:bg-red-400 transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                )}
              </div>
            ))}

            {/* Bouton ajouter dans les miniatures */}
            {peutModifier && (
              <button
                onClick={() => inputRef.current?.click()}
                className="flex-shrink-0 w-[72px] h-14 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-primary-400 hover:bg-primary-50 transition-all text-gray-400 hover:text-primary-600"
                title="Ajouter des photos"
              >
                <ImagePlus size={18} />
              </button>
            )}
          </div>
        </div>
      ) : (
        /* ── Zone upload quand aucune photo ── */
        peutModifier && (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onClick={() => inputRef.current?.click()}
            className={`card p-12 text-center cursor-pointer border-2 border-dashed transition-all ${
              dragging
                ? 'border-primary-400 bg-primary-50'
                : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
            }`}
          >
            <Upload size={36} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">Ajouter des photos</p>
            <p className="text-gray-400 text-sm mt-1">
              Glissez-déposez ou cliquez · JPG, PNG, WEBP · max 5 Mo
            </p>
          </div>
        )
      )}

      {/* ── Zone upload drag & drop (quand des photos existent déjà) ── */}
      {peutModifier && photos.length > 0 && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
            dragging
              ? 'border-primary-400 bg-primary-50'
              : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
          }`}
        >
          {uploadMut.isPending ? (
            <div className="flex items-center justify-center gap-2 text-primary-600">
              <LoadingSpinner size="sm" />
              <span className="text-sm">Upload en cours…</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 text-gray-500">
              <Upload size={16} />
              <span className="text-sm">Ajouter d'autres photos — glisser-déposer ou cliquer</span>
            </div>
          )}
        </div>
      )}

      {/* Input file caché */}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

    </div>
  )
}
