import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { communicationsApi } from '@/api/communications.api'
import { useAgences } from '@/hooks'
import { useAuthStore } from '@/stores/authStore'
import PageHeader from '@/components/shared/PageHeader'
import { LoadingSpinner } from '@/components/shared/LoadingPage'
import { Paperclip, X, Send, Save } from 'lucide-react'
import toast from 'react-hot-toast'

const ROLES = [
  { value: 'super_admin',  label: 'Super Admin' },
  { value: 'directeur',    label: 'Directeur' },
  { value: 'resp_parc',    label: 'Resp. Parc' },
  { value: 'resp_agence',  label: 'Resp. Agence' },
  { value: 'comptable',    label: 'Comptable' },
  { value: 'chauffeur',    label: 'Chauffeur' },
  { value: 'attributaire', label: 'Attributaire' },
]

const schema = z.object({
  titre:                  z.string().min(3, 'Titre obligatoire (3 caractères min.)').max(200),
  contenu:                z.string().min(5, 'Contenu obligatoire'),
  type:                   z.enum(['annonce', 'note_service']),
  gravite:                z.enum(['info', 'importante', 'critique']),
  roles_cibles:           z.array(z.string()).nullable(),
  agences_cibles:         z.array(z.number()).nullable(),
  date_publication:       z.string().optional().or(z.literal('')),
  date_expiration:        z.string().optional().or(z.literal('')),
  accuse_lecture_requis:  z.boolean(),
})
type FormData = z.infer<typeof schema>

function F({ label, hint, error, children }: {
  label: string; hint?: string; error?: string; children: React.ReactNode
}) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint && !error && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
      {error && <p className="error-msg">{error}</p>}
    </div>
  )
}

