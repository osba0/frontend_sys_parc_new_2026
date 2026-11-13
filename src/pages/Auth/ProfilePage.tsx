import { useState } from 'react'
import { Edit2, Key, Save, X, User, Shield, Clock, Phone, Briefcase } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { authApi } from '@/api/auth.api'
import { useAuthStore } from '@/stores/authStore'
import PageHeader from '@/components/shared/PageHeader'
import { LoadingSpinner } from '@/components/shared/LoadingPage'
import { formatDate } from '@/utils'
import toast from 'react-hot-toast'

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  super_admin:  { label: 'Super Admin',   color: 'bg-red-100 text-red-700'       },
  directeur:    { label: 'Directeur',     color: 'bg-orange-100 text-orange-700' },
  resp_parc:    { label: 'Resp. Parc',    color: 'bg-blue-100 text-blue-700'     },
  resp_agence:  { label: 'Resp. Agence',  color: 'bg-blue-100 text-blue-700'     },
  comptable:    { label: 'Comptable',     color: 'bg-green-100 text-green-700'   },
  chauffeur:    { label: 'Chauffeur',     color: 'bg-gray-100 text-gray-700'     },
  attributaire: { label: 'Attributaire',  color: 'bg-gray-100 text-gray-700'     },
}

export default function ProfilePage() {
  const { user, setUser } = useAuthStore()
  const qc = useQueryClient()

  const [editMode, setEditMode] = useState(false)
  const [pwdMode,  setPwdMode]  = useState(false)

  // Champs édition profil
  const [nom,       setNom]       = useState(user?.name      ?? '')
  const [prenom,    setPrenom]    = useState(user?.prenom     ?? '')
  const [telephone, setTelephone] = useState(user?.telephone  ?? '')
  const [fonction,  setFonction]  = useState(user?.fonction   ?? '')

  // Champs mot de passe
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd,     setNewPwd]     = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')

  const profileMut = useMutation({
    mutationFn: () => authApi.updateProfile({ name: nom, prenom, telephone, fonction }),
    onSuccess: (res) => {
      const updated = res.data.data
      setUser({ ...user!, ...updated })
      qc.invalidateQueries({ queryKey: ['me'] })
      toast.success('Profil mis à jour.')
      setEditMode(false)
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erreur.'),
  })

  const passwordMut = useMutation({
    mutationFn: () => authApi.changePassword({
      current_password:      currentPwd,
      password:              newPwd,
      password_confirmation: confirmPwd,
    }),
    onSuccess: () => {
      toast.success('Mot de passe modifié.')
      setPwdMode(false)
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('')
    },
    onError: (err: any) => {
      const errors = err?.response?.data?.errors
      if (errors) {
        Object.values(errors as Record<string, string[]>).forEach(m => toast.error(m[0]))
      } else {
        toast.error(err?.response?.data?.message ?? 'Erreur.')
      }
    },
  })

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nom.trim()) { toast.error('Le nom est obligatoire.'); return }
    profileMut.mutate()
  }

  const handleSavePwd = (e: React.FormEvent) => {
    e.preventDefault()
    if (newPwd !== confirmPwd) { toast.error('Les mots de passe ne correspondent pas.'); return }
    if (newPwd.length < 8)     { toast.error('Minimum 8 caractères.'); return }
    passwordMut.mutate()
  }

  const cancelEdit = () => {
    setNom(user?.name ?? '')
    setPrenom(user?.prenom ?? '')
    setTelephone(user?.telephone ?? '')
    setFonction(user?.fonction ?? '')
    setEditMode(false)
  }

  if (!user) return null

  const roleInfo = ROLE_LABELS[user.role ?? ''] ?? { label: user.role, color: 'bg-gray-100 text-gray-700' }
  const initiales = `${user.prenom?.[0] ?? ''}${user.name[0] ?? ''}`.toUpperCase()

  return (
    <div className="max-w-2xl space-y-5">
      <PageHeader title="Mon profil" backTo="/dashboard" />

      {/* Carte identité */}
      <div className="card p-6">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-2xl bg-primary-700 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
              {initiales || <User size={24} />}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {user.nom_complet ?? `${user.prenom ?? ''} ${user.name}`.trim()}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`badge text-xs px-2 py-0.5 ${roleInfo.color}`}>
                  {roleInfo.label}
                </span>
                {user.agence?.nom && (
                  <span className="text-xs text-gray-400">· {user.agence.nom}</span>
                )}
              </div>
              <p className="text-gray-400 text-xs mt-0.5">{user.email}</p>
            </div>
          </div>
          {!editMode && (
            <button
              onClick={() => { setEditMode(true); setPwdMode(false) }}
              className="btn-secondary gap-2"
            >
              <Edit2 size={14} /> Modifier
            </button>
          )}
        </div>

        {/* Formulaire édition */}
        {editMode ? (
          <form onSubmit={handleSaveProfile} className="space-y-4 border-t border-gray-100 pt-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Prénom</label>
                <input value={prenom} onChange={e => setPrenom(e.target.value)}
                  className="input" placeholder="Prénom" />
              </div>
              <div>
                <label className="label">Nom *</label>
                <input value={nom} onChange={e => setNom(e.target.value)}
                  className="input" placeholder="Nom" required />
              </div>
              <div>
                <label className="label flex items-center gap-1">
                  <Phone size={12} /> Téléphone
                </label>
                <input value={telephone} onChange={e => setTelephone(e.target.value)}
                  className="input" placeholder="+221 77 xxx xx xx" />
              </div>
              <div>
                <label className="label flex items-center gap-1">
                  <Briefcase size={12} /> Fonction / Poste
                </label>
                <input value={fonction} onChange={e => setFonction(e.target.value)}
                  className="input" placeholder="ex : Chef de parc" />
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-1">
              <button type="button" onClick={cancelEdit} className="btn-secondary gap-2">
                <X size={14} /> Annuler
              </button>
              <button type="submit" disabled={profileMut.isPending} className="btn-primary gap-2">
                {profileMut.isPending
                  ? <><LoadingSpinner size="sm" /> Sauvegarde…</>
                  : <><Save size={14} /> Enregistrer</>
                }
              </button>
            </div>
          </form>
        ) : (
          /* Vue lecture */
          <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-5">
            {[
              { icon: <Phone size={13} />,    label: 'Téléphone',         value: user.telephone ?? '—' },
              { icon: <Briefcase size={13} />, label: 'Fonction',          value: user.fonction  ?? '—' },
              { icon: <Shield size={13} />,   label: 'Rôle',              value: roleInfo.label       },
              { icon: <Clock size={13} />,    label: 'Dernière connexion', value: formatDate(user.last_login_at) ?? '—' },
            ].map(({ icon, label, value }) => (
              <div key={label} className="flex items-start gap-2">
                <span className="text-gray-400 mt-0.5 flex-shrink-0">{icon}</span>
                <div>
                  <dt className="text-xs text-gray-400 uppercase tracking-wide">{label}</dt>
                  <dd className="text-sm font-medium text-gray-800 mt-0.5">{value}</dd>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sécurité — mot de passe */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-1">
          <h3 className="section-title flex items-center gap-2 mb-0 border-0 pb-0">
            <Key size={15} /> Sécurité
          </h3>
          {!pwdMode && (
            <button
              onClick={() => { setPwdMode(true); setEditMode(false) }}
              className="btn-secondary gap-2"
            >
              <Key size={14} /> Changer le mot de passe
            </button>
          )}
        </div>

        {pwdMode ? (
          <form onSubmit={handleSavePwd} className="space-y-4 mt-4">
            <div>
              <label className="label">Mot de passe actuel *</label>
              <input type="password" value={currentPwd}
                onChange={e => setCurrentPwd(e.target.value)}
                className="input" autoComplete="current-password" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Nouveau mot de passe *</label>
                <input type="password" value={newPwd}
                  onChange={e => setNewPwd(e.target.value)}
                  className="input" autoComplete="new-password" required />
                <p className="text-xs text-gray-400 mt-1">
                  Min. 8 caractères · 1 majuscule · 1 chiffre
                </p>
              </div>
              <div>
                <label className="label">Confirmer *</label>
                <input type="password" value={confirmPwd}
                  onChange={e => setConfirmPwd(e.target.value)}
                  className="input" autoComplete="new-password" required />
              </div>
            </div>
            {/* Indicateur force */}
            {newPwd && (
              <div>
                <div className="flex gap-1 mt-1">
                  {[
                    newPwd.length >= 8,
                    /[A-Z]/.test(newPwd),
                    /[0-9]/.test(newPwd),
                    /[^a-zA-Z0-9]/.test(newPwd),
                  ].map((ok, i) => (
                    <div key={i} className={`h-1.5 flex-1 rounded-full ${ok ? 'bg-success' : 'bg-gray-200'}`} />
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Force : {
                    [newPwd.length >= 8, /[A-Z]/.test(newPwd), /[0-9]/.test(newPwd), /[^a-zA-Z0-9]/.test(newPwd)]
                      .filter(Boolean).length
                  }/4
                </p>
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <button type="button"
                onClick={() => { setPwdMode(false); setCurrentPwd(''); setNewPwd(''); setConfirmPwd('') }}
                className="btn-secondary gap-2">
                <X size={14} /> Annuler
              </button>
              <button type="submit" disabled={passwordMut.isPending} className="btn-primary gap-2">
                {passwordMut.isPending
                  ? <><LoadingSpinner size="sm" /> Modification…</>
                  : <><Key size={14} /> Modifier le mot de passe</>
                }
              </button>
            </div>
          </form>
        ) : (
          <p className="text-sm text-gray-400 mt-2">
            Pour la sécurité de votre compte, utilisez un mot de passe fort et unique.
          </p>
        )}
      </div>

      {/* Infos chauffeur si applicable */}
      {user.chauffeur && (
        <div className="card p-6">
          <h3 className="section-title flex items-center gap-2">
            🚗 Informations chauffeur
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              ['Matricule',       user.chauffeur.matricule_interne ?? '—'],
              ['Statut',          user.chauffeur.statut            ?? '—'],
              ['Statut permis',   user.chauffeur.statut_permis     ?? '—'],
              ['Véhicule actuel', user.chauffeur.vehicule_actuel?.immatriculation ?? 'Non affecté'],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</dt>
                <dd className="text-sm font-medium text-gray-800">{value}</dd>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