export default function CommunicationFormPage() {
  const navigate = useNavigate()
  const { id }   = useParams()
  const [searchParams] = useSearchParams()
  const isEdit   = !!id
  const qc       = useQueryClient()
  const { hasRole } = useAuthStore()
  const peutPublier = hasRole('super_admin', 'directeur', 'resp_parc', 'resp_agence')

  const typeParDefaut = searchParams.get('type') === 'note_service' ? 'note_service' : 'annonce'

  const { data: agences = [] } = useAgences()

  const { data: communication, isLoading } = useQuery({
    queryKey: ['communication', id],
    queryFn:  () => communicationsApi.get(parseInt(id!)).then(r => r.data.data),
    enabled:  isEdit,
  })

  const {
    register, handleSubmit, control, watch, reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: typeParDefaut,
      gravite: 'info',
      roles_cibles: null,
      agences_cibles: null,
      accuse_lecture_requis: false,
      date_publication: '',
      date_expiration: '',
    },
  })

  const [pieceJointe, setPieceJointe] = useState<File | null>(null)
  const gravite = watch('gravite')

  useEffect(() => {
    if (communication) {
      reset({
        titre:   communication.titre,
        contenu: communication.contenu,
        type:    communication.type,
        gravite: communication.gravite,
        roles_cibles:   communication.roles_cibles,
        agences_cibles: communication.agences_cibles,
        date_publication: communication.date_publication?.slice(0, 16) ?? '',
        date_expiration:  communication.date_expiration?.slice(0, 16) ?? '',
        accuse_lecture_requis: communication.accuse_lecture_requis,
      })
    }
  }, [communication, reset])

  const buildPayload = (data: FormData, statut?: 'brouillon' | 'publie'): FormData | object => {
    const payload: Record<string, any> = {
      titre:   data.titre,
      contenu: data.contenu,
      type:    data.type,
      gravite: data.gravite,
      roles_cibles:   data.roles_cibles?.length ? data.roles_cibles : null,
      agences_cibles: data.agences_cibles?.length ? data.agences_cibles : null,
      date_publication: data.date_publication || null,
      date_expiration:  data.date_expiration || null,
      accuse_lecture_requis: data.accuse_lecture_requis,
    }
    if (statut) payload.statut = statut

    if (!pieceJointe) return payload

    const fd = new FormData()
    Object.entries(payload).forEach(([k, v]) => {
      if (v === null || v === undefined) return
      if (Array.isArray(v)) {
        v.forEach((item, i) => fd.append(`${k}[${i}]`, String(item)))
      } else {
        fd.append(k, typeof v === 'boolean' ? (v ? '1' : '0') : String(v))
      }
    })
    fd.append('piece_jointe', pieceJointe)
    return fd
  }

  const createMut = useMutation({
    mutationFn: (payload: { data: FormData; statut?: 'brouillon' | 'publie' }) =>
      communicationsApi.create(buildPayload(payload.data, payload.statut)),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['communications'] })
      qc.invalidateQueries({ queryKey: ['communications-actives'] })
      toast.success(res.data.message ?? 'Enregistré.')
      navigate(typeParDefaut === 'note_service' ? '/communication/notes-service' : '/communication/annonces')
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Erreur lors de l'enregistrement."),
  })

  const updateMut = useMutation({
    mutationFn: (data: FormData) => communicationsApi.update(parseInt(id!), buildPayload(data)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['communications'] })
      qc.invalidateQueries({ queryKey: ['communication', id] })
      qc.invalidateQueries({ queryKey: ['communications-actives'] })
      toast.success('Mis à jour.')
      navigate(communication?.type === 'note_service' ? '/communication/notes-service' : '/communication/annonces')
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erreur lors de la mise à jour.'),
  })

  const onSaveBrouillon = (data: FormData) => {
    if (isEdit) updateMut.mutate(data)
    else createMut.mutate({ data, statut: 'brouillon' })
  }

  const onPublier = (data: FormData) => {
    if (isEdit) {
      updateMut.mutate(data)
    } else {
      createMut.mutate({ data, statut: 'publie' })
    }
  }

  if (isEdit && isLoading) {
    return <div className="card p-6"><LoadingSpinner size="md" /></div>
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title={isEdit ? 'Modifier' : (typeParDefaut === 'note_service' ? 'Nouvelle note de service' : 'Nouvelle annonce')}
        backTo={typeParDefaut === 'note_service' ? '/communication/notes-service' : '/communication/annonces'}
      />

      <form className="card p-6 space-y-4">

        <F label="Titre" error={errors.titre?.message}>
          <input {...register('titre')} className="input" placeholder="Ex : Maintenance préventive obligatoire" />
        </F>

        <F label="Contenu" error={errors.contenu?.message}>
          <textarea {...register('contenu')} rows={6} className="input resize-none" placeholder="Détails du message…" />
        </F>

        <div className="grid grid-cols-2 gap-4">
          <F label="Type">
            <select {...register('type')} className="input">
              <option value="annonce">Annonce</option>
              <option value="note_service">Note de service</option>
            </select>
          </F>
          <F label="Gravité" hint={gravite === 'critique' ? "La gravité critique permet d'exiger un accusé de lecture obligatoire." : undefined}>
            <select {...register('gravite')} className="input">
              <option value="info">Info</option>
              <option value="importante">Importante</option>
              <option value="critique">Critique</option>
            </select>
          </F>
        </div>

        <F label="Rôles ciblés" hint="Aucune sélection = visible par tous les rôles.">
          <Controller
            name="roles_cibles"
            control={control}
            render={({ field }) => (
              <div className="flex flex-wrap gap-2">
                {ROLES.map(r => {
                  const checked = field.value?.includes(r.value) ?? false
                  return (
                    <label key={r.value} className={`badge cursor-pointer transition-colors ${checked ? 'bg-primary-50 text-primary-700 border border-primary-200' : 'bg-gray-50 text-gray-500 border border-gray-200'}`}>
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={checked}
                        onChange={() => {
                          const current = field.value ?? []
                          field.onChange(
                            checked ? current.filter(v => v !== r.value) : [...current, r.value]
                          )
                        }}
                      />
                      {r.label}
                    </label>
                  )
                })}
              </div>
            )}
          />
        </F>

        <F label="Agences ciblées" hint="Aucune sélection = visible par toutes les agences.">
          <Controller
            name="agences_cibles"
            control={control}
            render={({ field }) => (
              <div className="flex flex-wrap gap-2">
                {agences.map((a: any) => {
                  const checked = field.value?.includes(a.id) ?? false
                  return (
                    <label key={a.id} className={`badge cursor-pointer transition-colors ${checked ? 'bg-primary-50 text-primary-700 border border-primary-200' : 'bg-gray-50 text-gray-500 border border-gray-200'}`}>
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={checked}
                        onChange={() => {
                          const current = field.value ?? []
                          field.onChange(
                            checked ? current.filter(v => v !== a.id) : [...current, a.id]
                          )
                        }}
                      />
                      {a.nom}
                    </label>
                  )
                })}
              </div>
            )}
          />
        </F>

        <div className="grid grid-cols-2 gap-4">
          <F label="Date de publication" hint="Vide = publication immédiate.">
            <input type="datetime-local" {...register('date_publication')} className="input" />
          </F>
          <F label="Date d'expiration" hint="Vide = pas d'expiration.">
            <input type="datetime-local" {...register('date_expiration')} className="input" />
          </F>
        </div>

        <label className={`flex items-start gap-2 cursor-pointer p-3 rounded-xl border ${gravite === 'critique' ? 'border-red-100 bg-red-50' : 'border-gray-100 bg-gray-50'}`}>
          <input type="checkbox" {...register('accuse_lecture_requis')} className="w-4 h-4 accent-primary-600 mt-0.5" />
          <div>
            <span className="text-sm font-medium text-gray-700">Accusé de lecture obligatoire</span>
            <p className="text-xs text-gray-500 mt-0.5">
              Affiche une fenêtre bloquante à la connexion tant que le destinataire n'a pas confirmé avoir lu ce message.
              {gravite !== 'critique' && " Recommandé uniquement pour les messages de gravité « Critique »."}
            </p>
          </div>
        </label>

        <F label="Pièce jointe (optionnel)" hint="PDF ou image, 5 Mo max.">
          <div className="flex items-center gap-3">
            <label className="btn-secondary text-xs gap-1.5 px-3 py-1.5 cursor-pointer">
              <Paperclip size={12} /> {pieceJointe ? 'Changer' : 'Choisir un fichier'}
              <input
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f && f.size > 5 * 1024 * 1024) {
                    toast.error('Le fichier ne doit pas dépasser 5 Mo.')
                    return
                  }
                  setPieceJointe(f ?? null)
                }}
                className="hidden"
              />
            </label>
            {pieceJointe && (
              <span className="text-sm text-gray-600 flex items-center gap-1.5">
                {pieceJointe.name}
                <button type="button" onClick={() => setPieceJointe(null)} className="text-red-400 hover:text-red-600">
                  <X size={14} />
                </button>
              </span>
            )}
            {!pieceJointe && communication?.piece_jointe_url && (
              <a href={communication.piece_jointe_url} target="_blank" rel="noreferrer" className="text-sm text-primary-600 hover:underline flex items-center gap-1">
                <Paperclip size={12} /> {communication.piece_jointe_nom ?? 'Pièce jointe actuelle'}
              </a>
            )}
          </div>
        </F>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSubmit(onSaveBrouillon)}
            disabled={isSubmitting}
            className="btn-secondary gap-2"
          >
            {isSubmitting && <LoadingSpinner size="sm" />}
            <Save size={15} /> {isEdit ? 'Enregistrer' : 'Enregistrer en brouillon'}
          </button>
          {!isEdit && peutPublier && (
            <button
              type="button"
              onClick={handleSubmit(onPublier)}
              disabled={isSubmitting}
              className="btn-primary gap-2"
            >
              {isSubmitting && <LoadingSpinner size="sm" />}
              <Send size={15} /> Publier
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
